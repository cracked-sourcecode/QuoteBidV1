/**
 * QuoteBid Dynamic Pricing Engine - Core Math
 * 
 * Pure function that computes price changes based on market variables.
 * No external dependencies - designed for testing and reliability.
 */

export interface PricingSnapshot {
  opportunityId: string;
  tier: 1 | 2 | 3; // Tier 1 = $250, Tier 2 = $175, Tier 3 = $125
  current_price: number;
  pitches: number;
  clicks: number;
  saves: number;
  drafts: number;
  emailClicks1h: number; // Email clicks in last hour (pricing emails only)
  hoursRemaining: number;
  outlet_avg_price?: number;
  successRateOutlet?: number; // 0-1 
  inventory_level: number;
  category?: string;
}

export interface PricingConfig {
  weights: {
    pitches: number;
    clicks: number;
    saves: number;
    drafts: number;
    emailClickBoost: number; // Boost for email clicks on pricing emails
    outlet_avg_price: number;
    successRateOutlet: number;
    hoursRemaining: number;
    baselineDecay: number; // Constant downward pressure preventing flat periods
    yieldPullCap: number; // Maximum influence of yield pull (0.05 = 5%)
    boundaryPressure: number; // Gradual pressure away from ceiling/floor extremes (0.03 = 3%)
  };
  priceStep: number; // Default $5
  elasticity: number; // Category-specific multiplier, default 1.0
  floor: number; // Minimum price 
  ceil: number; // Maximum price
}

export interface PricingMeta {
  score: number;
  driftApplied: boolean;
  outletLoadPenalty?: number;
  ambientDrift?: number;
  lastCalculated: string;
}

export interface PricingResult {
  price: number;
  meta: PricingMeta;
}

/**
 * V2 Pricing Engine - Returns both price and metadata
 * 
 * Algorithm:
 * 1. Demand score = pitches × w.pitches + clicks × w.clicks + ...
 * 2. Supply pressure = decay24h(hrsRemaining) when hrs < 24, else hrsRemaining/72
 * 3. Yield pull = (outletAvgPrice - currentPrice) / outletAvgPrice  
 * 4. Risk adj. = (1 - successRateOutlet) × w.successRateOutlet
 * 5. Delta = elasticity × demand + yieldPull - supplyPressure - riskAdj
 * 6. Move = Math.sign(delta) × priceStep
 * 7. Return clamp(currentPrice + move, floor, ceil) + metadata
 */
export function calculatePrice(input: PricingSnapshot, cfg: PricingConfig): PricingResult {
  const { weights, priceStep, elasticity, floor, ceil } = cfg;
  
  // Step 1: Calculate demand score
  const demandScore = 
    input.pitches * weights.pitches +
    input.clicks * weights.clicks +
    input.saves * weights.saves +
    input.drafts * weights.drafts +
    input.emailClicks1h * weights.emailClickBoost;

  // Step 2: Calculate supply pressure (urgency factor)
  const supplyPressure = calculateSupplyPressure(input.hoursRemaining);

  // Step 3: Calculate yield pull (anchor toward outlet average)
  const yieldPull = calculateYieldPull(
    input.outlet_avg_price, 
    input.current_price,
    weights.yieldPullCap
  );

  // Step 4: Calculate risk adjustment  
  const riskAdjustment = calculateRiskAdjustment(
    input.successRateOutlet,
    weights.successRateOutlet
  );

  // Step 5: Calculate boundary pressure (rubber band effect)
  const boundaryPressure = calculateBoundaryPressure(
    input.current_price,
    floor,
    ceil,
    weights.boundaryPressure
  );

  // Step 6: Calculate overall delta
  const delta = 
    elasticity * demandScore + 
    yieldPull + 
    boundaryPressure - 
    supplyPressure - 
    riskAdjustment -
    weights.baselineDecay; // Always pulls price down to prevent flat periods

  // Step 6: Calculate price move with ambient chatter
  let move = Math.sign(delta) * priceStep;
  
  // CRITICAL FIX: Add ambient price chatter during inactive periods
  // If delta is very small (indicating low activity), add small random movement
  // This prevents flat periods and makes pricing look more natural
  if (Math.abs(delta) < 0.1 && move === 0) {
    // During inactive periods, create small ambient movement
    // 60% chance of small downward pressure (market gravity)
    // 40% chance of small upward pressure (natural variation)
    const ambientDirection = Math.random() < 0.6 ? -1 : 1;
    move = ambientDirection * priceStep;
    
    console.log(`🌊 Ambient chatter: OPP ${input.opportunityId} → ${ambientDirection > 0 ? '▲' : '▼'}$${priceStep} (low activity)`);
  }

  // Step 7: Apply move and clamp to bounds
  const newPrice = input.current_price + move;
  const price = clamp(newPrice, floor, ceil);

  // Step 8: Build metadata
  const meta: PricingMeta = {
    score: demandScore + yieldPull - supplyPressure - riskAdjustment,
    driftApplied: Math.abs(move) > 0 && Math.abs(delta) < 0.1, // Small moves might be drift
    outletLoadPenalty: input.outlet_avg_price ? yieldPull : undefined,
    ambientDrift: Math.abs(delta) < 0.1 ? move : undefined,
    lastCalculated: new Date().toISOString(),
  };

  return { price, meta };
}

/**
 * Legacy V1 function - Returns only price for backwards compatibility
 * 
 * Algorithm:
 * 1. Demand score = pitches × w.pitches + clicks × w.clicks + ...
 * 2. Supply pressure = decay24h(hrsRemaining) when hrs < 24, else hrsRemaining/72
 * 3. Yield pull = (outletAvgPrice - currentPrice) / outletAvgPrice  
 * 4. Risk adj. = (1 - successRateOutlet) × w.successRateOutlet
 * 5. Delta = elasticity × demand + yieldPull - supplyPressure - riskAdj
 * 6. Move = Math.sign(delta) × priceStep
 * 7. Return clamp(currentPrice + move, bandFloor, bandCeil) with dynamic band
 */
export function computePrice(input: PricingSnapshot, cfg: PricingConfig): number {
  const { weights, priceStep, elasticity, floor, ceil } = cfg;
  
  // Step 1: Calculate demand score
  const demandScore = 
    input.pitches * weights.pitches +
    input.clicks * weights.clicks +
    input.saves * weights.saves +
    input.drafts * weights.drafts +
    input.emailClicks1h * weights.emailClickBoost;

  // Step 2: Calculate supply pressure (urgency factor)
  const supplyPressure = calculateSupplyPressure(input.hoursRemaining);

  // Step 3: Calculate yield pull (anchor toward outlet average)
  const yieldPull = calculateYieldPull(
    input.outlet_avg_price, 
    input.current_price,
    weights.yieldPullCap
  );

  // Step 4: Calculate risk adjustment  
  const riskAdjustment = calculateRiskAdjustment(
    input.successRateOutlet,
    weights.successRateOutlet
  );

  // Step 5: Calculate boundary pressure (rubber band effect)
  const boundaryPressure = calculateBoundaryPressure(
    input.current_price,
    floor,
    ceil,
    weights.boundaryPressure
  );

  // Step 6: Calculate overall delta
  const delta = 
    elasticity * demandScore + 
    yieldPull + 
    boundaryPressure - 
    supplyPressure - 
    riskAdjustment -
    weights.baselineDecay; // Always pulls price down to prevent flat periods

  // Step 6: Calculate price move with ambient chatter
  let move = Math.sign(delta) * priceStep;
  
  // CRITICAL FIX: Add ambient price chatter during inactive periods
  // If delta is very small (indicating low activity), add small random movement
  // This prevents flat periods and makes pricing look more natural
  if (Math.abs(delta) < 0.1 && move === 0) {
    // During inactive periods, create small ambient movement
    // 60% chance of small downward pressure (market gravity)
    // 40% chance of small upward pressure (natural variation)
    const ambientDirection = Math.random() < 0.6 ? -1 : 1;
    move = ambientDirection * priceStep;
    
    console.log(`🌊 Ambient chatter: OPP ${input.opportunityId} → ${ambientDirection > 0 ? '▲' : '▼'}$${priceStep} (low activity)`);
  }
  
  const raw = input.current_price + move;

  // --- NEW dynamic band ---------------------------------
  const anchor = input.outlet_avg_price ?? tierBase(input.tier);
  const bandFloor = Math.max(floor, 0.6 * anchor);
  const bandCeil = Math.min(ceil, 2.0 * anchor);
  const price = clamp(raw, bandFloor, bandCeil);

  return price;
}

/**
 * Soft-urgency curve (log-style)
 * - 24h → 0
 * - 12h → ~0.7
 * -  6h → ~1.0
 * -  1h → ≤ 1.3
 * Capped at 1.5 so it can never swamp demand.
 */
export function calculateSupplyPressure(hoursRemaining: number): number {
  if (hoursRemaining >= 24) return 0;

  // Avoid log(0) — shift domain by +1
  const pressure = Math.log10((24 - hoursRemaining) + 1); // 0-to-log10(25)

  // Scale to get desired curve: 12h→0.7, 6h→1.0, 1h→1.3
  // log10(13) ≈ 1.114 for 12h, so scale by 0.63 to get 0.7
  const scaledPressure = pressure * 0.63;

  // Normalise to 0-1.5 range and ensure it caps at 1.5
  return Math.min(1.5, scaledPressure);
}

/**
 * Calculate yield pull - pressure to move toward outlet's historical average
 * Positive = pull price up, Negative = pull price down
 * FIXED: Scale yield pull to respect price step configuration
 */
function calculateYieldPull(
  outletAvgPrice: number | undefined, 
  currentPrice: number,
  yieldPullCap: number
): number {
  if (!outletAvgPrice || outletAvgPrice <= 0) return 0;
  
  // CRITICAL FIX: Cap yield pull to prevent overwhelming price step
  // Maximum yield pull should be equivalent to ~2 price steps worth of influence
  const rawYieldPull = (outletAvgPrice - currentPrice) / outletAvgPrice;
  
  // Scale yield pull to be proportional (configurable max influence via yieldPullCap)
  // This ensures yield pull influences direction but doesn't override price step
  const scaledYieldPull = Math.sign(rawYieldPull) * Math.min(Math.abs(rawYieldPull), yieldPullCap);
  
  return scaledYieldPull;
}

/**
 * Calculate boundary pressure - gradual rubber band effect away from ceiling/floor
 * Creates gentle pressure to return prices to healthy trading ranges
 */
function calculateBoundaryPressure(
  currentPrice: number,
  floor: number,
  ceil: number,
  boundaryPressureStrength: number
): number {
  if (boundaryPressureStrength <= 0) return 0;
  
  const range = ceil - floor;
  if (range <= 0) return 0;
  
  // Define "extreme" zones: top 20% and bottom 20% of range
  const extremeZoneSize = range * 0.2;
  const upperThreshold = ceil - extremeZoneSize; // 80% toward ceiling
  const lowerThreshold = floor + extremeZoneSize; // 20% above floor
  
  let pressure = 0;
  
  // Upper boundary pressure (push down from ceiling)
  if (currentPrice > upperThreshold) {
    const distanceIntoZone = currentPrice - upperThreshold;
    const pressureRatio = Math.min(distanceIntoZone / extremeZoneSize, 1);
    // Exponential curve for stronger pressure as you approach ceiling
    pressure = -boundaryPressureStrength * (pressureRatio ** 1.5);
  }
  
  // Lower boundary pressure (push up from floor)  
  else if (currentPrice < lowerThreshold) {
    const distanceIntoZone = lowerThreshold - currentPrice;
    const pressureRatio = Math.min(distanceIntoZone / extremeZoneSize, 1);
    // Exponential curve for stronger pressure as you approach floor
    pressure = boundaryPressureStrength * (pressureRatio ** 1.5);
  }
  
  return pressure;
}

/**
 * Calculate risk adjustment based on outlet's historical success rate
 * Low success rate = higher risk = price discount
 */
function calculateRiskAdjustment(
  successRateOutlet: number | undefined,
  weight: number
): number {
  if (typeof successRateOutlet !== 'number') return 0;
  
  // Risk factor: (1 - successRate) means lower success = higher risk
  const riskFactor = 1 - Math.max(0, Math.min(1, successRateOutlet));
  return riskFactor * Math.abs(weight);
}

/**
 * Clamp a value between min and max bounds
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Helper to get default pricing config
 * NOTE: These defaults should be overridden by database values in production
 */
export function getDefaultPricingConfig(): PricingConfig {
  return {
    weights: {
      pitches: 1.0,
      clicks: 0.3,
      saves: 0.2,
      drafts: 0.1,
      emailClickBoost: 0.05,
      outlet_avg_price: -1.0,
      successRateOutlet: -0.5,
      hoursRemaining: -1.2,
      baselineDecay: 0.05, // Default 5% constant downward pressure
      yieldPullCap: 0.05, // Default 5% maximum yield pull influence
      boundaryPressure: 0.03, // Default 3% gradual boundary pressure
    },
    priceStep: 5,
    elasticity: 1.0,
    floor: 50,     // DEPRECATED: Should be read from variable_registry in production
    ceil: 500,     // DEPRECATED: Should be read from variable_registry in production
  };
}

/**
 * Helper to get tier base price for dynamic band calculation
 */
function tierBase(tier: 1 | 2 | 3): number {
  return tier === 1 ? 250 : tier === 2 ? 175 : 125;
} 
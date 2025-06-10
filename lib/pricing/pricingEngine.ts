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
    outlet_avg_price: number;
    successRateOutlet: number;
    hoursRemaining: number;
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
    input.drafts * weights.drafts;

  // Step 2: Calculate supply pressure (urgency factor)
  const supplyPressure = calculateSupplyPressure(input.hoursRemaining);

  // Step 3: Calculate yield pull (anchor toward outlet average)
  const yieldPull = calculateYieldPull(
    input.outlet_avg_price, 
    input.current_price
  );

  // Step 4: Calculate risk adjustment  
  const riskAdjustment = calculateRiskAdjustment(
    input.successRateOutlet,
    weights.successRateOutlet
  );

  // Step 5: Calculate overall delta
  const delta = 
    elasticity * demandScore + 
    yieldPull - 
    supplyPressure - 
    riskAdjustment;

  // Step 6: Calculate price move
  const move = Math.sign(delta) * priceStep;

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
 * 7. Return clamp(currentPrice + move, floor, ceil)
 */
export function computePrice(input: PricingSnapshot, cfg: PricingConfig): number {
  const result = calculatePrice(input, cfg);
  return result.price;
}

/**
 * Calculate supply pressure based on hours remaining to deadline
 * When < 24 hours: exponential decay to create urgency
 * When >= 24 hours: linear decay over 72 hours (3 days)
 */
function calculateSupplyPressure(hoursRemaining: number): number {
  if (hoursRemaining < 1) {
    // Fire sale - maximum pressure
    return 10;
  } else if (hoursRemaining < 24) {
    // Exponential decay for final 24 hours
    // decay24h creates urgency: 24hrs=0.1, 12hrs=0.5, 6hrs=2, 1hr=8
    return 8 * Math.pow(0.5, hoursRemaining / 6);
  } else {
    // Linear decay over 72 hours
    return Math.max(0, hoursRemaining / 72);
  }
}

/**
 * Calculate yield pull - pressure to move toward outlet's historical average
 * Positive = pull price up, Negative = pull price down
 */
function calculateYieldPull(
  outletAvgPrice: number | undefined, 
  currentPrice: number
): number {
  if (!outletAvgPrice || outletAvgPrice <= 0) return 0;
  
  // Pull toward the outlet average
  return (outletAvgPrice - currentPrice) / outletAvgPrice;
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
 */
export function getDefaultPricingConfig(): PricingConfig {
  return {
    weights: {
      pitches: 1.0,
      clicks: 0.3,
      saves: 0.2,
      drafts: 0.1,
      outlet_avg_price: -1.0,
      successRateOutlet: -0.5,
      hoursRemaining: -1.2,
    },
    priceStep: 5,
    elasticity: 1.0,
    floor: 10,     // Minimum safety floor
    ceil: 10000,   // Maximum safety ceiling
  };
} 
/**
 * Gatekeeper - Decides when to skip GPT and apply price changes directly
 * 
 * Rule: Skip GPT if:
 * - Math.abs(priceDelta) < priceStep AND
 * - hoursRemaining > 12
 * 
 * This saves ~90% of GPT API calls by handling routine price movements automatically.
 */

/**
 * Determines if a price change should skip GPT review
 * 
 * @param priceDelta - The difference between new price and current price
 * @param hoursRemaining - Hours until opportunity deadline
 * @param priceStep - The configured price step size (default $5)
 * @returns true if GPT should be skipped (apply price directly)
 */
export function shouldSkipGPT(
  priceDelta: number,
  hoursRemaining: number,
  priceStep: number = 5
): boolean {
  const deltaMagnitude = Math.abs(priceDelta);
  
  // Skip GPT for small changes when there's plenty of time
  const isSmallChange = deltaMagnitude < priceStep;
  const hasTimeRemaining = hoursRemaining > 12;
  
  const shouldSkip = isSmallChange && hasTimeRemaining;
  
  // Log decision for debugging
  if (shouldSkip) {
    console.log(`🚪 Gatekeeper: SKIP GPT (Δ=${priceDelta}, hrs=${hoursRemaining.toFixed(1)})`);
  } else {
    console.log(`🤖 Gatekeeper: QUEUE GPT (Δ=${priceDelta}, hrs=${hoursRemaining.toFixed(1)})`);
  }
  
  return shouldSkip;
}

/**
 * Get gatekeeper statistics for monitoring
 */
export function getGatekeeperStats() {
  // This could be enhanced to track statistics over time
  return {
    rule: "Math.abs(Δ) < priceStep && hoursRemaining > 12",
    expectedSkipRate: "~90%"
  };
} 
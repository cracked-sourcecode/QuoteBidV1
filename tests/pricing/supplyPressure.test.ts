import { calculateSupplyPressure } from '../../lib/pricing/pricingEngine';

describe('soft urgency curve', () => {
  it('returns 0 at ≥24h', () => {
    expect(calculateSupplyPressure(30)).toBe(0);
    expect(calculateSupplyPressure(24)).toBe(0);
  });
  it('is gentle at 12h', () => {
    expect(calculateSupplyPressure(12)).toBeCloseTo(0.7, 1);
  });
  it('caps at 1.5', () => {
    expect(calculateSupplyPressure(0)).toBeLessThanOrEqual(1.5);
  });
}); 
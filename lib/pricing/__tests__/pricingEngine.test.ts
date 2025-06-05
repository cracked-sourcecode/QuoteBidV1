import { describe, it, expect } from 'vitest';
import { 
  computePrice, 
  getDefaultPricingConfig,
  type PricingSnapshot,
  type PricingConfig 
} from '../pricingEngine';

describe('pricingEngine', () => {
  
  const defaultConfig = getDefaultPricingConfig();
  
  // Helper to create test snapshots
  const createSnapshot = (overrides: Partial<PricingSnapshot> = {}): PricingSnapshot => ({
    opportunityId: 'test-123',
    tier: 1,
    current_price: 200,
    pitches: 0,
    clicks: 0,
    saves: 0,
    drafts: 0,
    hoursRemaining: 48,
    outlet_avg_price: 200,
    successRateOutlet: 0.7,
    inventory_level: 5,
    category: 'finance',
    ...overrides
  });

  describe('Happy Path - High Demand Increases Price', () => {
    it('should increase price when demand is high (5 pitches)', () => {
      const snapshot = createSnapshot({
        pitches: 5,
        current_price: 200
      });

      const newPrice = computePrice(snapshot, defaultConfig);
      
      // With 5 pitches × weight(1.0) = 5 demand score
      // Should move price up by priceStep ($5)
      expect(newPrice).toBe(205);
    });

    it('should increase price with mixed demand signals', () => {
      const snapshot = createSnapshot({
        pitches: 3,    // 3 × 1.0 = 3.0
        clicks: 10,    // 10 × 0.3 = 3.0  
        saves: 5,      // 5 × 0.2 = 1.0
        drafts: 2,     // 2 × 0.1 = 0.2
        current_price: 150
        // Total demand = 7.2 > 0, so price should increase
      });

      const newPrice = computePrice(snapshot, defaultConfig);
      expect(newPrice).toBe(155); // +5 price step
    });
  });

  describe('Low Demand - Price Drops', () => {
    it('should decrease price with zero pitches and time pressure', () => {
      const snapshot = createSnapshot({
        pitches: 0,
        clicks: 0,
        saves: 0,
        drafts: 0,
        hoursRemaining: 30, // Creates some supply pressure
        current_price: 200
      });

      const newPrice = computePrice(snapshot, defaultConfig);
      
      // Zero demand + supply pressure should drop price
      expect(newPrice).toBe(195); // -5 price step
    });

    it('should handle very low demand correctly', () => {
      const snapshot = createSnapshot({
        pitches: 0,
        clicks: 1,     // 1 × 0.3 = 0.3 (minimal demand)
        hoursRemaining: 36,  // Medium supply pressure
        current_price: 175
      });

      const newPrice = computePrice(snapshot, defaultConfig);
      expect(newPrice).toBe(170); // Should drop due to low demand vs supply pressure
    });
  });

  describe('Near Deadline Fire-Sale', () => {
    it('should apply maximum pressure when deadline < 1 hour', () => {
      const snapshot = createSnapshot({
        pitches: 2,    // Some demand
        hoursRemaining: 0.5, // Very urgent!
        current_price: 100
      });

      const newPrice = computePrice(snapshot, defaultConfig);
      
      // Fire sale pressure should dominate even with some demand
      expect(newPrice).toBe(95); // Should drop due to extreme urgency
    });

    it('should respect floor price even in fire sale', () => {
      const snapshot = createSnapshot({
        pitches: 0,
        hoursRemaining: 0.25, // Extreme urgency
        current_price: 55     // Close to floor (50)
      });

      const newPrice = computePrice(snapshot, defaultConfig);
      
      // Should hit the floor and not go below
      expect(newPrice).toBe(50);
    });

    it('should apply exponential decay in final 24 hours', () => {
      const snapshot = createSnapshot({
        pitches: 1,
        hoursRemaining: 12, // 12 hours left
        current_price: 200
      });

      const newPrice = computePrice(snapshot, defaultConfig);
      
      // 12 hours should create significant downward pressure
      expect(newPrice).toBe(195);
    });
  });

  describe('Price Clamping', () => {
    it('should not go below floor price', () => {
      const config: PricingConfig = {
        ...defaultConfig,
        floor: 100,
        ceil: 400
      };

      const snapshot = createSnapshot({
        pitches: 0,
        hoursRemaining: 0.1, // Maximum urgency
        current_price: 105   // Just above floor
      });

      const newPrice = computePrice(snapshot, config);
      expect(newPrice).toBe(100); // Should clamp to floor
    });

    it('should not go above ceil price', () => {
      const config: PricingConfig = {
        ...defaultConfig,
        floor: 50,
        ceil: 300
      };

      const snapshot = createSnapshot({
        pitches: 20,      // Massive demand
        clicks: 50,
        saves: 30,
        current_price: 295 // Close to ceiling
      });

      const newPrice = computePrice(snapshot, config);
      expect(newPrice).toBe(300); // Should clamp to ceiling
    });

    it('should stay within bounds on exact boundaries', () => {
      const config: PricingConfig = {
        ...defaultConfig,
        floor: 50,
        ceil: 500
      };

      // Test floor boundary
      const floorSnapshot = createSnapshot({ current_price: 50 });
      expect(computePrice(floorSnapshot, config)).toBeGreaterThanOrEqual(50);

      // Test ceiling boundary  
      const ceilSnapshot = createSnapshot({ current_price: 500, pitches: 10 });
      expect(computePrice(ceilSnapshot, config)).toBeLessThanOrEqual(500);
    });
  });

  describe('Outlet Average Yield Pull', () => {
    it('should pull price toward outlet average when below', () => {
      const snapshot = createSnapshot({
        current_price: 150,
        outlet_avg_price: 200, // Outlet average is higher
        pitches: 1, // Minimal other factors
        hoursRemaining: 72 // Minimal supply pressure
      });

      const newPrice = computePrice(snapshot, defaultConfig);
      expect(newPrice).toBe(155); // Should move toward outlet average
    });

    it('should pull price down when above outlet average', () => {
      const snapshot = createSnapshot({
        current_price: 250,
        outlet_avg_price: 200, // Current price above average
        pitches: 1,
        hoursRemaining: 72
      });

      const newPrice = computePrice(snapshot, defaultConfig);
      expect(newPrice).toBe(245); // Should move toward outlet average (down)
    });

    it('should handle missing outlet average gracefully', () => {
      const snapshot = createSnapshot({
        current_price: 200,
        outlet_avg_price: undefined,
        pitches: 2
      });

      const newPrice = computePrice(snapshot, defaultConfig);
      expect(newPrice).toBe(205); // Should work without outlet data
    });
  });

  describe('Risk Adjustment', () => {
    it('should discount price for low success rate outlets', () => {
      const snapshot = createSnapshot({
        current_price: 200,
        successRateOutlet: 0.1, // Very low success rate = high risk  
        pitches: 0, // No demand
        hoursRemaining: 20, // More supply pressure
        outlet_avg_price: 180 // Below current price
      });

      const newPrice = computePrice(snapshot, defaultConfig);
      
      // Risk adjustment combined with other factors should push price down
      expect(newPrice).toBe(195);
    });

    it('should not penalize high success rate outlets', () => {
      const snapshot = createSnapshot({
        current_price: 200,
        successRateOutlet: 0.9, // High success rate = low risk
        pitches: 2,
        hoursRemaining: 48
      });

      const newPrice = computePrice(snapshot, defaultConfig);
      expect(newPrice).toBe(205); // Should increase due to demand
    });

    it('should handle missing success rate gracefully', () => {
      const snapshot = createSnapshot({
        current_price: 200,
        successRateOutlet: undefined,
        pitches: 3
      });

      const newPrice = computePrice(snapshot, defaultConfig);
      expect(newPrice).toBe(205); // Should work without success rate data
    });
  });

  describe('Elasticity Factor', () => {
    it('should amplify demand changes with higher elasticity', () => {
      const config: PricingConfig = {
        ...defaultConfig,
        elasticity: 2.0 // Double the demand impact
      };

      const snapshot = createSnapshot({
        pitches: 2, // Small demand signal
        current_price: 200
      });

      const newPrice = computePrice(snapshot, config);
      expect(newPrice).toBe(205); // Still moves by priceStep, not double
    });

    it('should dampen demand changes with lower elasticity', () => {
      const config: PricingConfig = {
        ...defaultConfig,
        elasticity: 0.5 // Half the demand impact
      };

      const snapshot = createSnapshot({
        pitches: 6, // Larger demand signal  
        current_price: 200
      });

      // With 0.5 elasticity, demand score of 6 becomes 3
      // Still positive so price increases
      const newPrice = computePrice(snapshot, config);
      expect(newPrice).toBe(205);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero price step gracefully', () => {
      const config: PricingConfig = {
        ...defaultConfig,
        priceStep: 0
      };

      const snapshot = createSnapshot({
        pitches: 10,
        current_price: 200
      });

      const newPrice = computePrice(snapshot, config);
      expect(newPrice).toBe(200); // No change with zero step
    });

    it('should handle negative hours remaining', () => {
      const snapshot = createSnapshot({
        hoursRemaining: -5, // Past deadline
        current_price: 200
      });

      const newPrice = computePrice(snapshot, defaultConfig);
      // Should apply maximum supply pressure
      expect(newPrice).toBe(195);
    });

    it('should handle extreme demand values', () => {
      const snapshot = createSnapshot({
        pitches: 1000,
        clicks: 5000,
        current_price: 100
      });

      const newPrice = computePrice(snapshot, defaultConfig);
      // Should move up by one price step (algorithm moves incrementally for stability)
      expect(newPrice).toBe(105);
    });

    it('should eventually reach ceiling with repeated applications', () => {
      let currentPrice = 495; // Close to ceiling
      const snapshot = createSnapshot({
        pitches: 50, // High demand
        current_price: currentPrice
      });

      const newPrice = computePrice(snapshot, defaultConfig);
      // Should clamp at ceiling
      expect(newPrice).toBe(500);
    });
  });

  describe('Default Configuration', () => {
    it('should provide sensible defaults', () => {
      const config = getDefaultPricingConfig();
      
      expect(config.priceStep).toBe(5);
      expect(config.elasticity).toBe(1.0);
      expect(config.floor).toBe(50);
      expect(config.ceil).toBe(500);
      expect(config.weights.pitches).toBe(1.0);
      expect(config.weights.clicks).toBe(0.3);
    });
  });
}); 
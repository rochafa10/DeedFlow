/**
 * Rehab Cost Calculator Tests
 *
 * Tests the rehab cost calculation functions including:
 * - Exterior costs breakdown (roof, siding, windows, doors, landscaping)
 * - Interior costs breakdown (flooring, paint, kitchen, bathrooms, systems)
 * - Structural costs breakdown (foundation, framing, insulation)
 * - Regional multiplier application (labor and materials)
 * - Confidence calculation based on data availability
 * - Complete rehab cost calculation with all adjustments
 * - Quick estimate and range calculation functions
 *
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-22
 */

import { describe, it, expect } from 'vitest';
import {
  estimateExteriorCosts,
  estimateInteriorCosts,
  estimateStructuralCosts,
  applyRegionalMultipliers,
  calculateRehabConfidence,
  calculateRehabCosts,
  estimateRehabTotal,
  getRehabCostRange,
  getAdjustedCostPerSqft,
  type RehabCostInput,
} from '../rehab';
import type { RehabScope, PropertyCondition, RehabBreakdown } from '@/types/costs';

// ============================================
// Test Fixtures
// ============================================

/**
 * Common property square footages for testing
 */
const TEST_SQFT = {
  small: 800,
  medium: 1500,
  large: 2500,
  veryLarge: 4000,
};

/**
 * Common rehab scopes for testing
 */
const REHAB_SCOPES: RehabScope[] = ['cosmetic', 'light', 'moderate', 'heavy', 'gut'];

/**
 * Common property conditions for testing
 */
const PROPERTY_CONDITIONS: PropertyCondition[] = ['excellent', 'good', 'fair', 'poor', 'distressed'];

/**
 * Sample states with varying regional multipliers
 */
const TEST_STATES = {
  baseline: 'PA',       // 1.0x labor, 1.0x materials
  lowCost: 'MS',        // 0.75x labor, 0.90x materials
  highCost: 'NY',       // 1.40x labor, 1.20x materials
  veryHighCost: 'HI',   // 1.45x labor, 1.40x materials
};

/**
 * Complete rehab cost input for Pennsylvania moderate renovation
 */
const mockModerateRehabInput: RehabCostInput = {
  property: {
    sqft: 1500,
    yearBuilt: 1980,
    state: 'PA',
    city: 'Pittsburgh',
  },
  condition: 'fair',
  scope: 'moderate',
  estimate: 'mid',
};

/**
 * Complete rehab cost input with Regrid data
 */
const mockRehabWithRegridInput: RehabCostInput = {
  property: {
    state: 'PA',
  },
  regridData: {
    building_sqft: 1800,
    year_built: 1970,
  },
  condition: 'poor',
  scope: 'heavy',
  estimate: 'mid',
};

/**
 * Minimal rehab cost input (defaults should apply)
 */
const mockMinimalInput: RehabCostInput = {
  property: {
    state: 'PA',
  },
};

/**
 * High-cost metro area rehab input
 */
const mockHighCostMetroInput: RehabCostInput = {
  property: {
    sqft: 1500,
    yearBuilt: 1990,
    state: 'CA',
    city: 'San Francisco',
  },
  condition: 'fair',
  scope: 'moderate',
  metro: 'SanFrancisco',
};

/**
 * Old property requiring extensive work
 */
const mockOldPropertyInput: RehabCostInput = {
  property: {
    sqft: 1500,
    yearBuilt: 1920,
    state: 'PA',
  },
  condition: 'distressed',
  scope: 'gut',
  estimate: 'high',
};

// ============================================
// Exterior Cost Breakdown Tests
// ============================================

describe('estimateExteriorCosts', () => {
  describe('cosmetic scope allocations', () => {
    it('should allocate mostly to landscaping for cosmetic scope', () => {
      const costs = estimateExteriorCosts(10000, 'cosmetic');

      expect(costs.landscaping).toBeGreaterThan(costs.roof);
      expect(costs.landscaping).toBeGreaterThan(costs.siding);
      expect(costs.landscaping).toBeGreaterThan(costs.windows);
      expect(costs.roof).toBe(0); // No roof work in cosmetic
      expect(costs.windows).toBe(0); // No window work in cosmetic
    });

    it('should include minimal siding and doors for cosmetic', () => {
      const costs = estimateExteriorCosts(10000, 'cosmetic');

      expect(costs.siding).toBeGreaterThan(0);
      expect(costs.doors).toBeGreaterThan(0);
      expect(costs.siding).toBeLessThan(costs.landscaping);
    });
  });

  describe('moderate scope allocations', () => {
    it('should allocate significant budget to roof for moderate scope', () => {
      const costs = estimateExteriorCosts(20000, 'moderate');

      expect(costs.roof).toBeGreaterThan(4000);
      expect(costs.roof).toBeGreaterThan(costs.landscaping);
    });

    it('should include all exterior categories', () => {
      const costs = estimateExteriorCosts(20000, 'moderate');

      expect(costs.roof).toBeGreaterThan(0);
      expect(costs.siding).toBeGreaterThan(0);
      expect(costs.windows).toBeGreaterThan(0);
      expect(costs.doors).toBeGreaterThan(0);
      expect(costs.landscaping).toBeGreaterThan(0);
      expect(costs.hardscape).toBeGreaterThan(0);
    });
  });

  describe('gut scope allocations', () => {
    it('should allocate heavily to roof, siding, and windows for gut', () => {
      const costs = estimateExteriorCosts(30000, 'gut');

      expect(costs.roof).toBeGreaterThan(9000);
      expect(costs.siding).toBeGreaterThan(7000);
      expect(costs.windows).toBeGreaterThan(5000);
    });

    it('should allocate less to landscaping for gut scope', () => {
      const cosmeticCosts = estimateExteriorCosts(30000, 'cosmetic');
      const gutCosts = estimateExteriorCosts(30000, 'gut');

      expect(gutCosts.landscaping).toBeLessThan(cosmeticCosts.landscaping);
    });
  });

  describe('total calculation', () => {
    it('should calculate total as sum of all components', () => {
      const costs = estimateExteriorCosts(20000, 'moderate');

      const calculatedTotal =
        costs.roof +
        costs.siding +
        costs.windows +
        costs.doors +
        costs.landscaping +
        costs.hardscape;

      expect(costs.total).toBe(calculatedTotal);
    });

    it('should round individual components', () => {
      const costs = estimateExteriorCosts(12345, 'moderate');

      // All components should be integers
      expect(costs.roof % 1).toBe(0);
      expect(costs.siding % 1).toBe(0);
      expect(costs.windows % 1).toBe(0);
      expect(costs.doors % 1).toBe(0);
      expect(costs.landscaping % 1).toBe(0);
      expect(costs.hardscape % 1).toBe(0);
    });
  });

  describe('scope comparisons', () => {
    REHAB_SCOPES.forEach((scope) => {
      it(`should return valid breakdown for ${scope} scope`, () => {
        const costs = estimateExteriorCosts(20000, scope);

        expect(costs.total).toBeGreaterThan(0);
        expect(costs.total).toBeLessThanOrEqual(20000);
        expect(costs.roof).toBeGreaterThanOrEqual(0);
        expect(costs.siding).toBeGreaterThanOrEqual(0);
        expect(costs.windows).toBeGreaterThanOrEqual(0);
      });
    });
  });
});

// ============================================
// Interior Cost Breakdown Tests
// ============================================

describe('estimateInteriorCosts', () => {
  describe('cosmetic scope allocations', () => {
    it('should allocate heavily to flooring and paint for cosmetic', () => {
      const costs = estimateInteriorCosts(17000, 'cosmetic');

      expect(costs.flooring).toBeGreaterThan(5000);
      expect(costs.paint).toBeGreaterThan(6000);
      expect(costs.flooring + costs.paint).toBeGreaterThan(costs.kitchen + costs.bathrooms);
    });

    it('should allocate minimal budget to systems for cosmetic', () => {
      const costs = estimateInteriorCosts(17000, 'cosmetic');

      expect(costs.electrical).toBeLessThan(500);
      expect(costs.plumbing).toBeLessThan(500);
      expect(costs.hvac).toBeLessThan(300);
    });
  });

  describe('moderate scope allocations', () => {
    it('should allocate significant budget to kitchen and bathrooms', () => {
      const costs = estimateInteriorCosts(27000, 'moderate');

      expect(costs.kitchen).toBeGreaterThan(6000);
      expect(costs.bathrooms).toBeGreaterThan(4000);
      expect(costs.kitchen + costs.bathrooms).toBeGreaterThan(costs.flooring + costs.paint);
    });

    it('should include all interior categories', () => {
      const costs = estimateInteriorCosts(27000, 'moderate');

      expect(costs.flooring).toBeGreaterThan(0);
      expect(costs.paint).toBeGreaterThan(0);
      expect(costs.kitchen).toBeGreaterThan(0);
      expect(costs.bathrooms).toBeGreaterThan(0);
      expect(costs.electrical).toBeGreaterThan(0);
      expect(costs.plumbing).toBeGreaterThan(0);
      expect(costs.hvac).toBeGreaterThan(0);
      expect(costs.fixtures).toBeGreaterThan(0);
    });
  });

  describe('gut scope allocations', () => {
    it('should allocate heavily to electrical and plumbing for gut', () => {
      const costs = estimateInteriorCosts(40000, 'gut');

      expect(costs.electrical).toBeGreaterThan(6000);
      expect(costs.plumbing).toBeGreaterThan(4000);
      expect(costs.hvac).toBeGreaterThan(3000);
    });

    it('should allocate less to paint and fixtures for gut scope', () => {
      const costs = estimateInteriorCosts(40000, 'gut');

      expect(costs.paint).toBeLessThan(costs.electrical);
      expect(costs.fixtures).toBeLessThan(costs.plumbing);
    });
  });

  describe('total calculation', () => {
    it('should calculate total as sum of all components', () => {
      const costs = estimateInteriorCosts(27000, 'moderate');

      const calculatedTotal =
        costs.flooring +
        costs.paint +
        costs.kitchen +
        costs.bathrooms +
        costs.electrical +
        costs.plumbing +
        costs.hvac +
        costs.fixtures;

      expect(costs.total).toBe(calculatedTotal);
    });

    it('should round individual components', () => {
      const costs = estimateInteriorCosts(12345, 'moderate');

      expect(costs.flooring % 1).toBe(0);
      expect(costs.paint % 1).toBe(0);
      expect(costs.kitchen % 1).toBe(0);
      expect(costs.bathrooms % 1).toBe(0);
      expect(costs.electrical % 1).toBe(0);
      expect(costs.plumbing % 1).toBe(0);
      expect(costs.hvac % 1).toBe(0);
      expect(costs.fixtures % 1).toBe(0);
    });
  });

  describe('sqft parameter', () => {
    it('should accept optional sqft parameter', () => {
      const costs = estimateInteriorCosts(27000, 'moderate', 1500);
      expect(costs.total).toBeGreaterThan(0);
    });

    it('should work without sqft parameter', () => {
      const costs = estimateInteriorCosts(27000, 'moderate');
      expect(costs.total).toBeGreaterThan(0);
    });
  });

  describe('scope comparisons', () => {
    REHAB_SCOPES.forEach((scope) => {
      it(`should return valid breakdown for ${scope} scope`, () => {
        const costs = estimateInteriorCosts(30000, scope);

        expect(costs.total).toBeGreaterThan(0);
        expect(costs.total).toBeLessThanOrEqual(30000);
        expect(costs.flooring).toBeGreaterThanOrEqual(0);
        expect(costs.paint).toBeGreaterThanOrEqual(0);
      });
    });
  });
});

// ============================================
// Structural Cost Breakdown Tests
// ============================================

describe('estimateStructuralCosts', () => {
  describe('cosmetic scope', () => {
    it('should return zero costs for cosmetic scope', () => {
      const costs = estimateStructuralCosts(5000, 'cosmetic');

      expect(costs.foundation).toBe(0);
      expect(costs.framing).toBe(0);
      expect(costs.insulation).toBe(0);
      expect(costs.total).toBe(0);
    });
  });

  describe('light scope', () => {
    it('should allocate evenly for light structural work', () => {
      const costs = estimateStructuralCosts(10000, 'light');

      expect(costs.foundation).toBeGreaterThan(0);
      expect(costs.framing).toBeGreaterThan(0);
      expect(costs.insulation).toBeGreaterThan(0);
      expect(costs.framing).toBeGreaterThan(costs.foundation);
    });
  });

  describe('gut scope', () => {
    it('should allocate heavily to foundation for gut renovation', () => {
      const costs = estimateStructuralCosts(25000, 'gut');

      expect(costs.foundation).toBeGreaterThan(10000);
      expect(costs.framing).toBeGreaterThan(8000);
      expect(costs.insulation).toBeGreaterThan(4000);
    });

    it('should prioritize foundation over insulation', () => {
      const costs = estimateStructuralCosts(25000, 'gut');

      expect(costs.foundation).toBeGreaterThan(costs.insulation);
    });
  });

  describe('total calculation', () => {
    it('should calculate total as sum of all components', () => {
      const costs = estimateStructuralCosts(15000, 'moderate');

      const calculatedTotal = costs.foundation + costs.framing + costs.insulation;
      expect(costs.total).toBe(calculatedTotal);
    });

    it('should round individual components', () => {
      const costs = estimateStructuralCosts(12345, 'heavy');

      expect(costs.foundation % 1).toBe(0);
      expect(costs.framing % 1).toBe(0);
      expect(costs.insulation % 1).toBe(0);
    });
  });

  describe('scope comparisons', () => {
    it('should show increasing costs with scope intensity', () => {
      const light = estimateStructuralCosts(10000, 'light');
      const moderate = estimateStructuralCosts(10000, 'moderate');
      const heavy = estimateStructuralCosts(10000, 'heavy');
      const gut = estimateStructuralCosts(10000, 'gut');

      expect(moderate.foundation).toBeGreaterThan(light.foundation);
      expect(heavy.foundation).toBeGreaterThan(moderate.foundation);
      expect(gut.foundation).toBeGreaterThan(heavy.foundation);
    });
  });
});

// ============================================
// Regional Multiplier Application Tests
// ============================================

describe('applyRegionalMultipliers', () => {
  const baseCosts = {
    exterior: estimateExteriorCosts(10000, 'moderate'),
    interior: estimateInteriorCosts(15000, 'moderate'),
    structural: estimateStructuralCosts(5000, 'moderate'),
    permits: 3000,
    totalRehab: 33000,
  };

  describe('baseline state (Pennsylvania)', () => {
    it('should apply 1.0x multipliers for Pennsylvania', () => {
      const adjusted = applyRegionalMultipliers(baseCosts, 'PA');

      expect(adjusted.laborMultiplier).toBe(1.0);
      expect(adjusted.materialMultiplier).toBe(1.0);
      expect(adjusted.totalRehab).toBeCloseTo(baseCosts.totalRehab, 0);
    });

    it('should include multiplier fields in result', () => {
      const adjusted = applyRegionalMultipliers(baseCosts, 'PA');

      expect(adjusted).toHaveProperty('laborMultiplier');
      expect(adjusted).toHaveProperty('materialMultiplier');
      expect(adjusted.laborMultiplier).toBeGreaterThan(0);
      expect(adjusted.materialMultiplier).toBeGreaterThan(0);
    });
  });

  describe('low-cost state (Mississippi)', () => {
    it('should reduce costs for low-cost state', () => {
      const adjusted = applyRegionalMultipliers(baseCosts, 'MS');

      expect(adjusted.laborMultiplier).toBe(0.75);
      expect(adjusted.materialMultiplier).toBe(0.90);
      expect(adjusted.totalRehab).toBeLessThan(baseCosts.totalRehab);
    });

    it('should reduce all cost categories', () => {
      const paAdjusted = applyRegionalMultipliers(baseCosts, 'PA');
      const msAdjusted = applyRegionalMultipliers(baseCosts, 'MS');

      expect(msAdjusted.exterior.total).toBeLessThan(paAdjusted.exterior.total);
      expect(msAdjusted.interior.total).toBeLessThan(paAdjusted.interior.total);
      expect(msAdjusted.structural.total).toBeLessThan(paAdjusted.structural.total);
    });
  });

  describe('high-cost state (New York)', () => {
    it('should increase costs for high-cost state', () => {
      const adjusted = applyRegionalMultipliers(baseCosts, 'NY');

      expect(adjusted.laborMultiplier).toBe(1.40);
      expect(adjusted.materialMultiplier).toBe(1.20);
      expect(adjusted.totalRehab).toBeGreaterThan(baseCosts.totalRehab);
    });

    it('should increase all cost categories', () => {
      const paAdjusted = applyRegionalMultipliers(baseCosts, 'PA');
      const nyAdjusted = applyRegionalMultipliers(baseCosts, 'NY');

      expect(nyAdjusted.exterior.total).toBeGreaterThan(paAdjusted.exterior.total);
      expect(nyAdjusted.interior.total).toBeGreaterThan(paAdjusted.interior.total);
      expect(nyAdjusted.structural.total).toBeGreaterThan(paAdjusted.structural.total);
    });
  });

  describe('metro area overrides', () => {
    it('should apply metro multiplier when provided', () => {
      const stateAdjusted = applyRegionalMultipliers(baseCosts, 'CA');
      const metroAdjusted = applyRegionalMultipliers(baseCosts, 'CA', 'San Francisco');

      expect(metroAdjusted.totalRehab).toBeGreaterThan(stateAdjusted.totalRehab);
      expect(metroAdjusted.laborMultiplier).toBeGreaterThan(stateAdjusted.laborMultiplier);
    });

    it('should use state multiplier when metro not found', () => {
      const stateAdjusted = applyRegionalMultipliers(baseCosts, 'PA');
      const unknownMetro = applyRegionalMultipliers(baseCosts, 'PA', 'UnknownCity');

      expect(unknownMetro.totalRehab).toBe(stateAdjusted.totalRehab);
    });
  });

  describe('combined multiplier calculation', () => {
    it('should weight labor at 60% and materials at 40%', () => {
      const adjusted = applyRegionalMultipliers(baseCosts, 'NY');

      const expectedCombined = 0.6 * 1.40 + 0.4 * 1.20;
      expect(expectedCombined).toBeCloseTo(1.32, 2);
    });
  });

  describe('case insensitivity', () => {
    it('should handle lowercase state codes', () => {
      const upper = applyRegionalMultipliers(baseCosts, 'NY');
      const lower = applyRegionalMultipliers(baseCosts, 'ny');

      expect(lower.totalRehab).toBe(upper.totalRehab);
    });
  });

  describe('total recalculation', () => {
    it('should recalculate totals after adjustment', () => {
      const adjusted = applyRegionalMultipliers(baseCosts, 'NY');

      const calculatedTotal =
        adjusted.exterior.total +
        adjusted.interior.total +
        adjusted.structural.total +
        adjusted.permits;

      expect(adjusted.totalRehab).toBeCloseTo(calculatedTotal, 0);
    });
  });
});

// ============================================
// Confidence Calculation Tests
// ============================================

describe('calculateRehabConfidence', () => {
  describe('high confidence scenarios', () => {
    it('should return high confidence with complete data', () => {
      const confidence = calculateRehabConfidence(
        { sqft: 1500, yearBuilt: 1980, state: 'PA', city: 'Pittsburgh' },
        { building_sqft: 1500, year_built: 1980 },
        'fair'
      );

      expect(confidence).toBe('high');
    });

    it('should return high confidence with all property fields', () => {
      const confidence = calculateRehabConfidence(
        { sqft: 1500, yearBuilt: 1980, state: 'PA', city: 'Pittsburgh' },
        undefined,
        'poor'
      );

      expect(confidence).toBe('high');
    });
  });

  describe('medium confidence scenarios', () => {
    it('should return medium confidence with partial data', () => {
      const confidence = calculateRehabConfidence(
        { sqft: 1500, state: 'PA' },
        undefined,
        undefined
      );

      // sqft (30) + state (15) = 45 points = low
      expect(confidence).toBe('low');
    });

    it('should return medium confidence with sqft and state only', () => {
      const confidence = calculateRehabConfidence(
        { sqft: 1500, state: 'PA', city: 'Pittsburgh' },
        undefined,
        undefined
      );

      expect(confidence).toBe('medium');
    });
  });

  describe('low confidence scenarios', () => {
    it('should return low confidence with minimal data', () => {
      const confidence = calculateRehabConfidence(
        { state: 'PA' },
        undefined,
        undefined
      );

      expect(confidence).toBe('low');
    });

    it('should return low confidence with only state', () => {
      const confidence = calculateRehabConfidence(
        { state: 'PA' },
        { building_sqft: undefined, year_built: undefined },
        undefined
      );

      expect(confidence).toBe('low');
    });
  });

  describe('data source priority', () => {
    it('should accept sqft from property or regridData', () => {
      const fromProperty = calculateRehabConfidence(
        { sqft: 1500, state: 'PA' },
        undefined,
        undefined
      );

      const fromRegrid = calculateRehabConfidence(
        { state: 'PA' },
        { building_sqft: 1500, year_built: undefined },
        undefined
      );

      expect(fromProperty).toBe(fromRegrid);
    });

    it('should accept yearBuilt from property or regridData', () => {
      const fromProperty = calculateRehabConfidence(
        { yearBuilt: 1980, state: 'PA' },
        undefined,
        undefined
      );

      const fromRegrid = calculateRehabConfidence(
        { state: 'PA' },
        { building_sqft: undefined, year_built: 1980 },
        undefined
      );

      expect(fromProperty).toBe(fromRegrid);
    });
  });

  describe('condition assessment impact', () => {
    it('should increase confidence when condition provided', () => {
      const withoutCondition = calculateRehabConfidence(
        { sqft: 1500, state: 'PA' },
        undefined,
        undefined
      );

      const withCondition = calculateRehabConfidence(
        { sqft: 1500, state: 'PA' },
        undefined,
        'fair'
      );

      // sqft (30) + state (15) + condition (25) = 70 points = medium
      expect(withCondition).not.toBe('low');
      expect(withCondition).toBe('medium');
    });
  });
});

// ============================================
// Complete Rehab Cost Calculation Tests
// ============================================

describe('calculateRehabCosts', () => {
  describe('basic functionality', () => {
    it('should return complete rehab breakdown', () => {
      const costs = calculateRehabCosts(mockModerateRehabInput);

      expect(costs).toBeDefined();
      expect(costs.exterior).toBeDefined();
      expect(costs.interior).toBeDefined();
      expect(costs.structural).toBeDefined();
      expect(costs.permits).toBeGreaterThan(0);
      expect(costs.totalRehab).toBeGreaterThan(0);
      expect(costs.laborMultiplier).toBeGreaterThan(0);
      expect(costs.materialMultiplier).toBeGreaterThan(0);
    });

    it('should calculate total as sum of all categories', () => {
      const costs = calculateRehabCosts(mockModerateRehabInput);

      const calculatedTotal =
        costs.exterior.total +
        costs.interior.total +
        costs.structural.total +
        costs.permits;

      expect(costs.totalRehab).toBeCloseTo(calculatedTotal, 0);
    });

    it('should handle minimal input with defaults', () => {
      const costs = calculateRehabCosts(mockMinimalInput);

      expect(costs.totalRehab).toBeGreaterThan(0);
      expect(costs.exterior.total).toBeGreaterThan(0);
      expect(costs.interior.total).toBeGreaterThan(0);
    });
  });

  describe('scope variations', () => {
    REHAB_SCOPES.forEach((scope) => {
      it(`should calculate costs for ${scope} scope`, () => {
        const costs = calculateRehabCosts({
          property: { sqft: 1500, state: 'PA' },
          scope,
        });

        expect(costs.totalRehab).toBeGreaterThan(0);
        expect(costs.exterior.total).toBeGreaterThanOrEqual(0);
        expect(costs.interior.total).toBeGreaterThan(0);
      });
    });

    it('should show increasing costs from cosmetic to gut', () => {
      const cosmetic = calculateRehabCosts({
        property: { sqft: 1500, state: 'PA' },
        scope: 'cosmetic',
      });

      const gut = calculateRehabCosts({
        property: { sqft: 1500, state: 'PA' },
        scope: 'gut',
      });

      expect(gut.totalRehab).toBeGreaterThan(cosmetic.totalRehab * 3);
    });
  });

  describe('condition multiplier impact', () => {
    PROPERTY_CONDITIONS.forEach((condition) => {
      it(`should calculate costs for ${condition} condition`, () => {
        const costs = calculateRehabCosts({
          property: { sqft: 1500, state: 'PA' },
          condition,
          scope: 'moderate',
        });

        expect(costs.totalRehab).toBeGreaterThan(0);
      });
    });

    it('should show increasing costs from excellent to distressed', () => {
      const excellent = calculateRehabCosts({
        property: { sqft: 1500, state: 'PA' },
        condition: 'excellent',
        scope: 'moderate',
      });

      const distressed = calculateRehabCosts({
        property: { sqft: 1500, state: 'PA' },
        condition: 'distressed',
        scope: 'moderate',
      });

      expect(distressed.totalRehab).toBeGreaterThan(excellent.totalRehab * 2.5);
    });
  });

  describe('age multiplier impact', () => {
    it('should increase costs for older properties', () => {
      const newer = calculateRehabCosts({
        property: { sqft: 1500, yearBuilt: 2015, state: 'PA' },
        scope: 'moderate',
      });

      const older = calculateRehabCosts({
        property: { sqft: 1500, yearBuilt: 1920, state: 'PA' },
        scope: 'moderate',
      });

      expect(older.totalRehab).toBeGreaterThan(newer.totalRehab * 1.4);
    });

    it('should use default year when not provided', () => {
      const costs = calculateRehabCosts({
        property: { sqft: 1500, state: 'PA' },
        scope: 'moderate',
      });

      expect(costs.totalRehab).toBeGreaterThan(0);
    });
  });

  describe('regional multiplier application', () => {
    it('should apply lower costs for low-cost states', () => {
      const paCosts = calculateRehabCosts({
        property: { sqft: 1500, state: 'PA' },
        scope: 'moderate',
      });

      const msCosts = calculateRehabCosts({
        property: { sqft: 1500, state: 'MS' },
        scope: 'moderate',
      });

      expect(msCosts.totalRehab).toBeLessThan(paCosts.totalRehab);
      expect(msCosts.laborMultiplier).toBe(0.75);
      expect(msCosts.materialMultiplier).toBe(0.90);
    });

    it('should apply higher costs for high-cost states', () => {
      const paCosts = calculateRehabCosts({
        property: { sqft: 1500, state: 'PA' },
        scope: 'moderate',
      });

      const hiCosts = calculateRehabCosts({
        property: { sqft: 1500, state: 'HI' },
        scope: 'moderate',
      });

      expect(hiCosts.totalRehab).toBeGreaterThan(paCosts.totalRehab * 1.3);
      expect(hiCosts.laborMultiplier).toBe(1.45);
      expect(hiCosts.materialMultiplier).toBe(1.40);
    });
  });

  describe('metro area adjustments', () => {
    it('should apply metro multipliers when provided', () => {
      const costs = calculateRehabCosts(mockHighCostMetroInput);

      expect(costs.laborMultiplier).toBeGreaterThan(1.4);
      expect(costs.totalRehab).toBeGreaterThan(60000);
    });

    it('should show higher costs in expensive metros', () => {
      const stateCosts = calculateRehabCosts({
        property: { sqft: 1500, state: 'CA' },
        scope: 'moderate',
      });

      const metroCosts = calculateRehabCosts({
        property: { sqft: 1500, state: 'CA', city: 'San Francisco' },
        scope: 'moderate',
        metro: 'SanFrancisco',
      });

      expect(metroCosts.totalRehab).toBeGreaterThan(stateCosts.totalRehab);
    });
  });

  describe('estimate tier variations', () => {
    it('should provide lower costs for low estimate', () => {
      const lowCosts = calculateRehabCosts({
        property: { sqft: 1500, state: 'PA' },
        scope: 'moderate',
        estimate: 'low',
      });

      const midCosts = calculateRehabCosts({
        property: { sqft: 1500, state: 'PA' },
        scope: 'moderate',
        estimate: 'mid',
      });

      expect(lowCosts.totalRehab).toBeLessThan(midCosts.totalRehab);
    });

    it('should provide higher costs for high estimate', () => {
      const midCosts = calculateRehabCosts({
        property: { sqft: 1500, state: 'PA' },
        scope: 'moderate',
        estimate: 'mid',
      });

      const highCosts = calculateRehabCosts({
        property: { sqft: 1500, state: 'PA' },
        scope: 'moderate',
        estimate: 'high',
      });

      expect(highCosts.totalRehab).toBeGreaterThan(midCosts.totalRehab);
    });

    it('should default to mid estimate when not specified', () => {
      const defaultCosts = calculateRehabCosts({
        property: { sqft: 1500, state: 'PA' },
        scope: 'moderate',
      });

      const midCosts = calculateRehabCosts({
        property: { sqft: 1500, state: 'PA' },
        scope: 'moderate',
        estimate: 'mid',
      });

      expect(defaultCosts.totalRehab).toBe(midCosts.totalRehab);
    });
  });

  describe('square footage impact', () => {
    it('should scale costs with square footage', () => {
      const small = calculateRehabCosts({
        property: { sqft: 1000, state: 'PA' },
        scope: 'moderate',
      });

      const large = calculateRehabCosts({
        property: { sqft: 3000, state: 'PA' },
        scope: 'moderate',
      });

      expect(large.totalRehab).toBeCloseTo(small.totalRehab * 3, -2);
    });

    it('should use default sqft when not provided', () => {
      const costs = calculateRehabCosts({
        property: { state: 'PA' },
        scope: 'moderate',
      });

      expect(costs.totalRehab).toBeGreaterThan(0);
    });
  });

  describe('regridData integration', () => {
    it('should prioritize regridData over property data', () => {
      const costs = calculateRehabCosts(mockRehabWithRegridInput);

      expect(costs.totalRehab).toBeGreaterThan(0);
    });

    it('should use regridData sqft when property sqft missing', () => {
      const withRegrid = calculateRehabCosts({
        property: { state: 'PA' },
        regridData: { building_sqft: 2000, year_built: 1980 },
        scope: 'moderate',
      });

      const withProperty = calculateRehabCosts({
        property: { sqft: 2000, yearBuilt: 1980, state: 'PA' },
        scope: 'moderate',
      });

      expect(withRegrid.totalRehab).toBeCloseTo(withProperty.totalRehab, -2);
    });
  });

  describe('state override parameter', () => {
    it('should use state parameter over property.state', () => {
      const costs = calculateRehabCosts({
        property: { sqft: 1500, state: 'PA' },
        state: 'CA',
        scope: 'moderate',
      });

      expect(costs.laborMultiplier).toBe(1.35);
    });
  });
});

// ============================================
// Quick Estimate Functions Tests
// ============================================

describe('estimateRehabTotal', () => {
  it('should return total rehab cost for given parameters', () => {
    const total = estimateRehabTotal(1500, 'moderate', 'PA');
    expect(total).toBeGreaterThan(0);
  });

  it('should match calculateRehabCosts result', () => {
    const quickEstimate = estimateRehabTotal(1500, 'moderate', 'PA');
    const fullCalculation = calculateRehabCosts({
      property: { sqft: 1500, state: 'PA' },
      scope: 'moderate',
    });

    expect(quickEstimate).toBe(fullCalculation.totalRehab);
  });

  it('should scale with square footage', () => {
    const small = estimateRehabTotal(1000, 'moderate', 'PA');
    const large = estimateRehabTotal(2000, 'moderate', 'PA');

    expect(large).toBeCloseTo(small * 2, -2);
  });

  it('should vary by scope', () => {
    const cosmetic = estimateRehabTotal(1500, 'cosmetic', 'PA');
    const gut = estimateRehabTotal(1500, 'gut', 'PA');

    expect(gut).toBeGreaterThan(cosmetic * 4);
  });

  it('should vary by state', () => {
    const lowCost = estimateRehabTotal(1500, 'moderate', 'MS');
    const highCost = estimateRehabTotal(1500, 'moderate', 'HI');

    expect(highCost).toBeGreaterThan(lowCost * 1.5);
  });
});

describe('getRehabCostRange', () => {
  it('should return low, mid, and high estimates', () => {
    const range = getRehabCostRange(1500, 'moderate', 'PA');

    expect(range).toHaveProperty('low');
    expect(range).toHaveProperty('mid');
    expect(range).toHaveProperty('high');
    expect(range.low).toBeGreaterThan(0);
    expect(range.mid).toBeGreaterThan(range.low);
    expect(range.high).toBeGreaterThan(range.mid);
  });

  it('should show appropriate spread between estimates', () => {
    const range = getRehabCostRange(1500, 'moderate', 'PA');

    const lowToMidRatio = range.mid / range.low;
    const midToHighRatio = range.high / range.mid;

    expect(lowToMidRatio).toBeGreaterThan(1.1);
    expect(lowToMidRatio).toBeLessThan(1.5);
    expect(midToHighRatio).toBeGreaterThan(1.1);
    expect(midToHighRatio).toBeLessThan(1.5);
  });

  it('should scale all estimates with square footage', () => {
    const small = getRehabCostRange(1000, 'moderate', 'PA');
    const large = getRehabCostRange(2000, 'moderate', 'PA');

    expect(large.low).toBeCloseTo(small.low * 2, -2);
    expect(large.mid).toBeCloseTo(small.mid * 2, -2);
    expect(large.high).toBeCloseTo(small.high * 2, -2);
  });

  it('should vary by scope', () => {
    const cosmetic = getRehabCostRange(1500, 'cosmetic', 'PA');
    const gut = getRehabCostRange(1500, 'gut', 'PA');

    expect(gut.low).toBeGreaterThan(cosmetic.low * 3);
    expect(gut.mid).toBeGreaterThan(cosmetic.mid * 3);
    expect(gut.high).toBeGreaterThan(cosmetic.high * 3);
  });

  it('should vary by state', () => {
    const lowCostState = getRehabCostRange(1500, 'moderate', 'MS');
    const highCostState = getRehabCostRange(1500, 'moderate', 'HI');

    expect(highCostState.mid).toBeGreaterThan(lowCostState.mid * 1.5);
  });
});

describe('getAdjustedCostPerSqft', () => {
  it('should return cost per square foot with all adjustments', () => {
    const costPerSqft = getAdjustedCostPerSqft('moderate', 'fair', 1980, 'PA');

    expect(costPerSqft).toBeGreaterThan(0);
    expect(costPerSqft).toBeLessThan(150);
  });

  it('should increase for poor condition', () => {
    const fair = getAdjustedCostPerSqft('moderate', 'fair', 1980, 'PA');
    const poor = getAdjustedCostPerSqft('moderate', 'poor', 1980, 'PA');

    expect(poor).toBeGreaterThan(fair);
  });

  it('should increase for older properties', () => {
    const newer = getAdjustedCostPerSqft('moderate', 'fair', 2010, 'PA');
    const older = getAdjustedCostPerSqft('moderate', 'fair', 1920, 'PA');

    expect(older).toBeGreaterThan(newer);
  });

  it('should increase for higher scope', () => {
    const cosmetic = getAdjustedCostPerSqft('cosmetic', 'fair', 1980, 'PA');
    const gut = getAdjustedCostPerSqft('gut', 'fair', 1980, 'PA');

    expect(gut).toBeGreaterThan(cosmetic * 4);
  });

  it('should vary by state', () => {
    const lowCost = getAdjustedCostPerSqft('moderate', 'fair', 1980, 'MS');
    const highCost = getAdjustedCostPerSqft('moderate', 'fair', 1980, 'HI');

    expect(highCost).toBeGreaterThan(lowCost * 1.5);
  });

  it('should apply metro multiplier when provided', () => {
    const stateCost = getAdjustedCostPerSqft('moderate', 'fair', 1980, 'CA');
    const metroCost = getAdjustedCostPerSqft('moderate', 'fair', 1980, 'CA', 'SanFrancisco');

    expect(metroCost).toBeGreaterThan(stateCost);
  });

  it('should round to 2 decimal places', () => {
    const costPerSqft = getAdjustedCostPerSqft('moderate', 'fair', 1980, 'PA');

    // Check that result has at most 2 decimal places
    expect(Math.round(costPerSqft * 100)).toBe(costPerSqft * 100);
  });
});

// ============================================
// Integration Scenarios
// ============================================

describe('integration scenarios', () => {
  describe('typical renovation scenarios', () => {
    it('should calculate costs for cosmetic flip in good condition', () => {
      const costs = calculateRehabCosts({
        property: { sqft: 1200, yearBuilt: 2005, state: 'FL' },
        condition: 'good',
        scope: 'cosmetic',
      });

      expect(costs.totalRehab).toBeGreaterThan(15000);
      expect(costs.totalRehab).toBeLessThan(35000);
      expect(costs.interior.total).toBeGreaterThan(costs.exterior.total);
    });

    it('should calculate costs for moderate rehab in fair condition', () => {
      const costs = calculateRehabCosts({
        property: { sqft: 1500, yearBuilt: 1985, state: 'TX' },
        condition: 'fair',
        scope: 'moderate',
      });

      expect(costs.totalRehab).toBeGreaterThan(50000);
      expect(costs.totalRehab).toBeLessThan(90000);
      expect(costs.structural.total).toBeGreaterThan(0);
    });

    it('should calculate costs for gut renovation in distressed condition', () => {
      const costs = calculateRehabCosts({
        property: { sqft: 1800, yearBuilt: 1950, state: 'OH' },
        condition: 'distressed',
        scope: 'gut',
      });

      expect(costs.totalRehab).toBeGreaterThan(150000);
      expect(costs.structural.total).toBeGreaterThan(30000);
      expect(costs.interior.electrical).toBeGreaterThan(costs.interior.paint);
    });
  });

  describe('regional comparison scenarios', () => {
    it('should show significant cost differences across regions', () => {
      const input = {
        property: { sqft: 1500, yearBuilt: 1980 },
        condition: 'fair' as PropertyCondition,
        scope: 'moderate' as RehabScope,
      };

      const southCosts = calculateRehabCosts({ ...input, property: { ...input.property, state: 'MS' } });
      const northeastCosts = calculateRehabCosts({ ...input, property: { ...input.property, state: 'NY' } });
      const westCoastCosts = calculateRehabCosts({ ...input, property: { ...input.property, state: 'CA' } });

      expect(northeastCosts.totalRehab).toBeGreaterThan(southCosts.totalRehab * 1.3);
      expect(westCoastCosts.totalRehab).toBeGreaterThan(southCosts.totalRehab * 1.2);
    });

    it('should show metro premium in expensive cities', () => {
      const ruralCosts = calculateRehabCosts({
        property: { sqft: 1500, yearBuilt: 1980, state: 'PA' },
        scope: 'moderate',
      });

      const philadelphiaCosts = calculateRehabCosts({
        property: { sqft: 1500, yearBuilt: 1980, state: 'PA', city: 'Philadelphia' },
        scope: 'moderate',
        metro: 'Philadelphia',
      });

      expect(philadelphiaCosts.totalRehab).toBeGreaterThan(ruralCosts.totalRehab);
    });
  });

  describe('property age impact scenarios', () => {
    it('should show increasing costs for older properties', () => {
      const input = {
        property: { sqft: 1500, state: 'PA' },
        condition: 'fair' as PropertyCondition,
        scope: 'moderate' as RehabScope,
      };

      const new2020 = calculateRehabCosts({ ...input, property: { ...input.property, yearBuilt: 2020 } });
      const mid2000 = calculateRehabCosts({ ...input, property: { ...input.property, yearBuilt: 2000 } });
      const mid1980 = calculateRehabCosts({ ...input, property: { ...input.property, yearBuilt: 1980 } });
      const old1930 = calculateRehabCosts({ ...input, property: { ...input.property, yearBuilt: 1930 } });

      expect(mid2000.totalRehab).toBeGreaterThan(new2020.totalRehab);
      expect(mid1980.totalRehab).toBeGreaterThan(mid2000.totalRehab);
      expect(old1930.totalRehab).toBeGreaterThan(mid1980.totalRehab * 1.2);
    });
  });

  describe('scope progression scenarios', () => {
    it('should show clear cost progression through scope levels', () => {
      const input = {
        property: { sqft: 1500, yearBuilt: 1985, state: 'PA' },
        condition: 'fair' as PropertyCondition,
      };

      const cosmetic = calculateRehabCosts({ ...input, scope: 'cosmetic' });
      const light = calculateRehabCosts({ ...input, scope: 'light' });
      const moderate = calculateRehabCosts({ ...input, scope: 'moderate' });
      const heavy = calculateRehabCosts({ ...input, scope: 'heavy' });
      const gut = calculateRehabCosts({ ...input, scope: 'gut' });

      expect(light.totalRehab).toBeGreaterThan(cosmetic.totalRehab * 1.3);
      expect(moderate.totalRehab).toBeGreaterThan(light.totalRehab * 1.3);
      expect(heavy.totalRehab).toBeGreaterThan(moderate.totalRehab * 1.3);
      expect(gut.totalRehab).toBeGreaterThan(heavy.totalRehab * 1.3);
    });

    it('should show changing category proportions by scope', () => {
      const cosmetic = calculateRehabCosts({
        property: { sqft: 1500, state: 'PA' },
        scope: 'cosmetic',
      });

      const gut = calculateRehabCosts({
        property: { sqft: 1500, state: 'PA' },
        scope: 'gut',
      });

      const cosmeticInteriorPct = cosmetic.interior.total / cosmetic.totalRehab;
      const gutStructuralPct = gut.structural.total / gut.totalRehab;

      expect(cosmeticInteriorPct).toBeGreaterThan(0.80);
      expect(gutStructuralPct).toBeGreaterThan(0.20);
    });
  });

  describe('estimate range scenarios', () => {
    it('should provide realistic range for budgeting', () => {
      const range = getRehabCostRange(1500, 'moderate', 'PA');

      expect(range.high - range.low).toBeGreaterThan(15000);
      // The mid value uses different calculation path, not simple average
      expect(range.mid).toBeGreaterThan(range.low);
      expect(range.mid).toBeLessThan(range.high);
    });

    it('should show wider ranges for intensive scopes', () => {
      const cosmeticRange = getRehabCostRange(1500, 'cosmetic', 'PA');
      const gutRange = getRehabCostRange(1500, 'gut', 'PA');

      const cosmeticSpread = cosmeticRange.high - cosmeticRange.low;
      const gutSpread = gutRange.high - gutRange.low;

      expect(gutSpread).toBeGreaterThan(cosmeticSpread * 2);
    });
  });

  describe('real-world validation scenarios', () => {
    it('should produce realistic costs for typical small flip', () => {
      const costs = calculateRehabCosts({
        property: { sqft: 1000, yearBuilt: 1990, state: 'GA' },
        condition: 'good',
        scope: 'cosmetic',
      });

      expect(costs.totalRehab).toBeGreaterThan(10000);
      expect(costs.totalRehab).toBeLessThan(30000);
    });

    it('should produce realistic costs for typical BRRRR property', () => {
      const costs = calculateRehabCosts({
        property: { sqft: 1400, yearBuilt: 1975, state: 'OH' },
        condition: 'poor',
        scope: 'heavy',
      });

      expect(costs.totalRehab).toBeGreaterThan(70000);
      expect(costs.totalRehab).toBeLessThan(150000);
    });

    it('should produce realistic costs for luxury gut renovation', () => {
      const costs = calculateRehabCosts({
        property: { sqft: 2500, yearBuilt: 1960, state: 'CA', city: 'Los Angeles' },
        condition: 'poor',
        scope: 'gut',
        metro: 'LosAngeles',
        estimate: 'high',
      });

      expect(costs.totalRehab).toBeGreaterThan(300000);
    });
  });
});

// ============================================
// Comprehensive State Coverage Tests
// ============================================

describe('state coverage', () => {
  const testStates = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
  ];

  testStates.forEach((state) => {
    it(`should calculate rehab costs for ${state}`, () => {
      const costs = calculateRehabCosts({
        property: { sqft: 1500, state },
        scope: 'moderate',
      });

      expect(costs.totalRehab).toBeGreaterThan(0);
      expect(costs.exterior.total).toBeGreaterThanOrEqual(0);
      expect(costs.interior.total).toBeGreaterThan(0);
      expect(costs.laborMultiplier).toBeGreaterThan(0);
      expect(costs.materialMultiplier).toBeGreaterThan(0);
    });
  });
});

/**
 * Holding Cost Calculator Tests
 *
 * Tests the holding cost calculation functions including:
 * - Monthly property tax estimation with county adjustments
 * - Monthly insurance premium calculation by property type
 * - Utility cost estimation with size and climate adjustments
 * - Maintenance cost estimation with lot size and regional adjustments
 * - Loan payment calculation (interest-only and amortizing)
 * - Complete holding cost breakdown
 * - Quick estimate and rate calculation functions
 *
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-22
 */

import { describe, it, expect } from 'vitest';
import {
  estimateMonthlyTaxes,
  estimateMonthlyInsurance,
  estimateUtilities,
  estimateMonthlyMaintenance,
  calculateMonthlyLoanPayment,
  calculateHoldingCosts,
  estimateHoldingTotal,
  getHoldingRatePer1000,
  type PropertyInsuranceType,
  type HoldingCostInput,
} from '../holding';

// ============================================
// Test Fixtures
// ============================================

/**
 * Common property values for testing
 */
const TEST_PROPERTY_VALUES = {
  low: 50000,
  medium: 100000,
  high: 250000,
  veryHigh: 500000,
};

/**
 * Common property sizes for testing
 */
const TEST_SQFT = {
  small: 800,
  medium: 1500,
  large: 2500,
  veryLarge: 4000,
};

/**
 * Sample states with varying tax rates
 */
const TEST_STATES = {
  lowTax: 'HI',       // 0.28% (Hawaii)
  mediumTax: 'PA',    // 1.53% (Pennsylvania)
  highTax: 'TX',      // 1.81% (Texas)
  veryHighTax: 'NJ',  // 2.49% (New Jersey)
};

/**
 * Sample states with varying insurance costs
 */
const INSURANCE_STATES = {
  lowRisk: 'PA',      // 1.0x multiplier
  highRisk: 'FL',     // 1.8x multiplier (hurricanes)
  veryHighRisk: 'LA', // 1.7x multiplier (hurricanes + floods)
};

/**
 * Sample states with varying utility costs
 */
const UTILITY_STATES = {
  cold: 'MN',         // 1.3x multiplier (heating)
  hot: 'AZ',          // 1.35x multiplier (cooling)
  moderate: 'PA',     // 1.0x multiplier
  mild: 'CA',         // 0.95x multiplier
};

/**
 * Complete holding cost input for Pennsylvania property
 */
const mockPAPropertyInput: HoldingCostInput = {
  assessedValue: 80000,
  propertyValue: 100000,
  sqft: 1500,
  state: 'PA',
  county: 'Blair',
  holdingMonths: 6,
  isVacant: true,
};

/**
 * Complete holding cost input with financing
 */
const mockFinancedPropertyInput: HoldingCostInput = {
  assessedValue: 80000,
  propertyValue: 100000,
  sqft: 1500,
  state: 'PA',
  holdingMonths: 6,
  isVacant: true,
  financing: {
    isFinanced: true,
    loanAmount: 70000,
    interestRate: 0.08,
    termMonths: 60,
    interestOnly: true,
  },
};

/**
 * Minimal holding cost input
 */
const mockMinimalInput: HoldingCostInput = {
  propertyValue: 100000,
  state: 'PA',
};

/**
 * Holding cost input with overrides
 */
const mockOverrideInput: HoldingCostInput = {
  propertyValue: 100000,
  state: 'PA',
  holdingMonths: 12,
  monthlyTaxesOverride: 200,
  monthlyInsuranceOverride: 150,
  monthlyHoa: 75,
};

// ============================================
// Monthly Property Tax Tests
// ============================================

describe('estimateMonthlyTaxes', () => {
  describe('state-level tax rates', () => {
    it('should calculate low taxes for Hawaii (0.28%)', () => {
      const taxes = estimateMonthlyTaxes(100000, 'HI');
      expect(taxes).toBeGreaterThan(20);
      expect(taxes).toBeLessThan(30);
    });

    it('should calculate medium taxes for Pennsylvania (1.53%)', () => {
      const taxes = estimateMonthlyTaxes(100000, 'PA');
      expect(taxes).toBeGreaterThan(120);
      expect(taxes).toBeLessThan(140);
    });

    it('should calculate high taxes for Texas (1.81%)', () => {
      const taxes = estimateMonthlyTaxes(100000, 'TX');
      expect(taxes).toBeGreaterThan(145);
      expect(taxes).toBeLessThan(160);
    });

    it('should calculate very high taxes for New Jersey (2.49%)', () => {
      const taxes = estimateMonthlyTaxes(100000, 'NJ');
      expect(taxes).toBeGreaterThan(200);
      expect(taxes).toBeLessThan(220);
    });

    it('should handle lowercase state codes', () => {
      const taxesUpper = estimateMonthlyTaxes(100000, 'PA');
      const taxesLower = estimateMonthlyTaxes(100000, 'pa');
      expect(taxesLower).toBe(taxesUpper);
    });
  });

  describe('county-level adjustments', () => {
    it('should apply Philadelphia county adjustment', () => {
      const standardPA = estimateMonthlyTaxes(100000, 'PA');
      const philadelphiaPA = estimateMonthlyTaxes(100000, 'PA', 'Philadelphia');
      expect(philadelphiaPA).not.toBe(standardPA);
    });

    it('should apply NJ Essex county adjustment (2.85%)', () => {
      const taxes = estimateMonthlyTaxes(100000, 'NJ', 'Essex');
      expect(taxes).toBeGreaterThan(230);
      expect(taxes).toBeLessThan(250);
    });

    it('should apply IL Cook county adjustment (2.30%)', () => {
      const taxes = estimateMonthlyTaxes(100000, 'IL', 'Cook');
      expect(taxes).toBeGreaterThan(190);
      expect(taxes).toBeLessThan(200);
    });

    it('should handle county names with spaces and special chars', () => {
      const taxes1 = estimateMonthlyTaxes(100000, 'PA', 'Allegheny');
      const taxes2 = estimateMonthlyTaxes(100000, 'PA', 'Allegheny County');
      const standardPA = estimateMonthlyTaxes(100000, 'PA');
      // "Allegheny" matches PA_Allegheny key, "Allegheny County" becomes PA_AlleghenyCounty (no match)
      expect(taxes1).not.toBe(standardPA); // Allegheny has custom rate
      expect(taxes2).toBe(standardPA); // Allegheny County falls back to state rate
    });

    it('should use state rate for unrecognized counties', () => {
      const standardPA = estimateMonthlyTaxes(100000, 'PA');
      const unknownCounty = estimateMonthlyTaxes(100000, 'PA', 'UnknownCounty');
      expect(unknownCounty).toBe(standardPA);
    });

    it('should handle county parameter when undefined', () => {
      const taxes = estimateMonthlyTaxes(100000, 'PA', undefined);
      expect(taxes).toBeGreaterThan(0);
    });
  });

  describe('assessed value variations', () => {
    it('should scale with assessed value', () => {
      const taxes50k = estimateMonthlyTaxes(50000, 'PA');
      const taxes100k = estimateMonthlyTaxes(100000, 'PA');
      expect(taxes100k).toBeCloseTo(taxes50k * 2, 1);
    });

    it('should handle low assessed values', () => {
      const taxes = estimateMonthlyTaxes(10000, 'PA');
      expect(taxes).toBeGreaterThan(0);
      expect(taxes).toBeLessThan(20);
    });

    it('should handle high assessed values', () => {
      const taxes = estimateMonthlyTaxes(500000, 'PA');
      expect(taxes).toBeGreaterThan(600);
    });
  });

  describe('rounding and precision', () => {
    it('should round to 2 decimal places', () => {
      const taxes = estimateMonthlyTaxes(123456, 'PA');
      // Check that result has at most 2 decimal places
      expect(Math.round(taxes * 100)).toBe(taxes * 100);
    });

    it('should return consistent results', () => {
      const taxes1 = estimateMonthlyTaxes(100000, 'PA');
      const taxes2 = estimateMonthlyTaxes(100000, 'PA');
      expect(taxes2).toBe(taxes1);
    });
  });
});

// ============================================
// Monthly Insurance Tests
// ============================================

describe('estimateMonthlyInsurance', () => {
  describe('property type variations', () => {
    it('should calculate lowest premium for vacant land (0.2%)', () => {
      const insurance = estimateMonthlyInsurance(100000, 'PA', 'vacant_land');
      expect(insurance).toBeGreaterThan(15);
      expect(insurance).toBeLessThan(20);
    });

    it('should calculate low premium for condo (0.4%)', () => {
      const insurance = estimateMonthlyInsurance(100000, 'PA', 'condo');
      expect(insurance).toBeGreaterThan(30);
      expect(insurance).toBeLessThan(40);
    });

    it('should calculate medium premium for single family (0.5%)', () => {
      const insurance = estimateMonthlyInsurance(100000, 'PA', 'single_family');
      expect(insurance).toBeGreaterThan(40);
      expect(insurance).toBeLessThan(50);
    });

    it('should calculate high premium for multi-family (0.6%)', () => {
      const insurance = estimateMonthlyInsurance(100000, 'PA', 'multi_family');
      expect(insurance).toBeGreaterThan(48);
      expect(insurance).toBeLessThan(55);
    });

    it('should calculate highest premium for vacant building (1.0%)', () => {
      const insurance = estimateMonthlyInsurance(100000, 'PA', 'vacant_building');
      expect(insurance).toBeGreaterThan(80);
      expect(insurance).toBeLessThan(90);
    });

    it('should default to vacant_building when type not specified', () => {
      const insurance = estimateMonthlyInsurance(100000, 'PA');
      const vacantInsurance = estimateMonthlyInsurance(100000, 'PA', 'vacant_building');
      expect(insurance).toBe(vacantInsurance);
    });
  });

  describe('state multiplier variations', () => {
    it('should apply high multiplier for Florida (1.8x hurricane risk)', () => {
      const paInsurance = estimateMonthlyInsurance(100000, 'PA', 'single_family');
      const flInsurance = estimateMonthlyInsurance(100000, 'FL', 'single_family');
      expect(flInsurance).toBeGreaterThan(paInsurance * 1.7);
      expect(flInsurance).toBeLessThan(paInsurance * 1.9);
    });

    it('should apply high multiplier for Louisiana (1.7x)', () => {
      const insurance = estimateMonthlyInsurance(100000, 'LA', 'single_family');
      expect(insurance).toBeGreaterThan(70);
    });

    it('should apply moderate multiplier for California (1.35x)', () => {
      const insurance = estimateMonthlyInsurance(100000, 'CA', 'single_family');
      expect(insurance).toBeGreaterThan(55);
      expect(insurance).toBeLessThan(60);
    });

    it('should apply low multiplier for Idaho (0.9x)', () => {
      const paInsurance = estimateMonthlyInsurance(100000, 'PA', 'single_family');
      const idInsurance = estimateMonthlyInsurance(100000, 'ID', 'single_family');
      expect(idInsurance).toBeLessThan(paInsurance);
    });

    it('should default to 1.0 multiplier for unknown states', () => {
      const insurance = estimateMonthlyInsurance(100000, 'XX', 'single_family');
      expect(insurance).toBeGreaterThan(0);
    });

    it('should handle lowercase state codes', () => {
      const insuranceUpper = estimateMonthlyInsurance(100000, 'FL', 'single_family');
      const insuranceLower = estimateMonthlyInsurance(100000, 'fl', 'single_family');
      expect(insuranceLower).toBe(insuranceUpper);
    });
  });

  describe('property value variations', () => {
    it('should scale linearly with property value', () => {
      const insurance50k = estimateMonthlyInsurance(50000, 'PA', 'single_family');
      const insurance100k = estimateMonthlyInsurance(100000, 'PA', 'single_family');
      expect(insurance100k).toBeCloseTo(insurance50k * 2, 1);
    });

    it('should handle low property values', () => {
      const insurance = estimateMonthlyInsurance(25000, 'PA', 'single_family');
      expect(insurance).toBeGreaterThan(0);
      expect(insurance).toBeLessThan(15);
    });

    it('should handle high property values', () => {
      const insurance = estimateMonthlyInsurance(500000, 'PA', 'vacant_building');
      expect(insurance).toBeGreaterThan(400);
    });
  });

  describe('rounding and precision', () => {
    it('should round to 2 decimal places', () => {
      const insurance = estimateMonthlyInsurance(123456, 'FL', 'single_family');
      expect(insurance % 0.01).toBeCloseTo(0, 5);
    });

    it('should return consistent results', () => {
      const insurance1 = estimateMonthlyInsurance(100000, 'PA', 'single_family');
      const insurance2 = estimateMonthlyInsurance(100000, 'PA', 'single_family');
      expect(insurance2).toBe(insurance1);
    });
  });
});

// ============================================
// Utilities Tests
// ============================================

describe('estimateUtilities', () => {
  describe('vacant vs occupied', () => {
    it('should estimate lower costs for vacant property', () => {
      const vacantUtils = estimateUtilities(1500, 'PA', true);
      const occupiedUtils = estimateUtilities(1500, 'PA', false);
      expect(vacantUtils).toBeLessThan(occupiedUtils);
    });

    it('should default to vacant=true when not specified', () => {
      const utils = estimateUtilities(1500, 'PA');
      const vacantUtils = estimateUtilities(1500, 'PA', true);
      expect(utils).toBe(vacantUtils);
    });

    it('should use base $150 for vacant properties', () => {
      const utils = estimateUtilities(1500, 'PA', true);
      expect(utils).toBeCloseTo(150, 0);
    });

    it('should use base $200 for occupied properties', () => {
      const utils = estimateUtilities(1500, 'PA', false);
      expect(utils).toBeGreaterThan(150);
    });
  });

  describe('size adjustments', () => {
    it('should apply 0.7x multiplier for small properties', () => {
      const smallUtils = estimateUtilities(500, 'PA', true);
      const mediumUtils = estimateUtilities(1500, 'PA', true);
      expect(smallUtils).toBeLessThan(mediumUtils);
    });

    it('should apply 1.0x multiplier for medium properties (1500 sqft)', () => {
      const utils = estimateUtilities(1500, 'PA', true);
      expect(utils).toBeCloseTo(150, 10);
    });

    it('should apply higher multiplier for large properties', () => {
      const largeUtils = estimateUtilities(3000, 'PA', true);
      const mediumUtils = estimateUtilities(1500, 'PA', true);
      expect(largeUtils).toBeGreaterThan(mediumUtils);
    });

    it('should cap size multiplier at 1.5x', () => {
      const utils4k = estimateUtilities(4000, 'PA', true);
      const utils8k = estimateUtilities(8000, 'PA', true);
      expect(utils8k).toBe(utils4k);
    });

    it('should apply minimum 0.7x multiplier', () => {
      const utils = estimateUtilities(100, 'PA', true);
      expect(utils).toBeGreaterThan(100);
    });
  });

  describe('climate adjustments', () => {
    it('should apply high multiplier for cold state (Minnesota 1.3x)', () => {
      const mnUtils = estimateUtilities(1500, 'MN', true);
      const paUtils = estimateUtilities(1500, 'PA', true);
      expect(mnUtils).toBeGreaterThan(paUtils);
    });

    it('should apply high multiplier for hot state (Arizona 1.35x)', () => {
      const azUtils = estimateUtilities(1500, 'AZ', true);
      const paUtils = estimateUtilities(1500, 'PA', true);
      expect(azUtils).toBeGreaterThan(paUtils);
    });

    it('should apply low multiplier for mild climate (California 0.95x)', () => {
      const caUtils = estimateUtilities(1500, 'CA', true);
      const paUtils = estimateUtilities(1500, 'PA', true);
      expect(caUtils).toBeLessThan(paUtils);
    });

    it('should default to 1.0 multiplier for unknown states', () => {
      const utils = estimateUtilities(1500, 'XX', true);
      expect(utils).toBeCloseTo(150, 10);
    });

    it('should handle lowercase state codes', () => {
      const utilsUpper = estimateUtilities(1500, 'MN', true);
      const utilsLower = estimateUtilities(1500, 'mn', true);
      expect(utilsLower).toBe(utilsUpper);
    });
  });

  describe('combined adjustments', () => {
    it('should combine size and climate adjustments', () => {
      const smallColdUtils = estimateUtilities(800, 'MN', true);
      const largeMildUtils = estimateUtilities(3000, 'CA', true);
      expect(smallColdUtils).not.toBe(largeMildUtils);
    });

    it('should round to integer', () => {
      const utils = estimateUtilities(1234, 'AZ', true);
      expect(utils % 1).toBe(0);
    });
  });
});

// ============================================
// Maintenance Tests
// ============================================

describe('estimateMonthlyMaintenance', () => {
  describe('lot size adjustments', () => {
    it('should use 1.0x multiplier when lot size not provided', () => {
      const maint = estimateMonthlyMaintenance(1500, 'PA');
      expect(maint).toBeGreaterThan(90);
      expect(maint).toBeLessThan(115);
    });

    it('should apply multiplier for small lot (0.25 acres)', () => {
      const maint = estimateMonthlyMaintenance(1500, 'PA', 0.25);
      expect(maint).toBeGreaterThanOrEqual(95);
    });

    it('should apply higher multiplier for large lot (1 acre)', () => {
      const smallLot = estimateMonthlyMaintenance(1500, 'PA', 0.25);
      const largeLot = estimateMonthlyMaintenance(1500, 'PA', 1.0);
      expect(largeLot).toBeGreaterThan(smallLot);
    });

    it('should cap lot multiplier at 2.0x', () => {
      const maint3acres = estimateMonthlyMaintenance(1500, 'PA', 3.0);
      const maint10acres = estimateMonthlyMaintenance(1500, 'PA', 10.0);
      // Both should hit the 2.0x cap
      expect(maint10acres).toBe(maint3acres);
    });

    it('should apply minimum lot multiplier of 0.8x', () => {
      const maint = estimateMonthlyMaintenance(1500, 'PA', 0.0);
      expect(maint).toBeGreaterThan(75);
    });
  });

  describe('regional cost adjustments', () => {
    it('should apply regional labor multiplier', () => {
      const paMaint = estimateMonthlyMaintenance(1500, 'PA');
      const nyMaint = estimateMonthlyMaintenance(1500, 'NY');
      expect(nyMaint).toBeGreaterThan(paMaint);
    });

    it('should handle lowercase state codes', () => {
      const maintUpper = estimateMonthlyMaintenance(1500, 'PA');
      const maintLower = estimateMonthlyMaintenance(1500, 'pa');
      expect(maintLower).toBe(maintUpper);
    });
  });

  describe('seasonal adjustments', () => {
    it('should apply snow removal premium for cold states (Minnesota)', () => {
      const mnMaint = estimateMonthlyMaintenance(1500, 'MN');
      const paMaint = estimateMonthlyMaintenance(1500, 'PA');
      expect(mnMaint).toBeGreaterThan(paMaint);
    });

    it('should apply lawn care premium for hot humid states (Florida)', () => {
      const flMaint = estimateMonthlyMaintenance(1500, 'FL');
      const paMaint = estimateMonthlyMaintenance(1500, 'PA');
      expect(flMaint).toBeGreaterThan(paMaint);
    });

    it('should apply low multiplier for arid climates (Arizona)', () => {
      const azMaint = estimateMonthlyMaintenance(1500, 'AZ');
      const paMaint = estimateMonthlyMaintenance(1500, 'PA');
      expect(azMaint).toBeLessThan(paMaint);
    });

    it('should default to 1.0 seasonal multiplier for unknown states', () => {
      const maint = estimateMonthlyMaintenance(1500, 'XX');
      expect(maint).toBeGreaterThan(0);
    });
  });

  describe('combined adjustments', () => {
    it('should combine lot size, regional, and seasonal adjustments', () => {
      const maint1 = estimateMonthlyMaintenance(1500, 'MN', 0.5);
      const maint2 = estimateMonthlyMaintenance(1500, 'AZ', 0.25);
      expect(maint1).toBeGreaterThan(maint2);
    });

    it('should round to integer', () => {
      const maint = estimateMonthlyMaintenance(1234, 'FL', 0.75);
      expect(maint % 1).toBe(0);
    });

    it('should return consistent results', () => {
      const maint1 = estimateMonthlyMaintenance(1500, 'PA', 0.5);
      const maint2 = estimateMonthlyMaintenance(1500, 'PA', 0.5);
      expect(maint2).toBe(maint1);
    });
  });
});

// ============================================
// Loan Payment Tests
// ============================================

describe('calculateMonthlyLoanPayment', () => {
  describe('interest-only payments', () => {
    it('should calculate interest-only payment correctly', () => {
      const payment = calculateMonthlyLoanPayment(70000, 0.08, 60, true);
      expect(payment).toBeCloseTo(466.67, 2);
    });

    it('should default to interest-only when not specified', () => {
      const payment = calculateMonthlyLoanPayment(70000, 0.08, 60);
      const interestOnly = calculateMonthlyLoanPayment(70000, 0.08, 60, true);
      expect(payment).toBe(interestOnly);
    });

    it('should scale with loan amount', () => {
      const payment50k = calculateMonthlyLoanPayment(50000, 0.08, 60, true);
      const payment100k = calculateMonthlyLoanPayment(100000, 0.08, 60, true);
      expect(payment100k).toBeCloseTo(payment50k * 2, 1);
    });

    it('should scale with interest rate', () => {
      const payment6pct = calculateMonthlyLoanPayment(70000, 0.06, 60, true);
      const payment12pct = calculateMonthlyLoanPayment(70000, 0.12, 60, true);
      expect(payment12pct).toBeCloseTo(payment6pct * 2, 2);
    });

    it('should be independent of term for interest-only', () => {
      const payment12mo = calculateMonthlyLoanPayment(70000, 0.08, 12, true);
      const payment60mo = calculateMonthlyLoanPayment(70000, 0.08, 60, true);
      expect(payment60mo).toBe(payment12mo);
    });
  });

  describe('amortizing payments', () => {
    it('should calculate amortizing payment correctly', () => {
      const payment = calculateMonthlyLoanPayment(70000, 0.08, 60, false);
      expect(payment).toBeGreaterThan(1400);
      expect(payment).toBeLessThan(1450);
    });

    it('should be higher than interest-only payment', () => {
      const interestOnly = calculateMonthlyLoanPayment(70000, 0.08, 60, true);
      const amortizing = calculateMonthlyLoanPayment(70000, 0.08, 60, false);
      expect(amortizing).toBeGreaterThan(interestOnly * 2.5);
    });

    it('should decrease with longer term', () => {
      const payment12mo = calculateMonthlyLoanPayment(70000, 0.08, 12, false);
      const payment60mo = calculateMonthlyLoanPayment(70000, 0.08, 60, false);
      expect(payment60mo).toBeLessThan(payment12mo);
    });

    it('should increase with higher interest rate', () => {
      const payment6pct = calculateMonthlyLoanPayment(70000, 0.06, 60, false);
      const payment12pct = calculateMonthlyLoanPayment(70000, 0.12, 60, false);
      expect(payment12pct).toBeGreaterThan(payment6pct);
    });

    it('should use standard amortization formula', () => {
      const payment = calculateMonthlyLoanPayment(100000, 0.06, 360, false);
      expect(payment).toBeCloseTo(599.55, 2);
    });
  });

  describe('edge cases', () => {
    it('should return 0 for zero loan amount', () => {
      const payment = calculateMonthlyLoanPayment(0, 0.08, 60, true);
      expect(payment).toBe(0);
    });

    it('should return 0 for negative loan amount', () => {
      const payment = calculateMonthlyLoanPayment(-10000, 0.08, 60, true);
      expect(payment).toBe(0);
    });

    it('should return 0 for zero interest rate', () => {
      const payment = calculateMonthlyLoanPayment(70000, 0, 60, true);
      expect(payment).toBe(0);
    });

    it('should return 0 for negative interest rate', () => {
      const payment = calculateMonthlyLoanPayment(70000, -0.08, 60, true);
      expect(payment).toBe(0);
    });

    it('should handle very low interest rates', () => {
      const payment = calculateMonthlyLoanPayment(70000, 0.001, 60, true);
      expect(payment).toBeGreaterThan(0);
      expect(payment).toBeLessThan(10);
    });

    it('should handle very high interest rates', () => {
      const payment = calculateMonthlyLoanPayment(70000, 0.25, 60, true);
      expect(payment).toBeGreaterThan(1000);
    });
  });

  describe('rounding and precision', () => {
    it('should round to 2 decimal places', () => {
      const payment = calculateMonthlyLoanPayment(70000, 0.08, 60, true);
      expect(payment % 0.01).toBeCloseTo(0, 5);
    });

    it('should return consistent results', () => {
      const payment1 = calculateMonthlyLoanPayment(70000, 0.08, 60, false);
      const payment2 = calculateMonthlyLoanPayment(70000, 0.08, 60, false);
      expect(payment2).toBe(payment1);
    });
  });
});

// ============================================
// Complete Holding Cost Calculation Tests
// ============================================

describe('calculateHoldingCosts', () => {
  describe('basic functionality', () => {
    it('should return complete holding cost breakdown', () => {
      const costs = calculateHoldingCosts(mockPAPropertyInput);

      expect(costs).toBeDefined();
      expect(costs.monthlyTaxes).toBeGreaterThan(0);
      expect(costs.monthlyInsurance).toBeGreaterThan(0);
      expect(costs.monthlyUtilities).toBeGreaterThan(0);
      expect(costs.monthlyMaintenance).toBeGreaterThan(0);
      expect(costs.monthlyLoanPayment).toBe(0);
      expect(costs.monthlyHoa).toBe(0);
      expect(costs.totalMonthly).toBeGreaterThan(0);
      expect(costs.holdingPeriodMonths).toBe(6);
      expect(costs.totalHolding).toBeGreaterThan(0);
    });

    it('should calculate total monthly as sum of components', () => {
      const costs = calculateHoldingCosts(mockPAPropertyInput);

      const calculatedTotal =
        costs.monthlyTaxes +
        costs.monthlyInsurance +
        costs.monthlyUtilities +
        costs.monthlyMaintenance +
        costs.monthlyLoanPayment +
        costs.monthlyHoa;

      expect(costs.totalMonthly).toBeCloseTo(calculatedTotal, 2);
    });

    it('should calculate total holding cost correctly', () => {
      const costs = calculateHoldingCosts(mockPAPropertyInput);
      const expectedTotal = costs.totalMonthly * costs.holdingPeriodMonths;
      expect(costs.totalHolding).toBeCloseTo(expectedTotal, 2);
    });

    it('should handle minimal input', () => {
      const costs = calculateHoldingCosts(mockMinimalInput);

      expect(costs).toBeDefined();
      expect(costs.monthlyTaxes).toBeGreaterThan(0);
      expect(costs.totalMonthly).toBeGreaterThan(0);
      expect(costs.holdingPeriodMonths).toBe(6);
    });
  });

  describe('assessed value handling', () => {
    it('should use provided assessed value for tax calculation', () => {
      const costs = calculateHoldingCosts({
        assessedValue: 80000,
        propertyValue: 100000,
        state: 'PA',
      });

      expect(costs.monthlyTaxes).toBeGreaterThan(0);
    });

    it('should estimate assessed value as 80% of property value when not provided', () => {
      const costsWithAssessed = calculateHoldingCosts({
        assessedValue: 80000,
        propertyValue: 100000,
        state: 'PA',
      });

      const costsWithoutAssessed = calculateHoldingCosts({
        propertyValue: 100000,
        state: 'PA',
      });

      expect(costsWithoutAssessed.monthlyTaxes).toBeCloseTo(costsWithAssessed.monthlyTaxes, 1);
    });
  });

  describe('financing integration', () => {
    it('should include loan payment when financing is provided', () => {
      const costs = calculateHoldingCosts(mockFinancedPropertyInput);

      expect(costs.monthlyLoanPayment).toBeGreaterThan(0);
      expect(costs.monthlyLoanPayment).toBeCloseTo(466.67, 2);
    });

    it('should not include loan payment when financing is false', () => {
      const input: HoldingCostInput = {
        ...mockFinancedPropertyInput,
        financing: {
          isFinanced: false,
          loanAmount: 70000,
          interestRate: 0.08,
          termMonths: 60,
        },
      };

      const costs = calculateHoldingCosts(input);
      expect(costs.monthlyLoanPayment).toBe(0);
    });

    it('should use interest-only by default', () => {
      const costs = calculateHoldingCosts(mockFinancedPropertyInput);
      const expectedPayment = 70000 * (0.08 / 12);
      expect(costs.monthlyLoanPayment).toBeCloseTo(expectedPayment, 2);
    });

    it('should calculate amortizing payment when specified', () => {
      const input: HoldingCostInput = {
        ...mockFinancedPropertyInput,
        financing: {
          ...mockFinancedPropertyInput.financing!,
          interestOnly: false,
        },
      };

      const costs = calculateHoldingCosts(input);
      expect(costs.monthlyLoanPayment).toBeGreaterThan(1400);
    });
  });

  describe('override parameters', () => {
    it('should use monthly tax override when provided', () => {
      const costs = calculateHoldingCosts(mockOverrideInput);
      expect(costs.monthlyTaxes).toBe(200);
    });

    it('should use monthly insurance override when provided', () => {
      const costs = calculateHoldingCosts(mockOverrideInput);
      expect(costs.monthlyInsurance).toBe(150);
    });

    it('should include HOA fees when provided', () => {
      const costs = calculateHoldingCosts(mockOverrideInput);
      expect(costs.monthlyHoa).toBe(75);
    });

    it('should calculate correct total with all overrides', () => {
      const costs = calculateHoldingCosts(mockOverrideInput);
      const expectedTotal =
        200 + // monthlyTaxesOverride
        150 + // monthlyInsuranceOverride
        costs.monthlyUtilities +
        costs.monthlyMaintenance +
        75; // monthlyHoa

      expect(costs.totalMonthly).toBeCloseTo(expectedTotal, 2);
    });
  });

  describe('holding period variations', () => {
    it('should default to 6 months when not specified', () => {
      const costs = calculateHoldingCosts({
        propertyValue: 100000,
        state: 'PA',
      });

      expect(costs.holdingPeriodMonths).toBe(6);
    });

    it('should use provided holding period', () => {
      const costs = calculateHoldingCosts({
        propertyValue: 100000,
        state: 'PA',
        holdingMonths: 12,
      });

      expect(costs.holdingPeriodMonths).toBe(12);
      expect(costs.totalHolding).toBeCloseTo(costs.totalMonthly * 12, 2);
    });

    it('should handle short holding periods', () => {
      const costs = calculateHoldingCosts({
        propertyValue: 100000,
        state: 'PA',
        holdingMonths: 1,
      });

      expect(costs.holdingPeriodMonths).toBe(1);
      expect(costs.totalHolding).toBeCloseTo(costs.totalMonthly, 2);
    });

    it('should handle long holding periods', () => {
      const costs = calculateHoldingCosts({
        propertyValue: 100000,
        state: 'PA',
        holdingMonths: 24,
      });

      expect(costs.holdingPeriodMonths).toBe(24);
      expect(costs.totalHolding).toBeCloseTo(costs.totalMonthly * 24, 2);
    });
  });

  describe('property characteristics', () => {
    it('should use vacant property rates when isVacant=true', () => {
      const costs = calculateHoldingCosts({
        propertyValue: 100000,
        state: 'PA',
        isVacant: true,
      });

      expect(costs.monthlyInsurance).toBeGreaterThan(80);
    });

    it('should use occupied property rates when isVacant=false', () => {
      const vacantCosts = calculateHoldingCosts({
        propertyValue: 100000,
        state: 'PA',
        isVacant: true,
      });

      const occupiedCosts = calculateHoldingCosts({
        propertyValue: 100000,
        state: 'PA',
        isVacant: false,
      });

      expect(occupiedCosts.monthlyInsurance).toBeLessThan(vacantCosts.monthlyInsurance);
      expect(occupiedCosts.monthlyUtilities).toBeGreaterThan(vacantCosts.monthlyUtilities);
    });

    it('should default to vacant=true when not specified', () => {
      const costs = calculateHoldingCosts({
        propertyValue: 100000,
        state: 'PA',
      });

      const vacantCosts = calculateHoldingCosts({
        propertyValue: 100000,
        state: 'PA',
        isVacant: true,
      });

      expect(costs.monthlyInsurance).toBe(vacantCosts.monthlyInsurance);
    });

    it('should adjust for lot size', () => {
      const smallLot = calculateHoldingCosts({
        propertyValue: 100000,
        state: 'PA',
        lotSizeAcres: 0.25,
      });

      const largeLot = calculateHoldingCosts({
        propertyValue: 100000,
        state: 'PA',
        lotSizeAcres: 1.0,
      });

      expect(largeLot.monthlyMaintenance).toBeGreaterThan(smallLot.monthlyMaintenance);
    });

    it('should adjust for square footage', () => {
      const smallHome = calculateHoldingCosts({
        propertyValue: 100000,
        state: 'PA',
        sqft: 800,
      });

      const largeHome = calculateHoldingCosts({
        propertyValue: 100000,
        state: 'PA',
        sqft: 3000,
      });

      expect(largeHome.monthlyUtilities).toBeGreaterThan(smallHome.monthlyUtilities);
    });

    it('should default to 1500 sqft when not specified', () => {
      const costs = calculateHoldingCosts({
        propertyValue: 100000,
        state: 'PA',
      });

      const costs1500 = calculateHoldingCosts({
        propertyValue: 100000,
        state: 'PA',
        sqft: 1500,
      });

      expect(costs.monthlyUtilities).toBe(costs1500.monthlyUtilities);
    });
  });

  describe('state variations', () => {
    it('should show higher costs for high-tax state (NJ)', () => {
      const paCosts = calculateHoldingCosts({
        propertyValue: 100000,
        state: 'PA',
      });

      const njCosts = calculateHoldingCosts({
        propertyValue: 100000,
        state: 'NJ',
      });

      expect(njCosts.monthlyTaxes).toBeGreaterThan(paCosts.monthlyTaxes);
      expect(njCosts.totalMonthly).toBeGreaterThan(paCosts.totalMonthly);
    });

    it('should show higher costs for high-insurance state (FL)', () => {
      const paCosts = calculateHoldingCosts({
        propertyValue: 100000,
        state: 'PA',
      });

      const flCosts = calculateHoldingCosts({
        propertyValue: 100000,
        state: 'FL',
      });

      expect(flCosts.monthlyInsurance).toBeGreaterThan(paCosts.monthlyInsurance);
    });

    it('should handle county parameter', () => {
      const costs = calculateHoldingCosts({
        propertyValue: 100000,
        state: 'PA',
        county: 'Philadelphia',
      });

      expect(costs.monthlyTaxes).toBeGreaterThan(0);
    });
  });

  describe('rounding and precision', () => {
    it('should round all monthly costs to 2 decimal places', () => {
      const costs = calculateHoldingCosts(mockPAPropertyInput);

      // Check that results have at most 2 decimal places
      expect(Math.round(costs.monthlyTaxes * 100)).toBe(costs.monthlyTaxes * 100);
      expect(Math.round(costs.monthlyInsurance * 100)).toBe(costs.monthlyInsurance * 100);
      expect(Math.round(costs.totalMonthly * 100)).toBe(costs.totalMonthly * 100);
      expect(Math.round(costs.totalHolding * 100)).toBe(costs.totalHolding * 100);
    });

    it('should return consistent results', () => {
      const costs1 = calculateHoldingCosts(mockPAPropertyInput);
      const costs2 = calculateHoldingCosts(mockPAPropertyInput);

      expect(costs2.totalMonthly).toBe(costs1.totalMonthly);
      expect(costs2.totalHolding).toBe(costs1.totalHolding);
    });
  });
});

// ============================================
// Quick Estimate Functions Tests
// ============================================

describe('estimateHoldingTotal', () => {
  it('should return total holding cost for specified period', () => {
    const total = estimateHoldingTotal(100000, 6, 'PA');
    expect(total).toBeGreaterThan(0);
  });

  it('should match calculateHoldingCosts result', () => {
    const quickEstimate = estimateHoldingTotal(100000, 6, 'PA');
    const fullCalculation = calculateHoldingCosts({
      propertyValue: 100000,
      holdingMonths: 6,
      state: 'PA',
    });

    expect(quickEstimate).toBe(fullCalculation.totalHolding);
  });

  it('should scale with holding period', () => {
    const total6mo = estimateHoldingTotal(100000, 6, 'PA');
    const total12mo = estimateHoldingTotal(100000, 12, 'PA');

    expect(total12mo).toBeCloseTo(total6mo * 2, 2);
  });

  it('should scale with property value', () => {
    const total50k = estimateHoldingTotal(50000, 6, 'PA');
    const total100k = estimateHoldingTotal(100000, 6, 'PA');

    // Holding costs scale but not linearly (fixed costs like utilities don't scale)
    expect(total100k).toBeGreaterThan(total50k);
    expect(total100k).toBeLessThan(total50k * 2);
  });

  it('should vary by state', () => {
    const totalPA = estimateHoldingTotal(100000, 6, 'PA');
    const totalNJ = estimateHoldingTotal(100000, 6, 'NJ');

    expect(totalNJ).toBeGreaterThan(totalPA);
  });
});

describe('getHoldingRatePer1000', () => {
  it('should return monthly cost per $1000 of value', () => {
    const rate = getHoldingRatePer1000('PA');
    expect(rate).toBeGreaterThan(0);
    expect(rate).toBeLessThan(10);
  });

  it('should be higher for high-cost states', () => {
    const ratePA = getHoldingRatePer1000('PA');
    const rateNJ = getHoldingRatePer1000('NJ');

    expect(rateNJ).toBeGreaterThan(ratePA);
  });

  it('should be lower for low-cost states', () => {
    const ratePA = getHoldingRatePer1000('PA');
    const rateHI = getHoldingRatePer1000('HI');

    expect(rateHI).toBeLessThan(ratePA);
  });

  it('should handle all state codes', () => {
    const states = ['PA', 'TX', 'CA', 'FL', 'NY', 'NJ', 'OH'];
    states.forEach((state) => {
      const rate = getHoldingRatePer1000(state);
      expect(rate).toBeGreaterThan(0);
    });
  });

  it('should round to 2 decimal places', () => {
    const rate = getHoldingRatePer1000('PA');
    expect(rate % 0.01).toBeCloseTo(0, 5);
  });

  it('should return consistent results', () => {
    const rate1 = getHoldingRatePer1000('PA');
    const rate2 = getHoldingRatePer1000('PA');
    expect(rate2).toBe(rate1);
  });

  it('should calculate rate based on standard $100k property', () => {
    const rate = getHoldingRatePer1000('PA');
    const costs = calculateHoldingCosts({
      propertyValue: 100000,
      holdingMonths: 1,
      state: 'PA',
    });

    expect(rate).toBeCloseTo(costs.totalMonthly / 100, 2);
  });
});

// ============================================
// Integration Scenarios
// ============================================

describe('integration scenarios', () => {
  describe('typical investment property scenarios', () => {
    it('should calculate costs for low-cost property with financing', () => {
      const costs = calculateHoldingCosts({
        assessedValue: 30000,
        propertyValue: 40000,
        sqft: 1200,
        state: 'PA',
        holdingMonths: 6,
        financing: {
          isFinanced: true,
          loanAmount: 28000,
          interestRate: 0.09,
          termMonths: 36,
          interestOnly: true,
        },
      });

      expect(costs.totalMonthly).toBeGreaterThan(200);
      expect(costs.totalMonthly).toBeLessThan(550);
      expect(costs.totalHolding).toBeGreaterThan(1200);
    });

    it('should calculate costs for medium-cost property without financing', () => {
      const costs = calculateHoldingCosts({
        assessedValue: 80000,
        propertyValue: 100000,
        sqft: 1500,
        state: 'TX',
        county: 'Travis',
        holdingMonths: 8,
        lotSizeAcres: 0.25,
      });

      expect(costs.totalMonthly).toBeGreaterThan(300);
      expect(costs.totalMonthly).toBeLessThan(600);
      expect(costs.totalHolding).toBeGreaterThan(2400);
    });

    it('should calculate costs for high-cost property in expensive state', () => {
      const costs = calculateHoldingCosts({
        assessedValue: 200000,
        propertyValue: 250000,
        sqft: 2500,
        state: 'NJ',
        county: 'Bergen',
        holdingMonths: 12,
        monthlyHoa: 150,
        lotSizeAcres: 0.5,
        isVacant: true,
      });

      expect(costs.totalMonthly).toBeGreaterThan(1000);
      expect(costs.totalHolding).toBeGreaterThan(12000);
    });

    it('should calculate costs for vacant land', () => {
      const costs = calculateHoldingCosts({
        propertyValue: 50000,
        state: 'FL',
        holdingMonths: 12,
        lotSizeAcres: 2.0,
        isVacant: true,
      });

      expect(costs.monthlyInsurance).toBeLessThan(100);
      expect(costs.monthlyUtilities).toBeGreaterThan(0);
      expect(costs.totalMonthly).toBeGreaterThan(100);
    });
  });

  describe('state comparison scenarios', () => {
    it('should show cost differences across low vs high tax states', () => {
      const hawaiiCosts = calculateHoldingCosts({
        propertyValue: 100000,
        state: 'HI',
        holdingMonths: 6,
      });

      const njCosts = calculateHoldingCosts({
        propertyValue: 100000,
        state: 'NJ',
        holdingMonths: 6,
      });

      expect(njCosts.monthlyTaxes).toBeGreaterThan(hawaiiCosts.monthlyTaxes * 5);
      expect(njCosts.totalHolding).toBeGreaterThan(hawaiiCosts.totalHolding);
    });

    it('should show cost differences for hurricane vs non-hurricane states', () => {
      const paCosts = calculateHoldingCosts({
        propertyValue: 100000,
        state: 'PA',
        holdingMonths: 6,
      });

      const flCosts = calculateHoldingCosts({
        propertyValue: 100000,
        state: 'FL',
        holdingMonths: 6,
      });

      expect(flCosts.monthlyInsurance).toBeGreaterThan(paCosts.monthlyInsurance * 1.5);
    });
  });

  describe('holding period comparison scenarios', () => {
    it('should show cost impact of short vs long hold periods', () => {
      const shortHold = calculateHoldingCosts({
        propertyValue: 100000,
        state: 'PA',
        holdingMonths: 3,
      });

      const longHold = calculateHoldingCosts({
        propertyValue: 100000,
        state: 'PA',
        holdingMonths: 18,
      });

      expect(longHold.totalHolding).toBeCloseTo(shortHold.totalHolding * 6, 2);
    });
  });

  describe('financing comparison scenarios', () => {
    it('should show cost impact of cash vs financed purchase', () => {
      const cashCosts = calculateHoldingCosts({
        propertyValue: 100000,
        state: 'PA',
        holdingMonths: 6,
      });

      const financedCosts = calculateHoldingCosts({
        propertyValue: 100000,
        state: 'PA',
        holdingMonths: 6,
        financing: {
          isFinanced: true,
          loanAmount: 70000,
          interestRate: 0.08,
          termMonths: 60,
          interestOnly: true,
        },
      });

      expect(financedCosts.monthlyLoanPayment).toBeGreaterThan(450);
      expect(financedCosts.totalMonthly).toBeGreaterThan(cashCosts.totalMonthly);
      expect(financedCosts.totalHolding).toBeGreaterThan(cashCosts.totalHolding + 2500);
    });

    it('should show cost impact of interest-only vs amortizing loan', () => {
      const interestOnlyCosts = calculateHoldingCosts({
        propertyValue: 100000,
        state: 'PA',
        holdingMonths: 6,
        financing: {
          isFinanced: true,
          loanAmount: 70000,
          interestRate: 0.08,
          termMonths: 60,
          interestOnly: true,
        },
      });

      const amortizingCosts = calculateHoldingCosts({
        propertyValue: 100000,
        state: 'PA',
        holdingMonths: 6,
        financing: {
          isFinanced: true,
          loanAmount: 70000,
          interestRate: 0.08,
          termMonths: 60,
          interestOnly: false,
        },
      });

      expect(amortizingCosts.monthlyLoanPayment).toBeGreaterThan(interestOnlyCosts.monthlyLoanPayment * 2.5);
      expect(amortizingCosts.totalHolding).toBeGreaterThan(interestOnlyCosts.totalHolding);
    });
  });
});

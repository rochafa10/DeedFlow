/**
 * Acquisition Cost Calculator Tests
 *
 * Tests the acquisition cost calculation functions including:
 * - Buyer's premium calculation
 * - Transfer tax calculation (state and county-specific)
 * - Title cost calculation (search and insurance)
 * - Recording fees calculation
 * - Legal fees calculation
 * - Complete acquisition cost breakdown
 * - Simplified and quick estimate functions
 *
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-22
 */

import { describe, it, expect } from 'vitest';
import {
  calculateBuyersPremium,
  calculateTransferTax,
  calculateTitleCosts,
  calculateRecordingFees,
  calculateLegalFees,
  calculateAcquisitionCosts,
  calculateSimpleAcquisitionCosts,
  estimateAcquisitionTotal,
  type AcquisitionCostInput,
  type TitleCosts,
} from '../acquisition';
import type { AuctionPlatform } from '@/types/costs';

// ============================================
// Test Fixtures
// ============================================

/**
 * Common bid amounts for testing
 */
const TEST_BID_AMOUNTS = {
  low: 10000,
  medium: 50000,
  high: 150000,
  veryHigh: 500000,
};

/**
 * Sample states with varying transfer tax rates
 */
const TEST_STATES = {
  noTransferTax: 'TX',       // No transfer tax
  lowTransferTax: 'CA',      // 0.11%
  mediumTransferTax: 'FL',   // 0.7%
  highTransferTax: 'PA',     // 2%
  veryHighTransferTax: 'DE', // 4%
};

/**
 * Attorney states requiring legal representation
 */
const ATTORNEY_STATES = ['NY', 'CT', 'MA', 'GA', 'SC', 'NC'];

/**
 * Non-attorney states (optional legal review)
 */
const NON_ATTORNEY_STATES = ['CA', 'TX', 'AZ', 'NV', 'FL'];

/**
 * Complete acquisition cost input for Pennsylvania property
 */
const mockPAPropertyInput: AcquisitionCostInput = {
  bidAmount: 50000,
  state: 'PA',
  county: 'Blair',
  platform: 'bid4assets',
  propertyValue: 50000,
};

/**
 * Complete acquisition cost input for New York property (attorney state)
 */
const mockNYPropertyInput: AcquisitionCostInput = {
  bidAmount: 100000,
  state: 'NY',
  county: 'NewYork',
  platform: 'bid4assets',
  propertyValue: 120000,
};

/**
 * Complete acquisition cost input for Texas property (no transfer tax)
 */
const mockTXPropertyInput: AcquisitionCostInput = {
  bidAmount: 75000,
  state: 'TX',
  platform: 'in_person',
  propertyValue: 75000,
};

/**
 * Minimal acquisition cost input
 */
const mockMinimalInput: AcquisitionCostInput = {
  bidAmount: 30000,
  state: 'CA',
};

// ============================================
// Buyer's Premium Tests
// ============================================

describe('calculateBuyersPremium', () => {
  describe('platform-specific premiums', () => {
    it('should calculate 5% premium for bid4assets', () => {
      const premium = calculateBuyersPremium(50000, 'bid4assets');
      expect(premium).toBe(2500); // 50000 * 0.05
    });

    it('should calculate 5% premium for govease', () => {
      const premium = calculateBuyersPremium(50000, 'govease');
      expect(premium).toBe(2500);
    });

    it('should calculate 3% premium for county_direct', () => {
      const premium = calculateBuyersPremium(50000, 'county_direct');
      expect(premium).toBe(1500); // 50000 * 0.03
    });

    it('should calculate 2% premium for in_person auctions', () => {
      const premium = calculateBuyersPremium(50000, 'in_person');
      expect(premium).toBe(1000); // 50000 * 0.02
    });

    it('should default to 5% premium for other platform', () => {
      const premium = calculateBuyersPremium(50000, 'other');
      expect(premium).toBe(2500);
    });

    it('should default to 5% premium when platform not specified', () => {
      const premium = calculateBuyersPremium(50000);
      expect(premium).toBe(2500);
    });
  });

  describe('bid amount variations', () => {
    it('should handle low bid amounts', () => {
      const premium = calculateBuyersPremium(5000, 'bid4assets');
      expect(premium).toBe(250);
    });

    it('should handle high bid amounts', () => {
      const premium = calculateBuyersPremium(500000, 'bid4assets');
      expect(premium).toBe(25000);
    });

    it('should round to 2 decimal places', () => {
      const premium = calculateBuyersPremium(12345, 'bid4assets');
      expect(premium).toBe(617.25); // 12345 * 0.05
    });
  });

  describe('edge cases', () => {
    it('should handle zero bid amount', () => {
      const premium = calculateBuyersPremium(0, 'bid4assets');
      expect(premium).toBe(0);
    });

    it('should handle decimal bid amounts', () => {
      const premium = calculateBuyersPremium(50000.50, 'bid4assets');
      expect(premium).toBe(2500.03); // Rounded
    });
  });
});

// ============================================
// Transfer Tax Tests
// ============================================

describe('calculateTransferTax', () => {
  describe('state-level transfer taxes', () => {
    it('should return 0 for Texas (no transfer tax)', () => {
      const tax = calculateTransferTax(50000, 'TX');
      expect(tax).toBe(0);
    });

    it('should calculate 2% transfer tax for Pennsylvania', () => {
      const tax = calculateTransferTax(50000, 'PA');
      expect(tax).toBe(1000); // 50000 * 0.02
    });

    it('should calculate 4% transfer tax for Delaware', () => {
      const tax = calculateTransferTax(50000, 'DE');
      expect(tax).toBe(2000); // 50000 * 0.04
    });

    it('should calculate 0.7% transfer tax for Florida', () => {
      const tax = calculateTransferTax(50000, 'FL');
      expect(tax).toBe(350); // 50000 * 0.007
    });

    it('should calculate 0.11% transfer tax for California', () => {
      const tax = calculateTransferTax(50000, 'CA');
      expect(tax).toBe(55); // 50000 * 0.0011
    });

    it('should calculate 0.4% transfer tax for New York', () => {
      const tax = calculateTransferTax(50000, 'NY');
      expect(tax).toBe(200); // 50000 * 0.004
    });
  });

  describe('county-level transfer taxes', () => {
    it('should add Philadelphia county tax (3.278%)', () => {
      const tax = calculateTransferTax(100000, 'PA', 'Philadelphia');
      // Base PA: 2% = 2000
      // Local: 3.278% = 3278
      // Total: 5.278% = 5278
      expect(tax).toBe(5278);
    });

    it('should add New York City tax for amounts >= $500k', () => {
      const tax = calculateTransferTax(600000, 'NY', 'NewYork');
      // Base NY: 0.4% = 2400
      // Local NYC: 1% = 6000
      // Total: 1.4% = 8400
      expect(tax).toBe(8400);
    });

    it('should not add NYC tax for amounts < $500k', () => {
      const tax = calculateTransferTax(400000, 'NY', 'NewYork');
      // Only base NY: 0.4% = 1600
      expect(tax).toBe(1600);
    });

    it('should add San Francisco county tax (0.68%)', () => {
      const tax = calculateTransferTax(100000, 'CA', 'SanFrancisco');
      // Base CA: 0.11% = 110
      // Local: 0.68% = 680
      // Total: 0.79% = 790
      expect(tax).toBe(790);
    });

    it('should add Seattle county tax (0.36%)', () => {
      const tax = calculateTransferTax(100000, 'WA', 'Seattle');
      // Base WA: 1.78% = 1780
      // Local: 0.36% = 360
      // Total: 2.14% = 2140
      expect(tax).toBe(2140);
    });

    it('should ignore non-matching county names', () => {
      const tax = calculateTransferTax(50000, 'PA', 'Blair');
      // Only base PA tax
      expect(tax).toBe(1000);
    });
  });

  describe('case insensitivity', () => {
    it('should handle lowercase state codes', () => {
      const tax = calculateTransferTax(50000, 'pa');
      expect(tax).toBe(1000);
    });

    it('should handle mixed case state codes', () => {
      const tax = calculateTransferTax(50000, 'Pa');
      expect(tax).toBe(1000);
    });
  });

  describe('unknown states', () => {
    it('should default to 1% for unknown states', () => {
      const tax = calculateTransferTax(50000, 'ZZ');
      expect(tax).toBe(500); // 50000 * 0.01 (default)
    });
  });

  describe('edge cases', () => {
    it('should handle zero amount', () => {
      const tax = calculateTransferTax(0, 'PA');
      expect(tax).toBe(0);
    });

    it('should round to 2 decimal places', () => {
      const tax = calculateTransferTax(12345, 'PA');
      expect(tax).toBe(246.9); // 12345 * 0.02
    });
  });
});

// ============================================
// Title Costs Tests
// ============================================

describe('calculateTitleCosts', () => {
  describe('basic title cost calculation', () => {
    it('should return title search and insurance costs', () => {
      const costs = calculateTitleCosts(100000);

      expect(costs).toHaveProperty('search');
      expect(costs).toHaveProperty('insurance');
      expect(costs).toHaveProperty('total');
      expect(costs.total).toBe(costs.search + costs.insurance);
    });

    it('should calculate search cost around $350', () => {
      const costs = calculateTitleCosts(100000);
      expect(costs.search).toBeGreaterThanOrEqual(300);
      expect(costs.search).toBeLessThanOrEqual(500);
    });

    it('should use minimum insurance for low values', () => {
      const costs = calculateTitleCosts(10000);
      // Insurance should be at minimum ($500)
      expect(costs.insurance).toBe(500);
    });

    it('should scale insurance with property value', () => {
      const costs = calculateTitleCosts(200000);
      // Insurance should be calculated (200000 * 0.005 = 1000)
      expect(costs.insurance).toBeGreaterThan(500);
      expect(costs.insurance).toBe(1000);
    });
  });

  describe('state-specific adjustments', () => {
    it('should apply 1.3x multiplier for New York', () => {
      const baseCosts = calculateTitleCosts(100000);
      const nyCosts = calculateTitleCosts(100000, 'NY');

      expect(nyCosts.search).toBeGreaterThan(baseCosts.search);
      expect(nyCosts.insurance).toBeGreaterThan(baseCosts.insurance);
    });

    it('should apply 1.25x multiplier for New Jersey', () => {
      const baseCosts = calculateTitleCosts(100000);
      const njCosts = calculateTitleCosts(100000, 'NJ');

      expect(njCosts.total).toBeGreaterThan(baseCosts.total);
    });

    it('should apply 0.9x multiplier for Arizona', () => {
      // Use higher value to avoid minimum insurance threshold
      const baseCosts = calculateTitleCosts(200000);
      const azCosts = calculateTitleCosts(200000, 'AZ');

      expect(azCosts.search).toBeLessThan(baseCosts.search);
      expect(azCosts.insurance).toBeLessThan(baseCosts.insurance);
    });

    it('should apply 0.9x multiplier for Nevada', () => {
      const baseCosts = calculateTitleCosts(100000);
      const nvCosts = calculateTitleCosts(100000, 'NV');

      expect(nvCosts.total).toBeLessThan(baseCosts.total);
    });

    it('should use 1.0 multiplier for states without adjustments', () => {
      const costs1 = calculateTitleCosts(100000);
      const costs2 = calculateTitleCosts(100000, 'PA');

      // Pennsylvania not in adjustment list, should be same as base
      expect(costs2.search).toBe(costs1.search);
      expect(costs2.insurance).toBe(costs1.insurance);
    });
  });

  describe('case insensitivity', () => {
    it('should handle lowercase state codes', () => {
      const costs1 = calculateTitleCosts(100000, 'NY');
      const costs2 = calculateTitleCosts(100000, 'ny');

      expect(costs1.total).toBe(costs2.total);
    });
  });

  describe('edge cases', () => {
    it('should handle zero property value', () => {
      const costs = calculateTitleCosts(0);

      expect(costs.search).toBeGreaterThan(0);
      expect(costs.insurance).toBe(500); // Minimum
    });

    it('should handle very high property values', () => {
      const costs = calculateTitleCosts(1000000);

      expect(costs.insurance).toBe(5000); // 1000000 * 0.005
      expect(costs.total).toBeGreaterThan(5000);
    });
  });
});

// ============================================
// Recording Fees Tests
// ============================================

describe('calculateRecordingFees', () => {
  describe('state-specific fees', () => {
    it('should return $200 for California', () => {
      const fees = calculateRecordingFees('CA');
      expect(fees).toBe(200);
    });

    it('should return $175 for New York', () => {
      const fees = calculateRecordingFees('NY');
      expect(fees).toBe(175);
    });

    it('should return $150 for Pennsylvania', () => {
      const fees = calculateRecordingFees('PA');
      expect(fees).toBe(150);
    });

    it('should return $100 for Florida', () => {
      const fees = calculateRecordingFees('FL');
      expect(fees).toBe(100);
    });

    it('should return $100 for Texas', () => {
      const fees = calculateRecordingFees('TX');
      expect(fees).toBe(100);
    });

    it('should return $75 for Georgia', () => {
      const fees = calculateRecordingFees('GA');
      expect(fees).toBe(75);
    });
  });

  describe('default fees', () => {
    it('should return default $150 for unknown states', () => {
      const fees = calculateRecordingFees('ZZ');
      expect(fees).toBe(150);
    });
  });

  describe('case insensitivity', () => {
    it('should handle lowercase state codes', () => {
      const fees = calculateRecordingFees('pa');
      expect(fees).toBe(150);
    });
  });

  describe('county parameter', () => {
    it('should accept county parameter (not currently used)', () => {
      const fees = calculateRecordingFees('PA', 'Blair');
      expect(fees).toBe(150);
    });
  });
});

// ============================================
// Legal Fees Tests
// ============================================

describe('calculateLegalFees', () => {
  describe('attorney states', () => {
    it('should return $1500 for New York (attorney required)', () => {
      const fees = calculateLegalFees('NY');
      expect(fees).toBe(1500);
    });

    it('should return $1200 for Connecticut (attorney required)', () => {
      const fees = calculateLegalFees('CT');
      expect(fees).toBe(1200);
    });

    it('should return $1200 for Massachusetts (attorney required)', () => {
      const fees = calculateLegalFees('MA');
      expect(fees).toBe(1200);
    });

    it('should return $800 for Georgia (attorney required)', () => {
      const fees = calculateLegalFees('GA');
      expect(fees).toBe(800);
    });

    it('should return $700 for South Carolina (attorney required)', () => {
      const fees = calculateLegalFees('SC');
      expect(fees).toBe(700);
    });

    it('should return $700 for North Carolina (attorney required)', () => {
      const fees = calculateLegalFees('NC');
      expect(fees).toBe(700);
    });

    it('should return $1000 default for other attorney states', () => {
      const fees = calculateLegalFees('VT'); // Vermont is attorney state
      expect(fees).toBe(1000);
    });
  });

  describe('non-attorney states', () => {
    it('should return $750 for California (optional review)', () => {
      const fees = calculateLegalFees('CA');
      expect(fees).toBe(750);
    });

    it('should return $750 for Texas (optional review)', () => {
      const fees = calculateLegalFees('TX');
      expect(fees).toBe(750);
    });

    it('should return $750 for Arizona (optional review)', () => {
      const fees = calculateLegalFees('AZ');
      expect(fees).toBe(750);
    });

    it('should return $750 for Pennsylvania (optional review)', () => {
      const fees = calculateLegalFees('PA');
      expect(fees).toBe(750);
    });
  });

  describe('override parameter', () => {
    it('should use override when isAttorneyState is true', () => {
      const fees = calculateLegalFees('CA', true);
      expect(fees).toBeGreaterThan(750); // Should use attorney fees
    });

    it('should use override when isAttorneyState is false', () => {
      const fees = calculateLegalFees('NY', false);
      expect(fees).toBe(750); // Should use optional review
    });
  });

  describe('case insensitivity', () => {
    it('should handle lowercase state codes', () => {
      const fees = calculateLegalFees('ny');
      expect(fees).toBe(1500);
    });
  });
});

// ============================================
// Complete Acquisition Costs Tests
// ============================================

describe('calculateAcquisitionCosts', () => {
  describe('complete cost breakdown', () => {
    it('should return all required cost components', () => {
      const costs = calculateAcquisitionCosts(mockPAPropertyInput);

      expect(costs).toHaveProperty('bidAmount');
      expect(costs).toHaveProperty('buyersPremium');
      expect(costs).toHaveProperty('transferTax');
      expect(costs).toHaveProperty('recordingFees');
      expect(costs).toHaveProperty('titleSearch');
      expect(costs).toHaveProperty('titleInsurance');
      expect(costs).toHaveProperty('legalFees');
      expect(costs).toHaveProperty('totalAcquisition');
    });

    it('should match input bid amount', () => {
      const costs = calculateAcquisitionCosts(mockPAPropertyInput);
      expect(costs.bidAmount).toBe(mockPAPropertyInput.bidAmount);
    });

    it('should calculate total as sum of all components', () => {
      const costs = calculateAcquisitionCosts(mockPAPropertyInput);

      const expectedTotal =
        costs.bidAmount +
        costs.buyersPremium +
        costs.transferTax +
        costs.recordingFees +
        costs.titleSearch +
        costs.titleInsurance +
        costs.legalFees;

      expect(costs.totalAcquisition).toBeCloseTo(expectedTotal, 2);
    });
  });

  describe('Pennsylvania property', () => {
    it('should calculate correct costs for PA property', () => {
      const costs = calculateAcquisitionCosts(mockPAPropertyInput);

      // Buyer's premium: 50000 * 0.05 = 2500
      expect(costs.buyersPremium).toBe(2500);

      // Transfer tax: 50000 * 0.02 = 1000
      expect(costs.transferTax).toBe(1000);

      // Recording fees: PA = 150
      expect(costs.recordingFees).toBe(150);

      // Legal fees: PA not attorney state = 750
      expect(costs.legalFees).toBe(750);

      // Title costs should exist
      expect(costs.titleSearch).toBeGreaterThan(0);
      expect(costs.titleInsurance).toBeGreaterThan(0);

      // Total should be reasonable
      expect(costs.totalAcquisition).toBeGreaterThan(costs.bidAmount);
      expect(costs.totalAcquisition).toBeLessThan(costs.bidAmount * 1.2);
    });
  });

  describe('New York property (attorney state)', () => {
    it('should calculate correct costs for NY property', () => {
      const costs = calculateAcquisitionCosts(mockNYPropertyInput);

      // Buyer's premium: 100000 * 0.05 = 5000
      expect(costs.buyersPremium).toBe(5000);

      // Transfer tax: 100000 * 0.004 = 400
      // Note: NYC local tax only applies to sales >= $500k, so just base rate here
      expect(costs.transferTax).toBe(400);

      // Recording fees: NY = 175
      expect(costs.recordingFees).toBe(175);

      // Legal fees: NY attorney state = 1500
      expect(costs.legalFees).toBe(1500);

      // Title insurance should use property value (120000) not bid
      expect(costs.titleInsurance).toBeGreaterThan(500);
    });
  });

  describe('Texas property (no transfer tax)', () => {
    it('should calculate correct costs for TX property', () => {
      const costs = calculateAcquisitionCosts(mockTXPropertyInput);

      // Buyer's premium: 75000 * 0.02 = 1500 (in_person)
      expect(costs.buyersPremium).toBe(1500);

      // Transfer tax: TX = 0
      expect(costs.transferTax).toBe(0);

      // Recording fees: TX = 100
      expect(costs.recordingFees).toBe(100);

      // Legal fees: TX not attorney state = 750
      expect(costs.legalFees).toBe(750);
    });
  });

  describe('minimal input handling', () => {
    it('should handle minimal input with defaults', () => {
      const costs = calculateAcquisitionCosts(mockMinimalInput);

      expect(costs.bidAmount).toBe(mockMinimalInput.bidAmount);
      expect(costs.buyersPremium).toBeGreaterThan(0); // Default platform
      expect(costs.recordingFees).toBeGreaterThan(0);
      expect(costs.titleSearch).toBeGreaterThan(0);
      expect(costs.titleInsurance).toBeGreaterThan(0);
      expect(costs.legalFees).toBeGreaterThan(0);
      expect(costs.totalAcquisition).toBeGreaterThan(costs.bidAmount);
    });
  });

  describe('property value override', () => {
    it('should use property value for title insurance if provided', () => {
      const input: AcquisitionCostInput = {
        bidAmount: 50000,
        state: 'PA',
        propertyValue: 100000, // Higher than bid
      };

      const costs = calculateAcquisitionCosts(input);

      // Title insurance should be based on 100000, not 50000
      expect(costs.titleInsurance).toBe(500); // 100000 * 0.005 = 500
    });

    it('should use bid amount for title insurance if value not provided', () => {
      const input: AcquisitionCostInput = {
        bidAmount: 50000,
        state: 'PA',
      };

      const costs = calculateAcquisitionCosts(input);

      // Title insurance should be minimum (500) since 50000 * 0.005 = 250 < min
      expect(costs.titleInsurance).toBe(500);
    });
  });

  describe('legal fees override', () => {
    it('should use override legal fees if provided', () => {
      const input: AcquisitionCostInput = {
        bidAmount: 50000,
        state: 'PA',
        legalFeesOverride: 2000,
      };

      const costs = calculateAcquisitionCosts(input);

      expect(costs.legalFees).toBe(2000);
    });
  });

  describe('platform variations', () => {
    const testPlatforms: Array<{ platform: AuctionPlatform; expectedRate: number }> = [
      { platform: 'bid4assets', expectedRate: 0.05 },
      { platform: 'govease', expectedRate: 0.05 },
      { platform: 'county_direct', expectedRate: 0.03 },
      { platform: 'in_person', expectedRate: 0.02 },
      { platform: 'other', expectedRate: 0.05 },
    ];

    testPlatforms.forEach(({ platform, expectedRate }) => {
      it(`should calculate correct premium for ${platform}`, () => {
        const input: AcquisitionCostInput = {
          bidAmount: 50000,
          state: 'PA',
          platform,
        };

        const costs = calculateAcquisitionCosts(input);
        expect(costs.buyersPremium).toBe(50000 * expectedRate);
      });
    });
  });

  describe('rounding', () => {
    it('should round total to 2 decimal places', () => {
      const costs = calculateAcquisitionCosts(mockPAPropertyInput);

      // Total should have at most 2 decimal places
      expect(costs.totalAcquisition).toBe(
        Math.round(costs.totalAcquisition * 100) / 100
      );
    });
  });
});

// ============================================
// Simple Acquisition Costs Tests
// ============================================

describe('calculateSimpleAcquisitionCosts', () => {
  it('should accept minimal parameters', () => {
    const costs = calculateSimpleAcquisitionCosts(50000, 'PA');

    expect(costs.bidAmount).toBe(50000);
    expect(costs.totalAcquisition).toBeGreaterThan(50000);
  });

  it('should use default platform when not specified', () => {
    const costs = calculateSimpleAcquisitionCosts(50000, 'PA');

    // Should use 'other' platform (5%)
    expect(costs.buyersPremium).toBe(2500);
  });

  it('should accept platform parameter', () => {
    const costs = calculateSimpleAcquisitionCosts(50000, 'PA', 'in_person');

    // Should use in_person platform (2%)
    expect(costs.buyersPremium).toBe(1000);
  });

  it('should produce same result as full calculator with minimal input', () => {
    const simpleCosts = calculateSimpleAcquisitionCosts(50000, 'PA', 'bid4assets');
    const fullCosts = calculateAcquisitionCosts({
      bidAmount: 50000,
      state: 'PA',
      platform: 'bid4assets',
    });

    expect(simpleCosts.totalAcquisition).toBe(fullCosts.totalAcquisition);
  });
});

// ============================================
// Quick Estimate Tests
// ============================================

describe('estimateAcquisitionTotal', () => {
  it('should estimate 15% above bid amount', () => {
    const estimate = estimateAcquisitionTotal(50000);
    expect(estimate).toBe(57500); // 50000 * 1.15
  });

  it('should handle various bid amounts', () => {
    expect(estimateAcquisitionTotal(10000)).toBe(11500);
    expect(estimateAcquisitionTotal(100000)).toBe(115000);
    expect(estimateAcquisitionTotal(250000)).toBe(287500);
  });

  it('should round to nearest dollar', () => {
    const estimate = estimateAcquisitionTotal(12345);
    expect(estimate).toBe(Math.round(12345 * 1.15));
  });

  it('should provide conservative estimate', () => {
    const estimate = estimateAcquisitionTotal(50000);
    const actual = calculateSimpleAcquisitionCosts(50000, 'PA');

    // Estimate should be in reasonable range
    // Actual PA costs are typically 10-13% above bid
    expect(estimate).toBeGreaterThanOrEqual(actual.totalAcquisition * 0.95);
    expect(estimate).toBeLessThanOrEqual(actual.totalAcquisition * 1.20);
  });

  it('should handle zero bid', () => {
    const estimate = estimateAcquisitionTotal(0);
    expect(estimate).toBe(0);
  });
});

// ============================================
// Integration Tests
// ============================================

describe('integration scenarios', () => {
  it('should calculate realistic costs for low-cost property', () => {
    const costs = calculateAcquisitionCosts({
      bidAmount: TEST_BID_AMOUNTS.low,
      state: 'PA',
      platform: 'county_direct',
    });

    // Total should be reasonable above bid
    // PA has 2% transfer tax which adds significant cost on top of other fees
    expect(costs.totalAcquisition).toBeGreaterThan(TEST_BID_AMOUNTS.low);
    expect(costs.totalAcquisition).toBeLessThan(TEST_BID_AMOUNTS.low * 1.30);
  });

  it('should calculate realistic costs for medium-cost property', () => {
    const costs = calculateAcquisitionCosts({
      bidAmount: TEST_BID_AMOUNTS.medium,
      state: 'FL',
      platform: 'bid4assets',
    });

    // Total should be 8-15% above bid
    expect(costs.totalAcquisition).toBeGreaterThan(TEST_BID_AMOUNTS.medium);
    expect(costs.totalAcquisition).toBeLessThan(TEST_BID_AMOUNTS.medium * 1.15);
  });

  it('should calculate realistic costs for high-cost property', () => {
    const costs = calculateAcquisitionCosts({
      bidAmount: TEST_BID_AMOUNTS.high,
      state: 'CA',
      platform: 'bid4assets',
      propertyValue: 180000,
    });

    // Total should be reasonable
    expect(costs.totalAcquisition).toBeGreaterThan(TEST_BID_AMOUNTS.high);
    expect(costs.totalAcquisition).toBeLessThan(TEST_BID_AMOUNTS.high * 1.20);
  });

  it('should show higher costs in attorney states', () => {
    const nyCosts = calculateAcquisitionCosts({
      bidAmount: 100000,
      state: 'NY',
    });

    const txCosts = calculateAcquisitionCosts({
      bidAmount: 100000,
      state: 'TX',
    });

    // NY should have higher legal fees
    expect(nyCosts.legalFees).toBeGreaterThan(txCosts.legalFees);
  });

  it('should show cost impact of transfer taxes', () => {
    const txCosts = calculateAcquisitionCosts({
      bidAmount: 100000,
      state: 'TX', // No transfer tax
    });

    const paCosts = calculateAcquisitionCosts({
      bidAmount: 100000,
      state: 'PA', // 2% transfer tax
    });

    // PA should have significantly higher transfer tax
    expect(paCosts.transferTax).toBe(2000);
    expect(txCosts.transferTax).toBe(0);
    expect(paCosts.totalAcquisition).toBeGreaterThan(txCosts.totalAcquisition);
  });

  it('should show platform premium impact', () => {
    const inPersonCosts = calculateAcquisitionCosts({
      bidAmount: 50000,
      state: 'PA',
      platform: 'in_person', // 2%
    });

    const bid4assetsCosts = calculateAcquisitionCosts({
      bidAmount: 50000,
      state: 'PA',
      platform: 'bid4assets', // 5%
    });

    expect(bid4assetsCosts.buyersPremium).toBeGreaterThan(inPersonCosts.buyersPremium);
    expect(bid4assetsCosts.buyersPremium).toBe(2500);
    expect(inPersonCosts.buyersPremium).toBe(1000);
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
    it(`should calculate acquisition costs for ${state}`, () => {
      const costs = calculateAcquisitionCosts({
        bidAmount: 50000,
        state,
      });

      expect(costs.totalAcquisition).toBeGreaterThan(0);
      expect(costs.totalAcquisition).toBeGreaterThan(costs.bidAmount);
      expect(costs.buyersPremium).toBeGreaterThanOrEqual(0);
      expect(costs.transferTax).toBeGreaterThanOrEqual(0);
      expect(costs.recordingFees).toBeGreaterThan(0);
      expect(costs.titleSearch).toBeGreaterThan(0);
      expect(costs.titleInsurance).toBeGreaterThan(0);
      expect(costs.legalFees).toBeGreaterThan(0);
    });
  });
});

/**
 * Selling Cost Calculator Tests
 *
 * Tests the selling cost calculation functions including:
 * - Agent commission calculation
 * - Seller closing costs calculation (state and county-specific)
 * - Staging cost calculation
 * - Marketing cost calculation
 * - Home warranty cost calculation
 * - Seller concessions calculation
 * - Complete selling cost breakdown
 * - Quick estimate and percentage functions
 *
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-22
 */

import { describe, it, expect } from 'vitest';
import {
  calculateAgentCommission,
  calculateClosingCosts,
  calculateStagingCosts,
  calculateMarketingCosts,
  calculateHomeWarrantyCost,
  calculateSellerConcessions,
  calculateSellingCosts,
  estimateSellingTotal,
  getSellingCostPercentage,
  type SellingCostInput,
} from '../selling';
import type { SaleStrategy, SellingCosts } from '@/types/costs';

// ============================================
// Test Fixtures
// ============================================

/**
 * Common sale prices for testing
 */
const TEST_SALE_PRICES = {
  low: 50000,
  medium: 200000,
  high: 500000,
  veryHigh: 1000000,
};

/**
 * Sample states with varying characteristics
 */
const TEST_STATES = {
  noTransferTax: 'TX',        // No transfer tax
  lowClosingCost: 'AZ',       // 0.9x multiplier
  standard: 'PA',             // 1.0x multiplier
  highClosingCost: 'NY',      // 1.5x multiplier, attorney required
  complexClosing: 'NJ',       // 1.4x multiplier
};

/**
 * Complete selling cost input for retail agent strategy
 */
const mockRetailAgentInput: SellingCostInput = {
  salePrice: 200000,
  state: 'PA',
  strategy: 'retail_agent',
  sqft: 1500,
  includeStaging: true,
  stagingLevel: 'partial',
  marketingLevel: 'standard',
  includeWarranty: true,
  marketCondition: 'normal',
};

/**
 * Complete selling cost input for FSBO strategy
 */
const mockFSBOInput: SellingCostInput = {
  salePrice: 200000,
  state: 'PA',
  strategy: 'retail_fsbo',
  sqft: 1500,
  includeStaging: true,
  stagingLevel: 'partial',
  marketingLevel: 'standard',
  includeWarranty: true,
  marketCondition: 'normal',
};

/**
 * Complete selling cost input for wholesale strategy
 */
const mockWholesaleInput: SellingCostInput = {
  salePrice: 150000,
  state: 'PA',
  strategy: 'wholesale',
  sqft: 1500,
  includeStaging: false,
  includeWarranty: false,
  marketCondition: 'normal',
};

/**
 * Complete selling cost input for auction strategy
 */
const mockAuctionInput: SellingCostInput = {
  salePrice: 200000,
  state: 'PA',
  strategy: 'auction',
  sqft: 1500,
  includeStaging: false,
  includeWarranty: false,
  marketCondition: 'normal',
};

/**
 * Minimal selling cost input
 */
const mockMinimalInput: SellingCostInput = {
  salePrice: 100000,
  state: 'CA',
};

// ============================================
// Agent Commission Tests
// ============================================

describe('calculateAgentCommission', () => {
  describe('default commission rates', () => {
    it('should calculate 6% commission by default', () => {
      const commission = calculateAgentCommission(200000);
      expect(commission).toBe(12000); // 200000 * 0.06
    });

    it('should include both agents by default', () => {
      const commission = calculateAgentCommission(200000, 0.06, true);
      expect(commission).toBe(12000);
    });
  });

  describe('custom commission rates', () => {
    it('should calculate 5% commission', () => {
      const commission = calculateAgentCommission(200000, 0.05);
      expect(commission).toBe(10000); // 200000 * 0.05
    });

    it('should calculate 4% commission', () => {
      const commission = calculateAgentCommission(200000, 0.04);
      expect(commission).toBe(8000);
    });

    it('should calculate 7% commission', () => {
      const commission = calculateAgentCommission(200000, 0.07);
      expect(commission).toBe(14000);
    });
  });

  describe('buyer agent options', () => {
    it('should calculate half commission when excluding buyer agent', () => {
      const commission = calculateAgentCommission(200000, 0.06, false);
      expect(commission).toBe(6000); // 200000 * 0.03
    });

    it('should calculate full commission when including buyer agent', () => {
      const commission = calculateAgentCommission(200000, 0.06, true);
      expect(commission).toBe(12000);
    });
  });

  describe('sale price variations', () => {
    it('should handle low sale prices', () => {
      const commission = calculateAgentCommission(50000);
      expect(commission).toBe(3000); // 50000 * 0.06
    });

    it('should handle high sale prices', () => {
      const commission = calculateAgentCommission(1000000);
      expect(commission).toBe(60000); // 1000000 * 0.06
    });

    it('should round to 2 decimal places', () => {
      const commission = calculateAgentCommission(123456);
      expect(commission).toBe(7407.36); // 123456 * 0.06
    });
  });

  describe('edge cases', () => {
    it('should handle zero sale price', () => {
      const commission = calculateAgentCommission(0);
      expect(commission).toBe(0);
    });

    it('should handle decimal sale prices', () => {
      const commission = calculateAgentCommission(200000.50);
      expect(commission).toBe(12000.03); // Rounded
    });

    it('should handle very small commission rates', () => {
      const commission = calculateAgentCommission(200000, 0.01);
      expect(commission).toBe(2000);
    });
  });
});

// ============================================
// Closing Costs Tests
// ============================================

describe('calculateClosingCosts', () => {
  describe('base closing costs', () => {
    it('should calculate 1.5% base closing costs', () => {
      const costs = calculateClosingCosts(200000, 'PA', false);
      // 200000 * 0.015 = 3000 (base only, no transfer tax)
      expect(costs).toBe(3000);
    });

    it('should apply state multiplier to base costs', () => {
      const paCosts = calculateClosingCosts(200000, 'PA', false);
      const nyCosts = calculateClosingCosts(200000, 'NY', false);

      // NY has 1.5x multiplier
      expect(nyCosts).toBeGreaterThan(paCosts);
      expect(nyCosts).toBe(4500); // 200000 * 0.015 * 1.5
    });
  });

  describe('state-specific adjustments', () => {
    it('should apply 1.5x multiplier for New York', () => {
      const costs = calculateClosingCosts(100000, 'NY', false);
      expect(costs).toBe(2250); // 100000 * 0.015 * 1.5
    });

    it('should apply 1.4x multiplier for New Jersey', () => {
      const costs = calculateClosingCosts(100000, 'NJ', false);
      expect(costs).toBe(2100); // 100000 * 0.015 * 1.4
    });

    it('should apply 1.3x multiplier for Connecticut', () => {
      const costs = calculateClosingCosts(100000, 'CT', false);
      expect(costs).toBe(1950); // 100000 * 0.015 * 1.3
    });

    it('should apply 1.3x multiplier for Massachusetts', () => {
      const costs = calculateClosingCosts(100000, 'MA', false);
      expect(costs).toBe(1950);
    });

    it('should apply 1.2x multiplier for Florida', () => {
      const costs = calculateClosingCosts(100000, 'FL', false);
      expect(costs).toBe(1800); // 100000 * 0.015 * 1.2
    });

    it('should apply 0.9x multiplier for Texas', () => {
      const costs = calculateClosingCosts(100000, 'TX', false);
      expect(costs).toBe(1350); // 100000 * 0.015 * 0.9
    });

    it('should apply 0.9x multiplier for Arizona', () => {
      const costs = calculateClosingCosts(100000, 'AZ', false);
      expect(costs).toBe(1350);
    });

    it('should apply 0.95x multiplier for Nevada', () => {
      const costs = calculateClosingCosts(100000, 'NV', false);
      expect(costs).toBe(1425); // 100000 * 0.015 * 0.95
    });

    it('should apply 1.0x multiplier for California', () => {
      const costs = calculateClosingCosts(100000, 'CA', false);
      expect(costs).toBe(1500); // 100000 * 0.015 * 1.0
    });

    it('should apply 1.0x multiplier for Pennsylvania', () => {
      const costs = calculateClosingCosts(100000, 'PA', false);
      expect(costs).toBe(1500);
    });

    it('should default to 1.0x multiplier for unknown states', () => {
      const costs = calculateClosingCosts(100000, 'ZZ', false);
      expect(costs).toBe(1500);
    });
  });

  describe('transfer tax inclusion', () => {
    it('should add transfer tax when includesTransferTax is true', () => {
      const costs = calculateClosingCosts(100000, 'PA', true);
      // Base: 100000 * 0.015 = 1500
      // Transfer tax PA: 100000 * 0.02 = 2000
      // Total: 3500
      expect(costs).toBe(3500);
    });

    it('should not add transfer tax when includesTransferTax is false', () => {
      const costs = calculateClosingCosts(100000, 'PA', false);
      expect(costs).toBe(1500); // Base only
    });

    it('should handle states with no transfer tax', () => {
      const costs = calculateClosingCosts(100000, 'TX', true);
      // Base: 100000 * 0.015 * 0.9 = 1350
      // Transfer tax TX: 0
      expect(costs).toBe(1350);
    });

    it('should handle states with high transfer tax', () => {
      const costs = calculateClosingCosts(100000, 'DE', true);
      // Base: 100000 * 0.015 = 1500
      // Transfer tax DE: 100000 * 0.04 = 4000
      // Total: 5500
      expect(costs).toBe(5500);
    });
  });

  describe('case insensitivity', () => {
    it('should handle lowercase state codes', () => {
      const costs = calculateClosingCosts(100000, 'pa', true);
      expect(costs).toBe(3500);
    });

    it('should handle mixed case state codes', () => {
      const costs = calculateClosingCosts(100000, 'Pa', true);
      expect(costs).toBe(3500);
    });
  });

  describe('edge cases', () => {
    it('should handle zero sale price', () => {
      const costs = calculateClosingCosts(0, 'PA', true);
      expect(costs).toBe(0);
    });

    it('should round to 2 decimal places', () => {
      const costs = calculateClosingCosts(123456, 'PA', true);
      // Base: 123456 * 0.015 = 1851.84
      // Transfer: 123456 * 0.02 = 2469.12
      // Total: 4320.96
      expect(costs).toBe(4320.96);
    });
  });
});

// ============================================
// Staging Costs Tests
// ============================================

describe('calculateStagingCosts', () => {
  describe('staging levels', () => {
    it('should return 0 for none staging', () => {
      const costs = calculateStagingCosts(1500, 'none', 2);
      expect(costs).toBe(0);
    });

    it('should calculate full staging costs', () => {
      const costs = calculateStagingCosts(1500, 'full', 2);
      // Initial: 1500 * 2.50 = 3750
      // Monthly: 600 * 2 = 1200
      // Total: 4950
      expect(costs).toBe(4950);
    });

    it('should calculate partial staging as 50% of full', () => {
      const fullCosts = calculateStagingCosts(1500, 'full', 2);
      const partialCosts = calculateStagingCosts(1500, 'partial', 2);
      expect(partialCosts).toBe(Math.round(fullCosts * 0.5));
      expect(partialCosts).toBe(2475); // 4950 / 2
    });
  });

  describe('square footage variations', () => {
    it('should handle small properties', () => {
      const costs = calculateStagingCosts(800, 'full', 1);
      // Initial: 800 * 2.50 = 2000
      // Monthly: 600 * 1 = 600
      // Total: 2600
      expect(costs).toBe(2600);
    });

    it('should handle large properties', () => {
      const costs = calculateStagingCosts(3000, 'full', 2);
      // Initial: 3000 * 2.50 = 7500
      // Monthly: 600 * 2 = 1200
      // Total: 8700
      expect(costs).toBe(8700);
    });

    it('should scale with square footage', () => {
      const small = calculateStagingCosts(1000, 'full', 1);
      const large = calculateStagingCosts(2000, 'full', 1);
      expect(large).toBeGreaterThan(small);
    });
  });

  describe('staging duration', () => {
    it('should handle 1 month staging', () => {
      const costs = calculateStagingCosts(1500, 'full', 1);
      // Initial: 1500 * 2.50 = 3750
      // Monthly: 600 * 1 = 600
      // Total: 4350
      expect(costs).toBe(4350);
    });

    it('should handle 3 month staging', () => {
      const costs = calculateStagingCosts(1500, 'full', 3);
      // Initial: 1500 * 2.50 = 3750
      // Monthly: 600 * 3 = 1800
      // Total: 5550
      expect(costs).toBe(5550);
    });

    it('should increase with more months', () => {
      const oneMonth = calculateStagingCosts(1500, 'full', 1);
      const threeMonths = calculateStagingCosts(1500, 'full', 3);
      expect(threeMonths).toBeGreaterThan(oneMonth);
    });
  });

  describe('default parameters', () => {
    it('should default to partial staging', () => {
      const costs = calculateStagingCosts(1500);
      const partialCosts = calculateStagingCosts(1500, 'partial', 1);
      expect(costs).toBe(partialCosts);
    });

    it('should default to 1 month', () => {
      const costs = calculateStagingCosts(1500, 'partial');
      // Initial: 1500 * 2.50 = 3750
      // Monthly: 600 * 1 = 600
      // Full total: 4350
      // Partial (50%): 2175
      expect(costs).toBe(2175);
    });
  });

  describe('edge cases', () => {
    it('should handle zero square footage', () => {
      const costs = calculateStagingCosts(0, 'full', 1);
      expect(costs).toBe(600); // Just monthly rental
    });

    it('should handle zero months', () => {
      const costs = calculateStagingCosts(1500, 'full', 0);
      expect(costs).toBe(3750); // Just initial setup
    });
  });
});

// ============================================
// Marketing Costs Tests
// ============================================

describe('calculateMarketingCosts', () => {
  describe('marketing levels', () => {
    it('should calculate basic marketing costs', () => {
      const costs = calculateMarketingCosts(200000, 'basic');
      expect(costs).toBe(500); // Base for basic
    });

    it('should calculate standard marketing costs', () => {
      const costs = calculateMarketingCosts(200000, 'standard');
      expect(costs).toBe(1000); // Base for standard
    });

    it('should calculate premium marketing costs', () => {
      const costs = calculateMarketingCosts(200000, 'premium');
      expect(costs).toBe(2500); // Base for premium
    });

    it('should have higher costs for premium vs standard', () => {
      const standard = calculateMarketingCosts(200000, 'standard');
      const premium = calculateMarketingCosts(200000, 'premium');
      expect(premium).toBeGreaterThan(standard);
    });

    it('should have higher costs for standard vs basic', () => {
      const basic = calculateMarketingCosts(200000, 'basic');
      const standard = calculateMarketingCosts(200000, 'standard');
      expect(standard).toBeGreaterThan(basic);
    });
  });

  describe('price-based scaling', () => {
    it('should use base cost for properties at $200k', () => {
      const costs = calculateMarketingCosts(200000, 'standard');
      expect(costs).toBe(1000);
    });

    it('should use base cost for properties below $200k', () => {
      const costs = calculateMarketingCosts(150000, 'standard');
      expect(costs).toBe(1000);
    });

    it('should add cost for properties above $200k', () => {
      const costs = calculateMarketingCosts(300000, 'standard');
      // Base: 1000
      // Additional: (300000 - 200000) * 0.002 = 200
      // Total: 1200
      expect(costs).toBe(1200);
    });

    it('should scale with price for high-value properties', () => {
      const costs = calculateMarketingCosts(500000, 'premium');
      // Base: 2500
      // Additional: (500000 - 200000) * 0.003 = 900
      // Total: 3400
      expect(costs).toBe(3400);
    });
  });

  describe('default parameters', () => {
    it('should default to standard marketing level', () => {
      const costs = calculateMarketingCosts(200000);
      expect(costs).toBe(1000);
    });
  });

  describe('edge cases', () => {
    it('should handle zero sale price', () => {
      const costs = calculateMarketingCosts(0, 'standard');
      expect(costs).toBe(1000); // Base only
    });

    it('should handle very high sale prices', () => {
      const costs = calculateMarketingCosts(1000000, 'premium');
      // Base: 2500
      // Additional: (1000000 - 200000) * 0.003 = 2400
      // Total: 4900
      expect(costs).toBe(4900);
    });

    it('should round to nearest dollar', () => {
      const costs = calculateMarketingCosts(250000, 'standard');
      expect(costs).toBe(1100); // No decimals
    });
  });
});

// ============================================
// Home Warranty Tests
// ============================================

describe('calculateHomeWarrantyCost', () => {
  describe('warranty inclusion', () => {
    it('should return 0 when warranty not included', () => {
      const cost = calculateHomeWarrantyCost(false);
      expect(cost).toBe(0);
    });

    it('should return cost when warranty included', () => {
      const cost = calculateHomeWarrantyCost(true);
      expect(cost).toBeGreaterThan(0);
    });
  });

  describe('coverage levels', () => {
    it('should calculate basic coverage cost', () => {
      const cost = calculateHomeWarrantyCost(true, 'basic');
      expect(cost).toBe(350);
    });

    it('should calculate standard coverage cost', () => {
      const cost = calculateHomeWarrantyCost(true, 'standard');
      expect(cost).toBe(500);
    });

    it('should calculate premium coverage cost', () => {
      const cost = calculateHomeWarrantyCost(true, 'premium');
      expect(cost).toBe(700);
    });

    it('should have increasing costs from basic to premium', () => {
      const basic = calculateHomeWarrantyCost(true, 'basic');
      const standard = calculateHomeWarrantyCost(true, 'standard');
      const premium = calculateHomeWarrantyCost(true, 'premium');

      expect(standard).toBeGreaterThan(basic);
      expect(premium).toBeGreaterThan(standard);
    });
  });

  describe('default parameters', () => {
    it('should default to including warranty', () => {
      const cost = calculateHomeWarrantyCost();
      expect(cost).toBe(500); // Standard coverage
    });

    it('should default to standard coverage', () => {
      const cost = calculateHomeWarrantyCost(true);
      expect(cost).toBe(500);
    });
  });
});

// ============================================
// Seller Concessions Tests
// ============================================

describe('calculateSellerConcessions', () => {
  describe('market conditions', () => {
    it('should return 0 for hot market', () => {
      const concessions = calculateSellerConcessions(200000, 'hot', 'good');
      expect(concessions).toBe(0);
    });

    it('should return 1% for normal market with good property', () => {
      const concessions = calculateSellerConcessions(200000, 'normal', 'good');
      expect(concessions).toBe(2000); // 200000 * 0.01
    });

    it('should return 2% for slow market with good property', () => {
      const concessions = calculateSellerConcessions(200000, 'slow', 'good');
      expect(concessions).toBe(4000); // 200000 * 0.02
    });
  });

  describe('property conditions', () => {
    it('should reduce concessions for excellent property', () => {
      const excellent = calculateSellerConcessions(200000, 'normal', 'excellent');
      const good = calculateSellerConcessions(200000, 'normal', 'good');

      expect(excellent).toBeLessThan(good);
      expect(excellent).toBe(0); // 1% - 1% = 0%
    });

    it('should maintain concessions for good property', () => {
      const concessions = calculateSellerConcessions(200000, 'normal', 'good');
      expect(concessions).toBe(2000); // 1% base
    });

    it('should increase concessions for fair property', () => {
      const concessions = calculateSellerConcessions(200000, 'normal', 'fair');
      expect(concessions).toBe(3000); // 1% + 0.5% = 1.5%
    });

    it('should increase concessions more for poor property', () => {
      const concessions = calculateSellerConcessions(200000, 'normal', 'poor');
      expect(concessions).toBe(4000); // 1% + 1% = 2%
    });
  });

  describe('combined factors', () => {
    it('should handle slow market with poor property', () => {
      const concessions = calculateSellerConcessions(200000, 'slow', 'poor');
      expect(concessions).toBe(6000); // 2% + 1% = 3%
    });

    it('should handle hot market with excellent property', () => {
      const concessions = calculateSellerConcessions(200000, 'hot', 'excellent');
      expect(concessions).toBe(0); // 0% - 1% = max(0, -1%) = 0%
    });

    it('should never return negative concessions', () => {
      const concessions = calculateSellerConcessions(200000, 'hot', 'excellent');
      expect(concessions).toBeGreaterThanOrEqual(0);
    });
  });

  describe('default parameters', () => {
    it('should default to normal market', () => {
      const concessions = calculateSellerConcessions(200000);
      const normal = calculateSellerConcessions(200000, 'normal', 'fair');
      expect(concessions).toBe(normal);
    });

    it('should default to fair property condition', () => {
      const concessions = calculateSellerConcessions(200000, 'normal');
      expect(concessions).toBe(3000); // 1.5%
    });
  });

  describe('edge cases', () => {
    it('should handle zero sale price', () => {
      const concessions = calculateSellerConcessions(0, 'normal', 'fair');
      expect(concessions).toBe(0);
    });

    it('should handle high sale prices', () => {
      const concessions = calculateSellerConcessions(1000000, 'slow', 'poor');
      expect(concessions).toBe(30000); // 3%
    });
  });
});

// ============================================
// Complete Selling Costs Tests
// ============================================

describe('calculateSellingCosts', () => {
  describe('complete cost breakdown', () => {
    it('should return all required cost components', () => {
      const costs = calculateSellingCosts(mockRetailAgentInput);

      expect(costs).toHaveProperty('agentCommission');
      expect(costs).toHaveProperty('closingCosts');
      expect(costs).toHaveProperty('staging');
      expect(costs).toHaveProperty('marketing');
      expect(costs).toHaveProperty('homeWarranty');
      expect(costs).toHaveProperty('sellerConcessions');
      expect(costs).toHaveProperty('totalSelling');
    });

    it('should calculate total as sum of all components', () => {
      const costs = calculateSellingCosts(mockRetailAgentInput);

      const expectedTotal =
        costs.agentCommission +
        costs.closingCosts +
        costs.staging +
        costs.marketing +
        costs.homeWarranty +
        costs.sellerConcessions;

      expect(costs.totalSelling).toBeCloseTo(expectedTotal, 2);
    });
  });

  describe('retail_agent strategy', () => {
    it('should calculate 6% agent commission', () => {
      const costs = calculateSellingCosts(mockRetailAgentInput);
      expect(costs.agentCommission).toBe(12000); // 200000 * 0.06
    });

    it('should include seller-paid transfer tax', () => {
      const costs = calculateSellingCosts(mockRetailAgentInput);
      // PA transfer tax should be included
      expect(costs.closingCosts).toBeGreaterThan(3000); // Base + transfer tax
    });

    it('should include staging costs', () => {
      const costs = calculateSellingCosts(mockRetailAgentInput);
      expect(costs.staging).toBeGreaterThan(0);
    });

    it('should include marketing costs', () => {
      const costs = calculateSellingCosts(mockRetailAgentInput);
      expect(costs.marketing).toBeGreaterThan(0);
    });

    it('should include home warranty', () => {
      const costs = calculateSellingCosts(mockRetailAgentInput);
      expect(costs.homeWarranty).toBe(500); // Standard
    });

    it('should include seller concessions', () => {
      const costs = calculateSellingCosts(mockRetailAgentInput);
      expect(costs.sellerConcessions).toBeGreaterThan(0);
    });
  });

  describe('retail_fsbo strategy', () => {
    it('should calculate 3% commission (buyer agent only)', () => {
      const costs = calculateSellingCosts(mockFSBOInput);
      expect(costs.agentCommission).toBe(6000); // 200000 * 0.03
    });

    it('should include seller-paid transfer tax', () => {
      const costs = calculateSellingCosts(mockFSBOInput);
      expect(costs.closingCosts).toBeGreaterThan(3000);
    });

    it('should include staging costs', () => {
      const costs = calculateSellingCosts(mockFSBOInput);
      expect(costs.staging).toBeGreaterThan(0);
    });

    it('should include marketing costs', () => {
      const costs = calculateSellingCosts(mockFSBOInput);
      expect(costs.marketing).toBeGreaterThan(0);
    });

    it('should include home warranty', () => {
      const costs = calculateSellingCosts(mockFSBOInput);
      expect(costs.homeWarranty).toBe(500);
    });

    it('should have lower total than retail_agent', () => {
      const fsbo = calculateSellingCosts(mockFSBOInput);
      const agent = calculateSellingCosts(mockRetailAgentInput);
      expect(fsbo.totalSelling).toBeLessThan(agent.totalSelling);
    });
  });

  describe('wholesale strategy', () => {
    it('should have zero agent commission', () => {
      const costs = calculateSellingCosts(mockWholesaleInput);
      expect(costs.agentCommission).toBe(0);
    });

    it('should not include seller-paid transfer tax', () => {
      const costs = calculateSellingCosts(mockWholesaleInput);
      // Should be lower (no transfer tax)
      expect(costs.closingCosts).toBe(2250); // 150000 * 0.015
    });

    it('should have zero staging costs', () => {
      const costs = calculateSellingCosts(mockWholesaleInput);
      expect(costs.staging).toBe(0);
    });

    it('should have zero marketing costs', () => {
      const costs = calculateSellingCosts(mockWholesaleInput);
      expect(costs.marketing).toBe(0);
    });

    it('should have zero home warranty', () => {
      const costs = calculateSellingCosts(mockWholesaleInput);
      expect(costs.homeWarranty).toBe(0);
    });

    it('should have zero seller concessions', () => {
      const costs = calculateSellingCosts(mockWholesaleInput);
      expect(costs.sellerConcessions).toBe(0);
    });

    it('should have lowest total costs', () => {
      const wholesale = calculateSellingCosts(mockWholesaleInput);
      const agent = calculateSellingCosts(mockRetailAgentInput);
      expect(wholesale.totalSelling).toBeLessThan(agent.totalSelling);
    });
  });

  describe('auction strategy', () => {
    it('should calculate 2% auction fee', () => {
      const costs = calculateSellingCosts(mockAuctionInput);
      expect(costs.agentCommission).toBe(4000); // 200000 * 0.02
    });

    it('should include seller-paid transfer tax', () => {
      const costs = calculateSellingCosts(mockAuctionInput);
      expect(costs.closingCosts).toBeGreaterThan(3000);
    });

    it('should have zero staging costs', () => {
      const costs = calculateSellingCosts(mockAuctionInput);
      expect(costs.staging).toBe(0);
    });

    it('should have zero marketing costs', () => {
      const costs = calculateSellingCosts(mockAuctionInput);
      expect(costs.marketing).toBe(0);
    });

    it('should have zero home warranty', () => {
      const costs = calculateSellingCosts(mockAuctionInput);
      expect(costs.homeWarranty).toBe(0);
    });
  });

  describe('optional parameters', () => {
    it('should respect includeStaging false', () => {
      const input: SellingCostInput = {
        ...mockRetailAgentInput,
        includeStaging: false,
      };
      const costs = calculateSellingCosts(input);
      expect(costs.staging).toBe(0);
    });

    it('should respect includeWarranty false', () => {
      const input: SellingCostInput = {
        ...mockRetailAgentInput,
        includeWarranty: false,
      };
      const costs = calculateSellingCosts(input);
      expect(costs.homeWarranty).toBe(0);
    });

    it('should use concessionsOverride when provided', () => {
      const input: SellingCostInput = {
        ...mockRetailAgentInput,
        concessionsOverride: 5000,
      };
      const costs = calculateSellingCosts(input);
      expect(costs.sellerConcessions).toBe(5000);
    });

    it('should respect stagingLevel parameter', () => {
      const fullInput: SellingCostInput = {
        ...mockRetailAgentInput,
        stagingLevel: 'full',
      };
      const partialInput: SellingCostInput = {
        ...mockRetailAgentInput,
        stagingLevel: 'partial',
      };

      const fullCosts = calculateSellingCosts(fullInput);
      const partialCosts = calculateSellingCosts(partialInput);

      expect(fullCosts.staging).toBeGreaterThan(partialCosts.staging);
    });

    it('should respect marketingLevel parameter', () => {
      const premiumInput: SellingCostInput = {
        ...mockRetailAgentInput,
        marketingLevel: 'premium',
      };
      const basicInput: SellingCostInput = {
        ...mockRetailAgentInput,
        marketingLevel: 'basic',
      };

      const premiumCosts = calculateSellingCosts(premiumInput);
      const basicCosts = calculateSellingCosts(basicInput);

      expect(premiumCosts.marketing).toBeGreaterThan(basicCosts.marketing);
    });
  });

  describe('minimal input handling', () => {
    it('should handle minimal input with defaults', () => {
      const costs = calculateSellingCosts(mockMinimalInput);

      expect(costs.agentCommission).toBeGreaterThan(0);
      expect(costs.closingCosts).toBeGreaterThan(0);
      expect(costs.totalSelling).toBeGreaterThan(0);
    });

    it('should use default strategy (retail_agent)', () => {
      const costs = calculateSellingCosts(mockMinimalInput);
      expect(costs.agentCommission).toBe(6000); // 100000 * 0.06
    });
  });

  describe('rounding', () => {
    it('should round total to 2 decimal places', () => {
      const costs = calculateSellingCosts(mockRetailAgentInput);
      expect(costs.totalSelling).toBe(
        Math.round(costs.totalSelling * 100) / 100
      );
    });
  });
});

// ============================================
// Quick Estimate Tests
// ============================================

describe('estimateSellingTotal', () => {
  it('should estimate selling costs for retail_agent strategy', () => {
    const estimate = estimateSellingTotal(200000, 'PA', 'retail_agent');
    expect(estimate).toBeGreaterThan(0);
  });

  it('should estimate selling costs for wholesale strategy', () => {
    const estimate = estimateSellingTotal(200000, 'PA', 'wholesale');
    expect(estimate).toBeGreaterThan(0);
  });

  it('should have lower estimate for wholesale than retail', () => {
    const wholesale = estimateSellingTotal(200000, 'PA', 'wholesale');
    const retail = estimateSellingTotal(200000, 'PA', 'retail_agent');
    expect(wholesale).toBeLessThan(retail);
  });

  it('should not include staging for wholesale', () => {
    const estimate = estimateSellingTotal(200000, 'PA', 'wholesale');
    const detailed = calculateSellingCosts({
      salePrice: 200000,
      state: 'PA',
      strategy: 'wholesale',
    });
    expect(detailed.staging).toBe(0);
    expect(estimate).toBe(detailed.totalSelling);
  });

  it('should include staging for retail strategies', () => {
    const estimate = estimateSellingTotal(200000, 'PA', 'retail_agent');
    const detailed = calculateSellingCosts({
      salePrice: 200000,
      state: 'PA',
      strategy: 'retail_agent',
      includeStaging: true,
    });
    expect(detailed.staging).toBeGreaterThan(0);
  });

  it('should default to retail_agent strategy', () => {
    const estimate = estimateSellingTotal(200000, 'PA');
    const retail = estimateSellingTotal(200000, 'PA', 'retail_agent');
    expect(estimate).toBe(retail);
  });

  it('should handle various sale prices', () => {
    expect(estimateSellingTotal(50000, 'PA')).toBeGreaterThan(0);
    expect(estimateSellingTotal(200000, 'PA')).toBeGreaterThan(0);
    expect(estimateSellingTotal(500000, 'PA')).toBeGreaterThan(0);
  });

  it('should scale appropriately with price', () => {
    const low = estimateSellingTotal(50000, 'PA', 'retail_agent');
    const high = estimateSellingTotal(500000, 'PA', 'retail_agent');
    expect(high).toBeGreaterThan(low);
  });
});

// ============================================
// Selling Cost Percentage Tests
// ============================================

describe('getSellingCostPercentage', () => {
  it('should return percentage for retail_agent strategy', () => {
    const percentage = getSellingCostPercentage('retail_agent', 'PA');
    expect(percentage).toBeGreaterThan(0);
    expect(percentage).toBeLessThanOrEqual(1); // Should be decimal (not > 100%)
  });

  it('should return percentage for wholesale strategy', () => {
    const percentage = getSellingCostPercentage('wholesale', 'PA');
    expect(percentage).toBeGreaterThan(0);
    expect(percentage).toBeLessThan(0.05); // Wholesale should be < 5%
  });

  it('should return percentage for retail_fsbo strategy', () => {
    const percentage = getSellingCostPercentage('retail_fsbo', 'PA');
    expect(percentage).toBeGreaterThan(0);
  });

  it('should return percentage for auction strategy', () => {
    const percentage = getSellingCostPercentage('auction', 'PA');
    expect(percentage).toBeGreaterThan(0);
  });

  it('should have lower percentage for wholesale than retail', () => {
    const wholesale = getSellingCostPercentage('wholesale', 'PA');
    const retail = getSellingCostPercentage('retail_agent', 'PA');
    expect(wholesale).toBeLessThan(retail);
  });

  it('should have lower percentage for FSBO than full agent', () => {
    const fsbo = getSellingCostPercentage('retail_fsbo', 'PA');
    const agent = getSellingCostPercentage('retail_agent', 'PA');
    expect(fsbo).toBeLessThan(agent);
  });

  it('should vary by state', () => {
    const pa = getSellingCostPercentage('retail_agent', 'PA');
    const tx = getSellingCostPercentage('retail_agent', 'TX');
    // Different states may have different percentages due to transfer tax
    expect(Math.abs(pa - tx)).toBeGreaterThan(0);
  });

  it('should round to 3 decimal places', () => {
    const percentage = getSellingCostPercentage('retail_agent', 'PA');
    const rounded = Math.round(percentage * 1000) / 1000;
    expect(percentage).toBe(rounded);
  });
});

// ============================================
// Integration Tests
// ============================================

describe('integration scenarios', () => {
  it('should calculate realistic costs for low-price property', () => {
    const costs = calculateSellingCosts({
      salePrice: TEST_SALE_PRICES.low,
      state: 'PA',
      strategy: 'retail_agent',
      sqft: 1000,
    });

    expect(costs.totalSelling).toBeGreaterThan(0);
    expect(costs.totalSelling).toBeLessThan(TEST_SALE_PRICES.low); // Shouldn't exceed sale price
  });

  it('should calculate realistic costs for medium-price property', () => {
    const costs = calculateSellingCosts({
      salePrice: TEST_SALE_PRICES.medium,
      state: 'PA',
      strategy: 'retail_agent',
      sqft: 1500,
    });

    expect(costs.totalSelling).toBeGreaterThan(0);
    // Typical selling costs are 10-15% of sale price
    expect(costs.totalSelling / TEST_SALE_PRICES.medium).toBeGreaterThan(0.08);
    expect(costs.totalSelling / TEST_SALE_PRICES.medium).toBeLessThan(0.20);
  });

  it('should calculate realistic costs for high-price property', () => {
    const costs = calculateSellingCosts({
      salePrice: TEST_SALE_PRICES.high,
      state: 'CA',
      strategy: 'retail_agent',
      sqft: 2500,
      marketingLevel: 'premium',
    });

    expect(costs.totalSelling).toBeGreaterThan(0);
    expect(costs.marketing).toBeGreaterThan(2500); // Premium for high-value
  });

  it('should show cost differences between strategies', () => {
    const salePrice = 200000;
    const state = 'PA';

    const retail = calculateSellingCosts({ salePrice, state, strategy: 'retail_agent' });
    const fsbo = calculateSellingCosts({ salePrice, state, strategy: 'retail_fsbo' });
    const wholesale = calculateSellingCosts({ salePrice, state, strategy: 'wholesale' });
    const auction = calculateSellingCosts({ salePrice, state, strategy: 'auction' });

    expect(retail.totalSelling).toBeGreaterThan(fsbo.totalSelling);
    expect(fsbo.totalSelling).toBeGreaterThan(auction.totalSelling);
    expect(auction.totalSelling).toBeGreaterThan(wholesale.totalSelling);
  });

  it('should show impact of market conditions on concessions', () => {
    const hotMarket = calculateSellingCosts({
      salePrice: 200000,
      state: 'PA',
      marketCondition: 'hot',
    });

    const slowMarket = calculateSellingCosts({
      salePrice: 200000,
      state: 'PA',
      marketCondition: 'slow',
    });

    expect(slowMarket.sellerConcessions).toBeGreaterThan(hotMarket.sellerConcessions);
  });

  it('should show state cost variations', () => {
    const paCosts = calculateSellingCosts({
      salePrice: 200000,
      state: 'PA', // High transfer tax
      strategy: 'retail_agent',
    });

    const txCosts = calculateSellingCosts({
      salePrice: 200000,
      state: 'TX', // No transfer tax
      strategy: 'retail_agent',
    });

    // PA should have higher closing costs due to transfer tax
    expect(paCosts.closingCosts).toBeGreaterThan(txCosts.closingCosts);
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
    it(`should calculate selling costs for ${state}`, () => {
      const costs = calculateSellingCosts({
        salePrice: 200000,
        state,
        strategy: 'retail_agent',
      });

      expect(costs.totalSelling).toBeGreaterThan(0);
      expect(costs.agentCommission).toBeGreaterThan(0);
      expect(costs.closingCosts).toBeGreaterThan(0);
    });
  });
});

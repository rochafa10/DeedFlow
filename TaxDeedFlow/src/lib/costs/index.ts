/**
 * Cost Estimation Engine - Module Exports
 *
 * This file re-exports all cost estimation functionality from a single entry point.
 * Import from '@/lib/costs' for access to all calculators and utilities.
 *
 * @module lib/costs
 * @author Claude Code Agent
 * @date 2026-01-16
 *
 * @example
 * // Import specific functions
 * import { calculateTotalCosts, getRegionalMultiplier } from '@/lib/costs';
 *
 * // Import all
 * import * as CostEngine from '@/lib/costs';
 */

// ============================================
// Type Re-exports
// ============================================

// Re-export all types from the types module
export type {
  // Regional types
  RegionalMultiplier,
  MetroMultiplier,

  // Acquisition types
  AcquisitionCosts,
  AuctionPlatform,

  // Rehab types
  ExteriorCosts,
  InteriorCosts,
  StructuralCosts,
  RehabBreakdown,
  PropertyCondition,
  RehabScope,

  // Holding types
  HoldingBreakdown,
  FinancingParams,

  // Selling types
  SellingCosts,
  SaleStrategy,

  // Combined types
  CostBreakdown,
  CostConfidence,
  CostInputs,
  CostCalculationResult,
  CostSummary,

  // Data types
  PropertyCostData,
  RegridCostData,
} from '@/types/costs';

// ============================================
// Constants Re-exports
// ============================================

export {
  // Regional multipliers
  REGIONAL_MULTIPLIERS,
  METRO_OVERRIDES,

  // Default costs
  DEFAULT_COSTS,

  // Cost per sqft tables
  REHAB_COSTS_PER_SQFT,
  CONDITION_MULTIPLIERS,
  BUYERS_PREMIUM_RATES,
  TRANSFER_TAX_RATES,

  // Helper functions
  getRegionalMultiplier,
  getTransferTaxRate,
  getBuyersPremiumRate,
  getRehabCostPerSqft,
  getConditionMultiplier,
  getAgeMultiplier,
  isValidState,
  getSupportedStates,
} from './constants';

// ============================================
// Acquisition Calculator Re-exports
// ============================================

export {
  // Main calculator
  calculateAcquisitionCosts,

  // Component calculators
  calculateBuyersPremium,
  calculateTransferTax,
  calculateTitleCosts,
  calculateRecordingFees,
  calculateLegalFees,

  // Simplified versions
  calculateSimpleAcquisitionCosts,
  estimateAcquisitionTotal,

  // Types
  type AcquisitionCostInput,
  type TitleCosts,
} from './acquisition';

// ============================================
// Rehab Calculator Re-exports
// ============================================

export {
  // Main calculator
  calculateRehabCosts,

  // Component calculators
  estimateExteriorCosts,
  estimateInteriorCosts,
  estimateStructuralCosts,
  applyRegionalMultipliers,

  // Confidence calculation
  calculateRehabConfidence,

  // Simplified versions
  estimateRehabTotal,
  getRehabCostRange,
  getAdjustedCostPerSqft,

  // Types
  type RehabCostInput,
} from './rehab';

// ============================================
// Holding Calculator Re-exports
// ============================================

export {
  // Main calculator
  calculateHoldingCosts,

  // Component calculators
  estimateMonthlyTaxes,
  estimateMonthlyInsurance,
  estimateUtilities,
  estimateMonthlyMaintenance,
  calculateMonthlyLoanPayment,

  // Simplified versions
  estimateHoldingTotal,
  getHoldingRatePer1000,

  // Types
  type HoldingCostInput,
  type PropertyInsuranceType,
} from './holding';

// ============================================
// Selling Calculator Re-exports
// ============================================

export {
  // Main calculator
  calculateSellingCosts,

  // Component calculators
  calculateAgentCommission,
  calculateClosingCosts,
  calculateStagingCosts,
  calculateMarketingCosts,
  calculateHomeWarrantyCost,
  calculateSellerConcessions,

  // Simplified versions
  estimateSellingTotal,
  getSellingCostPercentage,

  // Types
  type SellingCostInput,
} from './selling';

// ============================================
// Main Calculator Re-exports
// ============================================

export {
  // Version
  COST_ENGINE_VERSION,

  // Main calculator
  calculateTotalCosts,

  // Enhanced versions
  calculateCostsWithMetadata,
  getCostSummary,

  // Simplified versions
  quickEstimate,

  // Analysis functions
  calculateProfit,
  calculateMaxBid,
} from './calculator';

// ============================================
// Default Export
// ============================================

/**
 * Default export providing the main calculator function
 * and commonly used utilities
 */
export default {
  // Main entry point
  calculate: calculateTotalCosts,

  // Quick utilities
  quickEstimate,
  calculateProfit,
  calculateMaxBid,

  // Version
  version: COST_ENGINE_VERSION,
};

// Re-import for default export
import { calculateTotalCosts, quickEstimate, calculateProfit, calculateMaxBid, COST_ENGINE_VERSION } from './calculator';

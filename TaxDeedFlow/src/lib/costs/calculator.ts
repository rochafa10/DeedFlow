/**
 * Cost Estimation Engine - Main Calculator
 *
 * This is the primary entry point for cost calculations. It combines
 * all cost categories (acquisition, rehab, holding, selling) into a
 * comprehensive cost breakdown with contingency and warnings.
 *
 * @module lib/costs/calculator
 * @author Claude Code Agent
 * @date 2026-01-16
 */

import type {
  CostBreakdown,
  CostInputs,
  CostConfidence,
  CostCalculationResult,
  CostSummary,
  AcquisitionCosts,
  RehabBreakdown,
  HoldingBreakdown,
  SellingCosts,
} from '@/types/costs';

import { DEFAULT_COSTS, getRegionalMultiplier, isValidState } from './constants';
import { calculateAcquisitionCosts } from './acquisition';
import { calculateRehabCosts, calculateRehabConfidence } from './rehab';
import { calculateHoldingCosts } from './holding';
import { calculateSellingCosts } from './selling';

// ============================================
// Cost Engine Version
// ============================================

/**
 * Version string for the cost estimation engine
 * Update when making significant changes to calculations
 */
export const COST_ENGINE_VERSION = '1.0.0';

// ============================================
// Input Validation
// ============================================

/**
 * Validation result for cost inputs
 */
interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate cost calculation inputs
 *
 * @param inputs - Cost calculation inputs
 * @returns Validation result with errors and warnings
 */
function validateInputs(inputs: CostInputs): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!inputs.bidAmount || inputs.bidAmount <= 0) {
    errors.push('Bid amount must be greater than zero');
  }

  if (!inputs.salePrice || inputs.salePrice <= 0) {
    errors.push('Sale price (ARV) must be greater than zero');
  }

  if (!inputs.state) {
    errors.push('State is required');
  } else if (!isValidState(inputs.state)) {
    warnings.push(`State '${inputs.state}' not recognized, using default multipliers`);
  }

  // Logical validations
  if (inputs.bidAmount && inputs.salePrice && inputs.bidAmount >= inputs.salePrice) {
    warnings.push('Bid amount equals or exceeds expected sale price - verify numbers');
  }

  if (inputs.bidAmount && inputs.propertyValue && inputs.bidAmount > inputs.propertyValue * 0.9) {
    warnings.push('Bid amount is close to property value - limited margin');
  }

  // Reasonableness checks
  if (inputs.holdingMonths && inputs.holdingMonths > 24) {
    warnings.push('Holding period exceeds 24 months - extended timeline');
  }

  if (inputs.sqft && (inputs.sqft < 400 || inputs.sqft > 10000)) {
    warnings.push('Square footage outside typical range (400-10000 sqft)');
  }

  if (inputs.yearBuilt) {
    const age = new Date().getFullYear() - inputs.yearBuilt;
    if (age > 100) {
      warnings.push('Property over 100 years old - rehab costs may be higher');
    }
    if (age < 0) {
      errors.push('Year built cannot be in the future');
    }
  }

  // Financing validation
  if (inputs.financing?.isFinanced) {
    if (!inputs.financing.loanAmount || inputs.financing.loanAmount <= 0) {
      errors.push('Loan amount required when financing');
    }
    if (!inputs.financing.interestRate || inputs.financing.interestRate <= 0) {
      warnings.push('Interest rate not specified, using default 8%');
    }
    if (inputs.financing.loanAmount && inputs.bidAmount &&
        inputs.financing.loanAmount > inputs.bidAmount) {
      warnings.push('Loan amount exceeds bid amount');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================
// Confidence Calculation
// ============================================

/**
 * Calculate overall confidence level based on data quality
 *
 * @param inputs - Cost calculation inputs
 * @param rehabConfidence - Confidence from rehab calculation
 * @returns Overall confidence level
 */
function calculateOverallConfidence(
  inputs: CostInputs,
  rehabConfidence: CostConfidence
): CostConfidence {
  let score = 0;

  // Bid amount known (+20)
  if (inputs.bidAmount > 0) score += 20;

  // Sale price known (+15)
  if (inputs.salePrice > 0) score += 15;

  // State known (+10)
  if (inputs.state && isValidState(inputs.state)) score += 10;

  // Square footage known (+15)
  if (inputs.sqft && inputs.sqft > 0) score += 15;

  // Year built known (+10)
  if (inputs.yearBuilt && inputs.yearBuilt > 1800) score += 10;

  // Assessed value known (+10)
  if (inputs.assessedValue && inputs.assessedValue > 0) score += 10;

  // Annual taxes known (+10)
  if (inputs.annualTaxes && inputs.annualTaxes > 0) score += 10;

  // Rehab confidence bonus
  if (rehabConfidence === 'high') score += 10;
  else if (rehabConfidence === 'medium') score += 5;

  if (score >= 80) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
}

/**
 * Calculate data quality score (0-100)
 *
 * @param inputs - Cost calculation inputs
 * @returns Data quality score
 */
function calculateDataQuality(inputs: CostInputs): number {
  let score = 0;
  const maxScore = 100;

  // Required fields (50 points)
  if (inputs.bidAmount > 0) score += 15;
  if (inputs.salePrice > 0) score += 15;
  if (inputs.state && isValidState(inputs.state)) score += 10;
  if (inputs.rehabLevel) score += 10;

  // Property details (30 points)
  if (inputs.sqft && inputs.sqft > 0) score += 10;
  if (inputs.yearBuilt && inputs.yearBuilt > 1800) score += 10;
  if (inputs.condition) score += 10;

  // Financial details (20 points)
  if (inputs.assessedValue && inputs.assessedValue > 0) score += 7;
  if (inputs.annualTaxes && inputs.annualTaxes > 0) score += 7;
  if (inputs.holdingMonths && inputs.holdingMonths > 0) score += 6;

  return Math.min(maxScore, score);
}

// ============================================
// Contingency Calculation
// ============================================

/**
 * Calculate contingency amount based on confidence and scope
 *
 * @param totalCosts - Sum of all costs before contingency
 * @param confidence - Confidence level in estimates
 * @param rehabLevel - Rehab scope level
 * @returns Contingency amount in dollars
 */
function calculateContingency(
  totalCosts: number,
  confidence: CostConfidence,
  rehabLevel?: string
): number {
  // Base contingency rate
  let rate = DEFAULT_COSTS.contingencyRate; // 10%

  // Adjust for confidence level
  if (confidence === 'low') {
    rate *= 1.5; // 15% for low confidence
  } else if (confidence === 'high') {
    rate *= 0.8; // 8% for high confidence
  }

  // Adjust for rehab scope
  if (rehabLevel === 'gut' || rehabLevel === 'heavy') {
    rate *= 1.2; // Higher contingency for major rehabs
  } else if (rehabLevel === 'cosmetic') {
    rate *= 0.8; // Lower contingency for simple updates
  }

  return Math.round(totalCosts * rate);
}

// ============================================
// Warning Generation
// ============================================

/**
 * Generate warnings based on calculated costs
 *
 * @param costs - Calculated cost breakdown
 * @param inputs - Original inputs
 * @returns Array of warning messages
 */
function generateWarnings(
  acquisition: AcquisitionCosts,
  rehab: RehabBreakdown,
  holding: HoldingBreakdown,
  selling: SellingCosts,
  totalCosts: number,
  inputs: CostInputs
): string[] {
  const warnings: string[] = [];

  // Profit margin warning
  const profit = inputs.salePrice - totalCosts;
  const profitMargin = profit / inputs.salePrice;
  if (profitMargin < 0.15) {
    warnings.push(`Low profit margin (${(profitMargin * 100).toFixed(1)}%) - target is typically 15-20%`);
  }
  if (profit < 0) {
    warnings.push('NEGATIVE PROFIT - costs exceed expected sale price');
  }

  // Rehab cost warnings
  if (inputs.sqft && rehab.totalRehab > inputs.sqft * 100) {
    warnings.push('Rehab costs exceed $100/sqft - verify condition assessment');
  }
  if (rehab.totalRehab > inputs.bidAmount * 0.5) {
    warnings.push('Rehab costs exceed 50% of bid amount - significant renovation');
  }

  // Holding period warnings
  if (holding.holdingPeriodMonths > 12) {
    warnings.push('Extended holding period increases carrying costs and risk');
  }
  if (holding.totalHolding > inputs.bidAmount * 0.1) {
    warnings.push('Holding costs exceed 10% of bid amount');
  }

  // Acquisition cost warnings
  if (acquisition.buyersPremium > inputs.bidAmount * 0.08) {
    warnings.push("High buyer's premium - verify auction platform fees");
  }

  // Selling cost warnings
  if (selling.totalSelling > inputs.salePrice * 0.15) {
    warnings.push('Selling costs exceed 15% of sale price');
  }

  // Regional warnings
  const multiplier = getRegionalMultiplier(inputs.state, inputs.metro);
  if (multiplier.labor > 1.3) {
    warnings.push(`High labor cost region (${(multiplier.labor * 100 - 100).toFixed(0)}% above average)`);
  }

  return warnings;
}

// ============================================
// Main Calculator Function
// ============================================

/**
 * Calculate complete cost breakdown for a property investment
 *
 * This is the main entry point for the cost estimation engine.
 * It combines all cost categories and provides a comprehensive
 * breakdown with contingency and warnings.
 *
 * @param inputs - Complete cost calculation inputs
 * @returns Complete cost breakdown with all categories
 *
 * @throws Error if required inputs are missing or invalid
 *
 * @example
 * const costs = calculateTotalCosts({
 *   bidAmount: 50000,
 *   propertyValue: 60000,
 *   rehabLevel: 'moderate',
 *   holdingMonths: 6,
 *   salePrice: 150000,
 *   state: 'PA',
 *   county: 'Blair',
 *   sqft: 1500,
 *   yearBuilt: 1970,
 * });
 *
 * console.log(costs.grandTotal); // Total investment including contingency
 * console.log(costs.warnings); // Any warnings about the estimate
 */
export function calculateTotalCosts(inputs: CostInputs): CostBreakdown {
  // Validate inputs
  const validation = validateInputs(inputs);
  if (!validation.isValid) {
    throw new Error(`Invalid inputs: ${validation.errors.join(', ')}`);
  }

  // Extract inputs with defaults
  const {
    bidAmount,
    propertyValue,
    assessedValue,
    rehabLevel,
    condition = 'fair',
    holdingMonths = DEFAULT_COSTS.holding.defaultHoldingMonths,
    salePrice,
    state,
    county,
    metro,
    sqft,
    yearBuilt,
    annualTaxes,
    financing,
    auctionPlatform = 'other',
    saleStrategy = 'retail_agent',
    monthlyHoa,
  } = inputs;

  // Calculate acquisition costs
  const acquisition = calculateAcquisitionCosts({
    bidAmount,
    state,
    county,
    platform: auctionPlatform,
    propertyValue: propertyValue || bidAmount,
  });

  // Calculate rehab costs
  const rehab = calculateRehabCosts({
    property: {
      sqft,
      yearBuilt,
      state,
      city: metro,
      county,
    },
    condition,
    scope: rehabLevel,
    state,
    metro,
  });

  // Calculate rehab confidence
  const rehabConfidence = calculateRehabConfidence(
    { sqft, yearBuilt, state, city: metro, county },
    undefined,
    condition
  );

  // Calculate holding costs
  const holding = calculateHoldingCosts({
    assessedValue: assessedValue || (propertyValue ? propertyValue * 0.8 : bidAmount * 0.8),
    propertyValue: propertyValue || bidAmount,
    sqft: sqft || 1500,
    state,
    county,
    holdingMonths,
    monthlyTaxesOverride: annualTaxes ? annualTaxes / 12 : undefined,
    monthlyHoa,
    financing,
  });

  // Calculate selling costs
  const selling = calculateSellingCosts({
    salePrice,
    state,
    strategy: saleStrategy,
    sqft: sqft || 1500,
    includeStaging: saleStrategy !== 'wholesale',
    includeWarranty: saleStrategy !== 'wholesale',
  });

  // Calculate total costs before contingency
  const totalCosts =
    acquisition.totalAcquisition +
    rehab.totalRehab +
    holding.totalHolding +
    selling.totalSelling;

  // Calculate confidence and data quality
  const confidence = calculateOverallConfidence(inputs, rehabConfidence);
  const dataQuality = calculateDataQuality(inputs);

  // Calculate contingency
  const contingency = calculateContingency(totalCosts, confidence, rehabLevel);

  // Generate warnings
  const inputWarnings = validation.warnings;
  const calculatedWarnings = generateWarnings(
    acquisition,
    rehab,
    holding,
    selling,
    totalCosts + contingency,
    inputs
  );
  const allWarnings = [...inputWarnings, ...calculatedWarnings];

  // Calculate grand total
  const grandTotal = totalCosts + contingency;

  return {
    acquisition,
    rehab,
    holding,
    selling,
    totalCosts: Math.round(totalCosts * 100) / 100,
    contingency,
    grandTotal: Math.round(grandTotal * 100) / 100,
    confidence,
    dataQuality,
    warnings: allWarnings,
  };
}

// ============================================
// Convenience Functions
// ============================================

/**
 * Calculate total costs with full result metadata
 *
 * @param inputs - Cost calculation inputs
 * @returns Full calculation result with metadata
 */
export function calculateCostsWithMetadata(inputs: CostInputs): CostCalculationResult {
  const costs = calculateTotalCosts(inputs);
  const multipliers = getRegionalMultiplier(inputs.state, inputs.metro);

  return {
    costs,
    inputs,
    multipliers: {
      labor: multipliers.labor,
      materials: multipliers.materials,
      region: inputs.metro || inputs.state,
    },
    calculatedAt: new Date().toISOString(),
    engineVersion: COST_ENGINE_VERSION,
  };
}

/**
 * Get a simplified cost summary
 *
 * @param inputs - Cost calculation inputs
 * @returns Simplified cost summary for display
 */
export function getCostSummary(inputs: CostInputs): CostSummary {
  const costs = calculateTotalCosts(inputs);

  return {
    totalInvestment: costs.grandTotal,
    acquisitionTotal: costs.acquisition.totalAcquisition,
    rehabTotal: costs.rehab.totalRehab,
    holdingTotal: costs.holding.totalHolding,
    sellingTotal: costs.selling.totalSelling,
    contingency: costs.contingency,
    confidence: costs.confidence,
    topWarnings: costs.warnings.slice(0, 3),
  };
}

/**
 * Quick estimate total investment with minimal inputs
 *
 * @param bidAmount - Bid/purchase amount
 * @param salePrice - Expected sale price (ARV)
 * @param state - Two-letter state code
 * @param rehabLevel - Rehab scope level
 * @returns Estimated total investment
 */
export function quickEstimate(
  bidAmount: number,
  salePrice: number,
  state: string,
  rehabLevel: 'cosmetic' | 'light' | 'moderate' | 'heavy' | 'gut' = 'moderate'
): number {
  const costs = calculateTotalCosts({
    bidAmount,
    propertyValue: bidAmount,
    rehabLevel,
    holdingMonths: 6,
    salePrice,
    state,
  });

  return costs.grandTotal;
}

/**
 * Calculate potential profit from an investment
 *
 * @param inputs - Cost calculation inputs
 * @returns Profit analysis
 */
export function calculateProfit(inputs: CostInputs): {
  grossProfit: number;
  netProfit: number;
  profitMargin: number;
  roi: number;
  cashOnCashReturn: number;
} {
  const costs = calculateTotalCosts(inputs);

  const grossProfit = inputs.salePrice - inputs.bidAmount;
  const netProfit = inputs.salePrice - costs.grandTotal;

  // Guard against division by zero for profitMargin and roi
  const profitMargin = inputs.salePrice > 0 ? netProfit / inputs.salePrice : 0;
  const roi = costs.grandTotal > 0 ? netProfit / costs.grandTotal : 0;

  // Cash-on-cash calculation with division by zero guard
  // For financed deals, cash invested = total - loan amount
  const cashInvested = inputs.financing?.isFinanced
    ? Math.max(0, costs.grandTotal - (inputs.financing.loanAmount || 0))
    : costs.grandTotal;
  const cashOnCashReturn = cashInvested > 0 ? netProfit / cashInvested : 0;

  return {
    grossProfit: Math.round(grossProfit),
    netProfit: Math.round(netProfit),
    profitMargin: Math.round(profitMargin * 1000) / 1000,
    roi: Math.round(roi * 1000) / 1000,
    cashOnCashReturn: Math.round(cashOnCashReturn * 1000) / 1000,
  };
}

/**
 * Calculate maximum bid to achieve target profit margin
 *
 * @param salePrice - Expected sale price (ARV)
 * @param state - Two-letter state code
 * @param targetMargin - Target profit margin (decimal, e.g., 0.20 for 20%)
 * @param rehabLevel - Rehab scope level
 * @returns Maximum bid amount
 */
export function calculateMaxBid(
  salePrice: number,
  state: string,
  targetMargin: number = 0.20,
  rehabLevel: 'cosmetic' | 'light' | 'moderate' | 'heavy' | 'gut' = 'moderate'
): number {
  // Work backwards from target profit
  // targetProfit = salePrice * targetMargin
  // netProfit = salePrice - totalCosts = targetProfit
  // totalCosts = salePrice - targetProfit = salePrice * (1 - targetMargin)

  // Estimate costs as percentage of sale price
  // Acquisition: ~15% of bid (which is ~10-15% of sale)
  // Rehab: varies by scope
  // Holding: ~3% of sale
  // Selling: ~12% of sale
  // Contingency: ~10% of above

  const rehabRates: Record<string, number> = {
    cosmetic: 0.08,
    light: 0.12,
    moderate: 0.18,
    heavy: 0.25,
    gut: 0.35,
  };

  const rehabPct = rehabRates[rehabLevel] ?? 0.18;

  // Total non-bid costs as % of sale price
  // (rehab + holding + selling) * (1 + contingency)
  const nonBidCostsPct = (rehabPct + 0.03 + 0.12) * 1.10;

  // Available for bid and acquisition
  const availableForAcquisition = salePrice * (1 - targetMargin - nonBidCostsPct);

  // Acquisition is ~115% of bid (bid + 15% closing/fees)
  const maxBid = availableForAcquisition / 1.15;

  return Math.max(0, Math.round(maxBid));
}

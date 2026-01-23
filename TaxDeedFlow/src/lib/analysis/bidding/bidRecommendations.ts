/**
 * Bid Recommendation Engine
 *
 * Core engine for generating bid recommendations with conservative,
 * moderate, and aggressive bid ranges based on property analysis,
 * ARV estimates, and risk factors.
 *
 * Implements the 70% rule with adjustable multipliers for different
 * risk tolerances and confidence levels.
 *
 * @module lib/analysis/bidding/bidRecommendations
 * @author Claude Code Agent
 * @date 2026-01-23
 */

import type {
  BidRecommendation,
  BidRecommendationInput,
  BidRange,
  RiskWarning,
  ConfidenceFactors,
  CalculationBasis,
  RiskSeverity,
  CalculationMethod,
} from './types';

// ============================================
// Constants and Configuration
// ============================================

/**
 * Recommendation algorithm version for tracking
 */
const RECOMMENDATION_VERSION = '1.0.0';

/**
 * Default selling cost percentage (typical for real estate transactions)
 * Includes agent commission, closing costs, transfer taxes
 */
const DEFAULT_SELLING_COST_PERCENT = 0.08; // 8%

/**
 * ARV multipliers for different risk levels
 * These define how much of ARV can be allocated to purchase, rehab, and selling costs
 */
const ARV_MULTIPLIERS = {
  /** Most conservative - highest safety margin (30-35% gross margin) */
  conservative: 0.65,
  /** Balanced approach - standard 70% rule (30% gross margin) */
  moderate: 0.70,
  /** Aggressive - thinner margins, higher risk (25% gross margin) */
  aggressive: 0.75,
};

/**
 * Confidence level adjustments based on ARV confidence
 */
const CONFIDENCE_ADJUSTMENTS = {
  low: 0.90,    // Reduce bid by 10% for uncertain ARV
  medium: 0.95, // Reduce bid by 5% for moderate confidence
  high: 1.0,    // No adjustment for high confidence
};

/**
 * Default target ROI percentage
 */
const DEFAULT_TARGET_ROI = 25; // 25%

/**
 * Minimum acceptable profit threshold
 */
const MINIMUM_PROFIT_THRESHOLD = 5000;

// ============================================
// Main Bid Recommendation Generator
// ============================================

/**
 * Generate a complete bid recommendation with conservative, moderate, and aggressive ranges
 *
 * @param input - Recommendation input containing ARV, costs, and quality scores
 * @returns Complete bid recommendation with ranges, warnings, and analysis
 *
 * @example
 * ```typescript
 * const recommendation = calculateBidRecommendation({
 *   propertyId: 'prop-123',
 *   arv: 150000,
 *   arvConfidence: 'high',
 *   rehabCost: 30000,
 *   closingCosts: 3000,
 *   holdingCosts: 2000,
 *   targetROI: 25,
 *   openingBid: 50000,
 * });
 * console.log(recommendation.bidRange.moderate); // 72000
 * ```
 */
export function calculateBidRecommendation(
  input: BidRecommendationInput
): Omit<BidRecommendation, 'id' | 'createdAt' | 'updatedAt'> {
  const {
    propertyId,
    arv,
    arvConfidence,
    rehabCost,
    closingCosts,
    holdingCosts,
    targetROI = DEFAULT_TARGET_ROI,
    openingBid,
    marketValue,
    assessedValue,
    comparablesCount,
    dataQualityScore,
    riskScore,
  } = input;

  // Calculate confidence adjustment factor
  const confidenceAdjustment = CONFIDENCE_ADJUSTMENTS[arvConfidence];

  // Calculate bid ranges
  const bidRange = calculateBidRanges(
    arv,
    rehabCost,
    closingCosts,
    holdingCosts,
    confidenceAdjustment
  );

  // Calculate confidence level
  const confidenceLevel = calculateConfidenceLevel(
    arvConfidence,
    dataQualityScore,
    comparablesCount
  );

  // Generate risk warnings
  const riskWarnings = generateRiskWarnings(
    bidRange,
    openingBid,
    arv,
    rehabCost,
    riskScore
  );

  // Determine if opening bid exceeds our max recommendation
  const exceedsMaxBid = openingBid ? openingBid > bidRange.aggressive : false;

  // Calculate total investment at moderate bid
  const totalInvestment = bidRange.moderate + rehabCost + closingCosts + holdingCosts;

  // Calculate expected ROI projection at moderate bid
  const sellingCosts = arv * DEFAULT_SELLING_COST_PERCENT;
  const netProfit = arv - totalInvestment - sellingCosts;
  const roiProjection = (netProfit / totalInvestment) * 100;

  // Build calculation basis for transparency
  const calculationBasis: CalculationBasis = {
    arv,
    rehabCost,
    closingCosts,
    holdingCosts,
    targetROI,
    totalInvestment,
    arvMethod: determineARVMethod(comparablesCount, marketValue, assessedValue),
    comparablesCount,
    arvConfidence,
  };

  // Calculate confidence factors breakdown
  const confidenceFactors = calculateConfidenceFactors(
    arvConfidence,
    dataQualityScore,
    comparablesCount
  );

  return {
    propertyId,
    bidRange,
    confidenceLevel,
    roiProjection,
    riskWarnings: riskWarnings.length > 0 ? riskWarnings : undefined,
    riskScore,
    calculationBasis,
    arvEstimate: arv,
    rehabCostEstimate: rehabCost,
    closingCosts,
    holdingCosts,
    marketValue,
    assessedValue,
    comparablePropertiesCount: comparablesCount,
    openingBid,
    exceedsMaxBid,
    recommendationVersion: RECOMMENDATION_VERSION,
    calculationMethod: calculationBasis.arvMethod,
    dataQualityScore,
  };
}

// ============================================
// Bid Range Calculation
// ============================================

/**
 * Calculate conservative, moderate, and aggressive bid ranges
 *
 * Uses the 70% rule with adjustments:
 * - Conservative: 65% of ARV (safest, highest profit margin)
 * - Moderate: 70% of ARV (standard recommendation)
 * - Aggressive: 75% of ARV (maximum, thinner margins)
 *
 * Formula: Max Bid = (ARV * Multiplier * ConfidenceAdj) - Rehab - Selling Costs - Holding Costs
 *
 * @param arv - After Repair Value estimate
 * @param rehabCost - Estimated renovation costs
 * @param closingCosts - Closing costs estimate
 * @param holdingCosts - Holding costs estimate
 * @param confidenceAdjustment - Adjustment factor based on ARV confidence (0.9-1.0)
 * @returns Bid ranges for three risk levels
 */
export function calculateBidRanges(
  arv: number,
  rehabCost: number,
  closingCosts: number,
  holdingCosts: number,
  confidenceAdjustment: number = 1.0
): BidRange {
  const sellingCosts = arv * DEFAULT_SELLING_COST_PERCENT;

  // Calculate conservative bid (safest)
  const conservativeRaw =
    arv * ARV_MULTIPLIERS.conservative * confidenceAdjustment -
    rehabCost -
    sellingCosts -
    holdingCosts -
    closingCosts;

  // Calculate moderate bid (recommended)
  const moderateRaw =
    arv * ARV_MULTIPLIERS.moderate * confidenceAdjustment -
    rehabCost -
    sellingCosts -
    holdingCosts -
    closingCosts;

  // Calculate aggressive bid (maximum)
  const aggressiveRaw =
    arv * ARV_MULTIPLIERS.aggressive * confidenceAdjustment -
    rehabCost -
    sellingCosts -
    holdingCosts -
    closingCosts;

  return {
    conservative: Math.max(0, Math.round(conservativeRaw / 100) * 100),
    moderate: Math.max(0, Math.round(moderateRaw / 100) * 100),
    aggressive: Math.max(0, Math.round(aggressiveRaw / 100) * 100),
  };
}

// ============================================
// Risk Warning Generation
// ============================================

/**
 * Generate risk warnings based on bid analysis
 *
 * Checks for:
 * - Opening bid exceeding recommended max
 * - Thin profit margins
 * - High risk properties
 * - Insufficient data quality
 *
 * @param bidRange - Calculated bid ranges
 * @param openingBid - Property's minimum/opening bid
 * @param arv - After Repair Value estimate
 * @param rehabCost - Renovation cost estimate
 * @param riskScore - Risk score from risk analysis (0-25, higher is safer)
 * @returns Array of risk warnings
 */
export function generateRiskWarnings(
  bidRange: BidRange,
  openingBid: number | undefined,
  arv: number,
  rehabCost: number,
  riskScore: number | undefined
): RiskWarning[] {
  const warnings: RiskWarning[] = [];

  // Warning: Opening bid exceeds our maximum recommendation
  if (openingBid && openingBid > bidRange.aggressive) {
    const excessAmount = openingBid - bidRange.aggressive;
    const excessPercent = ((excessAmount / bidRange.aggressive) * 100).toFixed(1);
    warnings.push({
      type: 'opening_bid_exceeds_max',
      severity: 'critical',
      message: `Opening bid ($${openingBid.toLocaleString()}) exceeds our maximum recommended bid by $${excessAmount.toLocaleString()} (${excessPercent}%). This deal may not be profitable.`,
    });
  }

  // Warning: Opening bid exceeds moderate recommendation (but within aggressive)
  if (
    openingBid &&
    openingBid > bidRange.moderate &&
    openingBid <= bidRange.aggressive
  ) {
    warnings.push({
      type: 'thin_margin',
      severity: 'medium',
      message: `Opening bid ($${openingBid.toLocaleString()}) is above our moderate recommendation. Profit margins will be thin. Only bid if you have high confidence in ARV and costs.`,
    });
  }

  // Warning: Thin margin between bids
  const bidSpread = bidRange.aggressive - bidRange.conservative;
  const bidSpreadPercent = (bidSpread / bidRange.conservative) * 100;
  if (bidSpreadPercent < 10) {
    warnings.push({
      type: 'narrow_bid_range',
      severity: 'medium',
      message: `Narrow bid range indicates tight margins. Exercise caution and verify all cost estimates carefully.`,
    });
  }

  // Warning: High rehab costs relative to ARV
  const rehabToARV = (rehabCost / arv) * 100;
  if (rehabToARV > 40) {
    warnings.push({
      type: 'high_rehab_cost',
      severity: 'high',
      message: `Rehab costs (${rehabToARV.toFixed(1)}% of ARV) are very high. Ensure your cost estimates are accurate and consider contingencies.`,
    });
  }

  // Warning: Low risk score (higher risk)
  if (riskScore !== undefined && riskScore < 12) {
    let severity: RiskSeverity = 'medium';
    if (riskScore < 8) severity = 'high';
    if (riskScore < 5) severity = 'critical';

    warnings.push({
      type: 'high_risk_property',
      severity,
      message: `Property has a low risk score (${riskScore}/25), indicating elevated investment risk. Review risk analysis carefully before bidding.`,
    });
  }

  // Warning: Very low conservative bid (potential data quality issue)
  if (bidRange.conservative < 1000) {
    warnings.push({
      type: 'data_quality',
      severity: 'high',
      message: `Very low bid recommendation may indicate incomplete data or unfavorable deal economics. Verify all inputs before proceeding.`,
    });
  }

  return warnings;
}

// ============================================
// Confidence Calculation
// ============================================

/**
 * Calculate overall confidence level in the bid recommendation
 *
 * Based on:
 * - ARV confidence (low/medium/high)
 * - Data quality score (0-1)
 * - Number of comparables used
 *
 * @param arvConfidence - Confidence in ARV estimate
 * @param dataQualityScore - Overall data quality (0-1)
 * @param comparablesCount - Number of comparable properties used
 * @returns Confidence level (0.0 to 1.0)
 */
export function calculateConfidenceLevel(
  arvConfidence: 'low' | 'medium' | 'high',
  dataQualityScore: number | undefined,
  comparablesCount: number | undefined
): number {
  // Base confidence from ARV confidence
  let confidence = 0.5;
  switch (arvConfidence) {
    case 'low':
      confidence = 0.4;
      break;
    case 'medium':
      confidence = 0.65;
      break;
    case 'high':
      confidence = 0.85;
      break;
  }

  // Adjust based on data quality score
  if (dataQualityScore !== undefined) {
    confidence = confidence * 0.6 + dataQualityScore * 0.4;
  }

  // Boost confidence with more comparables
  if (comparablesCount !== undefined) {
    if (comparablesCount >= 5) {
      confidence += 0.05;
    }
    if (comparablesCount >= 10) {
      confidence += 0.05;
    }
    if (comparablesCount < 3) {
      confidence -= 0.1;
    }
  }

  // Clamp to 0.0-1.0 range
  return Math.max(0.0, Math.min(1.0, confidence));
}

/**
 * Calculate detailed confidence factors breakdown
 *
 * @param arvConfidence - Confidence in ARV estimate
 * @param dataQualityScore - Overall data quality (0-1)
 * @param comparablesCount - Number of comparable properties used
 * @returns Breakdown of confidence factors
 */
export function calculateConfidenceFactors(
  arvConfidence: 'low' | 'medium' | 'high',
  dataQualityScore: number | undefined,
  comparablesCount: number | undefined
): ConfidenceFactors {
  // Comparables quality based on ARV confidence and count
  let comparablesQuality = 0.5;
  switch (arvConfidence) {
    case 'low':
      comparablesQuality = 0.3;
      break;
    case 'medium':
      comparablesQuality = 0.6;
      break;
    case 'high':
      comparablesQuality = 0.85;
      break;
  }
  if (comparablesCount && comparablesCount >= 5) {
    comparablesQuality = Math.min(1.0, comparablesQuality + 0.1);
  }

  // Cost estimate accuracy (assume 80% baseline, adjust with data quality)
  const costEstimateAccuracy = dataQualityScore
    ? dataQualityScore * 0.5 + 0.4
    : 0.7;

  // Property data completeness from data quality score
  const propertyDataCompleteness = dataQualityScore ?? 0.7;

  // Market data freshness (assume 85% baseline - would need actual data age)
  const marketDataFreshness = 0.85;

  return {
    comparablesQuality,
    costEstimateAccuracy,
    propertyDataCompleteness,
    marketDataFreshness,
  };
}

// ============================================
// Helper Functions
// ============================================

/**
 * Determine the primary ARV calculation method used
 *
 * @param comparablesCount - Number of comparables used
 * @param marketValue - Current market value
 * @param assessedValue - Tax assessed value
 * @returns Primary calculation method
 */
function determineARVMethod(
  comparablesCount: number | undefined,
  marketValue: number | undefined,
  assessedValue: number | undefined
): CalculationMethod {
  if (comparablesCount && comparablesCount >= 3) {
    return 'arv_based';
  }
  if (marketValue && assessedValue) {
    return 'hybrid';
  }
  if (marketValue) {
    return 'market_value_based';
  }
  if (assessedValue) {
    return 'assessed_value_based';
  }
  return 'hybrid';
}

/**
 * Validate bid recommendation input
 *
 * @param input - Recommendation input
 * @returns Validation errors (empty array if valid)
 */
export function validateBidRecommendationInput(
  input: BidRecommendationInput
): string[] {
  const errors: string[] = [];

  if (input.arv <= 0) {
    errors.push('ARV must be greater than 0');
  }

  if (input.rehabCost < 0) {
    errors.push('Rehab cost cannot be negative');
  }

  if (input.closingCosts < 0) {
    errors.push('Closing costs cannot be negative');
  }

  if (input.holdingCosts < 0) {
    errors.push('Holding costs cannot be negative');
  }

  if (input.targetROI && input.targetROI < 0) {
    errors.push('Target ROI cannot be negative');
  }

  if (input.dataQualityScore !== undefined) {
    if (input.dataQualityScore < 0 || input.dataQualityScore > 1) {
      errors.push('Data quality score must be between 0 and 1');
    }
  }

  if (input.riskScore !== undefined) {
    if (input.riskScore < 0 || input.riskScore > 25) {
      errors.push('Risk score must be between 0 and 25');
    }
  }

  return errors;
}

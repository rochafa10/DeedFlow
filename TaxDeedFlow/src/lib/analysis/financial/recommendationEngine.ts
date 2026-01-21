/**
 * Investment Recommendation Engine - Phase 8D
 *
 * Core engine for generating investment recommendations based on
 * financial metrics, risk scores, and market conditions.
 *
 * Implements the 70% rule for maximum bid calculation and
 * threshold-based verdict determination.
 *
 * @module lib/analysis/financial/recommendationEngine
 * @author Claude Code Agent
 * @date 2026-01-16
 */

import type {
  InvestmentMetrics,
  InvestmentRecommendation,
  RecommendationInput,
  RecommendationVerdict,
  ExitStrategy,
  RecommendationThresholds,
} from './types';
import type { CostBreakdown } from '@/types/costs';

// ============================================
// Threshold Configuration
// ============================================

/**
 * Investment recommendation thresholds
 * These define the criteria for each verdict level
 */
export const THRESHOLDS: RecommendationThresholds = {
  strongBuy: {
    minROI: 30,
    minProfitMargin: 25,
    maxPriceToARV: 0.65,
    minRiskScore: 18,
  },
  buy: {
    minROI: 20,
    minProfitMargin: 15,
    maxPriceToARV: 0.70,
    minRiskScore: 12,
  },
  hold: {
    minROI: 10,
    minProfitMargin: 8,
    maxPriceToARV: 0.75,
    minRiskScore: 8,
  },
  pass: {
    minROI: 5,
    maxPriceToARV: 0.80,
  },
};

/**
 * Selling cost percentage (typical for real estate transactions)
 * Includes agent commission, closing costs, transfer taxes
 */
const DEFAULT_SELLING_COST_PERCENT = 0.08; // 8%

/**
 * Minimum profit threshold in dollars
 * Deals below this are not worth the effort
 */
const MINIMUM_PROFIT_THRESHOLD = 5000;

// ============================================
// Main Recommendation Generator
// ============================================

/**
 * Generate a complete investment recommendation
 *
 * @param input - Recommendation input containing metrics, costs, and scores
 * @returns Complete investment recommendation with verdict, max bid, and analysis
 *
 * @example
 * ```typescript
 * const recommendation = generateRecommendation({
 *   metrics: calculatedMetrics,
 *   costs: costBreakdown,
 *   riskScore: 18,
 *   locationScore: 20,
 *   marketScore: 15,
 *   comparablesConfidence: 'high',
 *   propertyCondition: 'fair',
 * });
 * console.log(recommendation.verdict); // 'buy'
 * console.log(recommendation.maxBid); // 45000
 * ```
 */
export function generateRecommendation(
  input: RecommendationInput
): InvestmentRecommendation {
  const { metrics, costs, riskScore, locationScore, marketScore, comparablesConfidence, propertyCondition } = input;

  // Determine the verdict based on metrics and thresholds
  const verdict = determineVerdict(metrics, riskScore);

  // Calculate maximum recommended bid using 70% rule
  const maxBid = calculateMaxBid(costs, verdict, comparablesConfidence);

  // Determine the best exit strategy
  const exitStrategy = determineExitStrategy(metrics, costs, propertyCondition);

  // Calculate confidence in the recommendation
  const confidence = calculateRecommendationConfidence(
    comparablesConfidence,
    riskScore,
    locationScore,
    marketScore,
    metrics
  );

  // Identify key factors, risks, and opportunities
  const keyFactors = identifyKeyFactors(metrics, riskScore, locationScore, marketScore);
  const risks = identifyRisks(metrics, riskScore, costs, propertyCondition);
  const opportunities = identifyOpportunities(metrics, locationScore, marketScore, costs);

  // Estimate timeline based on exit strategy
  const timelineMonths = estimateTimeline(exitStrategy, propertyCondition);

  // Calculate target profit at max bid
  const arvEstimate = costs.acquisition.bidAmount / metrics.priceToARV;
  const totalCostsAtMaxBid = maxBid + costs.rehab.totalRehab + costs.holding.totalHolding + costs.selling.totalSelling;
  const targetProfit = arvEstimate - totalCostsAtMaxBid;

  return {
    verdict,
    confidence,
    maxBid,
    targetProfit: Math.max(0, targetProfit),
    keyFactors,
    risks,
    opportunities,
    exitStrategy,
    timelineMonths,
  };
}

// ============================================
// Verdict Determination
// ============================================

/**
 * Determine investment verdict by comparing metrics against thresholds
 *
 * @param metrics - Calculated investment metrics
 * @param riskScore - Risk score from risk analysis (0-25, higher is safer)
 * @returns Investment verdict (strong_buy, buy, hold, pass, avoid)
 */
export function determineVerdict(
  metrics: InvestmentMetrics,
  riskScore: number
): RecommendationVerdict {
  const { roi, profitMargin, priceToARV, netProfit } = metrics;

  // First check if minimum profit threshold is met
  if (netProfit < MINIMUM_PROFIT_THRESHOLD) {
    return 'avoid';
  }

  // Check Strong Buy criteria (all must be met)
  if (
    roi >= THRESHOLDS.strongBuy.minROI &&
    profitMargin >= (THRESHOLDS.strongBuy.minProfitMargin ?? 0) &&
    priceToARV <= THRESHOLDS.strongBuy.maxPriceToARV &&
    riskScore >= (THRESHOLDS.strongBuy.minRiskScore ?? 0)
  ) {
    return 'strong_buy';
  }

  // Check Buy criteria
  if (
    roi >= THRESHOLDS.buy.minROI &&
    profitMargin >= (THRESHOLDS.buy.minProfitMargin ?? 0) &&
    priceToARV <= THRESHOLDS.buy.maxPriceToARV &&
    riskScore >= (THRESHOLDS.buy.minRiskScore ?? 0)
  ) {
    return 'buy';
  }

  // Check Hold criteria
  if (
    roi >= THRESHOLDS.hold.minROI &&
    profitMargin >= (THRESHOLDS.hold.minProfitMargin ?? 0) &&
    priceToARV <= THRESHOLDS.hold.maxPriceToARV &&
    riskScore >= (THRESHOLDS.hold.minRiskScore ?? 0)
  ) {
    return 'hold';
  }

  // Check Pass criteria (minimum viable deal)
  if (
    roi >= THRESHOLDS.pass.minROI &&
    priceToARV <= THRESHOLDS.pass.maxPriceToARV
  ) {
    return 'pass';
  }

  // Below all thresholds
  return 'avoid';
}

// ============================================
// Maximum Bid Calculation
// ============================================

/**
 * Calculate maximum recommended bid using the 70% rule
 *
 * Formula: Max Bid = ARV * 0.70 - Rehab - Selling Costs
 *
 * The 70% rule ensures a minimum 30% gross margin to cover
 * holding costs, unexpected expenses, and profit.
 *
 * @param costs - Complete cost breakdown
 * @param verdict - Current verdict (used to adjust conservativeness)
 * @param comparablesConfidence - Confidence in ARV estimate
 * @returns Maximum recommended bid amount
 */
export function calculateMaxBid(
  costs: CostBreakdown,
  verdict: RecommendationVerdict,
  comparablesConfidence: 'low' | 'medium' | 'high'
): number {
  // Extract values from costs
  const purchasePrice = costs.acquisition.bidAmount;
  const rehabCosts = costs.rehab.totalRehab;
  const holdingCosts = costs.holding.totalHolding;
  const sellingCosts = costs.selling.totalSelling;

  // Estimate ARV from price-to-ARV ratio if available
  // This is a simplified calculation - in production, use actual ARV from comparables
  // For now, we'll use the total investment to estimate a target price
  const totalInvestment = purchasePrice + rehabCosts + holdingCosts;
  const estimatedSellingCostsPercent = sellingCosts / (totalInvestment * 1.5) || DEFAULT_SELLING_COST_PERCENT;

  // Apply the 70% rule with adjustments based on confidence
  let arvMultiplier = 0.70;

  // Adjust multiplier based on comparables confidence
  switch (comparablesConfidence) {
    case 'low':
      arvMultiplier = 0.65; // More conservative with uncertain ARV
      break;
    case 'medium':
      arvMultiplier = 0.68;
      break;
    case 'high':
      arvMultiplier = 0.70;
      break;
  }

  // Further adjust based on verdict (more conservative for weaker deals)
  switch (verdict) {
    case 'avoid':
    case 'pass':
      arvMultiplier -= 0.05; // Extra cushion for marginal deals
      break;
    case 'hold':
      arvMultiplier -= 0.02;
      break;
    case 'buy':
      // Keep standard multiplier
      break;
    case 'strong_buy':
      arvMultiplier += 0.02; // Can be slightly more aggressive
      break;
  }

  // Calculate ARV estimate (reverse engineer from current metrics)
  // ARV = PurchasePrice / PriceToARV ratio
  // For max bid calculation, we need to work backward
  // Max Bid = ARV * multiplier - Rehab - Selling Costs

  // Estimate ARV based on typical investment scenarios
  // This assumes the current purchase price plus costs should yield ~30% ROI
  const targetROI = 0.30;
  const estimatedARV = (totalInvestment * (1 + targetROI)) / (1 - estimatedSellingCostsPercent);

  // Apply 70% rule
  const maxBidRaw = estimatedARV * arvMultiplier - rehabCosts - (estimatedARV * DEFAULT_SELLING_COST_PERCENT);

  // Ensure max bid is positive and reasonable
  const maxBid = Math.max(0, Math.round(maxBidRaw / 100) * 100); // Round to nearest $100

  return maxBid;
}

/**
 * Calculate maximum bid directly from known ARV
 * Use this when you have a reliable ARV estimate
 *
 * @param arv - After Repair Value
 * @param rehabCosts - Total rehabilitation costs
 * @param sellingCostsPercent - Selling costs as percentage of ARV
 * @param confidenceAdjustment - Adjustment factor based on confidence (0.95-1.05)
 * @returns Maximum recommended bid
 */
export function calculateMaxBidFromARV(
  arv: number,
  rehabCosts: number,
  sellingCostsPercent: number = DEFAULT_SELLING_COST_PERCENT,
  confidenceAdjustment: number = 1.0
): number {
  const adjustedMultiplier = 0.70 * confidenceAdjustment;
  const sellingCosts = arv * sellingCostsPercent;
  const maxBid = arv * adjustedMultiplier - rehabCosts - sellingCosts;

  return Math.max(0, Math.round(maxBid / 100) * 100);
}

// ============================================
// Exit Strategy Determination
// ============================================

/**
 * Determine the optimal exit strategy based on metrics and property condition
 *
 * @param metrics - Investment metrics
 * @param costs - Cost breakdown
 * @param propertyCondition - Current condition of property
 * @returns Recommended exit strategy
 */
export function determineExitStrategy(
  metrics: InvestmentMetrics,
  costs: CostBreakdown,
  propertyCondition?: 'excellent' | 'good' | 'fair' | 'poor' | 'distressed'
): ExitStrategy {
  const { roi, capRate, cashOnCash, profitMargin } = metrics;

  // Calculate rehab intensity
  const rehabIntensity = costs.rehab.totalRehab / (costs.acquisition.bidAmount || 1);

  // Wholesale: Best when property needs work and quick exit desired
  // Good for distressed properties with thin margins
  if (
    (propertyCondition === 'distressed' || propertyCondition === 'poor') &&
    rehabIntensity > 0.5 &&
    profitMargin < 15
  ) {
    return 'wholesale';
  }

  // Flip: Best for properties with good ROI and manageable rehab
  if (roi >= 20 && profitMargin >= 15 && rehabIntensity <= 0.6) {
    return 'flip';
  }

  // Rental: Best when cap rate is strong and property is in good condition
  if (
    capRate >= 8 &&
    cashOnCash >= 10 &&
    (propertyCondition === 'excellent' || propertyCondition === 'good' || propertyCondition === 'fair')
  ) {
    return 'rental';
  }

  // Hold: When neither flip nor rental is optimal but property has potential
  if (capRate >= 5 || roi >= 10) {
    return 'hold';
  }

  // Default to flip as most common tax deed strategy
  return 'flip';
}

// ============================================
// Confidence Calculation
// ============================================

/**
 * Calculate overall confidence in the recommendation
 *
 * @param comparablesConfidence - Confidence in comparable sales data
 * @param riskScore - Risk analysis score (0-25)
 * @param locationScore - Location analysis score (0-25)
 * @param marketScore - Market analysis score (0-25)
 * @param metrics - Investment metrics
 * @returns Confidence score (0-100)
 */
export function calculateRecommendationConfidence(
  comparablesConfidence: 'low' | 'medium' | 'high',
  riskScore: number,
  locationScore: number,
  marketScore: number,
  metrics: InvestmentMetrics
): number {
  // Base confidence from comparables (40% weight)
  let comparablesPoints = 0;
  switch (comparablesConfidence) {
    case 'high':
      comparablesPoints = 40;
      break;
    case 'medium':
      comparablesPoints = 28;
      break;
    case 'low':
      comparablesPoints = 16;
      break;
  }

  // Scores contribution (30% weight combined)
  // Each score is 0-25, normalize to 0-10 each
  const scoresPoints = (riskScore / 25) * 10 + (locationScore / 25) * 10 + (marketScore / 25) * 10;

  // Metrics quality (20% weight)
  // Good metrics increase confidence
  let metricsPoints = 10; // Base
  if (metrics.roi >= 20) metricsPoints += 3;
  if (metrics.profitMargin >= 15) metricsPoints += 3;
  if (metrics.priceToARV <= 0.70) metricsPoints += 2;
  if (metrics.netProfit >= 20000) metricsPoints += 2;

  // Deal clarity (10% weight)
  // Clear deals (very good or very bad) have higher confidence
  let clarityPoints = 5; // Base
  if (metrics.roi >= 30 || metrics.roi <= 5) clarityPoints = 10; // Clear verdict
  if (metrics.profitMargin >= 25 || metrics.profitMargin <= 5) clarityPoints += 3;

  // Total confidence
  const totalConfidence = Math.min(100, Math.round(
    comparablesPoints + scoresPoints + metricsPoints + clarityPoints
  ));

  return totalConfidence;
}

// ============================================
// Factor Identification
// ============================================

/**
 * Identify key positive factors supporting the recommendation
 *
 * @param metrics - Investment metrics
 * @param riskScore - Risk score (0-25)
 * @param locationScore - Location score (0-25)
 * @param marketScore - Market score (0-25)
 * @returns Array of key positive factors
 */
export function identifyKeyFactors(
  metrics: InvestmentMetrics,
  riskScore: number,
  locationScore: number,
  marketScore: number
): string[] {
  const factors: string[] = [];

  // ROI factors
  if (metrics.roi >= 40) {
    factors.push('Exceptional ROI potential above 40%');
  } else if (metrics.roi >= 30) {
    factors.push('Strong ROI potential above 30%');
  } else if (metrics.roi >= 20) {
    factors.push('Good ROI potential above 20%');
  }

  // Profit margin factors
  if (metrics.profitMargin >= 25) {
    factors.push('Excellent profit margin provides safety cushion');
  } else if (metrics.profitMargin >= 15) {
    factors.push('Healthy profit margin above 15%');
  }

  // Price to ARV factors
  if (metrics.priceToARV <= 0.60) {
    factors.push('Significant discount to ARV (40%+ below market)');
  } else if (metrics.priceToARV <= 0.70) {
    factors.push('Good discount to ARV (30%+ below market)');
  }

  // Net profit factors
  if (metrics.netProfit >= 50000) {
    factors.push(`Strong profit potential of $${metrics.netProfit.toLocaleString()}`);
  } else if (metrics.netProfit >= 25000) {
    factors.push(`Solid profit potential of $${metrics.netProfit.toLocaleString()}`);
  }

  // Risk score factors
  if (riskScore >= 20) {
    factors.push('Low risk profile with favorable title/environmental');
  } else if (riskScore >= 15) {
    factors.push('Manageable risk level');
  }

  // Location factors
  if (locationScore >= 20) {
    factors.push('Prime location with strong fundamentals');
  } else if (locationScore >= 15) {
    factors.push('Desirable location');
  }

  // Market factors
  if (marketScore >= 20) {
    factors.push('Strong market conditions support value growth');
  } else if (marketScore >= 15) {
    factors.push('Favorable market conditions');
  }

  // Cap rate for rentals
  if (metrics.capRate >= 10) {
    factors.push('Excellent cap rate for rental income');
  } else if (metrics.capRate >= 8) {
    factors.push('Good cap rate for rental strategy');
  }

  // Cash on cash return
  if (metrics.cashOnCash >= 15) {
    factors.push('Strong cash-on-cash return');
  }

  // Return top 5 factors
  return factors.slice(0, 5);
}

/**
 * Identify key risks associated with the investment
 *
 * @param metrics - Investment metrics
 * @param riskScore - Risk score (0-25)
 * @param costs - Cost breakdown
 * @param propertyCondition - Property condition
 * @returns Array of identified risks
 */
export function identifyRisks(
  metrics: InvestmentMetrics,
  riskScore: number,
  costs: CostBreakdown,
  propertyCondition?: 'excellent' | 'good' | 'fair' | 'poor' | 'distressed'
): string[] {
  const risks: string[] = [];

  // Low ROI risk
  if (metrics.roi < 15) {
    risks.push('Low ROI leaves little room for unexpected costs');
  }

  // Thin margins
  if (metrics.profitMargin < 10) {
    risks.push('Thin profit margin increases risk of loss');
  }

  // High price to ARV
  if (metrics.priceToARV > 0.75) {
    risks.push('Purchase price close to market value limits upside');
  }

  // Low risk score (indicates actual risks present)
  if (riskScore < 10) {
    risks.push('Risk analysis identified significant concerns');
  } else if (riskScore < 15) {
    risks.push('Some risk factors present - review risk report');
  }

  // High rehab costs
  const rehabToPrice = costs.rehab.totalRehab / (costs.acquisition.bidAmount || 1);
  if (rehabToPrice > 0.5) {
    risks.push('High rehab costs relative to purchase price');
  }

  // Property condition
  if (propertyCondition === 'distressed') {
    risks.push('Distressed property may have hidden issues');
  } else if (propertyCondition === 'poor') {
    risks.push('Poor condition requires significant renovation');
  }

  // Low net profit
  if (metrics.netProfit < 10000) {
    risks.push('Low absolute profit may not justify effort and risk');
  }

  // Break-even concerns
  if (metrics.breakEvenPrice > costs.acquisition.bidAmount * 1.1) {
    risks.push('Narrow margin to break-even point');
  }

  // Market timing (implied from holding costs)
  if (costs.holding.totalHolding > costs.acquisition.bidAmount * 0.1) {
    risks.push('Extended holding period increases cost exposure');
  }

  return risks.slice(0, 5);
}

/**
 * Identify potential opportunities and upsides
 *
 * @param metrics - Investment metrics
 * @param locationScore - Location score (0-25)
 * @param marketScore - Market score (0-25)
 * @param costs - Cost breakdown
 * @returns Array of identified opportunities
 */
export function identifyOpportunities(
  metrics: InvestmentMetrics,
  locationScore: number,
  marketScore: number,
  costs: CostBreakdown
): string[] {
  const opportunities: string[] = [];

  // Value-add through rehab
  if (costs.rehab.totalRehab > 0 && metrics.roi >= 20) {
    opportunities.push('Value-add potential through strategic improvements');
  }

  // Strong location upside
  if (locationScore >= 18) {
    opportunities.push('Premium location supports price appreciation');
  }

  // Market growth
  if (marketScore >= 18) {
    opportunities.push('Growing market may yield higher than projected ARV');
  }

  // Rental potential
  if (metrics.capRate >= 8) {
    opportunities.push('Strong rental yield if holding strategy preferred');
  }

  // Multiple exit options
  if (metrics.roi >= 15 && metrics.capRate >= 6) {
    opportunities.push('Multiple viable exit strategies provide flexibility');
  }

  // Below market acquisition
  if (metrics.priceToARV <= 0.65) {
    opportunities.push('Deep discount provides built-in equity');
  }

  // High gross profit potential
  if (metrics.grossProfit >= 50000) {
    opportunities.push('Significant gross profit potential on successful flip');
  }

  // Cash flow positive rental
  if (metrics.cashOnCash >= 12) {
    opportunities.push('Cash flow positive from day one as rental');
  }

  // Low holding costs
  if (costs.holding.totalHolding < costs.acquisition.bidAmount * 0.05) {
    opportunities.push('Low holding costs support extended marketing period');
  }

  return opportunities.slice(0, 5);
}

// ============================================
// Timeline Estimation
// ============================================

/**
 * Estimate timeline to exit based on strategy and property condition
 *
 * @param exitStrategy - Chosen exit strategy
 * @param propertyCondition - Current property condition
 * @returns Estimated months to exit
 */
export function estimateTimeline(
  exitStrategy: ExitStrategy,
  propertyCondition?: 'excellent' | 'good' | 'fair' | 'poor' | 'distressed'
): number {
  // Base timelines by strategy
  const baseTimelines: Record<ExitStrategy, number> = {
    wholesale: 1, // 1 month for wholesale
    flip: 6, // 6 months typical flip
    rental: 3, // 3 months to rent-ready
    hold: 12, // 12 months hold strategy
  };

  let timeline = baseTimelines[exitStrategy];

  // Adjust for property condition
  switch (propertyCondition) {
    case 'excellent':
      timeline *= 0.7; // 30% faster
      break;
    case 'good':
      timeline *= 0.85; // 15% faster
      break;
    case 'fair':
      // Base timeline
      break;
    case 'poor':
      timeline *= 1.3; // 30% longer
      break;
    case 'distressed':
      timeline *= 1.5; // 50% longer
      break;
    default:
      // Assume fair if not specified
      break;
  }

  // Minimum timelines
  const minimums: Record<ExitStrategy, number> = {
    wholesale: 0.5,
    flip: 3,
    rental: 2,
    hold: 6,
  };

  return Math.max(minimums[exitStrategy], Math.round(timeline * 10) / 10);
}

// ============================================
// Utility Functions
// ============================================

/**
 * Get a human-readable label for the verdict
 */
export function getVerdictLabel(verdict: RecommendationVerdict): string {
  const labels: Record<RecommendationVerdict, string> = {
    strong_buy: 'Strong Buy',
    buy: 'Buy',
    hold: 'Hold',
    pass: 'Pass',
    avoid: 'Avoid',
  };
  return labels[verdict];
}

/**
 * Get the color class for a verdict (for UI)
 */
export function getVerdictColor(verdict: RecommendationVerdict): string {
  const colors: Record<RecommendationVerdict, string> = {
    strong_buy: 'text-green-600 bg-green-100',
    buy: 'text-emerald-600 bg-emerald-100',
    hold: 'text-yellow-600 bg-yellow-100',
    pass: 'text-orange-600 bg-orange-100',
    avoid: 'text-red-600 bg-red-100',
  };
  return colors[verdict];
}

/**
 * Get the icon name for a verdict (for UI)
 */
export function getVerdictIcon(verdict: RecommendationVerdict): string {
  const icons: Record<RecommendationVerdict, string> = {
    strong_buy: 'TrendingUp',
    buy: 'ThumbsUp',
    hold: 'Pause',
    pass: 'MinusCircle',
    avoid: 'XCircle',
  };
  return icons[verdict];
}

/**
 * Get a human-readable label for the exit strategy
 */
export function getExitStrategyLabel(strategy: ExitStrategy): string {
  const labels: Record<ExitStrategy, string> = {
    flip: 'Fix & Flip',
    rental: 'Buy & Hold (Rental)',
    wholesale: 'Wholesale',
    hold: 'Hold for Appreciation',
  };
  return labels[strategy];
}

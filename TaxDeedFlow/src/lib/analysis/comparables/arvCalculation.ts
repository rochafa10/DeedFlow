/**
 * ARV Calculation Module - Comparables Analysis
 *
 * This module calculates the After Repair Value (ARV) using a weighted average
 * of adjusted comparable sales. Weights are based on similarity scores, with
 * more similar properties having greater influence on the final ARV.
 *
 * @module lib/analysis/comparables/arvCalculation
 * @author Claude Code Agent
 * @date 2026-01-16
 */

import type { ComparableProperty, SubjectProperty } from './similarityScoring';
import type { AdjustmentResult, ExtendedPropertyData } from './priceAdjustments';
import { calculateAllAdjustments } from './priceAdjustments';
import { calculateSimilarityScore, DEFAULT_WEIGHTS } from './similarityScoring';

// ============================================
// Type Definitions
// ============================================

/**
 * Comparable with full analysis data
 */
export interface AnalyzedComparable extends ComparableProperty {
  /** Price adjustment result */
  adjustmentResult: AdjustmentResult;
  /** Weight used in ARV calculation */
  weight: number;
  /** Contribution to ARV ($) */
  arvContribution: number;
  /** Whether this comparable was included in ARV */
  includedInARV: boolean;
  /** Reason if excluded */
  exclusionReason?: string;
}

/**
 * ARV calculation result
 */
export interface ARVCalculation {
  /** Calculated ARV (weighted average of adjusted prices) */
  arv: number;
  /** Simple average of adjusted prices (for comparison) */
  simpleAverage: number;
  /** Median adjusted price */
  medianPrice: number;
  /** Minimum adjusted price */
  minPrice: number;
  /** Maximum adjusted price */
  maxPrice: number;
  /** Price range */
  priceRange: number;
  /** Standard deviation */
  standardDeviation: number;
  /** Coefficient of variation (std dev / mean) */
  coefficientOfVariation: number;
  /** Price per square foot average */
  avgPricePerSqft: number;
  /** Confidence level in the ARV (0-100) */
  confidence: number;
  /** Confidence range */
  confidenceRange: {
    low: number;
    mid: number;
    high: number;
  };
  /** Number of comparables used */
  comparablesUsed: number;
  /** Total comparables analyzed */
  totalComparables: number;
  /** Analyzed comparables with details */
  comparables: AnalyzedComparable[];
  /** Warnings and notes */
  warnings: string[];
  /** Calculation method used */
  calculationMethod: 'weighted' | 'simple' | 'median';
  /** Analysis timestamp */
  calculatedAt: string;
}

/**
 * Configuration for ARV calculation
 */
export interface ARVCalculationConfig {
  /** Minimum similarity score to include (0-100) */
  minSimilarityScore: number;
  /** Maximum gross adjustment percentage to include */
  maxAdjustmentPercent: number;
  /** Minimum comparables required */
  minComparables: number;
  /** Maximum comparables to use */
  maxComparables: number;
  /** Whether to use weighted average */
  useWeightedAverage: boolean;
  /** Weight exponent (higher = more weight to similar comps) */
  weightExponent: number;
  /** Confidence adjustment factor */
  confidenceFactor: number;
}

// ============================================
// Constants
// ============================================

/**
 * Default ARV calculation configuration
 */
export const DEFAULT_ARV_CONFIG: ARVCalculationConfig = {
  minSimilarityScore: 50,       // Minimum 50% similarity
  maxAdjustmentPercent: 25,     // Max 25% gross adjustment
  minComparables: 3,            // Need at least 3 comps
  maxComparables: 10,           // Use at most 10 comps
  useWeightedAverage: true,     // Use weighted average
  weightExponent: 2,            // Square the similarity for weighting
  confidenceFactor: 0.8,        // Base confidence factor
};

// ============================================
// Weight Calculation
// ============================================

/**
 * Calculate weight for a comparable based on similarity score
 *
 * @param similarityScore Similarity score (0-100)
 * @param exponent Weight exponent
 * @returns Weight value
 */
export function calculateWeight(
  similarityScore: number,
  exponent: number = DEFAULT_ARV_CONFIG.weightExponent
): number {
  // Normalize similarity to 0-1 range
  const normalized = similarityScore / 100;
  // Apply exponent for non-linear weighting (higher similarity = much more weight)
  return Math.pow(normalized, exponent);
}

/**
 * Normalize numeric weights array to sum to 1.0
 *
 * Note: This function operates on numeric arrays, distinct from
 * normalizeWeights in similarityScoring which operates on SimilarityWeights objects.
 *
 * @param weights Array of raw weights
 * @returns Normalized weights
 */
export function normalizeARVWeights(weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum === 0) return weights.map(() => 1 / weights.length);
  return weights.map((w) => w / sum);
}

// ============================================
// Statistical Functions
// ============================================

/**
 * Calculate mean of values
 */
function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Calculate median of values
 */
function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Calculate standard deviation
 */
function calculateStdDev(values: number[], mean: number): number {
  if (values.length < 2) return 0;
  const squareDiffs = values.map((v) => Math.pow(v - mean, 2));
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(avgSquareDiff);
}

/**
 * Calculate weighted average
 */
function calculateWeightedAverage(
  values: number[],
  weights: number[]
): number {
  if (values.length === 0 || values.length !== weights.length) return 0;
  const normalizedWeights = normalizeARVWeights(weights);
  return values.reduce((sum, value, i) => sum + value * normalizedWeights[i], 0);
}

// ============================================
// ARV Calculation Functions
// ============================================

/**
 * Analyze a single comparable for ARV calculation
 *
 * @param subject Subject property
 * @param comparable Comparable property
 * @param config ARV calculation configuration
 * @returns Analyzed comparable
 */
export function analyzeComparable(
  subject: ExtendedPropertyData,
  comparable: ComparableProperty & { saleDate: string },
  config: ARVCalculationConfig = DEFAULT_ARV_CONFIG
): AnalyzedComparable {
  // Calculate similarity
  const similarityResult = calculateSimilarityScore(
    subject as SubjectProperty,
    comparable,
    DEFAULT_WEIGHTS
  );

  // Calculate price adjustments
  const adjustmentResult = calculateAllAdjustments(
    subject,
    comparable as ExtendedPropertyData & { salePrice: number; saleDate: string }
  );

  // Determine if should be included
  let includedInARV = true;
  let exclusionReason: string | undefined;

  if (similarityResult.score < config.minSimilarityScore) {
    includedInARV = false;
    exclusionReason = `Similarity score (${similarityResult.score.toFixed(1)}) below minimum (${config.minSimilarityScore})`;
  } else if (adjustmentResult.grossAdjustmentPercent > config.maxAdjustmentPercent) {
    includedInARV = false;
    exclusionReason = `Gross adjustment (${adjustmentResult.grossAdjustmentPercent.toFixed(1)}%) exceeds maximum (${config.maxAdjustmentPercent}%)`;
  }

  // Calculate weight
  const weight = includedInARV
    ? calculateWeight(similarityResult.score, config.weightExponent)
    : 0;

  return {
    ...comparable,
    similarityScore: similarityResult.score,
    distanceMiles: similarityResult.distanceMiles,
    adjustmentResult,
    weight,
    arvContribution: 0, // Will be calculated after normalization
    includedInARV,
    exclusionReason,
  };
}

/**
 * Calculate ARV from analyzed comparables
 *
 * @param subject Subject property
 * @param comparables Array of comparable properties
 * @param config ARV calculation configuration
 * @returns Complete ARV calculation result
 */
export function calculateARV(
  subject: ExtendedPropertyData,
  comparables: Array<ComparableProperty & { saleDate: string }>,
  config: ARVCalculationConfig = DEFAULT_ARV_CONFIG
): ARVCalculation {
  const warnings: string[] = [];

  // Analyze all comparables
  const analyzed = comparables.map((comp) =>
    analyzeComparable(subject, comp, config)
  );

  // Filter included comparables
  let includedComps = analyzed.filter((c) => c.includedInARV);

  // Sort by similarity and limit to max
  includedComps.sort((a, b) => (b.similarityScore || 0) - (a.similarityScore || 0));
  if (includedComps.length > config.maxComparables) {
    includedComps = includedComps.slice(0, config.maxComparables);
    // Update exclusion status for comps that didn't make the cut
    analyzed.forEach((c) => {
      if (c.includedInARV && !includedComps.includes(c)) {
        c.includedInARV = false;
        c.exclusionReason = 'Exceeded maximum comparable limit';
        c.weight = 0;
      }
    });
  }

  // Check minimum comparables
  if (includedComps.length < config.minComparables) {
    warnings.push(
      `Only ${includedComps.length} comparable(s) available (minimum ${config.minComparables} recommended)`
    );
  }

  // Get adjusted prices
  const adjustedPrices = includedComps.map((c) => c.adjustmentResult.adjustedPrice);
  const weights = includedComps.map((c) => c.weight);

  // Normalize weights
  const normalizedWeights = normalizeARVWeights(weights);

  // Update ARV contributions
  includedComps.forEach((comp, i) => {
    comp.weight = normalizedWeights[i];
    comp.arvContribution = comp.adjustmentResult.adjustedPrice * normalizedWeights[i];
  });

  // Calculate statistics
  let arv: number;
  let calculationMethod: 'weighted' | 'simple' | 'median';

  if (adjustedPrices.length === 0) {
    arv = 0;
    calculationMethod = 'simple';
    warnings.push('No valid comparables available for ARV calculation');
  } else if (config.useWeightedAverage && adjustedPrices.length >= 2) {
    arv = calculateWeightedAverage(adjustedPrices, normalizedWeights);
    calculationMethod = 'weighted';
  } else {
    arv = calculateMean(adjustedPrices);
    calculationMethod = 'simple';
    if (config.useWeightedAverage) {
      warnings.push('Insufficient comparables for weighted average, using simple average');
    }
  }

  const simpleAverage = calculateMean(adjustedPrices);
  const medianPrice = calculateMedian(adjustedPrices);
  const minPrice = adjustedPrices.length > 0 ? Math.min(...adjustedPrices) : 0;
  const maxPrice = adjustedPrices.length > 0 ? Math.max(...adjustedPrices) : 0;
  const priceRange = maxPrice - minPrice;
  const standardDeviation = calculateStdDev(adjustedPrices, simpleAverage);
  const coefficientOfVariation = simpleAverage > 0 ? standardDeviation / simpleAverage : 0;

  // Calculate price per sqft
  let avgPricePerSqft = 0;
  const pricePerSqftValues = includedComps
    .filter((c) => c.sqft && c.sqft > 0)
    .map((c) => c.adjustmentResult.adjustedPrice / (c.sqft as number));
  if (pricePerSqftValues.length > 0) {
    avgPricePerSqft = calculateMean(pricePerSqftValues);
  }

  // Calculate confidence
  let confidence = config.confidenceFactor * 100;

  // Adjust for number of comparables
  if (includedComps.length >= 5) {
    confidence *= 1.0;
  } else if (includedComps.length >= 3) {
    confidence *= 0.9;
  } else if (includedComps.length >= 2) {
    confidence *= 0.75;
  } else {
    confidence *= 0.5;
  }

  // Adjust for coefficient of variation (higher = less confidence)
  if (coefficientOfVariation > 0.2) {
    confidence *= 0.8;
    warnings.push('High price variation among comparables');
  } else if (coefficientOfVariation > 0.15) {
    confidence *= 0.9;
  }

  // Adjust for average similarity score
  const avgSimilarity = includedComps.length > 0
    ? includedComps.reduce((sum, c) => sum + (c.similarityScore || 0), 0) / includedComps.length
    : 0;
  confidence *= (avgSimilarity / 100);

  confidence = Math.min(95, Math.max(0, confidence));

  // Calculate confidence range
  const rangeMultiplier = (100 - confidence) / 100 * 0.15; // Max 15% range at 0% confidence
  const confidenceRange = {
    low: arv * (1 - rangeMultiplier),
    mid: arv,
    high: arv * (1 + rangeMultiplier),
  };

  // Add warnings for price differences
  if (Math.abs(arv - simpleAverage) > simpleAverage * 0.05) {
    warnings.push('Weighted and simple averages differ by more than 5%');
  }

  if (Math.abs(arv - medianPrice) > medianPrice * 0.1) {
    warnings.push('ARV differs from median by more than 10% - verify outliers');
  }

  return {
    arv: Math.round(arv),
    simpleAverage: Math.round(simpleAverage),
    medianPrice: Math.round(medianPrice),
    minPrice: Math.round(minPrice),
    maxPrice: Math.round(maxPrice),
    priceRange: Math.round(priceRange),
    standardDeviation: Math.round(standardDeviation),
    coefficientOfVariation: Math.round(coefficientOfVariation * 100) / 100,
    avgPricePerSqft: Math.round(avgPricePerSqft),
    confidence: Math.round(confidence),
    confidenceRange: {
      low: Math.round(confidenceRange.low),
      mid: Math.round(confidenceRange.mid),
      high: Math.round(confidenceRange.high),
    },
    comparablesUsed: includedComps.length,
    totalComparables: comparables.length,
    comparables: analyzed,
    warnings,
    calculationMethod,
    calculatedAt: new Date().toISOString(),
  };
}

/**
 * Calculate ARV using price per square foot method
 *
 * @param subject Subject property with sqft
 * @param comparables Comparables
 * @returns ARV based on price/sqft
 */
export function calculateARVByPricePerSqft(
  subject: ExtendedPropertyData,
  comparables: Array<ComparableProperty & { saleDate: string }>
): number | null {
  if (!subject.sqft || subject.sqft <= 0) return null;

  const validComps = comparables.filter(
    (c) => c.sqft && c.sqft > 0 && c.salePrice && c.salePrice > 0
  );

  if (validComps.length === 0) return null;

  // Calculate price per sqft for each comp
  const pricePerSqft = validComps.map((c) => c.salePrice / (c.sqft as number));

  // Use weighted average based on similarity
  const weights = validComps.map((c) => {
    const result = calculateSimilarityScore(
      subject as SubjectProperty,
      c,
      DEFAULT_WEIGHTS
    );
    return calculateWeight(result.score);
  });

  const normalizedWeightsArr = normalizeARVWeights(weights);
  const avgPricePerSqft = pricePerSqft.reduce(
    (sum, price, i) => sum + price * normalizedWeightsArr[i],
    0
  );

  return Math.round(subject.sqft * avgPricePerSqft);
}

/**
 * Reconcile multiple ARV estimates
 *
 * @param weightedARV Weighted average ARV
 * @param medianARV Median ARV
 * @param pricePerSqftARV Price per sqft ARV
 * @param confidence Confidence in weighted ARV
 * @returns Reconciled ARV
 */
export function reconcileARVEstimates(
  weightedARV: number,
  medianARV: number,
  pricePerSqftARV: number | null,
  confidence: number
): {
  finalARV: number;
  method: string;
  reasoning: string;
} {
  const estimates: Array<{ value: number; weight: number; name: string }> = [
    { value: weightedARV, weight: confidence / 100, name: 'Weighted Average' },
    { value: medianARV, weight: 0.8, name: 'Median' },
  ];

  if (pricePerSqftARV !== null) {
    estimates.push({ value: pricePerSqftARV, weight: 0.6, name: 'Price/SqFt' });
  }

  // Calculate weighted average of estimates
  const totalWeight = estimates.reduce((sum, e) => sum + e.weight, 0);
  const normalizedEstimates = estimates.map((e) => ({
    ...e,
    normalizedWeight: e.weight / totalWeight,
  }));

  const finalARV = normalizedEstimates.reduce(
    (sum, e) => sum + e.value * e.normalizedWeight,
    0
  );

  // Determine primary method
  const sortedByWeight = [...normalizedEstimates].sort(
    (a, b) => b.normalizedWeight - a.normalizedWeight
  );
  const primaryMethod = sortedByWeight[0].name;

  // Generate reasoning
  const reasoning =
    estimates.length > 2
      ? `Reconciled from ${estimates.length} methods: ${estimates.map((e) => e.name).join(', ')}`
      : `Based primarily on ${primaryMethod} with ${confidence}% confidence`;

  return {
    finalARV: Math.round(finalARV),
    method: primaryMethod,
    reasoning,
  };
}

// ============================================
// Utility Functions
// ============================================

/**
 * Format ARV result for display
 */
export function formatARVResult(result: ARVCalculation): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });

  return [
    `ARV: ${formatter.format(result.arv)} (${result.confidence}% confidence)`,
    `Range: ${formatter.format(result.confidenceRange.low)} - ${formatter.format(result.confidenceRange.high)}`,
    `Based on ${result.comparablesUsed} comparable(s)`,
    `Method: ${result.calculationMethod}`,
  ].join('\n');
}

/**
 * Get ARV quality rating based on confidence and data quality
 */
export function getARVQualityRating(
  result: ARVCalculation
): 'excellent' | 'good' | 'fair' | 'poor' {
  const { confidence, comparablesUsed, coefficientOfVariation, warnings } = result;

  let score = confidence;

  // Adjust for number of comparables
  if (comparablesUsed < 3) score -= 20;
  else if (comparablesUsed >= 5) score += 5;

  // Adjust for variation
  if (coefficientOfVariation > 0.2) score -= 15;
  else if (coefficientOfVariation < 0.1) score += 5;

  // Adjust for warnings
  score -= warnings.length * 5;

  if (score >= 75) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  return 'poor';
}

/**
 * Validate ARV calculation result
 */
export function validateARVResult(result: ARVCalculation): string[] {
  const errors: string[] = [];

  if (result.arv <= 0) {
    errors.push('ARV cannot be zero or negative');
  }

  if (result.comparablesUsed === 0) {
    errors.push('No valid comparables were used');
  }

  if (result.confidence < 30) {
    errors.push('Very low confidence in ARV estimate');
  }

  if (result.priceRange > result.arv * 0.5) {
    errors.push('Price range exceeds 50% of ARV - high uncertainty');
  }

  return errors;
}

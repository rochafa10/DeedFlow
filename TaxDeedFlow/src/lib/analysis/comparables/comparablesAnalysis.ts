/**
 * Comparables Analysis Module - Main Orchestration
 *
 * This module serves as the main entry point for the comparables analysis system.
 * It orchestrates similarity scoring, price adjustments, and ARV calculation
 * to provide comprehensive comparable sales analysis for tax deed properties.
 *
 * @module lib/analysis/comparables/comparablesAnalysis
 * @author Claude Code Agent
 * @date 2026-01-16
 */

// Note: This module does NOT re-export from submodules to avoid naming conflicts.
// Import from the individual modules or from the index.ts which provides explicit exports.
// For example, similarityScoring.normalizeWeights and arvCalculation.normalizeARVWeights
// are distinct functions with different signatures.

import type {
  SubjectProperty,
  ComparableProperty,
  SimilarityWeights,
  SimilarityResult,
  FactorScores,
} from './similarityScoring';

import type {
  ExtendedPropertyData,
  AdjustmentResult,
  PriceAdjustment,
  ConditionRating,
  LocationQuality,
  BasementType,
} from './priceAdjustments';

import type {
  AnalyzedComparable,
  ARVCalculation,
  ARVCalculationConfig,
} from './arvCalculation';

import {
  scoreComparables,
  filterByMinScore,
  getTopComparables,
  calculateDistanceMiles,
  DEFAULT_WEIGHTS,
  getSimilarityDescription,
} from './similarityScoring';

import {
  calculateAllAdjustments,
  ADJUSTMENT_VALUES,
  getAdjustmentSummary,
} from './priceAdjustments';

import {
  calculateARV,
  calculateARVByPricePerSqft,
  reconcileARVEstimates,
  DEFAULT_ARV_CONFIG,
  getARVQualityRating,
  formatARVResult,
  validateARVResult,
} from './arvCalculation';

// ============================================
// Type Definitions
// ============================================

/**
 * Complete comparable analysis result
 */
export interface ComparablesAnalysisResult {
  /** Subject property used in analysis */
  subject: ExtendedPropertyData;
  /** ARV calculation result */
  arvCalculation: ARVCalculation;
  /** Reconciled final ARV */
  reconciledARV: {
    finalARV: number;
    method: string;
    reasoning: string;
  };
  /** Price per square foot ARV estimate */
  pricePerSqftARV: number | null;
  /** Top comparables (sorted by similarity) */
  topComparables: AnalyzedComparable[];
  /** Summary statistics */
  statistics: ComparableStatistics;
  /** Analysis quality metrics */
  quality: AnalysisQuality;
  /** Warnings and recommendations */
  warnings: string[];
  /** Recommendations for improving analysis */
  recommendations: string[];
  /** Analysis timestamp */
  analyzedAt: string;
}

/**
 * Summary statistics for comparables
 */
export interface ComparableStatistics {
  /** Total comparables provided */
  totalProvided: number;
  /** Comparables passing similarity threshold */
  passedSimilarity: number;
  /** Comparables passing adjustment threshold */
  passedAdjustment: number;
  /** Comparables used in final ARV */
  usedInARV: number;
  /** Average similarity score of used comparables */
  avgSimilarityScore: number;
  /** Average distance in miles */
  avgDistanceMiles: number;
  /** Average sale age in days */
  avgSaleAgeDays: number;
  /** Price per square foot statistics */
  pricePerSqft: {
    min: number;
    max: number;
    avg: number;
    median: number;
  };
  /** Sale price statistics */
  salePrice: {
    min: number;
    max: number;
    avg: number;
    median: number;
  };
}

/**
 * Analysis quality assessment
 */
export interface AnalysisQuality {
  /** Overall quality rating */
  rating: 'excellent' | 'good' | 'fair' | 'poor';
  /** Confidence score (0-100) */
  confidence: number;
  /** Data completeness score (0-100) */
  dataCompleteness: number;
  /** Number of key factors available */
  factorsAvailable: number;
  /** Total possible factors */
  totalFactors: number;
  /** Quality breakdown by category */
  breakdown: {
    comparableCount: 'sufficient' | 'marginal' | 'insufficient';
    similarityQuality: 'high' | 'medium' | 'low';
    priceVariation: 'low' | 'moderate' | 'high';
    dataQuality: 'complete' | 'partial' | 'limited';
  };
}

/**
 * Configuration for full comparables analysis
 */
export interface ComparablesAnalysisConfig {
  /** ARV calculation configuration */
  arvConfig: ARVCalculationConfig;
  /** Similarity weights */
  similarityWeights: SimilarityWeights;
  /** Maximum distance to consider (miles) */
  maxDistance: number;
  /** Maximum sale age to consider (months) */
  maxSaleAgeMonths: number;
  /** Minimum comparables warning threshold */
  minComparablesWarning: number;
  /** Include rejected comparables in output */
  includeRejected: boolean;
}

// ============================================
// Constants
// ============================================

/**
 * Default analysis configuration
 */
export const DEFAULT_ANALYSIS_CONFIG: ComparablesAnalysisConfig = {
  arvConfig: DEFAULT_ARV_CONFIG,
  similarityWeights: DEFAULT_WEIGHTS,
  maxDistance: 3.0,           // 3 miles max
  maxSaleAgeMonths: 12,       // 12 months max
  minComparablesWarning: 5,   // Warn if fewer than 5
  includeRejected: true,      // Include rejected for review
};

/**
 * Total factors tracked for data completeness
 */
const TRACKED_FACTORS = [
  'sqft',
  'lotSizeSqft',
  'bedrooms',
  'bathrooms',
  'yearBuilt',
  'propertyType',
  'condition',
  'garageSpaces',
  'hasPool',
  'hasBasement',
] as const;

// ============================================
// Main Analysis Function
// ============================================

/**
 * Perform complete comparables analysis
 *
 * This is the main entry point for comparables analysis. It:
 * 1. Scores all comparables for similarity
 * 2. Calculates price adjustments
 * 3. Computes ARV using multiple methods
 * 4. Reconciles estimates and generates quality metrics
 *
 * @param subject Subject property data
 * @param comparables Array of comparable sales
 * @param config Analysis configuration
 * @returns Complete analysis result
 */
export function analyzeComparables(
  subject: ExtendedPropertyData,
  comparables: Array<ComparableProperty & { saleDate: string }>,
  config: Partial<ComparablesAnalysisConfig> = {}
): ComparablesAnalysisResult {
  const fullConfig: ComparablesAnalysisConfig = {
    ...DEFAULT_ANALYSIS_CONFIG,
    ...config,
    arvConfig: { ...DEFAULT_ARV_CONFIG, ...config.arvConfig },
    similarityWeights: { ...DEFAULT_WEIGHTS, ...config.similarityWeights },
  };

  const warnings: string[] = [];
  const recommendations: string[] = [];

  // Step 1: Pre-filter comparables by distance and age
  const now = new Date();
  const filteredComparables = comparables.filter((comp) => {
    // Check distance
    const distance = calculateDistanceMiles(
      subject.latitude,
      subject.longitude,
      comp.latitude,
      comp.longitude
    );

    if (distance > fullConfig.maxDistance) {
      return false;
    }

    // Check sale age
    const saleDate = new Date(comp.saleDate);
    const ageMonths = (now.getTime() - saleDate.getTime()) / (1000 * 60 * 60 * 24 * 30);

    if (ageMonths > fullConfig.maxSaleAgeMonths) {
      return false;
    }

    return true;
  });

  if (filteredComparables.length < comparables.length) {
    const removed = comparables.length - filteredComparables.length;
    warnings.push(
      `${removed} comparable(s) excluded due to distance (>${fullConfig.maxDistance} mi) or age (>${fullConfig.maxSaleAgeMonths} mo)`
    );
  }

  // Step 2: Calculate ARV (handles similarity scoring and adjustments internally)
  const arvCalculation = calculateARV(
    subject,
    filteredComparables,
    fullConfig.arvConfig
  );

  // Merge ARV warnings
  warnings.push(...arvCalculation.warnings);

  // Step 3: Calculate price per square foot ARV
  const pricePerSqftARV = calculateARVByPricePerSqft(subject, filteredComparables);

  // Step 4: Reconcile ARV estimates
  const reconciledARV = reconcileARVEstimates(
    arvCalculation.arv,
    arvCalculation.medianPrice,
    pricePerSqftARV,
    arvCalculation.confidence
  );

  // Step 5: Get top comparables (sorted by similarity)
  const topComparables = arvCalculation.comparables
    .filter((c) => c.includedInARV)
    .slice(0, fullConfig.arvConfig.maxComparables);

  // Step 6: Calculate statistics
  const statistics = calculateStatistics(
    comparables,
    filteredComparables,
    arvCalculation
  );

  // Step 7: Assess quality
  const quality = assessAnalysisQuality(
    subject,
    arvCalculation,
    statistics
  );

  // Step 8: Generate recommendations
  if (statistics.usedInARV < fullConfig.minComparablesWarning) {
    recommendations.push(
      `Consider expanding search area beyond ${fullConfig.maxDistance} miles to find more comparables`
    );
  }

  if (quality.dataCompleteness < 70) {
    const missingFields: string[] = [];
    if (!subject.sqft) missingFields.push('square footage');
    if (!subject.bedrooms) missingFields.push('bedroom count');
    if (!subject.bathrooms) missingFields.push('bathroom count');
    if (!subject.yearBuilt) missingFields.push('year built');
    if (!subject.condition) missingFields.push('condition rating');

    if (missingFields.length > 0) {
      recommendations.push(
        `Add missing subject property data to improve accuracy: ${missingFields.join(', ')}`
      );
    }
  }

  if (quality.breakdown.priceVariation === 'high') {
    recommendations.push(
      'High price variation detected. Consider removing outlier comparables manually'
    );
  }

  if (quality.breakdown.similarityQuality === 'low') {
    recommendations.push(
      'Low similarity scores. Look for more similar properties or adjust similarity weights'
    );
  }

  // Validate the result
  const validationErrors = validateARVResult(arvCalculation);
  warnings.push(...validationErrors);

  return {
    subject,
    arvCalculation,
    reconciledARV,
    pricePerSqftARV,
    topComparables,
    statistics,
    quality,
    warnings,
    recommendations,
    analyzedAt: new Date().toISOString(),
  };
}

// ============================================
// Helper Functions
// ============================================

/**
 * Calculate comprehensive statistics for comparables
 */
function calculateStatistics(
  allComparables: Array<ComparableProperty & { saleDate: string }>,
  filteredComparables: Array<ComparableProperty & { saleDate: string }>,
  arvCalculation: ARVCalculation
): ComparableStatistics {
  const usedComps = arvCalculation.comparables.filter((c) => c.includedInARV);
  const now = new Date();

  // Calculate distances
  const distances = usedComps.map((c) => c.distanceMiles || 0);
  const avgDistance = distances.length > 0
    ? distances.reduce((a, b) => a + b, 0) / distances.length
    : 0;

  // Calculate sale ages
  const saleAges = usedComps.map((c) => {
    const saleDate = new Date(c.saleDate);
    return Math.floor((now.getTime() - saleDate.getTime()) / (1000 * 60 * 60 * 24));
  });
  const avgSaleAge = saleAges.length > 0
    ? saleAges.reduce((a, b) => a + b, 0) / saleAges.length
    : 0;

  // Calculate price per sqft stats
  const pricePerSqftValues = usedComps
    .filter((c) => c.sqft && c.sqft > 0)
    .map((c) => c.adjustmentResult.adjustedPrice / (c.sqft as number));

  const pricePerSqftStats = calculateMinMaxAvgMedian(pricePerSqftValues);

  // Calculate sale price stats (adjusted)
  const adjustedPrices = usedComps.map((c) => c.adjustmentResult.adjustedPrice);
  const salePriceStats = calculateMinMaxAvgMedian(adjustedPrices);

  // Calculate similarity scores
  const similarityScores = usedComps.map((c) => c.similarityScore || 0);
  const avgSimilarity = similarityScores.length > 0
    ? similarityScores.reduce((a, b) => a + b, 0) / similarityScores.length
    : 0;

  // Count comparables at each stage
  // Use default minSimilarityScore of 50 (standard threshold)
  const minSimilarityScore = 50;
  const passedSimilarity = arvCalculation.comparables.filter(
    (c) => (c.similarityScore || 0) >= minSimilarityScore
  ).length;

  const passedAdjustment = arvCalculation.comparables.filter(
    (c) => c.adjustmentResult.grossAdjustmentPercent <= 25
  ).length;

  return {
    totalProvided: allComparables.length,
    passedSimilarity,
    passedAdjustment,
    usedInARV: usedComps.length,
    avgSimilarityScore: Math.round(avgSimilarity * 10) / 10,
    avgDistanceMiles: Math.round(avgDistance * 100) / 100,
    avgSaleAgeDays: Math.round(avgSaleAge),
    pricePerSqft: {
      min: Math.round(pricePerSqftStats.min),
      max: Math.round(pricePerSqftStats.max),
      avg: Math.round(pricePerSqftStats.avg),
      median: Math.round(pricePerSqftStats.median),
    },
    salePrice: {
      min: Math.round(salePriceStats.min),
      max: Math.round(salePriceStats.max),
      avg: Math.round(salePriceStats.avg),
      median: Math.round(salePriceStats.median),
    },
  };
}

/**
 * Calculate min, max, average, and median for a set of values
 */
function calculateMinMaxAvgMedian(
  values: number[]
): { min: number; max: number; avg: number; median: number } {
  if (values.length === 0) {
    return { min: 0, max: 0, avg: 0, median: 0 };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;

  return {
    min: Math.min(...values),
    max: Math.max(...values),
    avg: values.reduce((a, b) => a + b, 0) / values.length,
    median,
  };
}

/**
 * Assess the quality of the analysis
 */
function assessAnalysisQuality(
  subject: ExtendedPropertyData,
  arvCalculation: ARVCalculation,
  statistics: ComparableStatistics
): AnalysisQuality {
  // Count available factors on subject property
  let factorsAvailable = 0;
  for (const factor of TRACKED_FACTORS) {
    if (subject[factor as keyof ExtendedPropertyData] !== undefined) {
      factorsAvailable++;
    }
  }

  const dataCompleteness = (factorsAvailable / TRACKED_FACTORS.length) * 100;

  // Determine breakdown ratings
  let comparableCount: 'sufficient' | 'marginal' | 'insufficient';
  if (statistics.usedInARV >= 5) {
    comparableCount = 'sufficient';
  } else if (statistics.usedInARV >= 3) {
    comparableCount = 'marginal';
  } else {
    comparableCount = 'insufficient';
  }

  let similarityQuality: 'high' | 'medium' | 'low';
  if (statistics.avgSimilarityScore >= 75) {
    similarityQuality = 'high';
  } else if (statistics.avgSimilarityScore >= 55) {
    similarityQuality = 'medium';
  } else {
    similarityQuality = 'low';
  }

  let priceVariation: 'low' | 'moderate' | 'high';
  if (arvCalculation.coefficientOfVariation <= 0.10) {
    priceVariation = 'low';
  } else if (arvCalculation.coefficientOfVariation <= 0.20) {
    priceVariation = 'moderate';
  } else {
    priceVariation = 'high';
  }

  let dataQuality: 'complete' | 'partial' | 'limited';
  if (dataCompleteness >= 80) {
    dataQuality = 'complete';
  } else if (dataCompleteness >= 50) {
    dataQuality = 'partial';
  } else {
    dataQuality = 'limited';
  }

  // Get overall rating from ARV calculation
  const rating = getARVQualityRating(arvCalculation);

  return {
    rating,
    confidence: arvCalculation.confidence,
    dataCompleteness: Math.round(dataCompleteness),
    factorsAvailable,
    totalFactors: TRACKED_FACTORS.length,
    breakdown: {
      comparableCount,
      similarityQuality,
      priceVariation,
      dataQuality,
    },
  };
}

// ============================================
// Convenience Functions
// ============================================

/**
 * Quick ARV estimate with minimal configuration
 *
 * @param subject Subject property (latitude, longitude, sqft required)
 * @param comparables Array of comparable sales
 * @returns Quick ARV estimate with confidence
 */
export function quickARVEstimate(
  subject: SubjectProperty,
  comparables: Array<ComparableProperty & { saleDate: string }>
): { arv: number; confidence: number; comparablesUsed: number } {
  const result = analyzeComparables(
    subject as ExtendedPropertyData,
    comparables,
    { arvConfig: { ...DEFAULT_ARV_CONFIG, maxComparables: 5 } }
  );

  return {
    arv: result.reconciledARV.finalARV,
    confidence: result.quality.confidence,
    comparablesUsed: result.statistics.usedInARV,
  };
}

/**
 * Get formatted analysis summary for display
 *
 * @param result Analysis result
 * @returns Formatted summary string
 */
export function getAnalysisSummary(result: ComparablesAnalysisResult): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });

  const lines: string[] = [
    '='.repeat(60),
    'COMPARABLES ANALYSIS SUMMARY',
    '='.repeat(60),
    '',
    'AFTER REPAIR VALUE (ARV)',
    '-'.repeat(30),
    `Final ARV: ${formatter.format(result.reconciledARV.finalARV)}`,
    `Confidence: ${result.quality.confidence}%`,
    `Quality Rating: ${result.quality.rating.toUpperCase()}`,
    `Method: ${result.reconciledARV.method}`,
    '',
    'CONFIDENCE RANGE',
    '-'.repeat(30),
    `Low:  ${formatter.format(result.arvCalculation.confidenceRange.low)}`,
    `Mid:  ${formatter.format(result.arvCalculation.confidenceRange.mid)}`,
    `High: ${formatter.format(result.arvCalculation.confidenceRange.high)}`,
    '',
    'COMPARABLES STATISTICS',
    '-'.repeat(30),
    `Total Provided: ${result.statistics.totalProvided}`,
    `Used in ARV: ${result.statistics.usedInARV}`,
    `Avg Similarity: ${result.statistics.avgSimilarityScore}%`,
    `Avg Distance: ${result.statistics.avgDistanceMiles} miles`,
    `Avg Sale Age: ${result.statistics.avgSaleAgeDays} days`,
    '',
    'PRICE STATISTICS',
    '-'.repeat(30),
    `Min Adjusted: ${formatter.format(result.statistics.salePrice.min)}`,
    `Max Adjusted: ${formatter.format(result.statistics.salePrice.max)}`,
    `Median: ${formatter.format(result.statistics.salePrice.median)}`,
    `Avg $/SqFt: $${result.statistics.pricePerSqft.avg}`,
    '',
    'DATA QUALITY',
    '-'.repeat(30),
    `Completeness: ${result.quality.dataCompleteness}%`,
    `Factors Available: ${result.quality.factorsAvailable}/${result.quality.totalFactors}`,
    `Comparable Count: ${result.quality.breakdown.comparableCount}`,
    `Price Variation: ${result.quality.breakdown.priceVariation}`,
  ];

  if (result.warnings.length > 0) {
    lines.push('', 'WARNINGS', '-'.repeat(30));
    result.warnings.forEach((w) => lines.push(`* ${w}`));
  }

  if (result.recommendations.length > 0) {
    lines.push('', 'RECOMMENDATIONS', '-'.repeat(30));
    result.recommendations.forEach((r) => lines.push(`* ${r}`));
  }

  lines.push('', '='.repeat(60));

  return lines.join('\n');
}

/**
 * Export analysis result to structured format for reports
 *
 * @param result Analysis result
 * @returns Report-ready data structure
 */
export function exportForReport(result: ComparablesAnalysisResult): {
  summary: {
    arv: number;
    confidence: number;
    rating: string;
    comparablesUsed: number;
    priceRange: { low: number; high: number };
  };
  comparables: Array<{
    address?: string;
    salePrice: number;
    adjustedPrice: number;
    similarityScore: number;
    distance: number;
    saleDate: string;
    adjustments: Array<{ factor: string; amount: number }>;
  }>;
  statistics: ComparableStatistics;
  warnings: string[];
} {
  return {
    summary: {
      arv: result.reconciledARV.finalARV,
      confidence: result.quality.confidence,
      rating: result.quality.rating,
      comparablesUsed: result.statistics.usedInARV,
      priceRange: {
        low: result.arvCalculation.confidenceRange.low,
        high: result.arvCalculation.confidenceRange.high,
      },
    },
    comparables: result.topComparables.map((comp) => ({
      address: comp.address,
      salePrice: comp.salePrice,
      adjustedPrice: comp.adjustmentResult.adjustedPrice,
      similarityScore: comp.similarityScore || 0,
      distance: comp.distanceMiles || 0,
      saleDate: comp.saleDate,
      adjustments: comp.adjustmentResult.adjustments.map((adj) => ({
        factor: adj.factor,
        amount: adj.adjustmentAmount,
      })),
    })),
    statistics: result.statistics,
    warnings: result.warnings,
  };
}

// ============================================
// Data Transformation Utilities
// ============================================

/**
 * Convert raw property data to SubjectProperty format
 *
 * @param data Raw property data from database
 * @returns Formatted subject property
 */
export function formatSubjectProperty(data: {
  latitude: number;
  longitude: number;
  sqft?: number;
  lot_size_sqft?: number;
  bedrooms?: number;
  bathrooms?: number;
  year_built?: number;
  property_type?: string;
  style?: string;
  stories?: number;
  has_garage?: boolean;
  garage_spaces?: number;
  has_pool?: boolean;
  has_basement?: boolean;
  basement_finished?: boolean;
  condition?: string;
}): ExtendedPropertyData {
  return {
    latitude: data.latitude,
    longitude: data.longitude,
    sqft: data.sqft,
    lotSizeSqft: data.lot_size_sqft,
    bedrooms: data.bedrooms,
    bathrooms: data.bathrooms,
    yearBuilt: data.year_built,
    propertyType: data.property_type,
    style: data.style,
    stories: data.stories,
    hasGarage: data.has_garage,
    garageSpaces: data.garage_spaces,
    hasPool: data.has_pool,
    hasBasement: data.has_basement,
    basementFinished: data.basement_finished,
    condition: data.condition as ConditionRating | undefined,
  };
}

/**
 * Convert raw comparable data to ComparableProperty format
 *
 * @param data Raw comparable data from database
 * @returns Formatted comparable property
 */
export function formatComparableProperty(data: {
  latitude: number;
  longitude: number;
  sale_price: number;
  sale_date: string;
  address?: string;
  sqft?: number;
  lot_size_sqft?: number;
  bedrooms?: number;
  bathrooms?: number;
  year_built?: number;
  property_type?: string;
  style?: string;
  stories?: number;
  has_garage?: boolean;
  garage_spaces?: number;
  has_pool?: boolean;
  has_basement?: boolean;
  basement_finished?: boolean;
}): ComparableProperty & { saleDate: string } {
  return {
    latitude: data.latitude,
    longitude: data.longitude,
    salePrice: data.sale_price,
    saleDate: data.sale_date,
    address: data.address,
    sqft: data.sqft,
    lotSizeSqft: data.lot_size_sqft,
    bedrooms: data.bedrooms,
    bathrooms: data.bathrooms,
    yearBuilt: data.year_built,
    propertyType: data.property_type,
    style: data.style,
    stories: data.stories,
    hasGarage: data.has_garage,
    garageSpaces: data.garage_spaces,
    hasPool: data.has_pool,
    hasBasement: data.has_basement,
    basementFinished: data.basement_finished,
  };
}

/**
 * Batch format comparable properties
 *
 * @param dataArray Array of raw comparable data
 * @returns Array of formatted comparable properties
 */
export function formatComparableProperties(
  dataArray: Array<{
    latitude: number;
    longitude: number;
    sale_price: number;
    sale_date: string;
    address?: string;
    sqft?: number;
    lot_size_sqft?: number;
    bedrooms?: number;
    bathrooms?: number;
    year_built?: number;
    property_type?: string;
    style?: string;
    stories?: number;
    has_garage?: boolean;
    garage_spaces?: number;
    has_pool?: boolean;
    has_basement?: boolean;
    basement_finished?: boolean;
  }>
): Array<ComparableProperty & { saleDate: string }> {
  return dataArray.map(formatComparableProperty);
}

/**
 * Comparables Analysis Module - Main Export
 *
 * This module provides comprehensive comparable sales analysis for tax deed properties,
 * including similarity scoring, price adjustments, and ARV (After Repair Value) calculation.
 *
 * @module lib/analysis/comparables
 */

// Main analysis orchestration
export {
  // Main function
  analyzeComparables,
  quickARVEstimate,

  // Summary and export utilities
  getAnalysisSummary,
  exportForReport,

  // Data formatting utilities
  formatSubjectProperty,
  formatComparableProperty,
  formatComparableProperties,

  // Configuration
  DEFAULT_ANALYSIS_CONFIG,

  // Types
  type ComparablesAnalysisResult,
  type ComparableStatistics,
  type AnalysisQuality,
  type ComparablesAnalysisConfig,
} from './comparablesAnalysis';

// Similarity scoring
export {
  calculateSimilarityScore,
  scoreComparables,
  filterByMinScore,
  getTopComparables,
  calculateDistanceMiles,
  getSimilarityDescription,
  getSignificantDifference,
  validateWeights,
  normalizeWeights,

  // Individual factor calculations
  calculateDistanceScore,
  calculateSqftScore,
  calculateLotSizeScore,
  calculateBedroomScore,
  calculateBathroomScore,
  calculateAgeScore,
  calculateRecencyScore,
  calculatePropertyTypeScore,
  calculateStyleScore,
  calculateFeaturesScore,

  // Configuration
  DEFAULT_WEIGHTS,

  // Types
  type SubjectProperty,
  type ComparableProperty,
  type SimilarityResult,
  type FactorScores,
  type SimilarityWeights,
} from './similarityScoring';

// Price adjustments
export {
  calculateAllAdjustments,
  getAdjustmentSummary,

  // Individual adjustment calculations
  calculateSqftAdjustment,
  calculateLotSizeAdjustment,
  calculateBedroomAdjustment,
  calculateBathroomAdjustment,
  calculateAgeAdjustment,
  calculateConditionAdjustment,
  calculateLocationAdjustment,
  calculateGarageAdjustment,
  calculatePoolAdjustment,
  calculateBasementAdjustment,
  calculateTimeAdjustment,
  calculateFeaturesAdjustment,
  calculatePremiumFeaturesAdjustment,

  // Configuration
  ADJUSTMENT_VALUES,

  // Types
  type PriceAdjustment,
  type AdjustmentResult,
  type AdjustmentCategory,
  type ConditionRating,
  type LocationQuality,
  type BasementType,
  type ExtendedPropertyData,
} from './priceAdjustments';

// ARV calculation
export {
  calculateARV,
  calculateARVByPricePerSqft,
  reconcileARVEstimates,
  analyzeComparable,
  calculateWeight,
  normalizeARVWeights,
  formatARVResult,
  getARVQualityRating,
  validateARVResult,

  // Configuration
  DEFAULT_ARV_CONFIG,

  // Types
  type AnalyzedComparable,
  type ARVCalculation,
  type ARVCalculationConfig,
} from './arvCalculation';

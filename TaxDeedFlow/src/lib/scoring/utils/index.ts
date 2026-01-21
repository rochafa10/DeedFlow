/**
 * Scoring Utilities Index
 *
 * Re-exports all utility functions for the scoring system.
 *
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-16
 */

// ============================================
// Normalization Utilities
// ============================================

export {
  normalizeToScale,
  invertNormalizedValue,
  normalizedToComponentScore,
  componentScoreToNormalized,
  normalizeWithCurve,
  normalizeBoolean,
  normalizeCategorical,
  normalizeWithThresholds,
  clampNormalized,
  weightedAverage,
  roundScore,
} from './normalization';

// ============================================
// Missing Data Utilities
// ============================================

export {
  getDefaultScoreForStrategy,
  createMissingDataScore,
  determineMissingDataStrategy,
  calculateAdjustedCategoryScore,
  checkRequiredDataMissing,
  generateDataRecommendations,
  calculateMissingDataPenalty,
} from './missing-data';

export type { MissingDataConfig } from './missing-data';

// ============================================
// Confidence Utilities
// ============================================

export {
  calculateConfidence,
  getConfidenceLabel,
  createDataCompletenessFactor,
  createSourceReliabilityFactor,
  createDataFreshnessFactor,
  createConsistencyFactor,
  calculateCategoryConfidence,
  generateConfidenceRecommendations,
  meetsConfidenceThreshold,
  getConfidenceColor,
} from './confidence';

// ============================================
// Missing Data Handler (Extended)
// ============================================

export {
  // Constants
  MISSING_DATA_CONFIG,

  // Functions
  handleMissingData,
  estimateFromPeers,
  getDefaultPeerCriteria,
  getRequiredDataComponents,
  getSkippableComponents,
  getTotalConfidencePenalty,
  canProceedWithScoring,
} from './missing-data-handler';

export type {
  ComponentMissingDataConfig,
  PeerCriteria,
  EstimatedValue,
  MissingDataResult,
} from './missing-data-handler';

// ============================================
// Confidence Calculator (Multi-Factor)
// ============================================

export {
  // Functions
  calculateMultiFactorConfidence,
  calculateCoreDataScore,
  calculateExternalDataScore,
  getDataFreshnessScore,
  getSourceReliabilityScore,
  getPropertyTypeConfidenceAdjustment,
  getPropertyTypeNote,
  getCoreDataDescription,
  getExternalDataDescription,
  getConfidenceLevel,
  createDefaultAvailability,
  mergeAvailabilities,
} from './confidence-calculator';

export type {
  ExtendedDataAvailability,
  ConfidenceLevel,
  CategoryConfidences,
} from './confidence-calculator';

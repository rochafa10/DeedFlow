/**
 * Scoring System Main Index
 *
 * This file re-exports all scoring system modules for convenient importing.
 * The scoring system evaluates properties on a 125-point scale across
 * 5 categories: Location, Risk, Financial, Market, and Profit.
 *
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-16
 *
 * @example
 * // Import types
 * import type { ScoreBreakdown, GradeResult } from '@/lib/scoring';
 *
 * // Import constants
 * import { SCORING_CONSTANTS, GRADE_THRESHOLDS } from '@/lib/scoring';
 *
 * // Import functions
 * import { calculateGrade, normalizeToScale } from '@/lib/scoring';
 */

// ============================================
// Type Exports from src/types/scoring.ts
// ============================================

export type {
  // Grade types
  GradeLevel,
  GradeWithModifier,
  GradeResult,

  // Category and component ID types
  CategoryId,
  ComponentId,
  LocationComponentId,
  RiskComponentId,
  FinancialComponentId,
  MarketComponentId,
  ProfitComponentId,

  // Score interfaces
  ComponentScore,
  CategoryScore,
  ScoreBreakdown,
  ScoreAdjustment,
  RegionalAdjustment,

  // Data types
  DataSource,
  MissingDataStrategy,
  PropertyType,
  PropertyData,
  ExternalData,
  DataAvailability,

  // Confidence types
  ConfidenceResult,
  ConfidenceFactor,
  ConfidenceLabel,

  // Warning types
  ScoringWarning,
} from '@/types/scoring';

// Export the calculateDataAvailability function from types
export { calculateDataAvailability } from '@/types/scoring';

// ============================================
// Constant Exports
// ============================================

export {
  // Core scoring constants
  SCORING_CONSTANTS,

  // Grade threshold configuration
  GRADE_THRESHOLDS,

  // Confidence level thresholds
  CONFIDENCE_THRESHOLDS,

  // Category ID constants
  CATEGORY_IDS,

  // Category display configuration
  CATEGORY_CONFIG,

  // Grade modifier thresholds
  GRADE_MODIFIER_THRESHOLDS,

  // Data quality weights
  DATA_QUALITY_WEIGHTS,

  // Missing data default scores
  MISSING_DATA_DEFAULTS,

  // Component score interpretation ranges
  COMPONENT_SCORE_RANGES,

  // Validation bounds
  VALIDATION,
} from './constants';

// ============================================
// Grade Calculator Exports
// ============================================

export {
  // Main grade calculation
  calculateGrade,
  calculateGradeModifier,

  // Grade helper functions
  getPointsForGrade,
  getPercentageForGrade,
  scoreToPercentage,
  percentageToScore,
  isValidScore,
  describeScore,
  pointsToNextGrade,
} from './grade-calculator';

// ============================================
// Utility Exports
// ============================================

// Normalization utilities
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
} from './utils';

// Missing data utilities
export {
  getDefaultScoreForStrategy,
  createMissingDataScore,
  determineMissingDataStrategy,
  calculateAdjustedCategoryScore,
  checkRequiredDataMissing,
  generateDataRecommendations,
  calculateMissingDataPenalty,
} from './utils';

export type { MissingDataConfig } from './utils';

// Confidence utilities
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
} from './utils';

// ============================================
// Phase 6B: Missing Data Handler (Extended)
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
} from './utils';

export type {
  ComponentMissingDataConfig,
  PeerCriteria,
  EstimatedValue,
  MissingDataResult,
} from './utils';

// ============================================
// Phase 6B: Confidence Calculator (Multi-Factor)
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
} from './utils';

export type {
  ExtendedDataAvailability,
  ConfidenceLevel,
  CategoryConfidences,
} from './utils';

// ============================================
// Phase 6C: Regional Adjustments
// ============================================

export {
  // Constants
  REGIONAL_ADJUSTMENTS,
  METRO_ADJUSTMENTS,

  // Functions
  applyRegionalAdjustments,
  getStateAdjustments,
  getMetroAdjustments,
  getAvailableMetros,
  hasStateAdjustments,
  hasMetroAdjustments,
  getRegionalSummary,
} from './adjustments';

export type {
  AdjustmentConfig,
  RegionalAdjustmentConfig,
} from './adjustments';

// ============================================
// Phase 6C: Metro Detection
// ============================================

export {
  // Constants
  METRO_BOUNDARIES,

  // Functions
  detectMetro,
  getMetroKey,
  getMetrosForState,
  getMetroByKey,
  getMetro,
  hasDefinedMetros,
  getStatesWithMetros,
  findNearestMetro,
} from './adjustments';

export type { BoundingBox, MetroBoundary } from './adjustments';

// ============================================
// Phase 6C: Property Type Adjustments
// ============================================

export {
  // Constants
  PROPERTY_TYPE_WEIGHTS,

  // Functions
  detectPropertyType,
  normalizePropertyType,
  normalizeWeights,
  getAdjustedWeights,
  calculateWeightedScore,
  getComponentWeightAdjustment,
  getWeightExplanations,
} from './adjustments';

export type {
  ExtendedPropertyType,
  CategoryWeights,
  ComponentWeightAdjustment,
} from './adjustments';

// ============================================
// Phase 6D: Edge Cases
// ============================================

export {
  // Main handler
  handleEdgeCases,

  // Utility functions
  shouldAutoReject,
  getEdgeCaseDefinitions,
  requiresSpecialHandling,
  getScoringBlockers,

  // Configuration
  DEFAULT_EDGE_CASE_CONFIG,
} from './edge-cases';

export type {
  EdgeCaseType,
  EdgeCaseHandling,
  EdgeCaseSeverity,
  EdgeCaseResult,
  EdgeCaseConfig,
} from './edge-cases';

// ============================================
// Phase 6D: Calibration
// ============================================

export {
  // Main calibration functions
  calibrateScore,
  calibrateCategoryScore,
  calibrateComponentScore,
  validateScoreBreakdown,
  scoreMatchesGrade,

  // Analysis functions
  calculateCalibrationStats,
  generateCalibrationAdjustment,

  // Constants
  SCORE_BOUNDS,
  PROPERTY_TYPE_CALIBRATION,
  MARKET_CONDITION_CALIBRATION,
  CALIBRATION_TOLERANCE,
  MIN_CALIBRATION_SAMPLE,
} from './edge-cases/calibration';

export type {
  CalibrationOutcome,
  CalibrationStats,
  CalibrationAdjustment,
  ScoreValidationResult,
  RegionalCalibration,
} from './edge-cases/calibration';

// ============================================
// Phase 6E: Location Category
// ============================================

export {
  // Main calculator
  calculateLocationScore,

  // Individual component calculators
  calculateWalkabilityScore,
  calculateCrimeSafetyScore,
  calculateSchoolQualityScore,
  calculateAmenitiesScore,
  calculateTransitAccessScore,

  // Utility functions
  getLocationComponentIds,
  getLocationComponentConfig,
  hasCompleteLocationData,
  getLocationDataCompleteness,
} from './categories/location';

// ============================================
// Phase 6E: Main Calculator
// ============================================

export {
  // Main scoring functions
  calculatePropertyScore,
  calculatePropertyScores,

  // Comparison and summary functions
  comparePropertyScores,
  getScoreSummary,
} from './calculator';

export type {
  PropertyScoreResult,
  FallbackLogEntry,
  CalculationOptions,
} from './calculator';

// ============================================
// Grade Calculator Extended Exports
// ============================================

export { getGradeDescription } from './grade-calculator';

// ============================================
// Category Exports
// ============================================

export {
  type CategoryCalculator,
} from './categories';

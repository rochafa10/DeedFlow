/**
 * Calibration Framework - Score Calibration and Validation
 *
 * This file provides calibration functions to ensure scoring accuracy
 * and consistency across different property types, regions, and time periods.
 *
 * Key responsibilities:
 * - Score normalization and bounding
 * - Historical calibration against actual outcomes
 * - Regional calibration adjustments
 * - Performance tracking for scoring model
 *
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-16
 */

import type { PropertyType, CategoryId } from '@/types/scoring';
import { SCORING_CONSTANTS } from '../constants';

// ============================================
// Calibration Types
// ============================================

/**
 * Calibration outcome tracking for model validation
 */
export interface CalibrationOutcome {
  /** Property ID */
  propertyId: string;
  /** Predicted score (0-125) */
  predictedScore: number;
  /** Predicted grade */
  predictedGrade: string;
  /** Actual outcome category */
  actualOutcome: 'profitable' | 'break_even' | 'loss' | 'pending';
  /** Actual ROI percentage (if known) */
  actualRoi?: number;
  /** Days held before exit */
  holdDays?: number;
  /** Exit strategy used */
  exitStrategy?: 'flip' | 'hold' | 'wholesale' | 'auction_resale';
  /** Outcome recorded date */
  recordedAt: Date;
  /** Notes about the outcome */
  notes?: string;
}

/**
 * Calibration statistics for a cohort
 */
export interface CalibrationStats {
  /** Number of properties in cohort */
  sampleSize: number;
  /** Average predicted score */
  avgPredictedScore: number;
  /** Average actual ROI */
  avgActualRoi: number;
  /** Correlation coefficient */
  correlation: number;
  /** Root mean square error */
  rmse: number;
  /** Mean absolute error */
  mae: number;
  /** Accuracy (% within tolerance) */
  accuracy: number;
  /** Profitable prediction accuracy */
  profitableAccuracy: number;
  /** Time period of data */
  periodStart: Date;
  /** Time period end */
  periodEnd: Date;
}

/**
 * Calibration adjustment factor
 */
export interface CalibrationAdjustment {
  /** Target (category, component, or overall) */
  target: 'overall' | CategoryId | string;
  /** Adjustment factor (1.0 = no change) */
  factor: number;
  /** Reason for adjustment */
  reason: string;
  /** Effective date */
  effectiveDate: Date;
  /** Expiration date (if temporary) */
  expiresAt?: Date;
  /** Source of calibration data */
  source: 'historical' | 'regional' | 'market_condition' | 'manual';
}

/**
 * Score validation result
 */
export interface ScoreValidationResult {
  /** Whether score is valid */
  isValid: boolean;
  /** Original score */
  originalScore: number;
  /** Calibrated score (after bounds and adjustments) */
  calibratedScore: number;
  /** Adjustments applied */
  adjustmentsApplied: CalibrationAdjustment[];
  /** Validation warnings */
  warnings: string[];
  /** Confidence in calibration (0-100) */
  calibrationConfidence: number;
}

/**
 * Regional calibration configuration
 */
export interface RegionalCalibration {
  /** State code */
  state: string;
  /** Metro area (optional) */
  metro?: string;
  /** County (optional) */
  county?: string;
  /** Category-specific factors */
  categoryFactors: Partial<Record<CategoryId, number>>;
  /** Overall factor */
  overallFactor: number;
  /** Last updated */
  updatedAt: Date;
  /** Sample size used for calibration */
  sampleSize: number;
}

// ============================================
// Constants
// ============================================

/**
 * Default calibration tolerance (% difference acceptable)
 */
export const CALIBRATION_TOLERANCE = 10;

/**
 * Minimum sample size for statistical significance
 */
export const MIN_CALIBRATION_SAMPLE = 30;

/**
 * Score bounds for validation
 */
export const SCORE_BOUNDS = {
  min: 0,
  max: SCORING_CONSTANTS.MAX_TOTAL_SCORE, // 125
  categoryMin: 0,
  categoryMax: SCORING_CONSTANTS.MAX_CATEGORY_SCORE, // 25
  componentMin: 0,
  componentMax: SCORING_CONSTANTS.MAX_COMPONENT_SCORE, // 5
} as const;

/**
 * Historical calibration adjustments by property type
 *
 * These factors adjust scores based on observed outcomes.
 * A factor > 1.0 means we historically underestimate this type.
 * A factor < 1.0 means we historically overestimate this type.
 */
export const PROPERTY_TYPE_CALIBRATION: Record<PropertyType, number> = {
  single_family_residential: 1.0, // Baseline
  multi_family_residential: 0.95, // Slightly overestimate
  commercial: 0.90, // More overestimate (higher risk)
  industrial: 0.88, // Higher risk
  vacant_land: 0.85, // Development risk
  mixed_use: 0.92,
  agricultural: 0.88,
  unknown: 0.90, // Conservative when unknown
};

/**
 * Market condition calibration factors
 */
export const MARKET_CONDITION_CALIBRATION: Record<string, number> = {
  'hot': 1.05, // Rising market - scores slightly underestimate
  'balanced': 1.0,
  'cooling': 0.95,
  'declining': 0.85,
  'distressed': 0.75,
};

// ============================================
// Core Calibration Functions
// ============================================

/**
 * Apply calibration adjustments to a score
 *
 * This function takes a raw score and applies various calibration
 * factors to produce a more accurate prediction.
 *
 * @param rawScore - Uncalibrated score (0-125)
 * @param propertyType - Type of property
 * @param state - State code
 * @param marketCondition - Current market condition
 * @param activeAdjustments - Additional active adjustments
 * @returns CalibrationResult with adjusted score
 *
 * @example
 * const result = calibrateScore(
 *   85,
 *   'single_family_residential',
 *   'PA',
 *   'balanced'
 * );
 * // Returns: { calibratedScore: 85, adjustments: [...] }
 */
export function calibrateScore(
  rawScore: number,
  propertyType: PropertyType = 'unknown',
  state?: string,
  marketCondition?: string,
  activeAdjustments?: CalibrationAdjustment[]
): ScoreValidationResult {
  const adjustmentsApplied: CalibrationAdjustment[] = [];
  const warnings: string[] = [];
  let calibratedScore = rawScore;

  // Step 1: Validate and bound raw score
  if (rawScore < SCORE_BOUNDS.min) {
    warnings.push(`Raw score ${rawScore} below minimum, bounded to ${SCORE_BOUNDS.min}`);
    calibratedScore = SCORE_BOUNDS.min;
  } else if (rawScore > SCORE_BOUNDS.max) {
    warnings.push(`Raw score ${rawScore} above maximum, bounded to ${SCORE_BOUNDS.max}`);
    calibratedScore = SCORE_BOUNDS.max;
  }

  // Step 2: Apply property type calibration
  const typeCalibration = PROPERTY_TYPE_CALIBRATION[propertyType] || 1.0;
  if (typeCalibration !== 1.0) {
    calibratedScore *= typeCalibration;
    adjustmentsApplied.push({
      target: 'overall',
      factor: typeCalibration,
      reason: `Property type calibration for ${propertyType}`,
      effectiveDate: new Date(),
      source: 'historical',
    });
  }

  // Step 3: Apply market condition calibration
  if (marketCondition && MARKET_CONDITION_CALIBRATION[marketCondition]) {
    const marketFactor = MARKET_CONDITION_CALIBRATION[marketCondition];
    if (marketFactor !== 1.0) {
      calibratedScore *= marketFactor;
      adjustmentsApplied.push({
        target: 'overall',
        factor: marketFactor,
        reason: `Market condition calibration: ${marketCondition}`,
        effectiveDate: new Date(),
        source: 'market_condition',
      });
    }
  }

  // Step 4: Apply active adjustments
  if (activeAdjustments && activeAdjustments.length > 0) {
    for (const adjustment of activeAdjustments) {
      // Check if adjustment is still valid
      if (adjustment.expiresAt && adjustment.expiresAt < new Date()) {
        continue;
      }

      if (adjustment.target === 'overall') {
        calibratedScore *= adjustment.factor;
        adjustmentsApplied.push(adjustment);
      }
      // Category-specific adjustments would be applied elsewhere
    }
  }

  // Step 5: Final bounds check
  calibratedScore = Math.max(
    SCORE_BOUNDS.min,
    Math.min(SCORE_BOUNDS.max, calibratedScore)
  );

  // Round to 2 decimal places
  calibratedScore = Math.round(calibratedScore * 100) / 100;

  // Calculate calibration confidence based on data availability
  const calibrationConfidence = calculateCalibrationConfidence(
    propertyType,
    state,
    adjustmentsApplied.length
  );

  return {
    isValid: warnings.length === 0,
    originalScore: rawScore,
    calibratedScore,
    adjustmentsApplied,
    warnings,
    calibrationConfidence,
  };
}

/**
 * Calibrate a category score
 *
 * @param categoryId - Category to calibrate
 * @param rawScore - Raw category score (0-25)
 * @param propertyType - Property type
 * @returns Calibrated category score
 */
export function calibrateCategoryScore(
  categoryId: CategoryId,
  rawScore: number,
  propertyType: PropertyType = 'unknown'
): number {
  // Bound the score
  let calibrated = Math.max(
    SCORE_BOUNDS.categoryMin,
    Math.min(SCORE_BOUNDS.categoryMax, rawScore)
  );

  // Apply property-type specific category adjustments
  // Different property types may have different category weights
  // This is handled in property-type.ts, but we can apply
  // historical calibration here if needed

  // Round to 2 decimal places
  return Math.round(calibrated * 100) / 100;
}

/**
 * Calibrate a component score
 *
 * @param componentId - Component to calibrate
 * @param rawScore - Raw component score (0-5)
 * @returns Calibrated component score
 */
export function calibrateComponentScore(
  componentId: string,
  rawScore: number
): number {
  // Bound the score
  let calibrated = Math.max(
    SCORE_BOUNDS.componentMin,
    Math.min(SCORE_BOUNDS.componentMax, rawScore)
  );

  // Round to 2 decimal places
  return Math.round(calibrated * 100) / 100;
}

// ============================================
// Calibration Analysis Functions
// ============================================

/**
 * Calculate calibration statistics from outcome data
 *
 * Used to evaluate how well our scoring predicts actual outcomes.
 *
 * @param outcomes - Array of calibration outcomes
 * @returns CalibrationStats with accuracy metrics
 */
export function calculateCalibrationStats(
  outcomes: CalibrationOutcome[]
): CalibrationStats | null {
  // Filter to outcomes with actual ROI
  const validOutcomes = outcomes.filter(
    (o) => o.actualRoi !== undefined && o.actualOutcome !== 'pending'
  );

  if (validOutcomes.length < MIN_CALIBRATION_SAMPLE) {
    return null; // Insufficient data
  }

  // Calculate averages
  const avgPredictedScore =
    validOutcomes.reduce((sum, o) => sum + o.predictedScore, 0) /
    validOutcomes.length;

  const avgActualRoi =
    validOutcomes.reduce((sum, o) => sum + (o.actualRoi || 0), 0) /
    validOutcomes.length;

  // Calculate correlation
  const correlation = calculateCorrelation(
    validOutcomes.map((o) => o.predictedScore),
    validOutcomes.map((o) => o.actualRoi || 0)
  );

  // Calculate errors
  const errors = validOutcomes.map((o) => {
    // Map score to expected ROI range for comparison
    // This is a simplified mapping
    const expectedRoi = mapScoreToExpectedRoi(o.predictedScore);
    return (o.actualRoi || 0) - expectedRoi;
  });

  const rmse = Math.sqrt(
    errors.reduce((sum, e) => sum + e * e, 0) / errors.length
  );

  const mae = errors.reduce((sum, e) => sum + Math.abs(e), 0) / errors.length;

  // Calculate accuracy (% within tolerance)
  const withinTolerance = errors.filter(
    (e) => Math.abs(e) <= CALIBRATION_TOLERANCE
  ).length;
  const accuracy = (withinTolerance / errors.length) * 100;

  // Calculate profitable prediction accuracy
  const profitablePredictions = validOutcomes.filter(
    (o) => o.predictedScore >= 75 // B grade or better
  );
  const actuallyProfitable = profitablePredictions.filter(
    (o) => o.actualOutcome === 'profitable'
  ).length;
  const profitableAccuracy =
    profitablePredictions.length > 0
      ? (actuallyProfitable / profitablePredictions.length) * 100
      : 0;

  // Get date range
  const dates = validOutcomes.map((o) => o.recordedAt);
  const periodStart = new Date(Math.min(...dates.map((d) => d.getTime())));
  const periodEnd = new Date(Math.max(...dates.map((d) => d.getTime())));

  return {
    sampleSize: validOutcomes.length,
    avgPredictedScore,
    avgActualRoi,
    correlation,
    rmse,
    mae,
    accuracy,
    profitableAccuracy,
    periodStart,
    periodEnd,
  };
}

/**
 * Generate calibration adjustments from historical data
 *
 * Analyzes outcomes to determine if scoring needs adjustment.
 *
 * @param stats - Calibration statistics
 * @param target - What to calibrate ('overall' or category)
 * @returns Recommended calibration adjustment
 */
export function generateCalibrationAdjustment(
  stats: CalibrationStats,
  target: 'overall' | CategoryId
): CalibrationAdjustment | null {
  // Need minimum sample size
  if (stats.sampleSize < MIN_CALIBRATION_SAMPLE) {
    return null;
  }

  // Calculate adjustment factor based on prediction vs actual
  // If we're consistently over-predicting, factor < 1.0
  // If we're consistently under-predicting, factor > 1.0

  // Use correlation and error metrics to determine adjustment
  let factor = 1.0;
  let reason = '';

  // If our predictions are consistently off by more than tolerance
  if (stats.mae > CALIBRATION_TOLERANCE) {
    // Determine direction of bias
    // avgActualRoi vs expected ROI from avgPredictedScore
    const expectedRoi = mapScoreToExpectedRoi(stats.avgPredictedScore);

    if (stats.avgActualRoi < expectedRoi - 5) {
      // We're over-predicting - need to lower scores
      factor = 0.95;
      reason = 'Historical data shows over-prediction of returns';
    } else if (stats.avgActualRoi > expectedRoi + 5) {
      // We're under-predicting - could raise scores
      factor = 1.05;
      reason = 'Historical data shows under-prediction of returns';
    }
  }

  // If low profitability accuracy, be more conservative
  if (stats.profitableAccuracy < 70) {
    factor *= 0.95;
    reason += '. Profitability accuracy below target';
  }

  if (factor === 1.0) {
    return null; // No adjustment needed
  }

  return {
    target,
    factor,
    reason: reason.trim(),
    effectiveDate: new Date(),
    expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
    source: 'historical',
  };
}

// ============================================
// Validation Functions
// ============================================

/**
 * Validate a complete score breakdown
 *
 * Ensures all scores are within valid bounds and consistent.
 *
 * @param totalScore - Total score (0-125)
 * @param categoryScores - Individual category scores
 * @returns Validation result with any corrections
 */
export function validateScoreBreakdown(
  totalScore: number,
  categoryScores: Record<CategoryId, number>
): {
  isValid: boolean;
  issues: string[];
  correctedTotal: number;
  correctedCategories: Record<CategoryId, number>;
} {
  const issues: string[] = [];
  const correctedCategories = { ...categoryScores };

  // Validate each category score
  for (const [category, score] of Object.entries(categoryScores)) {
    if (score < SCORE_BOUNDS.categoryMin) {
      issues.push(
        `${category} score ${score} below minimum, corrected to ${SCORE_BOUNDS.categoryMin}`
      );
      correctedCategories[category as CategoryId] = SCORE_BOUNDS.categoryMin;
    } else if (score > SCORE_BOUNDS.categoryMax) {
      issues.push(
        `${category} score ${score} above maximum, corrected to ${SCORE_BOUNDS.categoryMax}`
      );
      correctedCategories[category as CategoryId] = SCORE_BOUNDS.categoryMax;
    }
  }

  // Calculate what total should be
  const calculatedTotal = Object.values(correctedCategories).reduce(
    (sum, score) => sum + score,
    0
  );

  // Check if provided total matches calculated
  let correctedTotal = totalScore;
  if (Math.abs(totalScore - calculatedTotal) > 0.01) {
    issues.push(
      `Total score ${totalScore} does not match sum of categories ${calculatedTotal.toFixed(2)}`
    );
    correctedTotal = calculatedTotal;
  }

  // Validate total bounds
  if (correctedTotal < SCORE_BOUNDS.min) {
    issues.push(
      `Total score ${correctedTotal} below minimum, corrected to ${SCORE_BOUNDS.min}`
    );
    correctedTotal = SCORE_BOUNDS.min;
  } else if (correctedTotal > SCORE_BOUNDS.max) {
    issues.push(
      `Total score ${correctedTotal} above maximum, corrected to ${SCORE_BOUNDS.max}`
    );
    correctedTotal = SCORE_BOUNDS.max;
  }

  return {
    isValid: issues.length === 0,
    issues,
    correctedTotal: Math.round(correctedTotal * 100) / 100,
    correctedCategories,
  };
}

/**
 * Check if a score is within expected range for grade
 *
 * @param score - Score to check
 * @param expectedGrade - Expected grade
 * @returns Whether score matches expected grade
 */
export function scoreMatchesGrade(
  score: number,
  expectedGrade: string
): boolean {
  const gradeRanges: Record<string, { min: number; max: number }> = {
    'A+': { min: 118.75, max: 125 }, // 95-100%
    'A': { min: 106.25, max: 118.74 }, // 85-94.99%
    'A-': { min: 100, max: 106.24 }, // 80-84.99%
    'B+': { min: 93.75, max: 99.99 }, // 75-79.99%
    'B': { min: 81.25, max: 93.74 }, // 65-74.99%
    'B-': { min: 75, max: 81.24 }, // 60-64.99%
    'C+': { min: 68.75, max: 74.99 }, // 55-59.99%
    'C': { min: 56.25, max: 68.74 }, // 45-54.99%
    'C-': { min: 50, max: 56.24 }, // 40-44.99%
    'D+': { min: 43.75, max: 49.99 }, // 35-39.99%
    'D': { min: 31.25, max: 43.74 }, // 25-34.99%
    'D-': { min: 25, max: 31.24 }, // 20-24.99%
    'F': { min: 0, max: 24.99 }, // 0-19.99%
  };

  const range = gradeRanges[expectedGrade];
  if (!range) return false;

  return score >= range.min && score <= range.max;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Calculate Pearson correlation coefficient
 */
function calculateCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n === 0 || n !== y.length) return 0;

  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((total, xi, i) => total + xi * y[i], 0);
  const sumX2 = x.reduce((total, xi) => total + xi * xi, 0);
  const sumY2 = y.reduce((total, yi) => total + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt(
    (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
  );

  if (denominator === 0) return 0;
  return numerator / denominator;
}

/**
 * Map score to expected ROI
 *
 * This is a simplified mapping for calibration purposes.
 * In practice, this would be based on historical data.
 */
function mapScoreToExpectedRoi(score: number): number {
  // Simplified linear mapping
  // Score 125 -> ~50% ROI
  // Score 100 -> ~30% ROI
  // Score 75 -> ~15% ROI
  // Score 50 -> ~0% ROI
  // Score 25 -> ~-15% ROI
  // Score 0 -> ~-30% ROI

  const percentage = (score / SCORING_CONSTANTS.MAX_TOTAL_SCORE) * 100;

  // Linear mapping from percentage to ROI
  // 100% -> 50% ROI, 0% -> -30% ROI
  return (percentage * 0.8) - 30;
}

/**
 * Calculate calibration confidence
 */
function calculateCalibrationConfidence(
  propertyType: PropertyType,
  state?: string,
  adjustmentCount: number = 0
): number {
  let confidence = 75; // Base confidence

  // Known property type adds confidence
  if (propertyType !== 'unknown') {
    confidence += 10;
  }

  // State data adds confidence
  if (state) {
    confidence += 5;
  }

  // More adjustments applied may reduce confidence
  // (each adjustment introduces potential error)
  confidence -= Math.min(10, adjustmentCount * 2);

  return Math.max(40, Math.min(95, confidence));
}

// All types and constants are exported at their declarations above

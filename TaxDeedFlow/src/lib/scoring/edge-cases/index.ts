/**
 * Edge Cases Module Index
 *
 * Re-exports all edge case handling and calibration functionality.
 *
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-16
 */

// ============================================
// Edge Case Detection and Handling
// ============================================

export {
  // Main function
  handleEdgeCases,

  // Utility functions
  shouldAutoReject,
  getEdgeCaseDefinitions,
  requiresSpecialHandling,
  getScoringBlockers,

  // Constants
  DEFAULT_EDGE_CASE_CONFIG,
} from './edgeCases';

export type {
  // Types
  EdgeCaseType,
  EdgeCaseHandling,
  EdgeCaseSeverity,
  EdgeCaseResult,
  EdgeCaseConfig,
} from './edgeCases';

// ============================================
// Calibration Framework
// ============================================

export {
  // Main functions
  calibrateScore,
  calibrateCategoryScore,
  calibrateComponentScore,

  // Analysis functions
  calculateCalibrationStats,
  generateCalibrationAdjustment,

  // Validation functions
  validateScoreBreakdown,
  scoreMatchesGrade,

  // Constants
  SCORE_BOUNDS,
  PROPERTY_TYPE_CALIBRATION,
  MARKET_CONDITION_CALIBRATION,
  CALIBRATION_TOLERANCE,
  MIN_CALIBRATION_SAMPLE,
} from './calibration';

export type {
  // Types
  CalibrationOutcome,
  CalibrationStats,
  CalibrationAdjustment,
  ScoreValidationResult,
  RegionalCalibration,
} from './calibration';

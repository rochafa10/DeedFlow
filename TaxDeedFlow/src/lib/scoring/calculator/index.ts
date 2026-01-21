/**
 * Property Score Calculator Module Index
 *
 * Re-exports the main scoring calculator functionality.
 *
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-16
 */

export {
  // Main calculator
  calculatePropertyScore,
  calculatePropertyScores,

  // Analysis functions
  comparePropertyScores,
  getScoreSummary,
} from './propertyScoreCalculator';

export type {
  // Result types
  PropertyScoreResult,
  FallbackLogEntry,
  CalculationOptions,
} from './propertyScoreCalculator';

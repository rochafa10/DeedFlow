/**
 * Location Category Module Index
 *
 * Re-exports all location scoring functionality.
 *
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-16
 */

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
} from './locationScore';

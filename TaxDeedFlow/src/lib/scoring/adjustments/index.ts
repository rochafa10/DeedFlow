/**
 * Scoring Adjustments Index
 *
 * Re-exports all adjustment modules for regional and property type scoring.
 *
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-16
 */

// ============================================
// Regional Adjustments
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
} from './regional';

export type {
  AdjustmentConfig,
  RegionalAdjustmentConfig,
  ScoreAdjustment,
} from './regional';

// ============================================
// Metro Detection
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
} from './metro-detection';

export type { BoundingBox, MetroBoundary } from './metro-detection';

// ============================================
// Property Type Adjustments
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
} from './property-type';

export type {
  ExtendedPropertyType,
  CategoryWeights,
  ComponentWeightAdjustment,
} from './property-type';

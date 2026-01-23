/**
 * Drought Risk Module
 *
 * Exports all drought risk analysis components.
 *
 * @module lib/risk/drought
 */

export {
  analyzeDroughtRisk,
  getDroughtRiskScore,
  DROUGHT_PRONE_STATES,
  DROUGHT_SEVERITY_DEFINITIONS,
} from './drought-analyzer';

export type {
  DroughtRiskAnalysis,
  DroughtCategory,
  WaterAvailability,
  CropImpactLevel,
} from '@/types/risk-analysis';

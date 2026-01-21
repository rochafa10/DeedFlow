/**
 * Geological Risk Module
 *
 * Exports all geological risk analysis components including earthquake,
 * sinkhole, and slope/landslide risk assessment.
 *
 * @module lib/risk/geological
 */

export {
  analyzeEarthquakeRisk,
  analyzeSinkholeRisk,
  analyzeSlopeRisk,
  analyzeGeologicalRisk,
  getGeologicalRiskScore,
  KARST_GEOLOGY_STATES,
} from './geological-analyzer';

export type {
  EarthquakeRiskAnalysis,
  SinkholeRiskAnalysis,
  SlopeRiskAnalysis,
  GeologicalRiskResult,
  SeismicHazardLevel,
  SinkholeRiskLevel,
  SlopeStabilityLevel,
} from '@/types/risk-analysis';

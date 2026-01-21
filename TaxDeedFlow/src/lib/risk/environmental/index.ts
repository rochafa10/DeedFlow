/**
 * Environmental Risk Module
 *
 * Exports all environmental risk analysis components including contamination
 * and radon risk assessment.
 *
 * @module lib/risk/environmental
 */

export {
  analyzeContaminationRisk,
  analyzeRadonRisk,
  analyzeEnvironmentalRisk,
  getContaminationRiskScore,
  getRadonRiskScore,
  getEnvironmentalRiskScore,
  RADON_DISCLOSURE_STATES,
} from './environmental-analyzer';

export type {
  EnvironmentalContaminationAnalysis,
  RadonRiskAnalysis,
  EnvironmentalRiskResult,
  ContaminationRiskLevel,
  ContaminationSite,
  RadonZone,
} from '@/types/risk-analysis';

/**
 * Combined Risk Integration Module
 *
 * Exports all combined risk analysis components including adaptive weights,
 * comprehensive risk assessment, and 125-point scoring integration.
 *
 * @module lib/risk/combined
 */

export {
  calculateRiskAssessment,
  calculateRiskCategoryScore,
  getWeightsForState,
  getRegionForState,
  RISK_REGIONS,
  STATE_RISK_REGIONS,
  validateWeights,
  normalizeWeights,
} from './combined-risk-service';

export type {
  RiskAssessment,
  RiskWeights,
  RiskInput,
  RiskCategoryScore,
  RiskCategoryScoring,
  InsuranceEstimates,
  RiskMitigation,
  OverallRiskLevel,
} from '@/types/risk-analysis';

/**
 * Fire Risk Module
 *
 * Exports all wildfire risk analysis components.
 *
 * @module lib/risk/fire
 */

export {
  analyzeWildfireRisk,
  getWildfireRiskScore,
  WILDFIRE_RISK_STATES,
} from './fire-analyzer';

export type {
  WildfireRiskAnalysis,
  WildfireRiskLevel,
} from '@/types/risk-analysis';

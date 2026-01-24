/**
 * Risk Category Module Index
 *
 * Re-exports all risk scoring functionality.
 *
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-23
 */

export {
  // Main calculator
  calculateRiskScore,

  // Individual component calculators
  calculateFloodZoneScore,
  calculateEnvironmentalHazardsScore,
  calculateStructuralRiskScore,
  calculateTitleIssuesScore,
  calculateZoningComplianceScore,

  // Utility functions
  getRiskComponentIds,
  getRiskComponentConfig,
  hasCompleteRiskData,
  getRiskDataCompleteness,
} from './riskScore';

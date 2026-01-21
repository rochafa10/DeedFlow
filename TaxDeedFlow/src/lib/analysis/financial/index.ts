/**
 * Financial Analysis Module - Phase 8D
 *
 * Central export point for all financial analysis functionality.
 *
 * @module lib/analysis/financial
 * @author Claude Code Agent
 * @date 2026-01-16
 */

// ============================================
// Type Exports
// ============================================
export type {
  // Investment Metrics
  InvestmentMetrics,

  // Revenue & ARV
  ARVAnalysis,
  RentalProjection,
  RevenueProjection,

  // Recommendations
  RecommendationVerdict,
  ExitStrategy,
  InvestmentRecommendation,
  RecommendationInput,

  // Data Quality
  DataQualityComponents,
  DataQualityAssessment,

  // Comparables
  ComparableSale,
  ComparableAdjustment,
  ComparablesAnalysis,

  // Complete Analysis
  FinancialAnalysis,

  // Input Types
  PropertyFinancialData,
  RegridFinancialData,
  FinancialAnalysisOptions,
  FinancialAnalysisInput,

  // Threshold Types
  VerdictThreshold,
  RecommendationThresholds,
} from './types';

// ============================================
// Recommendation Engine Exports
// ============================================
export {
  // Main function
  generateRecommendation,

  // Component functions
  determineVerdict,
  calculateMaxBid,
  calculateMaxBidFromARV,
  determineExitStrategy,
  calculateRecommendationConfidence,
  identifyKeyFactors,
  identifyRisks,
  identifyOpportunities,
  estimateTimeline,

  // Utility functions
  getVerdictLabel,
  getVerdictColor,
  getVerdictIcon,
  getExitStrategyLabel,

  // Constants
  THRESHOLDS,
} from './recommendationEngine';

// ============================================
// Data Quality Exports
// ============================================
export {
  // Main function
  assessDataQuality,

  // Component assessors
  assessComparablesQuality,
  assessCostEstimateAccuracy,
  assessMarketDataFreshness,
  assessPropertyDataCompleteness,

  // Missing data functions
  identifyMissingData,
  documentAssumptions,
  assessMissingDataImpact,

  // Utility functions
  getQualityLevel,
  getQualityColor,
  getQualityDescription,
} from './dataQuality';

// ============================================
// Orchestrator Exports
// ============================================
export {
  // Main analysis function
  analyzePropertyFinancials,

  // Quick analysis helper
  quickAnalysis,
} from './orchestrator';

// ============================================
// ROI Calculator Exports (existing)
// ============================================
export {
  calculateROIAnalysis,
  calculateInvestmentMetrics,
  calculateIRR,
  calculateNPV,
} from './roiCalculator';

// ============================================
// Holding Costs Exports (existing)
// ============================================
export {
  calculateHoldingCosts,
} from './holdingCosts';

// ============================================
// Exit Strategies Exports (existing)
// ============================================
export {
  compareExitStrategies,
} from './exitStrategies';

/**
 * Bidding Strategy Types - Bid Recommendation System
 *
 * This file contains all TypeScript interfaces and types for the
 * bid recommendation system and bidding strategy analysis.
 *
 * @module lib/analysis/bidding/types
 * @author Claude Code Agent
 * @date 2026-01-23
 */

// ============================================
// Risk Warning Types
// ============================================

/**
 * Severity level for risk warnings
 */
export type RiskSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Risk warning structure stored in risk_warnings JSONB
 */
export interface RiskWarning {
  /** Type/category of risk (e.g., 'opening_bid_exceeds_max', 'thin_margin', 'data_quality') */
  type: string;
  /** Severity level of the warning */
  severity: RiskSeverity;
  /** Human-readable warning message */
  message: string;
}

// ============================================
// Bid Range Types
// ============================================

/**
 * Three-tier bid recommendation ranges
 */
export interface BidRange {
  /** Safest bid amount - highest profit margin, lowest risk */
  conservative: number;
  /** Balanced bid amount - recommended for most investors */
  moderate: number;
  /** Maximum bid amount - higher risk, thinner margins */
  aggressive: number;
}

// ============================================
// Confidence Factors Types
// ============================================

/**
 * Breakdown of factors contributing to recommendation confidence
 */
export interface ConfidenceFactors {
  /** Quality of comparable sales data (0-1) */
  comparablesQuality: number;
  /** Accuracy of cost estimates (0-1) */
  costEstimateAccuracy: number;
  /** Completeness of property data (0-1) */
  propertyDataCompleteness: number;
  /** Freshness of market data (0-1) */
  marketDataFreshness: number;
}

// ============================================
// Calculation Basis Types
// ============================================

/**
 * Detailed calculation inputs for transparency (stored in calculation_basis JSONB)
 */
export interface CalculationBasis {
  /** After Repair Value used in calculation */
  arv: number;
  /** Estimated renovation costs */
  rehabCost: number;
  /** Closing costs estimate */
  closingCosts: number;
  /** Holding costs estimate */
  holdingCosts: number;
  /** Target ROI percentage (e.g., 25 for 25%) */
  targetROI: number;
  /** Total investment required */
  totalInvestment: number;
  /** Method used for ARV calculation */
  arvMethod: CalculationMethod;
  /** Number of comparable properties used */
  comparablesCount?: number;
  /** Confidence in ARV estimate */
  arvConfidence: 'low' | 'medium' | 'high';
}

// ============================================
// Calculation Method Types
// ============================================

/**
 * Primary method used for bid calculation
 */
export type CalculationMethod =
  | 'arv_based'
  | 'market_value_based'
  | 'assessed_value_based'
  | 'hybrid';

// ============================================
// Main Bid Recommendation Interface
// ============================================

/**
 * Complete bid recommendation with all analysis data
 * Maps to bid_strategy_recommendations database table
 */
export interface BidRecommendation {
  /** Unique identifier */
  id: string;
  /** Property ID this recommendation belongs to */
  propertyId: string;

  // Bid Recommendations (Three Risk Levels)
  /** Three-tier bid ranges */
  bidRange: BidRange;

  // Confidence & ROI
  /** Confidence level in recommendation (0.0 to 1.0) */
  confidenceLevel: number;
  /** Expected ROI percentage (e.g., 25.5 for 25.5%) */
  roiProjection?: number;

  // Risk Analysis
  /** Array of risk warnings */
  riskWarnings?: RiskWarning[];
  /** Overall risk score (0.0 to 1.0, higher is riskier) */
  riskScore?: number;

  // Calculation Details
  /** Detailed calculation inputs for transparency */
  calculationBasis: CalculationBasis;
  /** After Repair Value estimate used */
  arvEstimate?: number;
  /** Estimated renovation costs */
  rehabCostEstimate?: number;
  /** Estimated closing costs */
  closingCosts?: number;
  /** Estimated holding costs */
  holdingCosts?: number;

  // Market Context
  /** Current market value */
  marketValue?: number;
  /** Tax assessed value */
  assessedValue?: number;
  /** Number of comparable properties used */
  comparablePropertiesCount?: number;

  // Bid Comparison
  /** Property's minimum/opening bid (if available) */
  openingBid?: number;
  /** Warning flag: opening bid exceeds our recommended max */
  exceedsMaxBid: boolean;

  // Recommendation Metadata
  /** Algorithm version for tracking */
  recommendationVersion: string;
  /** Primary calculation method used */
  calculationMethod?: CalculationMethod;
  /** Overall data quality score (0.0 to 1.0) */
  dataQualityScore?: number;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Input Types for Bid Calculation
// ============================================

/**
 * Input parameters for generating a bid recommendation
 */
export interface BidRecommendationInput {
  /** Property ID */
  propertyId: string;
  /** After Repair Value estimate */
  arv: number;
  /** ARV confidence level */
  arvConfidence: 'low' | 'medium' | 'high';
  /** Estimated renovation costs */
  rehabCost: number;
  /** Closing costs estimate */
  closingCosts: number;
  /** Holding costs estimate */
  holdingCosts: number;
  /** Target ROI percentage (default: 25%) */
  targetROI?: number;
  /** Property's opening/minimum bid */
  openingBid?: number;
  /** Current market value */
  marketValue?: number;
  /** Tax assessed value */
  assessedValue?: number;
  /** Number of comparables used for ARV */
  comparablesCount?: number;
  /** Overall data quality score */
  dataQualityScore?: number;
  /** Risk score from risk analysis */
  riskScore?: number;
}

// ============================================
// Output Types for API Responses
// ============================================

/**
 * Simplified bid recommendation for API responses
 */
export interface BidRecommendationResponse {
  success: boolean;
  data?: BidRecommendation;
  error?: string;
}

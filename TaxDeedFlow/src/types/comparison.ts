/**
 * Property Analysis Report System - Comparison Type Definitions
 *
 * This file contains all TypeScript interfaces and types for comparing
 * two properties side-by-side using the 125-point investment scoring system.
 * The comparison utility evaluates which property performs better in each
 * category (Location, Risk, Financial, Market, Profit) and provides
 * investment recommendations.
 *
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-23
 */

import type {
  CategoryId,
  CategoryScore,
  ScoreBreakdown,
  PropertyData,
  GradeWithModifier,
  ConfidenceResult,
  PropertyType,
} from './scoring';

// Re-export types from scoring for external consumers
export type { PropertyData, CategoryId, PropertyType } from './scoring';

// ============================================
// Comparison Winner Types
// ============================================

/**
 * Identifies which property won a category comparison
 */
export type ComparisonWinner = 'property1' | 'property2' | 'tie';

/**
 * Magnitude of the score differential between two properties
 * Used to describe how significant the difference is
 */
export type DifferentialMagnitude = 'negligible' | 'small' | 'moderate' | 'significant' | 'major';

/**
 * Maps score differential to magnitude label
 * @param differential - Absolute score difference
 * @param maxScore - Maximum possible score for the category
 */
export function getDifferentialMagnitude(
  differential: number,
  maxScore: number
): DifferentialMagnitude {
  const percentage = Math.abs(differential) / maxScore;
  if (percentage < 0.05) return 'negligible'; // < 5%
  if (percentage < 0.15) return 'small'; // 5-15%
  if (percentage < 0.30) return 'moderate'; // 15-30%
  if (percentage < 0.50) return 'significant'; // 30-50%
  return 'major'; // >= 50%
}

// ============================================
// Category Comparison Types
// ============================================

/**
 * Comparison details for a single scoring category
 * Shows which property performed better and by how much
 */
export interface CategoryComparison {
  /** Category identifier (location, risk, financial, market, profit) */
  categoryId: CategoryId;
  /** Display name of the category */
  categoryName: string;

  /** Property 1's score for this category */
  property1Score: CategoryScore;
  /** Property 2's score for this category */
  property2Score: CategoryScore;

  /** Which property won this category */
  winner: ComparisonWinner;
  /** Absolute score differential (always positive) */
  scoreDifferential: number;
  /** Percentage difference relative to max score */
  percentageDifferential: number;
  /** Magnitude classification of the difference */
  magnitude: DifferentialMagnitude;

  /** Confidence in Property 1's score (0-100) */
  property1Confidence: number;
  /** Confidence in Property 2's score (0-100) */
  property2Confidence: number;
  /** Average confidence for this category comparison */
  comparisonConfidence: number;

  /** Human-readable summary of the comparison */
  summary: string;
  /** Key insights about why one property won */
  insights: string[];
}

// ============================================
// Overall Comparison Result Types
// ============================================

/**
 * Investment recommendation based on comparison results
 */
export type ComparisonRecommendation =
  | 'strongly_prefer_property1'
  | 'prefer_property1'
  | 'slightly_prefer_property1'
  | 'properties_equal'
  | 'slightly_prefer_property2'
  | 'prefer_property2'
  | 'strongly_prefer_property2';

/**
 * Determines recommendation based on score differential and grades
 * @param scoreDiff - Total score difference (property1 - property2)
 * @param grade1 - Property 1's grade
 * @param grade2 - Property 2's grade
 */
export function getRecommendation(
  scoreDiff: number,
  grade1: GradeWithModifier,
  grade2: GradeWithModifier
): ComparisonRecommendation {
  const percentage = scoreDiff / 125; // Total possible score is 125

  if (Math.abs(percentage) < 0.03) return 'properties_equal'; // < 3%

  if (scoreDiff > 0) {
    // Property 1 is better
    if (percentage >= 0.20) return 'strongly_prefer_property1'; // >= 20%
    if (percentage >= 0.10) return 'prefer_property1'; // 10-20%
    return 'slightly_prefer_property1'; // 3-10%
  } else {
    // Property 2 is better
    if (percentage <= -0.20) return 'strongly_prefer_property2'; // >= 20%
    if (percentage <= -0.10) return 'prefer_property2'; // 10-20%
    return 'slightly_prefer_property2'; // 3-10%
  }
}

/**
 * Strength of investment recommendation
 */
export type RecommendationStrength = 'strong' | 'moderate' | 'weak' | 'neutral';

/**
 * Maps recommendation to strength level
 */
export function getRecommendationStrength(
  recommendation: ComparisonRecommendation
): RecommendationStrength {
  if (recommendation === 'properties_equal') return 'neutral';
  if (recommendation.startsWith('strongly_')) return 'strong';
  if (recommendation.startsWith('prefer_')) return 'moderate';
  return 'weak';
}

// ============================================
// Main Comparison Result
// ============================================

/**
 * Complete comparison result for two properties
 * Contains all comparison data, category breakdowns, and recommendations
 */
export interface ComparisonResult {
  /** Unique identifier for this comparison */
  id: string;
  /** When the comparison was performed */
  comparedAt: Date;

  // Property Information
  /** First property being compared */
  property1: PropertyData;
  /** Second property being compared */
  property2: PropertyData;

  // Score Breakdowns
  /** Complete score breakdown for Property 1 */
  property1Scores: ScoreBreakdown;
  /** Complete score breakdown for Property 2 */
  property2Scores: ScoreBreakdown;

  // Overall Comparison
  /** Which property has the higher overall score */
  overallWinner: ComparisonWinner;
  /** Total score differential (property1 - property2) */
  totalScoreDifferential: number;
  /** Percentage of maximum possible score difference */
  percentageDifferential: number;
  /** Magnitude of the overall difference */
  overallMagnitude: DifferentialMagnitude;

  // Category-by-Category Comparisons
  /** Location category comparison */
  locationComparison: CategoryComparison;
  /** Risk category comparison */
  riskComparison: CategoryComparison;
  /** Financial category comparison */
  financialComparison: CategoryComparison;
  /** Market category comparison */
  marketComparison: CategoryComparison;
  /** Profit category comparison */
  profitComparison: CategoryComparison;

  /** Summary of which property won each category */
  categorySummary: {
    /** Number of categories won by Property 1 */
    property1Wins: number;
    /** Number of categories won by Property 2 */
    property2Wins: number;
    /** Number of tied categories */
    ties: number;
  };

  // Confidence Assessment
  /** Overall confidence in the comparison (0-100) */
  comparisonConfidence: number;
  /** Confidence details for Property 1 */
  property1ConfidenceDetails: ConfidenceResult;
  /** Confidence details for Property 2 */
  property2ConfidenceDetails: ConfidenceResult;

  // Investment Recommendation
  /** Investment recommendation based on comparison */
  recommendation: ComparisonRecommendation;
  /** Strength of the recommendation */
  recommendationStrength: RecommendationStrength;
  /** Detailed recommendation explanation */
  recommendationSummary: string;
  /** Key reasons supporting the recommendation */
  recommendationReasons: string[];

  // Additional Insights
  /** Notable differences between the properties */
  keyDifferences: {
    category: CategoryId;
    description: string;
    impact: 'positive' | 'negative' | 'neutral';
    severity: 'low' | 'medium' | 'high';
  }[];

  /** Trade-off analysis between the two properties */
  tradeoffs: {
    property1Advantages: string[];
    property2Advantages: string[];
  };

  /** Any warnings or caveats about the comparison */
  warnings: string[];

  // Metadata
  /** Version of the comparison algorithm used */
  comparisonVersion: string;
  /** Version of the scoring algorithm used */
  scoringVersion: string;
}

// ============================================
// Comparison Options
// ============================================

/**
 * Configuration options for property comparison
 */
export interface ComparisonOptions {
  /** Include detailed component-level comparisons */
  includeComponentDetails?: boolean;
  /** Include confidence factor breakdowns */
  includeConfidenceDetails?: boolean;
  /** Generate extended recommendations and insights */
  extendedAnalysis?: boolean;
  /** Minimum score differential to consider significant */
  significanceThreshold?: number;
  /** Minimum confidence level to trust comparison (0-100) */
  minConfidenceThreshold?: number;
}

// ============================================
// Comparison Summary (Lightweight)
// ============================================

/**
 * Lightweight comparison summary for list views
 * Contains only essential comparison data without full breakdowns
 */
export interface ComparisonSummary {
  /** Unique identifier for this comparison */
  id: string;
  /** When the comparison was performed */
  comparedAt: Date;

  /** Property 1 identifier and address */
  property1: {
    id: string;
    address: string;
    grade: GradeWithModifier;
    totalScore: number;
  };

  /** Property 2 identifier and address */
  property2: {
    id: string;
    address: string;
    grade: GradeWithModifier;
    totalScore: number;
  };

  /** Quick comparison result */
  result: {
    winner: ComparisonWinner;
    scoreDifferential: number;
    recommendation: ComparisonRecommendation;
    recommendationStrength: RecommendationStrength;
  };

  /** Category wins summary */
  categoryWins: {
    property1: number;
    property2: number;
    ties: number;
  };
}

// ============================================
// Comparison Error Handling
// ============================================

/**
 * Error that can occur during property comparison
 */
export interface ComparisonError {
  /** Error code */
  code: 'MISSING_PROPERTY_DATA' | 'SCORING_FAILED' | 'INVALID_COMPARISON' | 'CONFIDENCE_TOO_LOW';
  /** Human-readable error message */
  message: string;
  /** Which property the error relates to */
  propertyId?: string;
  /** Detailed error context */
  details?: Record<string, unknown>;
}

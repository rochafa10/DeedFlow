/**
 * Property Comparison Utility
 *
 * This module provides the main compareProperties() function that compares
 * two properties side-by-side using the 125-point investment scoring system.
 * It orchestrates two score calculations, compares them category by category,
 * and provides investment recommendations.
 *
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-23
 */

import type {
  PropertyData,
  ExternalData,
  CategoryId,
  CategoryScore,
  ScoreBreakdown,
  ConfidenceResult,
  ConfidenceLabel,
} from '@/types/scoring';
import type { ConfidenceLevel } from '@/lib/scoring/utils/confidence-calculator';
import type {
  ComparisonResult,
  ComparisonOptions,
  ComparisonSummary,
  ComparisonError,
  CategoryComparison,
  ComparisonWinner,
  DifferentialMagnitude,
  ComparisonRecommendation,
  RecommendationStrength,
} from '@/types/comparison';
import {
  getDifferentialMagnitude,
  getRecommendation,
  getRecommendationStrength,
} from '@/types/comparison';
import { calculatePropertyScore } from '@/lib/scoring/calculator/propertyScoreCalculator';
import type { PropertyScoreResult } from '@/lib/scoring/calculator/propertyScoreCalculator';
import { SCORING_CONSTANTS } from '@/lib/scoring/constants';

// ============================================
// Constants
// ============================================

/**
 * Version of the comparison algorithm
 */
const COMPARISON_VERSION = '1.0.0';

/**
 * Default comparison options
 */
const DEFAULT_OPTIONS: Required<ComparisonOptions> = {
  includeComponentDetails: true,
  includeConfidenceDetails: true,
  extendedAnalysis: true,
  significanceThreshold: 0.05, // 5% of max score
  minConfidenceThreshold: 50, // 50% minimum confidence
};

/**
 * Category names mapping
 */
const CATEGORY_NAMES: Record<CategoryId, string> = {
  location: 'Location',
  risk: 'Risk',
  financial: 'Financial',
  market: 'Market',
  profit: 'Profit',
};

// ============================================
// Helper Functions
// ============================================

/**
 * Determine the winner of a category comparison
 * @param score1 - Property 1's score
 * @param score2 - Property 2's score
 * @param threshold - Minimum difference to avoid tie
 * @returns Winner designation
 */
function determineWinner(
  score1: number,
  score2: number,
  threshold: number = 0.1
): ComparisonWinner {
  const diff = Math.abs(score1 - score2);
  if (diff < threshold) {
    return 'tie';
  }
  return score1 > score2 ? 'property1' : 'property2';
}

/**
 * Calculate average confidence for a category
 * @param score1 - Property 1's category score
 * @param score2 - Property 2's category score
 * @returns Average confidence percentage
 */
function calculateCategoryConfidence(
  score1: CategoryScore,
  score2: CategoryScore
): number {
  return Math.round((score1.confidence + score2.confidence) / 2);
}

/**
 * Convert ConfidenceLevel enum to ConfidenceResult object
 * Creates a basic confidence result from the enum value
 * @param level - Confidence level enum
 * @returns Basic ConfidenceResult object
 */
function confidenceLevelToResult(level: ConfidenceLevel): ConfidenceResult {
  // Map enum to percentage and label
  const levelMap: Record<ConfidenceLevel, { overall: number; label: ConfidenceLabel }> = {
    very_high: { overall: 90, label: 'Very High' },
    high: { overall: 75, label: 'High' },
    medium: { overall: 60, label: 'Moderate' },
    low: { overall: 40, label: 'Low' },
    very_low: { overall: 20, label: 'Very Low' },
  };

  const mapped = levelMap[level];

  return {
    overall: mapped.overall,
    label: mapped.label,
    factors: [],
    recommendations: [],
  };
}

/**
 * Generate category comparison summary text
 * @param categoryName - Name of the category
 * @param winner - Which property won
 * @param differential - Score differential
 * @param magnitude - Magnitude of difference
 * @returns Summary string
 */
function generateCategorySummary(
  categoryName: string,
  winner: ComparisonWinner,
  differential: number,
  magnitude: DifferentialMagnitude
): string {
  if (winner === 'tie') {
    return `Both properties score similarly in ${categoryName} (within ${differential.toFixed(1)} points).`;
  }

  const winnerText = winner === 'property1' ? 'Property 1' : 'Property 2';
  const magnitudeText =
    magnitude === 'negligible' ? 'slightly' :
    magnitude === 'small' ? 'moderately' :
    magnitude === 'moderate' ? 'notably' :
    magnitude === 'significant' ? 'significantly' :
    'substantially';

  return `${winnerText} scores ${magnitudeText} better in ${categoryName} (+${differential.toFixed(1)} points).`;
}

/**
 * Generate insights for a category comparison
 * @param categoryId - Category identifier
 * @param score1 - Property 1's category score
 * @param score2 - Property 2's category score
 * @param winner - Which property won
 * @returns Array of insight strings
 */
function generateCategoryInsights(
  categoryId: CategoryId,
  score1: CategoryScore,
  score2: CategoryScore,
  winner: ComparisonWinner
): string[] {
  const insights: string[] = [];

  if (winner === 'tie') {
    insights.push('Scores are nearly identical in this category.');
    return insights;
  }

  const winningScore = winner === 'property1' ? score1 : score2;
  const losingScore = winner === 'property1' ? score2 : score1;

  // Find components with largest differences
  const componentDiffs = winningScore.components.map((comp, idx) => ({
    name: comp.name,
    diff: comp.score - losingScore.components[idx].score,
  }));

  componentDiffs.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

  // Report top 2 component differences
  const topDiffs = componentDiffs.slice(0, 2).filter((d) => Math.abs(d.diff) > 0.5);
  topDiffs.forEach((diff) => {
    const direction = diff.diff > 0 ? 'higher' : 'lower';
    insights.push(
      `${diff.name} score is ${direction} by ${Math.abs(diff.diff).toFixed(1)} points.`
    );
  });

  // Mention confidence difference if significant
  const confidenceDiff = Math.abs(score1.confidence - score2.confidence);
  if (confidenceDiff > 20) {
    const higherConfProp = score1.confidence > score2.confidence ? 'Property 1' : 'Property 2';
    insights.push(
      `${higherConfProp} has ${confidenceDiff.toFixed(0)}% higher confidence in this category.`
    );
  }

  return insights;
}

/**
 * Compare a single category between two properties
 * @param categoryId - Category to compare
 * @param score1 - Property 1's category score
 * @param score2 - Property 2's category score
 * @param options - Comparison options
 * @returns CategoryComparison result
 */
function compareCategorys(
  categoryId: CategoryId,
  score1: CategoryScore,
  score2: CategoryScore,
  options: Required<ComparisonOptions>
): CategoryComparison {
  const categoryName = CATEGORY_NAMES[categoryId];
  const maxScore = SCORING_CONSTANTS.MAX_CATEGORY_SCORE;

  const scoreDiff = Math.abs(score1.score - score2.score);
  const percentageDiff = (scoreDiff / maxScore) * 100;
  const magnitude = getDifferentialMagnitude(scoreDiff, maxScore);
  const winner = determineWinner(score1.score, score2.score, options.significanceThreshold);

  const summary = generateCategorySummary(categoryName, winner, scoreDiff, magnitude);
  const insights = options.extendedAnalysis
    ? generateCategoryInsights(categoryId, score1, score2, winner)
    : [];

  return {
    categoryId,
    categoryName,
    property1Score: score1,
    property2Score: score2,
    winner,
    scoreDifferential: scoreDiff,
    percentageDifferential: percentageDiff,
    magnitude,
    property1Confidence: score1.confidence,
    property2Confidence: score2.confidence,
    comparisonConfidence: calculateCategoryConfidence(score1, score2),
    summary,
    insights,
  };
}

/**
 * Generate key differences between two properties
 * @param categoryComparisons - All category comparison results
 * @param extendedAnalysis - Whether to include extended analysis
 * @returns Array of key differences
 */
function generateKeyDifferences(
  categoryComparisons: CategoryComparison[],
  extendedAnalysis: boolean
): ComparisonResult['keyDifferences'] {
  if (!extendedAnalysis) {
    return [];
  }

  const differences: ComparisonResult['keyDifferences'] = [];

  categoryComparisons.forEach((comp) => {
    if (comp.winner === 'tie' || comp.magnitude === 'negligible') {
      return;
    }

    const impact = comp.winner === 'property1' ? 'positive' : 'negative';
    const severity =
      comp.magnitude === 'major' || comp.magnitude === 'significant' ? 'high' :
      comp.magnitude === 'moderate' ? 'medium' :
      'low';

    differences.push({
      category: comp.categoryId,
      description: comp.summary,
      impact,
      severity,
    });
  });

  return differences;
}

/**
 * Generate trade-off analysis between properties
 * @param categoryComparisons - All category comparison results
 * @param property1 - First property data
 * @param property2 - Second property data
 * @returns Trade-off analysis
 */
function generateTradeoffs(
  categoryComparisons: CategoryComparison[],
  property1: PropertyData,
  property2: PropertyData
): ComparisonResult['tradeoffs'] {
  const property1Advantages: string[] = [];
  const property2Advantages: string[] = [];

  categoryComparisons.forEach((comp) => {
    if (comp.winner === 'property1' && comp.magnitude !== 'negligible') {
      property1Advantages.push(
        `Better ${comp.categoryName.toLowerCase()} score (+${comp.scoreDifferential.toFixed(1)} points)`
      );
    } else if (comp.winner === 'property2' && comp.magnitude !== 'negligible') {
      property2Advantages.push(
        `Better ${comp.categoryName.toLowerCase()} score (+${comp.scoreDifferential.toFixed(1)} points)`
      );
    }
  });

  // Add property-specific advantages
  if (property1.total_due && property2.total_due && property1.total_due < property2.total_due) {
    const savings = property2.total_due - property1.total_due;
    property1Advantages.push(`Lower total due by $${savings.toLocaleString()}`);
  } else if (property1.total_due && property2.total_due && property2.total_due < property1.total_due) {
    const savings = property1.total_due - property2.total_due;
    property2Advantages.push(`Lower total due by $${savings.toLocaleString()}`);
  }

  if (property1.building_sqft && property2.building_sqft && property1.building_sqft > property2.building_sqft) {
    property1Advantages.push(
      `Larger building (${property1.building_sqft.toLocaleString()} sqft vs ${property2.building_sqft.toLocaleString()} sqft)`
    );
  } else if (property1.building_sqft && property2.building_sqft && property2.building_sqft > property1.building_sqft) {
    property2Advantages.push(
      `Larger building (${property2.building_sqft.toLocaleString()} sqft vs ${property1.building_sqft.toLocaleString()} sqft)`
    );
  }

  return {
    property1Advantages,
    property2Advantages,
  };
}

/**
 * Generate recommendation summary text
 * @param recommendation - Recommendation type
 * @param property1 - First property
 * @param property2 - Second property
 * @param scoreDiff - Total score differential
 * @param overallWinner - Overall winner
 * @returns Recommendation summary string
 */
function generateRecommendationSummary(
  recommendation: ComparisonRecommendation,
  property1: PropertyData,
  property2: PropertyData,
  scoreDiff: number,
  overallWinner: ComparisonWinner
): string {
  if (recommendation === 'properties_equal') {
    return `Both properties score nearly identically (within ${Math.abs(scoreDiff).toFixed(1)} points). Consider other factors like location preference, timeline, or specific investment goals to make your decision.`;
  }

  const winningProp = overallWinner === 'property1' ? property1 : property2;
  const propName = overallWinner === 'property1' ? 'Property 1' : 'Property 2';
  const address = winningProp.address || winningProp.parcel_id;

  const strength = getRecommendationStrength(recommendation);
  const strengthText =
    strength === 'strong' ? 'strongly recommend' :
    strength === 'moderate' ? 'recommend' :
    'slightly prefer';

  return `We ${strengthText} ${propName} (${address}) based on its superior overall investment score (+${Math.abs(scoreDiff).toFixed(1)} points). This property demonstrates better fundamentals across multiple categories.`;
}

/**
 * Generate recommendation reasons
 * @param categoryComparisons - All category comparisons
 * @param overallWinner - Overall winner
 * @param property1Scores - Property 1's score breakdown
 * @param property2Scores - Property 2's score breakdown
 * @returns Array of recommendation reason strings
 */
function generateRecommendationReasons(
  categoryComparisons: CategoryComparison[],
  overallWinner: ComparisonWinner,
  property1Scores: ScoreBreakdown,
  property2Scores: ScoreBreakdown
): string[] {
  if (overallWinner === 'tie') {
    return [
      'Overall scores are within the margin of equivalence.',
      'Both properties have similar risk/reward profiles.',
      'Decision should be based on personal preferences and specific investment goals.',
    ];
  }

  const reasons: string[] = [];
  const winningProp = overallWinner === 'property1' ? 'Property 1' : 'Property 2';

  // Count category wins
  const categoryWins = categoryComparisons.filter(
    (comp) => comp.winner === overallWinner && comp.magnitude !== 'negligible'
  );

  if (categoryWins.length > 0) {
    reasons.push(
      `${winningProp} wins in ${categoryWins.length} out of 5 categories.`
    );
  }

  // Highlight strongest categories
  const strongCategories = categoryComparisons
    .filter(
      (comp) =>
        comp.winner === overallWinner &&
        (comp.magnitude === 'significant' || comp.magnitude === 'major')
    )
    .map((comp) => comp.categoryName.toLowerCase());

  if (strongCategories.length > 0) {
    reasons.push(
      `Significantly better ${strongCategories.join(', ')} fundamentals.`
    );
  }

  // Mention grade advantage
  const winningGrade = overallWinner === 'property1'
    ? property1Scores.gradeResult.gradeWithModifier
    : property2Scores.gradeResult.gradeWithModifier;
  const losingGrade = overallWinner === 'property1'
    ? property2Scores.gradeResult.gradeWithModifier
    : property1Scores.gradeResult.gradeWithModifier;

  if (winningGrade !== losingGrade) {
    reasons.push(
      `Higher overall grade (${winningGrade} vs ${losingGrade}).`
    );
  }

  // Mention confidence if significantly higher
  const winningConf =
    overallWinner === 'property1'
      ? property1Scores.confidenceLevel.overall
      : property2Scores.confidenceLevel.overall;
  const losingConf =
    overallWinner === 'property1'
      ? property2Scores.confidenceLevel.overall
      : property1Scores.confidenceLevel.overall;

  if (winningConf - losingConf > 15) {
    reasons.push(
      `Higher data confidence (${winningConf.toFixed(0)}% vs ${losingConf.toFixed(0)}%).`
    );
  }

  return reasons;
}

/**
 * Generate comparison warnings
 * @param property1Result - Property 1's score result
 * @param property2Result - Property 2's score result
 * @param options - Comparison options
 * @returns Array of warning strings
 */
function generateWarnings(
  property1Result: PropertyScoreResult,
  property2Result: PropertyScoreResult,
  options: Required<ComparisonOptions>
): string[] {
  const warnings: string[] = [];

  // Check confidence levels
  const property1Confidence = confidenceLevelToResult(property1Result.confidenceLevel);
  const property2Confidence = confidenceLevelToResult(property2Result.confidenceLevel);
  const avgConfidence = (property1Confidence.overall + property2Confidence.overall) / 2;

  if (avgConfidence < options.minConfidenceThreshold) {
    warnings.push(
      `Average confidence is low (${avgConfidence.toFixed(0)}%). Consider gathering more data before making a decision.`
    );
  }

  // Check for edge cases
  if (property1Result.edgeCases.isEdgeCase || property2Result.edgeCases.isEdgeCase) {
    warnings.push(
      'One or both properties have edge case characteristics that may affect scoring accuracy.'
    );
  }

  // Check for validation status
  const prop1Rejected = property1Result.edgeCases.handling === 'auto_reject' ||
    property1Result.edgeCases.handling === 'reject_unbuildable';
  const prop2Rejected = property2Result.edgeCases.handling === 'auto_reject' ||
    property2Result.edgeCases.handling === 'reject_unbuildable';

  if (prop1Rejected) {
    warnings.push('Property 1 has been flagged as non-investable by automated screening.');
  }
  if (prop2Rejected) {
    warnings.push('Property 2 has been flagged as non-investable by automated screening.');
  }

  // Combine warnings from both properties
  const allWarnings = [
    ...property1Result.warnings,
    ...property2Result.warnings,
  ];

  // Add unique warnings
  const uniqueWarnings = Array.from(new Set(allWarnings));
  warnings.push(...uniqueWarnings);

  return warnings;
}

/**
 * Create a score breakdown from PropertyScoreResult
 * @param result - Property score result
 * @param propertyId - Property ID
 * @returns ScoreBreakdown
 */
function createScoreBreakdown(
  result: PropertyScoreResult,
  propertyId: string
): ScoreBreakdown {
  // Convert ConfidenceLevel enum to full ConfidenceResult
  const confidenceResult = confidenceLevelToResult(result.confidenceLevel);

  return {
    id: crypto.randomUUID(),
    propertyId,
    totalScore: result.totalScore,
    gradeResult: result.grade,
    confidenceLevel: confidenceResult,
    location: result.location,
    risk: result.risk,
    financial: result.financial,
    market: result.market,
    profit: result.profit,
    scoringVersion: result.scoringVersion,
    calculatedAt: result.calculatedAt,
    propertyType: result.propertyType,
    regionalAdjustments: [],
    warnings: result.warnings.map((w) => ({
      severity: 'warning' as const,
      category: 'overall' as const,
      message: w,
      recommendation: '',
    })),
  };
}

// ============================================
// Main Comparison Function
// ============================================

/**
 * Compare two properties side-by-side using the investment scoring system
 *
 * This function orchestrates two score calculations and produces a structured
 * comparison showing which property performs better in each category, score
 * differentials, and investment recommendations.
 *
 * @param property1 - First property data
 * @param property2 - Second property data
 * @param externalData1 - External data for property 1 (optional)
 * @param externalData2 - External data for property 2 (optional)
 * @param options - Comparison options (optional)
 * @returns ComparisonResult with complete comparison analysis
 * @throws ComparisonError if comparison cannot be performed
 *
 * @example
 * const comparison = compareProperties(
 *   propertyA,
 *   propertyB,
 *   externalDataA,
 *   externalDataB
 * );
 * console.log(comparison.recommendation); // 'prefer_property1'
 * console.log(comparison.totalScoreDifferential); // 12.5
 */
export function compareProperties(
  property1: Partial<PropertyData>,
  property2: Partial<PropertyData>,
  externalData1?: Partial<ExternalData> | null,
  externalData2?: Partial<ExternalData> | null,
  options: ComparisonOptions = {}
): ComparisonResult {
  // Merge options with defaults
  const opts: Required<ComparisonOptions> = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  // Validate properties
  if (!property1.id || !property2.id) {
    throw {
      code: 'MISSING_PROPERTY_DATA',
      message: 'Both properties must have an ID',
      details: { property1: property1.id, property2: property2.id },
    } as ComparisonError;
  }

  // Calculate scores for both properties
  let property1Result: PropertyScoreResult;
  let property2Result: PropertyScoreResult;

  try {
    property1Result = calculatePropertyScore(property1, externalData1, {
      includeFallbackLog: opts.includeComponentDetails,
    });
  } catch (error) {
    throw {
      code: 'SCORING_FAILED',
      message: `Failed to calculate score for Property 1: ${error}`,
      propertyId: property1.id,
      details: { error },
    } as ComparisonError;
  }

  try {
    property2Result = calculatePropertyScore(property2, externalData2, {
      includeFallbackLog: opts.includeComponentDetails,
    });
  } catch (error) {
    throw {
      code: 'SCORING_FAILED',
      message: `Failed to calculate score for Property 2: ${error}`,
      propertyId: property2.id,
      details: { error },
    } as ComparisonError;
  }

  // Check confidence thresholds - Convert enum to result first
  const property1ConfidenceResult = confidenceLevelToResult(property1Result.confidenceLevel);
  const property2ConfidenceResult = confidenceLevelToResult(property2Result.confidenceLevel);
  const avgConfidence =
    (property1ConfidenceResult.overall + property2ConfidenceResult.overall) / 2;

  if (avgConfidence < opts.minConfidenceThreshold) {
    throw {
      code: 'CONFIDENCE_TOO_LOW',
      message: `Average confidence (${avgConfidence.toFixed(0)}%) is below minimum threshold (${opts.minConfidenceThreshold}%)`,
      details: {
        property1Confidence: property1ConfidenceResult.overall,
        property2Confidence: property2ConfidenceResult.overall,
        threshold: opts.minConfidenceThreshold,
      },
    } as ComparisonError;
  }

  // Calculate overall comparison metrics
  const totalScoreDiff = property1Result.totalScore - property2Result.totalScore;
  const percentageDiff = (Math.abs(totalScoreDiff) / SCORING_CONSTANTS.MAX_TOTAL_SCORE) * 100;
  const overallMagnitude = getDifferentialMagnitude(
    Math.abs(totalScoreDiff),
    SCORING_CONSTANTS.MAX_TOTAL_SCORE
  );
  const overallWinner = determineWinner(
    property1Result.totalScore,
    property2Result.totalScore,
    opts.significanceThreshold
  );

  // Compare each category
  const locationComparison = compareCategorys(
    'location',
    property1Result.location,
    property2Result.location,
    opts
  );
  const riskComparison = compareCategorys(
    'risk',
    property1Result.risk,
    property2Result.risk,
    opts
  );
  const financialComparison = compareCategorys(
    'financial',
    property1Result.financial,
    property2Result.financial,
    opts
  );
  const marketComparison = compareCategorys(
    'market',
    property1Result.market,
    property2Result.market,
    opts
  );
  const profitComparison = compareCategorys(
    'profit',
    property1Result.profit,
    property2Result.profit,
    opts
  );

  const categoryComparisons = [
    locationComparison,
    riskComparison,
    financialComparison,
    marketComparison,
    profitComparison,
  ];

  // Calculate category wins
  const property1Wins = categoryComparisons.filter((c) => c.winner === 'property1').length;
  const property2Wins = categoryComparisons.filter((c) => c.winner === 'property2').length;
  const ties = categoryComparisons.filter((c) => c.winner === 'tie').length;

  // Generate recommendation
  const recommendation = getRecommendation(
    totalScoreDiff,
    property1Result.grade.gradeWithModifier,
    property2Result.grade.gradeWithModifier
  );
  const recommendationStrength = getRecommendationStrength(recommendation);

  // Create score breakdowns
  const property1Scores = createScoreBreakdown(property1Result, property1.id);
  const property2Scores = createScoreBreakdown(property2Result, property2.id);

  // Generate analysis
  const recommendationSummary = generateRecommendationSummary(
    recommendation,
    property1 as PropertyData,
    property2 as PropertyData,
    totalScoreDiff,
    overallWinner
  );
  const recommendationReasons = generateRecommendationReasons(
    categoryComparisons,
    overallWinner,
    property1Scores,
    property2Scores
  );
  const keyDifferences = generateKeyDifferences(categoryComparisons, opts.extendedAnalysis);
  const tradeoffs = opts.extendedAnalysis
    ? generateTradeoffs(categoryComparisons, property1 as PropertyData, property2 as PropertyData)
    : { property1Advantages: [], property2Advantages: [] };
  const warnings = generateWarnings(property1Result, property2Result, opts);

  // Calculate overall comparison confidence
  const comparisonConfidence = Math.round(avgConfidence);

  // Build final comparison result
  const comparisonResult: ComparisonResult = {
    id: crypto.randomUUID(),
    comparedAt: new Date(),

    // Properties
    property1: property1 as PropertyData,
    property2: property2 as PropertyData,

    // Score breakdowns
    property1Scores,
    property2Scores,

    // Overall comparison
    overallWinner,
    totalScoreDifferential: Math.abs(totalScoreDiff),
    percentageDifferential: percentageDiff,
    overallMagnitude,

    // Category comparisons
    locationComparison,
    riskComparison,
    financialComparison,
    marketComparison,
    profitComparison,

    // Category summary
    categorySummary: {
      property1Wins,
      property2Wins,
      ties,
    },

    // Confidence
    comparisonConfidence,
    property1ConfidenceDetails: property1ConfidenceResult,
    property2ConfidenceDetails: property2ConfidenceResult,

    // Recommendation
    recommendation,
    recommendationStrength,
    recommendationSummary,
    recommendationReasons,

    // Analysis
    keyDifferences,
    tradeoffs,
    warnings,

    // Metadata
    comparisonVersion: COMPARISON_VERSION,
    scoringVersion: property1Result.scoringVersion,
  };

  return comparisonResult;
}

/**
 * Create a lightweight comparison summary from a full comparison result
 *
 * Useful for list views where you don't need all the detailed breakdown data.
 *
 * @param comparison - Full comparison result
 * @returns Lightweight comparison summary
 *
 * @example
 * const summary = createComparisonSummary(fullComparison);
 * console.log(summary.result.winner); // 'property1'
 */
export function createComparisonSummary(
  comparison: ComparisonResult
): ComparisonSummary {
  return {
    id: comparison.id,
    comparedAt: comparison.comparedAt,
    property1: {
      id: comparison.property1.id,
      address: comparison.property1.address || comparison.property1.parcel_id,
      grade: comparison.property1Scores.gradeResult.gradeWithModifier,
      totalScore: comparison.property1Scores.totalScore,
    },
    property2: {
      id: comparison.property2.id,
      address: comparison.property2.address || comparison.property2.parcel_id,
      grade: comparison.property2Scores.gradeResult.gradeWithModifier,
      totalScore: comparison.property2Scores.totalScore,
    },
    result: {
      winner: comparison.overallWinner,
      scoreDifferential: comparison.totalScoreDifferential,
      recommendation: comparison.recommendation,
      recommendationStrength: comparison.recommendationStrength,
    },
    categoryWins: {
      property1: comparison.categorySummary.property1Wins,
      property2: comparison.categorySummary.property2Wins,
      ties: comparison.categorySummary.ties,
    },
  };
}

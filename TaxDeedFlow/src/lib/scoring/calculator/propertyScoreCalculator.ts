/**
 * Property Score Calculator - Main Entry Point
 *
 * This file provides the main calculatePropertyScore() function that
 * orchestrates all scoring components to produce a comprehensive
 * property investment score on the 125-point scale.
 *
 * Scoring Formula:
 * - 5 Categories x 25 points each = 125 total
 * - Grade = percentage * 100 / 125
 *
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-16
 */

import type {
  PropertyData,
  ExternalData,
  PropertyType,
  CategoryScore,
  GradeResult,
  DataAvailability,
} from '@/types/scoring';
import { SCORING_CONSTANTS } from '../constants';
import { calculateGrade } from '../grade-calculator';
import { calculateLocationScore } from '../categories/location';
import {
  handleEdgeCases,
  calibrateScore,
  type EdgeCaseResult,
  type ScoreValidationResult,
} from '../edge-cases';
import {
  calculateMultiFactorConfidence,
  type ConfidenceLevel,
  type ExtendedDataAvailability,
} from '../utils/confidence-calculator';
import { detectPropertyType } from '../adjustments/property-type';
import { applyAllRegionalAdjustments, type ScoreAdjustment } from '../adjustments/regional';

// ============================================
// Result Types
// ============================================

/**
 * Entry in the fallback log showing what defaults were used
 */
export interface FallbackLogEntry {
  /** Component that used fallback */
  component: string;
  /** Original value (if any) */
  originalValue: unknown;
  /** Fallback value used */
  fallbackValue: number;
  /** Reason for fallback */
  reason: string;
  /** Confidence penalty applied */
  confidencePenalty: number;
}

/**
 * Complete result from calculatePropertyScore()
 *
 * This is the main output type containing all scoring details.
 */
export interface PropertyScoreResult {
  /** Total score (0-125) */
  totalScore: number;
  /** Grade result with letter grade and percentage */
  grade: GradeResult;
  /** Location category score (25 points max) */
  location: CategoryScore;
  /** Risk category score (25 points max) - placeholder */
  risk: CategoryScore;
  /** Financial category score (25 points max) - placeholder */
  financial: CategoryScore;
  /** Market category score (25 points max) - placeholder */
  market: CategoryScore;
  /** Profit category score (25 points max) - placeholder */
  profit: CategoryScore;
  /** Detected property type */
  propertyType: PropertyType;
  /** Regional adjustments applied */
  regionAdjustments: string[];
  /** Confidence level assessment */
  confidenceLevel: ConfidenceLevel;
  /** Edge case detection results */
  edgeCases: EdgeCaseResult;
  /** Warnings for the user */
  warnings: string[];
  /** Version of the scoring algorithm */
  scoringVersion: string;
  /** When the score was calculated */
  calculatedAt: Date;
  /** Property ID being scored */
  propertyId: string;
  /** Log of fallback values used */
  fallbackLog?: FallbackLogEntry[];
}

/**
 * Options for score calculation
 */
export interface CalculationOptions {
  /** Skip edge case detection */
  skipEdgeCases?: boolean;
  /** Skip regional adjustments */
  skipRegionalAdjustments?: boolean;
  /** Skip calibration */
  skipCalibration?: boolean;
  /** Market condition for calibration */
  marketCondition?: string;
  /** Include fallback log in result */
  includeFallbackLog?: boolean;
}

// ============================================
// Main Calculator Function
// ============================================

/**
 * Calculate comprehensive property score
 *
 * This is the main entry point for property scoring. It:
 * 1. Detects edge cases that require special handling
 * 2. Calculates scores for all 5 categories
 * 3. Applies regional adjustments
 * 4. Calibrates the final score
 * 5. Determines the grade and confidence level
 *
 * @param property - Core property data from database
 * @param externalData - External data sources (optional)
 * @param options - Calculation options (optional)
 * @returns PropertyScoreResult with complete scoring breakdown
 *
 * @example
 * const result = calculatePropertyScore(
 *   { id: 'prop-123', address: '456 Oak St', state: 'PA', total_due: 5000 },
 *   { walkScore: 75, crimeData: { crimeIndex: 30 } }
 * );
 * // Returns: { totalScore: 85.5, grade: { grade: 'B', ... }, ... }
 */
export function calculatePropertyScore(
  property: Partial<PropertyData>,
  externalData?: Partial<ExternalData> | null,
  options: CalculationOptions = {}
): PropertyScoreResult {
  const warnings: string[] = [];
  const fallbackLog: FallbackLogEntry[] = [];
  const regionAdjustments: string[] = [];

  // Ensure we have a property ID
  const propertyId = property.id || 'unknown';

  // ============================================
  // Step 1: Edge Case Detection
  // ============================================

  let edgeCases: EdgeCaseResult = {
    isEdgeCase: false,
    handling: 'standard',
    warnings: [],
  };

  if (!options.skipEdgeCases) {
    edgeCases = handleEdgeCases(property, externalData);

    // Add edge case warnings
    warnings.push(...edgeCases.warnings);

    // If auto-reject or reject_unbuildable, return early with minimal score
    if (
      edgeCases.handling === 'auto_reject' ||
      edgeCases.handling === 'reject_unbuildable'
    ) {
      return createRejectedResult(property, edgeCases, propertyId);
    }
  }

  // ============================================
  // Step 2: Detect Property Type
  // ============================================

  const propertyType = detectPropertyType(
    {
      property_type: property.property_type,
      zoning: property.zoning,
      land_use: property.land_use,
      building_sqft: property.building_sqft,
      lot_size_acres: property.lot_size_acres,
    },
    null
  ) as PropertyType;

  // ============================================
  // Step 3: Calculate Category Scores
  // ============================================

  // Location Score (implemented)
  const locationScore = calculateLocationScore(property, externalData);

  // Risk Score (placeholder - use default)
  const riskScore = createPlaceholderCategoryScore('risk', 'Risk Assessment');
  fallbackLog.push({
    component: 'risk',
    originalValue: null,
    fallbackValue: riskScore.score,
    reason: 'Risk category not yet implemented',
    confidencePenalty: 20,
  });

  // Financial Score (placeholder)
  const financialScore = createPlaceholderCategoryScore('financial', 'Financial Analysis');
  fallbackLog.push({
    component: 'financial',
    originalValue: null,
    fallbackValue: financialScore.score,
    reason: 'Financial category not yet implemented',
    confidencePenalty: 20,
  });

  // Market Score (placeholder)
  const marketScore = createPlaceholderCategoryScore('market', 'Market Analysis');
  fallbackLog.push({
    component: 'market',
    originalValue: null,
    fallbackValue: marketScore.score,
    reason: 'Market category not yet implemented',
    confidencePenalty: 20,
  });

  // Profit Score (placeholder)
  const profitScore = createPlaceholderCategoryScore('profit', 'Profit Potential');
  fallbackLog.push({
    component: 'profit',
    originalValue: null,
    fallbackValue: profitScore.score,
    reason: 'Profit category not yet implemented',
    confidencePenalty: 20,
  });

  // ============================================
  // Step 4: Calculate Total Score
  // ============================================

  let totalScore =
    locationScore.score +
    riskScore.score +
    financialScore.score +
    marketScore.score +
    profitScore.score;

  // ============================================
  // Step 5: Apply Regional Adjustments
  // ============================================

  if (!options.skipRegionalAdjustments && property.state) {
    const adjustmentResult = applyAllRegionalAdjustments(
      {
        location: locationScore.score,
        risk: riskScore.score,
        financial: financialScore.score,
        market: marketScore.score,
        profit: profitScore.score,
      },
      property.state,
      property.county_name || undefined
    );

    // Update scores with adjustments
    locationScore.score = adjustmentResult.adjustedScores.location;
    riskScore.score = adjustmentResult.adjustedScores.risk;
    financialScore.score = adjustmentResult.adjustedScores.financial;
    marketScore.score = adjustmentResult.adjustedScores.market;
    profitScore.score = adjustmentResult.adjustedScores.profit;

    // Recalculate total
    totalScore = adjustmentResult.totalAdjusted;

    // Track adjustments applied
    for (const adj of adjustmentResult.adjustmentsApplied) {
      regionAdjustments.push(adj.reason);
    }
  }

  // ============================================
  // Step 6: Calibrate Score
  // ============================================

  let calibrationResult: ScoreValidationResult | null = null;

  if (!options.skipCalibration) {
    calibrationResult = calibrateScore(
      totalScore,
      propertyType,
      property.state || undefined,
      options.marketCondition
    );

    totalScore = calibrationResult.calibratedScore;
    warnings.push(...calibrationResult.warnings);
  }

  // ============================================
  // Step 7: Calculate Grade
  // ============================================

  const grade = calculateGrade(totalScore);

  // ============================================
  // Step 8: Calculate Confidence
  // ============================================

  // Build ExtendedDataAvailability from property and external data
  // Note: property is Partial<PropertyData>, so use optional chaining
  const dataAvailability: ExtendedDataAvailability = {
    // Core property data
    hasPropertyAddress: !!(property as Record<string, unknown>).property_address,
    hasAssessedValue: !!(property as Record<string, unknown>).assessed_value,
    hasMarketValue: !!(property as Record<string, unknown>).market_value,
    hasYearBuilt: !!(property as Record<string, unknown>).year_built,
    hasBuildingSqft: !!(property as Record<string, unknown>).building_sqft,
    hasLotSize: !!(property as Record<string, unknown>).lot_size_sqft || !!(property as Record<string, unknown>).lot_size_acres,
    hasCoordinates: !!(property as Record<string, unknown>).latitude && !!(property as Record<string, unknown>).longitude,
    hasOwnerInfo: !!(property as Record<string, unknown>).owner_name,
    hasParcelId: !!(property as Record<string, unknown>).parcel_id,

    // External data sources (handle Partial<ExternalData>)
    hasLocationData: !!(externalData as Record<string, unknown>)?.walkScore || !!(externalData as Record<string, unknown>)?.crimeData,
    hasRiskData: !!(externalData as Record<string, unknown>)?.floodZone || !!(externalData as Record<string, unknown>)?.environmentalHazards,
    hasMarketData: !!(externalData as Record<string, unknown>)?.marketData,
    hasComparables: !!(externalData as Record<string, unknown>)?.comparableSales,
    hasRentEstimates: false, // Not in ExternalData interface

    // Data quality indicators
    dataAge: 'fresh',
    sourceReliability: externalData ? 'high' : 'medium',
    conflictingData: false,
  };

  const confidenceLevel = calculateMultiFactorConfidence(
    dataAvailability,
    {
      location: locationScore.dataCompleteness,
      risk: riskScore.dataCompleteness,
      financial: financialScore.dataCompleteness,
      market: marketScore.dataCompleteness,
      profit: profitScore.dataCompleteness,
    },
    propertyType
  );

  // ============================================
  // Step 9: Add Warnings
  // ============================================

  // Convert ConfidenceResult.label to ConfidenceLevel
  const confidenceLevelMap: Record<string, ConfidenceLevel> = {
    'Very High': 'very_high',
    'High': 'high',
    'Moderate': 'medium',
    'Low': 'low',
    'Very Low': 'very_low',
  };
  const mappedConfidenceLevel: ConfidenceLevel = confidenceLevelMap[confidenceLevel.label] || 'medium';

  // Add low confidence warning
  if (mappedConfidenceLevel === 'low' || mappedConfidenceLevel === 'very_low') {
    warnings.push(
      `Low confidence score (${confidenceLevel.overall.toFixed(0)}%). Results should be verified.`
    );
  }

  // Add placeholder warning
  if (fallbackLog.length > 0) {
    warnings.push(
      'Some categories use placeholder scores. Full implementation pending.'
    );
  }

  // ============================================
  // Step 10: Build Result
  // ============================================

  const result: PropertyScoreResult = {
    totalScore: Math.round(totalScore * 100) / 100,
    grade,
    location: locationScore,
    risk: riskScore,
    financial: financialScore,
    market: marketScore,
    profit: profitScore,
    propertyType,
    regionAdjustments,
    confidenceLevel: mappedConfidenceLevel,
    edgeCases,
    warnings,
    scoringVersion: SCORING_CONSTANTS.SCORING_VERSION,
    calculatedAt: new Date(),
    propertyId,
  };

  if (options.includeFallbackLog) {
    result.fallbackLog = fallbackLog;
  }

  return result;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Create a placeholder category score
 *
 * Used for categories not yet implemented.
 * Returns neutral score with low confidence.
 */
function createPlaceholderCategoryScore(
  id: string,
  name: string
): CategoryScore {
  // Neutral score: 12.5 / 25 = 50%
  const neutralScore = SCORING_CONSTANTS.MAX_CATEGORY_SCORE / 2;

  return {
    id: id as 'location' | 'risk' | 'financial' | 'market' | 'profit',
    name,
    score: neutralScore,
    maxScore: SCORING_CONSTANTS.MAX_CATEGORY_SCORE,
    confidence: 30, // Low confidence for placeholder
    dataCompleteness: 0,
    components: [], // No components calculated
    notes: [`${name} category uses placeholder score. Implementation pending.`],
    adjustments: [],
  };
}

/**
 * Create result for rejected properties
 *
 * Properties that are auto-rejected (cemetery, utility) or
 * unbuildable (sliver lot) get a minimal score result.
 */
function createRejectedResult(
  property: Partial<PropertyData>,
  edgeCases: EdgeCaseResult,
  propertyId: string
): PropertyScoreResult {
  // Create zero-score categories
  const zeroCategory = (id: string, name: string): CategoryScore => ({
    id: id as 'location' | 'risk' | 'financial' | 'market' | 'profit',
    name,
    score: 0,
    maxScore: SCORING_CONSTANTS.MAX_CATEGORY_SCORE,
    confidence: 100, // We're confident it's zero
    dataCompleteness: 100,
    components: [],
    notes: [`Property rejected: ${edgeCases.rejectReason || 'Edge case detected'}`],
    adjustments: [],
  });

  // Grade F for rejected properties
  const grade = calculateGrade(0);

  return {
    totalScore: 0,
    grade,
    location: zeroCategory('location', 'Location'),
    risk: zeroCategory('risk', 'Risk Assessment'),
    financial: zeroCategory('financial', 'Financial Analysis'),
    market: zeroCategory('market', 'Market Analysis'),
    profit: zeroCategory('profit', 'Profit Potential'),
    propertyType: (property.property_type as PropertyType) || 'unknown',
    regionAdjustments: [],
    confidenceLevel: 'very_high', // Property rejected - confidence is high that it is not investable
    edgeCases,
    warnings: edgeCases.warnings,
    scoringVersion: SCORING_CONSTANTS.SCORING_VERSION,
    calculatedAt: new Date(),
    propertyId,
  };
}

// ============================================
// Batch Calculation
// ============================================

/**
 * Calculate scores for multiple properties
 *
 * Processes properties in parallel for efficiency.
 *
 * @param properties - Array of property/externalData pairs
 * @param options - Calculation options
 * @returns Array of PropertyScoreResults
 */
export async function calculatePropertyScores(
  properties: Array<{
    property: Partial<PropertyData>;
    externalData?: Partial<ExternalData> | null;
  }>,
  options: CalculationOptions = {}
): Promise<PropertyScoreResult[]> {
  // Process all properties
  const results = properties.map(({ property, externalData }) =>
    calculatePropertyScore(property, externalData, options)
  );

  return results;
}

// ============================================
// Score Analysis Functions
// ============================================

/**
 * Compare two property scores
 *
 * @param scoreA - First score result
 * @param scoreB - Second score result
 * @returns Comparison analysis
 */
export function comparePropertyScores(
  scoreA: PropertyScoreResult,
  scoreB: PropertyScoreResult
): {
  betterProperty: 'A' | 'B' | 'tie';
  scoreDifference: number;
  categoryComparison: Record<string, { A: number; B: number; winner: 'A' | 'B' | 'tie' }>;
  notes: string[];
} {
  const scoreDiff = scoreA.totalScore - scoreB.totalScore;
  const betterProperty = scoreDiff > 0.5 ? 'A' : scoreDiff < -0.5 ? 'B' : 'tie';

  const categories = ['location', 'risk', 'financial', 'market', 'profit'] as const;
  const categoryComparison: Record<
    string,
    { A: number; B: number; winner: 'A' | 'B' | 'tie' }
  > = {};

  for (const cat of categories) {
    const a = scoreA[cat].score;
    const b = scoreB[cat].score;
    const diff = a - b;
    categoryComparison[cat] = {
      A: a,
      B: b,
      winner: diff > 0.5 ? 'A' : diff < -0.5 ? 'B' : 'tie',
    };
  }

  const notes: string[] = [];
  if (scoreDiff !== 0) {
    notes.push(
      `Property ${betterProperty} scores ${Math.abs(scoreDiff).toFixed(1)} points higher.`
    );
  }

  // Note category differences
  const categoryWins = { A: 0, B: 0 };
  for (const [cat, comp] of Object.entries(categoryComparison)) {
    if (comp.winner === 'A') categoryWins.A++;
    if (comp.winner === 'B') categoryWins.B++;
  }

  if (categoryWins.A > categoryWins.B) {
    notes.push(`Property A wins ${categoryWins.A} of 5 categories.`);
  } else if (categoryWins.B > categoryWins.A) {
    notes.push(`Property B wins ${categoryWins.B} of 5 categories.`);
  }

  return {
    betterProperty,
    scoreDifference: Math.round(scoreDiff * 100) / 100,
    categoryComparison,
    notes,
  };
}

/**
 * Get score breakdown summary
 *
 * @param result - Property score result
 * @returns Human-readable summary
 */
export function getScoreSummary(result: PropertyScoreResult): string {
  const lines: string[] = [];

  lines.push(`Property Score: ${result.totalScore.toFixed(1)}/125 (Grade ${result.grade.gradeWithModifier})`);
  lines.push(`Confidence: ${result.confidenceLevel}`);
  lines.push('');
  lines.push('Category Breakdown:');
  lines.push(`  Location:  ${result.location.score.toFixed(1)}/25`);
  lines.push(`  Risk:      ${result.risk.score.toFixed(1)}/25`);
  lines.push(`  Financial: ${result.financial.score.toFixed(1)}/25`);
  lines.push(`  Market:    ${result.market.score.toFixed(1)}/25`);
  lines.push(`  Profit:    ${result.profit.score.toFixed(1)}/25`);

  if (result.warnings.length > 0) {
    lines.push('');
    lines.push('Warnings:');
    for (const warning of result.warnings) {
      lines.push(`  - ${warning}`);
    }
  }

  if (result.edgeCases.isEdgeCase) {
    lines.push('');
    lines.push(`Edge Case: ${result.edgeCases.edgeCaseTypes?.join(', ')}`);
    lines.push(`Handling: ${result.edgeCases.handling}`);
  }

  return lines.join('\n');
}

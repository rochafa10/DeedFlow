/**
 * Multi-Factor Confidence Calculator
 *
 * This file provides comprehensive confidence calculation that considers
 * multiple factors including data availability, source reliability,
 * data freshness, consistency, and property type adjustments.
 *
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-16
 */

import type {
  ConfidenceResult,
  ConfidenceFactor,
  ConfidenceLabel,
  PropertyType,
} from '@/types/scoring';
import { CONFIDENCE_THRESHOLDS } from '../constants';

// ============================================
// Extended Type Definitions
// ============================================

/**
 * Extended data availability interface for detailed confidence calculation
 *
 * This extends the basic DataAvailability from scoring.ts with additional
 * fields for more granular confidence assessment.
 */
export interface ExtendedDataAvailability {
  // Core property data
  /** Property address is available */
  hasPropertyAddress: boolean;
  /** Assessed value from county records is available */
  hasAssessedValue: boolean;
  /** Market value (estimated or from comps) is available */
  hasMarketValue: boolean;
  /** Year built is available */
  hasYearBuilt: boolean;
  /** Building square footage is available */
  hasBuildingSqft: boolean;
  /** Lot size (sqft or acres) is available */
  hasLotSize: boolean;
  /** Geographic coordinates are available */
  hasCoordinates: boolean;
  /** Owner information is available */
  hasOwnerInfo: boolean;
  /** Parcel ID is available */
  hasParcelId: boolean;

  // External data sources
  /** Location scores (walk, transit, crime, schools) are available */
  hasLocationData: boolean;
  /** Risk data (flood, environmental, etc.) is available */
  hasRiskData: boolean;
  /** Market data (trends, inventory, DOM) is available */
  hasMarketData: boolean;
  /** Comparable sales data is available */
  hasComparables: boolean;
  /** Rental income estimates are available */
  hasRentEstimates: boolean;

  // Data quality indicators
  /** How fresh is the data */
  dataAge: 'fresh' | 'recent' | 'stale' | 'unknown';
  /** Reliability of the primary data sources */
  sourceReliability: 'high' | 'medium' | 'low' | 'unknown';
  /** Whether data from different sources conflicts */
  conflictingData: boolean;
}

/**
 * Confidence level enumeration for type-safe level references
 */
export type ConfidenceLevel =
  | 'very_high'
  | 'high'
  | 'medium'
  | 'low'
  | 'very_low';

/**
 * Category confidence scores for weighted calculation
 */
export interface CategoryConfidences {
  location: number;
  risk: number;
  financial: number;
  market: number;
  profit: number;
}

// ============================================
// Core Confidence Calculation
// ============================================

/**
 * Calculate multi-factor confidence score
 *
 * This comprehensive function evaluates confidence from multiple angles:
 * 1. Core data availability (+20 to -30 impact)
 * 2. External data sources (+15 to -20 impact)
 * 3. Data freshness (+10 to -15 impact)
 * 4. Source reliability (+10 to -15 impact)
 * 5. Data consistency (+5 to -20 impact)
 * 6. Category score confidence (weighted average adjustment)
 * 7. Property type adjustment (-10 to +5 impact)
 *
 * @param availability - Extended data availability information
 * @param categoryConfidences - Confidence scores from each category (0-100 each)
 * @param propertyType - Type of property being scored
 * @returns ConfidenceResult with overall score, factors, and recommendations
 *
 * @example
 * const result = calculateMultiFactorConfidence(
 *   {
 *     hasPropertyAddress: true,
 *     hasAssessedValue: true,
 *     // ... other availability flags
 *   },
 *   { location: 80, risk: 70, financial: 85, market: 60, profit: 75 },
 *   'single_family_residential'
 * );
 * // Returns: { overall: 72, label: 'High', factors: [...], recommendations: [...] }
 */
export function calculateMultiFactorConfidence(
  availability: ExtendedDataAvailability,
  categoryConfidences: CategoryConfidences,
  propertyType: PropertyType
): ConfidenceResult {
  // Start with base confidence of 50%
  let baseConfidence = 50;
  const factors: ConfidenceFactor[] = [];

  // ============================================
  // Factor 1: Core Data Availability (+20 to -30)
  // ============================================
  const coreDataScore = calculateCoreDataScore(availability);
  const coreDataImpact = coreDataScore >= 80 ? 20 : coreDataScore >= 60 ? 10 : coreDataScore >= 40 ? 0 : coreDataScore >= 20 ? -15 : -30;

  factors.push({
    name: 'Core Data Completeness',
    impact: coreDataImpact,
    weight: 0.25,
    status: coreDataImpact > 0 ? 'positive' : coreDataImpact < 0 ? 'negative' : 'neutral',
    description: getCoreDataDescription(availability),
  });
  baseConfidence += coreDataImpact * 0.25;

  // ============================================
  // Factor 2: External Data Sources (+15 to -20)
  // ============================================
  const externalDataScore = calculateExternalDataScore(availability);
  const externalDataImpact = externalDataScore >= 80 ? 15 : externalDataScore >= 60 ? 8 : externalDataScore >= 40 ? 0 : externalDataScore >= 20 ? -10 : -20;

  factors.push({
    name: 'External Data Sources',
    impact: externalDataImpact,
    weight: 0.2,
    status: externalDataImpact > 0 ? 'positive' : externalDataImpact < 0 ? 'negative' : 'neutral',
    description: getExternalDataDescription(availability),
  });
  baseConfidence += externalDataImpact * 0.2;

  // ============================================
  // Factor 3: Data Freshness (+10 to -15)
  // ============================================
  const freshnessScore = getDataFreshnessScore(availability.dataAge);

  factors.push({
    name: 'Data Freshness',
    impact: freshnessScore,
    weight: 0.15,
    status: freshnessScore > 0 ? 'positive' : freshnessScore < 0 ? 'negative' : 'neutral',
    description: getDataFreshnessDescription(availability.dataAge),
  });
  baseConfidence += freshnessScore * 0.15;

  // ============================================
  // Factor 4: Source Reliability (+10 to -15)
  // ============================================
  const reliabilityScore = getSourceReliabilityScore(availability.sourceReliability);

  factors.push({
    name: 'Source Reliability',
    impact: reliabilityScore,
    weight: 0.15,
    status: reliabilityScore > 0 ? 'positive' : reliabilityScore < 0 ? 'negative' : 'neutral',
    description: getSourceReliabilityDescription(availability.sourceReliability),
  });
  baseConfidence += reliabilityScore * 0.15;

  // ============================================
  // Factor 5: Data Consistency (+5 to -20)
  // ============================================
  const consistencyImpact = availability.conflictingData ? -20 : 5;

  factors.push({
    name: 'Data Consistency',
    impact: consistencyImpact,
    weight: 0.1,
    status: consistencyImpact > 0 ? 'positive' : 'negative',
    description: availability.conflictingData
      ? 'Data from different sources shows conflicting values'
      : 'Data from different sources is consistent',
  });
  baseConfidence += consistencyImpact * 0.1;

  // ============================================
  // Factor 6: Category Score Confidence (weighted average)
  // ============================================
  const avgCategoryConfidence =
    (categoryConfidences.location +
      categoryConfidences.risk +
      categoryConfidences.financial +
      categoryConfidences.market +
      categoryConfidences.profit) /
    5;

  // Adjust base confidence toward category average
  // If categories are confident, boost overall; if not, reduce
  const categoryAdjustment = (avgCategoryConfidence - 50) * 0.3; // +/-15 max

  factors.push({
    name: 'Category Scoring Confidence',
    impact: categoryAdjustment,
    weight: 0.1,
    status: categoryAdjustment > 5 ? 'positive' : categoryAdjustment < -5 ? 'negative' : 'neutral',
    description: `Average category confidence: ${Math.round(avgCategoryConfidence)}%`,
  });
  baseConfidence += categoryAdjustment * 0.1;

  // ============================================
  // Factor 7: Property Type Adjustment (-10 to +5)
  // ============================================
  const propertyTypeAdjustment = getPropertyTypeConfidenceAdjustment(propertyType);

  factors.push({
    name: 'Property Type Factor',
    impact: propertyTypeAdjustment,
    weight: 0.05,
    status: propertyTypeAdjustment > 0 ? 'positive' : propertyTypeAdjustment < 0 ? 'negative' : 'neutral',
    description: getPropertyTypeNote(propertyType),
  });
  baseConfidence += propertyTypeAdjustment * 0.05;

  // ============================================
  // Final Calculations
  // ============================================

  // Clamp final confidence to 0-100
  const finalConfidence = Math.max(0, Math.min(100, Math.round(baseConfidence)));

  // Generate recommendations
  const recommendations = generateConfidenceRecommendations(factors, finalConfidence);

  return {
    overall: finalConfidence,
    label: getConfidenceLabel(finalConfidence),
    factors,
    recommendations,
  };
}

// ============================================
// Score Calculation Helpers
// ============================================

/**
 * Calculate core data availability score (0-100)
 *
 * Weights different core fields by importance:
 * - Critical (20% each): address, parcel ID, assessed value
 * - Important (15% each): market value, lot size
 * - Supporting (10% each): year built, sqft, coordinates
 *
 * @param availability - Data availability flags
 * @returns Score from 0-100
 */
export function calculateCoreDataScore(
  availability: ExtendedDataAvailability
): number {
  let score = 0;

  // Critical fields (20% each = 60% total)
  if (availability.hasPropertyAddress) score += 20;
  if (availability.hasParcelId) score += 20;
  if (availability.hasAssessedValue) score += 20;

  // Important fields (15% each = 30% total)
  if (availability.hasMarketValue) score += 15;
  if (availability.hasLotSize) score += 15;

  // Supporting fields (10% total split among 3)
  if (availability.hasYearBuilt) score += 3.33;
  if (availability.hasBuildingSqft) score += 3.33;
  if (availability.hasCoordinates) score += 3.33;

  return Math.min(100, Math.round(score));
}

/**
 * Calculate external data availability score (0-100)
 *
 * Weights external data sources by value to scoring:
 * - Location data: 25%
 * - Risk data: 25%
 * - Market data: 25%
 * - Comparables: 15%
 * - Rent estimates: 10%
 *
 * @param availability - Data availability flags
 * @returns Score from 0-100
 */
export function calculateExternalDataScore(
  availability: ExtendedDataAvailability
): number {
  let score = 0;

  if (availability.hasLocationData) score += 25;
  if (availability.hasRiskData) score += 25;
  if (availability.hasMarketData) score += 25;
  if (availability.hasComparables) score += 15;
  if (availability.hasRentEstimates) score += 10;

  return score;
}

/**
 * Get confidence impact from data freshness
 *
 * @param age - Data age category
 * @returns Impact value (+10 to -15)
 */
export function getDataFreshnessScore(
  age: ExtendedDataAvailability['dataAge']
): number {
  switch (age) {
    case 'fresh':
      return 10;
    case 'recent':
      return 5;
    case 'stale':
      return -10;
    case 'unknown':
    default:
      return -5;
  }
}

/**
 * Get confidence impact from source reliability
 *
 * @param reliability - Source reliability category
 * @returns Impact value (+10 to -15)
 */
export function getSourceReliabilityScore(
  reliability: ExtendedDataAvailability['sourceReliability']
): number {
  switch (reliability) {
    case 'high':
      return 10;
    case 'medium':
      return 3;
    case 'low':
      return -10;
    case 'unknown':
    default:
      return -5;
  }
}

/**
 * Get confidence adjustment for property type
 *
 * Some property types have more established scoring models and
 * market data available, while others are more difficult to assess.
 *
 * @param propertyType - Type of property
 * @returns Adjustment value (-10 to +5)
 */
export function getPropertyTypeConfidenceAdjustment(
  propertyType: PropertyType
): number {
  switch (propertyType) {
    case 'single_family_residential':
      return 5; // Most data available, best models
    case 'multi_family_residential':
      return 3; // Good data, rental income helps
    case 'commercial':
      return 0; // Moderate - specialized knowledge needed
    case 'mixed_use':
      return -2; // More complex to evaluate
    case 'industrial':
      return -3; // Limited comparable data
    case 'vacant_land':
      return -5; // No structure data, harder to value
    case 'agricultural':
      return -8; // Very specialized market
    case 'unknown':
    default:
      return -10; // Cannot adjust for unknown type
  }
}

/**
 * Get human-readable note for property type confidence adjustment
 *
 * @param propertyType - Type of property
 * @returns Explanation string
 */
export function getPropertyTypeNote(propertyType: PropertyType): string {
  switch (propertyType) {
    case 'single_family_residential':
      return 'Single-family homes have abundant market data and well-established valuation models.';
    case 'multi_family_residential':
      return 'Multi-family properties benefit from rental income data for validation.';
    case 'commercial':
      return 'Commercial properties require specialized market analysis.';
    case 'mixed_use':
      return 'Mixed-use properties are more complex with multiple value components.';
    case 'industrial':
      return 'Industrial properties have limited comparable sales in most markets.';
    case 'vacant_land':
      return 'Vacant land lacks structure data, making valuation more challenging.';
    case 'agricultural':
      return 'Agricultural properties have highly specialized local markets.';
    case 'unknown':
    default:
      return 'Property type unknown - confidence reduced due to uncertainty.';
  }
}

// ============================================
// Description Helpers
// ============================================

/**
 * Get description of core data availability
 *
 * @param availability - Data availability flags
 * @returns Human-readable description
 */
export function getCoreDataDescription(
  availability: ExtendedDataAvailability
): string {
  const missing: string[] = [];

  if (!availability.hasPropertyAddress) missing.push('address');
  if (!availability.hasParcelId) missing.push('parcel ID');
  if (!availability.hasAssessedValue) missing.push('assessed value');
  if (!availability.hasMarketValue) missing.push('market value');
  if (!availability.hasLotSize) missing.push('lot size');
  if (!availability.hasCoordinates) missing.push('coordinates');

  if (missing.length === 0) {
    return 'All core property data available.';
  }
  if (missing.length <= 2) {
    return `Most core data available. Missing: ${missing.join(', ')}.`;
  }
  return `Limited core data. Missing: ${missing.join(', ')}.`;
}

/**
 * Get description of external data availability
 *
 * @param availability - Data availability flags
 * @returns Human-readable description
 */
export function getExternalDataDescription(
  availability: ExtendedDataAvailability
): string {
  const available: string[] = [];

  if (availability.hasLocationData) available.push('location scores');
  if (availability.hasRiskData) available.push('risk data');
  if (availability.hasMarketData) available.push('market data');
  if (availability.hasComparables) available.push('comparables');
  if (availability.hasRentEstimates) available.push('rent estimates');

  if (available.length >= 4) {
    return `Comprehensive external data: ${available.join(', ')}.`;
  }
  if (available.length >= 2) {
    return `Partial external data: ${available.join(', ')}.`;
  }
  if (available.length === 1) {
    return `Limited external data: ${available[0]} only.`;
  }
  return 'No external data sources available.';
}

/**
 * Get description of data freshness
 *
 * @param age - Data age category
 * @returns Human-readable description
 */
function getDataFreshnessDescription(
  age: ExtendedDataAvailability['dataAge']
): string {
  switch (age) {
    case 'fresh':
      return 'Data is current (updated within 30 days).';
    case 'recent':
      return 'Data is relatively recent (30-90 days old).';
    case 'stale':
      return 'Data may be outdated (more than 90 days old).';
    case 'unknown':
    default:
      return 'Data freshness could not be determined.';
  }
}

/**
 * Get description of source reliability
 *
 * @param reliability - Source reliability category
 * @returns Human-readable description
 */
function getSourceReliabilityDescription(
  reliability: ExtendedDataAvailability['sourceReliability']
): string {
  switch (reliability) {
    case 'high':
      return 'Data from highly reliable sources (official records, verified APIs).';
    case 'medium':
      return 'Data from moderately reliable sources (established data providers).';
    case 'low':
      return 'Data from less reliable sources (estimates, user-submitted).';
    case 'unknown':
    default:
      return 'Source reliability could not be determined.';
  }
}

// ============================================
// Confidence Label Functions
// ============================================

/**
 * Get human-readable confidence label from score
 *
 * Uses CONFIDENCE_THRESHOLDS from constants:
 * - 90+: Very High
 * - 75+: High
 * - 50+: Moderate
 * - 25+: Low
 * - <25: Very Low
 *
 * @param confidence - Confidence percentage (0-100)
 * @returns Human-readable label
 */
export function getConfidenceLabel(confidence: number): ConfidenceLabel {
  if (confidence >= CONFIDENCE_THRESHOLDS.VERY_HIGH.min) {
    return 'Very High';
  }
  if (confidence >= CONFIDENCE_THRESHOLDS.HIGH.min) {
    return 'High';
  }
  if (confidence >= CONFIDENCE_THRESHOLDS.MODERATE.min) {
    return 'Moderate';
  }
  if (confidence >= CONFIDENCE_THRESHOLDS.LOW.min) {
    return 'Low';
  }
  return 'Very Low';
}

/**
 * Get confidence level enumeration value from score
 *
 * @param confidence - Confidence percentage (0-100)
 * @returns ConfidenceLevel enum value
 */
export function getConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= CONFIDENCE_THRESHOLDS.VERY_HIGH.min) {
    return 'very_high';
  }
  if (confidence >= CONFIDENCE_THRESHOLDS.HIGH.min) {
    return 'high';
  }
  if (confidence >= CONFIDENCE_THRESHOLDS.MODERATE.min) {
    return 'medium';
  }
  if (confidence >= CONFIDENCE_THRESHOLDS.LOW.min) {
    return 'low';
  }
  return 'very_low';
}

// ============================================
// Recommendation Generation
// ============================================

/**
 * Generate actionable recommendations to improve confidence
 *
 * Analyzes the confidence factors to suggest specific actions
 * that would most improve the confidence score.
 *
 * @param factors - Array of confidence factors
 * @param overallConfidence - Current overall confidence score
 * @returns Array of recommendation strings
 */
export function generateConfidenceRecommendations(
  factors: ConfidenceFactor[],
  overallConfidence: number
): string[] {
  const recommendations: string[] = [];

  // Sort factors by negative impact (most impactful first)
  const negativeFactors = factors
    .filter((f) => f.status === 'negative')
    .sort((a, b) => a.impact - b.impact);

  // Generate recommendations for negative factors
  for (const factor of negativeFactors) {
    switch (factor.name) {
      case 'Core Data Completeness':
        recommendations.push(
          'Add missing core property data (address, assessed value, lot size) to improve accuracy.'
        );
        break;
      case 'External Data Sources':
        recommendations.push(
          'Fetch external data (Walk Score, flood zones, market trends) for comprehensive analysis.'
        );
        break;
      case 'Data Freshness':
        recommendations.push(
          'Update property data - some information may be outdated and affect accuracy.'
        );
        break;
      case 'Source Reliability':
        recommendations.push(
          'Verify data with official sources (county records, FEMA) for higher reliability.'
        );
        break;
      case 'Data Consistency':
        recommendations.push(
          'Review and reconcile conflicting data values from different sources.'
        );
        break;
      case 'Category Scoring Confidence':
        recommendations.push(
          'Address low-confidence categories by adding more specific data for those areas.'
        );
        break;
      case 'Property Type Factor':
        recommendations.push(
          'Verify property type classification and add type-specific data if available.'
        );
        break;
    }
  }

  // Add general recommendations based on overall confidence
  if (overallConfidence < 50) {
    recommendations.push(
      'Confidence is low - consider gathering additional data before making investment decisions.'
    );
  } else if (overallConfidence < 75) {
    recommendations.push(
      'Moderate confidence - verify key assumptions before finalizing investment analysis.'
    );
  }

  // Limit to top 5 most relevant recommendations
  return recommendations.slice(0, 5);
}

// ============================================
// Utility Functions
// ============================================

/**
 * Create default ExtendedDataAvailability from basic availability check
 *
 * @param hasBasicData - Whether basic property data exists
 * @returns ExtendedDataAvailability with conservative defaults
 */
export function createDefaultAvailability(
  hasBasicData: boolean = false
): ExtendedDataAvailability {
  return {
    hasPropertyAddress: hasBasicData,
    hasAssessedValue: false,
    hasMarketValue: false,
    hasYearBuilt: false,
    hasBuildingSqft: false,
    hasLotSize: false,
    hasCoordinates: false,
    hasOwnerInfo: false,
    hasParcelId: hasBasicData,
    hasLocationData: false,
    hasRiskData: false,
    hasMarketData: false,
    hasComparables: false,
    hasRentEstimates: false,
    dataAge: 'unknown',
    sourceReliability: 'unknown',
    conflictingData: false,
  };
}

/**
 * Merge multiple availability assessments
 *
 * Useful when combining data from multiple sources.
 * Takes the "has" value if any source has it.
 *
 * @param availabilities - Array of availability assessments
 * @returns Merged availability with combined data presence
 */
export function mergeAvailabilities(
  availabilities: ExtendedDataAvailability[]
): ExtendedDataAvailability {
  if (availabilities.length === 0) {
    return createDefaultAvailability();
  }

  if (availabilities.length === 1) {
    return availabilities[0];
  }

  // Merge boolean fields (true if any is true)
  const merged: ExtendedDataAvailability = {
    hasPropertyAddress: availabilities.some((a) => a.hasPropertyAddress),
    hasAssessedValue: availabilities.some((a) => a.hasAssessedValue),
    hasMarketValue: availabilities.some((a) => a.hasMarketValue),
    hasYearBuilt: availabilities.some((a) => a.hasYearBuilt),
    hasBuildingSqft: availabilities.some((a) => a.hasBuildingSqft),
    hasLotSize: availabilities.some((a) => a.hasLotSize),
    hasCoordinates: availabilities.some((a) => a.hasCoordinates),
    hasOwnerInfo: availabilities.some((a) => a.hasOwnerInfo),
    hasParcelId: availabilities.some((a) => a.hasParcelId),
    hasLocationData: availabilities.some((a) => a.hasLocationData),
    hasRiskData: availabilities.some((a) => a.hasRiskData),
    hasMarketData: availabilities.some((a) => a.hasMarketData),
    hasComparables: availabilities.some((a) => a.hasComparables),
    hasRentEstimates: availabilities.some((a) => a.hasRentEstimates),
    // For non-boolean, take the best value
    dataAge: getBestDataAge(availabilities.map((a) => a.dataAge)),
    sourceReliability: getBestReliability(availabilities.map((a) => a.sourceReliability)),
    // Conflicting data is true if any source reports it
    conflictingData: availabilities.some((a) => a.conflictingData),
  };

  return merged;
}

/**
 * Get the best (freshest) data age from multiple sources
 */
function getBestDataAge(
  ages: ExtendedDataAvailability['dataAge'][]
): ExtendedDataAvailability['dataAge'] {
  const priority: ExtendedDataAvailability['dataAge'][] = ['fresh', 'recent', 'stale', 'unknown'];
  for (const age of priority) {
    if (ages.includes(age)) return age;
  }
  return 'unknown';
}

/**
 * Get the best (highest) reliability from multiple sources
 */
function getBestReliability(
  reliabilities: ExtendedDataAvailability['sourceReliability'][]
): ExtendedDataAvailability['sourceReliability'] {
  const priority: ExtendedDataAvailability['sourceReliability'][] = ['high', 'medium', 'low', 'unknown'];
  for (const rel of priority) {
    if (reliabilities.includes(rel)) return rel;
  }
  return 'unknown';
}

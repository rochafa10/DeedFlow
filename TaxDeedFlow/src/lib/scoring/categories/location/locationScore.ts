/**
 * Location Score Calculator - Location Category (25 points)
 *
 * This file calculates the Location category score, one of five categories
 * in the 125-point scoring system. Location measures neighborhood quality,
 * accessibility, and amenities.
 *
 * Components (5 points each, 25 points total):
 * 1. Walkability (walk_score) - WalkScore.com score normalized
 * 2. Crime Safety (crime_safety) - Inverse crime index
 * 3. School Quality (school_quality) - School ratings
 * 4. Nearby Amenities (nearby_amenities) - Count and quality of amenities
 * 5. Transit Access (transit_access) - Transit Score normalized
 *
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-16
 */

import type {
  CategoryScore,
  ComponentScore,
  PropertyData,
  ExternalData,
  DataSource,
  MissingDataStrategy,
  LocationComponentId,
  ScoreAdjustment,
} from '@/types/scoring';
import { SCORING_CONSTANTS } from '../../constants';
import { handleMissingData, type MissingDataResult } from '../../utils/missing-data-handler';
import { normalizeToScale, clampNormalized } from '../../utils/normalization';

// ============================================
// Component Configuration
// ============================================

/**
 * Configuration for each location component
 */
interface LocationComponentConfig {
  /** Component ID */
  id: LocationComponentId;
  /** Display name */
  name: string;
  /** Description of what this measures */
  description: string;
  /** How to normalize raw values */
  normalization: {
    /** Minimum raw value (maps to 0) */
    min: number;
    /** Maximum raw value (maps to 100) */
    max: number;
    /** Whether to invert (higher raw = lower score) */
    invert: boolean;
  };
  /** Default data source */
  defaultSource: string;
  /** Missing data handling key */
  missingDataKey: string;
}

/**
 * Location component configurations
 */
const LOCATION_COMPONENTS: LocationComponentConfig[] = [
  {
    id: 'walk_score',
    name: 'Walkability',
    description: 'Walk Score rating (0-100) measuring walkability of location',
    normalization: { min: 0, max: 100, invert: false },
    defaultSource: 'WalkScore',
    missingDataKey: 'walkability',
  },
  {
    id: 'crime_index',
    name: 'Crime Safety',
    description: 'Safety rating based on local crime statistics',
    normalization: { min: 0, max: 100, invert: true }, // Higher crime = lower score
    defaultSource: 'FBI/Local Police',
    missingDataKey: 'crime_safety',
  },
  {
    id: 'school_rating',
    name: 'School Quality',
    description: 'Average school rating for nearby schools (1-10 scale)',
    normalization: { min: 1, max: 10, invert: false },
    defaultSource: 'GreatSchools',
    missingDataKey: 'school_quality',
  },
  {
    id: 'amenity_count',
    name: 'Nearby Amenities',
    description: 'Quality and quantity of nearby amenities (restaurants, shopping, etc.)',
    normalization: { min: 0, max: 100, invert: false },
    defaultSource: 'Google Places',
    missingDataKey: 'amenities',
  },
  {
    id: 'transit_score',
    name: 'Transit Access',
    description: 'Transit Score rating (0-100) measuring public transit accessibility',
    normalization: { min: 0, max: 100, invert: false },
    defaultSource: 'WalkScore',
    missingDataKey: 'transit',
  },
];

// ============================================
// Main Calculation Function
// ============================================

/**
 * Calculate the Location category score
 *
 * Evaluates property location across 5 components:
 * - Walkability (Walk Score)
 * - Crime Safety (inverse crime index)
 * - School Quality (school ratings)
 * - Nearby Amenities (amenity count/score)
 * - Transit Access (Transit Score)
 *
 * @param property - Core property data
 * @param externalData - External data sources (WalkScore, crime, schools, etc.)
 * @returns CategoryScore with 5 components
 *
 * @example
 * const locationScore = calculateLocationScore(
 *   { id: 'prop-123', address: '456 Oak St', state: 'PA' },
 *   { walkScore: 75, crimeData: { crimeIndex: 30 }, schoolRating: { overallRating: 7 }, ... }
 * );
 * // Returns: { id: 'location', score: 18.5, components: [...], ... }
 */
export function calculateLocationScore(
  property: Partial<PropertyData>,
  externalData?: Partial<ExternalData> | null
): CategoryScore {
  const components: ComponentScore[] = [];
  const notes: string[] = [];
  const adjustments: ScoreAdjustment[] = [];
  let totalConfidence = 0;
  let totalDataCompleteness = 0;
  let componentsWithData = 0;

  // Calculate each component
  for (const config of LOCATION_COMPONENTS) {
    const componentResult = calculateComponent(
      config,
      property,
      externalData
    );

    components.push(componentResult.component);
    notes.push(...componentResult.notes);

    // Track confidence and completeness
    totalConfidence += componentResult.component.confidence;
    if (componentResult.hasData) {
      totalDataCompleteness += 100;
      componentsWithData++;
    } else {
      totalDataCompleteness += componentResult.component.confidence * 0.5;
    }
  }

  // Calculate base score (sum of 5 components)
  let totalScore = components.reduce((sum, c) => sum + c.score, 0);

  // Apply landlocked and road access penalties
  const accessPenalty = applyAccessPenalty(
    externalData,
    totalScore,
    notes,
    adjustments
  );
  totalScore = accessPenalty.adjustedScore;

  // Average confidence across components
  const avgConfidence = totalConfidence / LOCATION_COMPONENTS.length;

  // Data completeness percentage
  const dataCompleteness = totalDataCompleteness / LOCATION_COMPONENTS.length;

  // Add summary note
  if (componentsWithData === 0) {
    notes.push('Location score based entirely on default values. Confidence is low.');
  } else if (componentsWithData < 3) {
    notes.push(
      `Location score based on ${componentsWithData}/5 data points. Some components use defaults.`
    );
  }

  return {
    id: 'location',
    name: 'Location',
    score: Math.round(totalScore * 100) / 100,
    maxScore: SCORING_CONSTANTS.MAX_CATEGORY_SCORE,
    confidence: Math.round(avgConfidence * 10) / 10,
    dataCompleteness: Math.round(dataCompleteness * 10) / 10,
    components,
    notes,
    adjustments,
  };
}

// ============================================
// Access Penalty Functions
// ============================================

/**
 * Apply landlocked and road access penalties to location score
 *
 * @param externalData - External data containing access information
 * @param baseScore - Base location score before penalties
 * @param notes - Array to add penalty notes to
 * @param adjustments - Array to add adjustment records to
 * @returns Adjusted score and penalty details
 */
function applyAccessPenalty(
  externalData: Partial<ExternalData> | null | undefined,
  baseScore: number,
  notes: string[],
  adjustments: ScoreAdjustment[]
): {
  adjustedScore: number;
  penaltyApplied: number;
} {
  let penaltyApplied = 0;
  let adjustedScore = baseScore;

  // Check if access data is available
  if (!externalData?.accessData) {
    return { adjustedScore, penaltyApplied };
  }

  const accessData = externalData.accessData;

  // Apply landlocked penalty (-2 points)
  if (accessData.landlocked === true) {
    penaltyApplied += 2;
    adjustedScore -= 2;
    notes.push(
      'CRITICAL: Property appears to be landlocked (no direct road access). -2 point penalty applied.'
    );

    // Add adjustment record for transparency
    adjustments.push({
      type: 'property_type',
      factor: (adjustedScore / baseScore), // Calculate equivalent factor
      reason: 'Landlocked property penalty: -2 points for no direct road access',
      appliedTo: 'location.all',
    });
  }
  // Apply private road penalty (-1 point) only if not landlocked
  else if (
    accessData.roadAccessType === 'private' ||
    accessData.roadAccessType?.toLowerCase().includes('private')
  ) {
    penaltyApplied += 1;
    adjustedScore -= 1;
    notes.push(
      'Property has private road access only. -1 point penalty applied.'
    );

    // Add adjustment record for transparency
    adjustments.push({
      type: 'property_type',
      factor: (adjustedScore / baseScore), // Calculate equivalent factor
      reason: 'Private road access penalty: -1 point for limited accessibility',
      appliedTo: 'location.all',
    });
  }

  // Ensure score doesn't go below 0
  if (adjustedScore < 0) {
    adjustedScore = 0;
  }

  return { adjustedScore, penaltyApplied };
}

// ============================================
// Component Calculation Functions
// ============================================

/**
 * Calculate a single component score
 */
function calculateComponent(
  config: LocationComponentConfig,
  property: Partial<PropertyData>,
  externalData?: Partial<ExternalData> | null
): {
  component: ComponentScore;
  notes: string[];
  hasData: boolean;
} {
  const notes: string[] = [];

  // Get raw value for this component
  const rawValueResult = getRawValue(config.id, externalData);
  const hasData = rawValueResult.hasData;
  const rawValue = rawValueResult.value;

  let score: number;
  let normalizedValue: number;
  let confidence: number;
  let missingDataStrategy: MissingDataStrategy = 'default_neutral';
  let dataSource: DataSource;
  let description: string;

  if (hasData && rawValue !== null) {
    // We have actual data - calculate score
    normalizedValue = normalizeRawValue(rawValue, config.normalization);
    score = normalizedValueToScore(normalizedValue);
    confidence = 90; // High confidence with actual data
    dataSource = {
      name: rawValueResult.source || config.defaultSource,
      type: 'api',
      reliability: 'high',
      lastUpdated: new Date(),
    };
    description = generateDescription(config.id, rawValue, score);
  } else {
    // Missing data - use handler
    const missingResult = handleMissingData(config.missingDataKey, false);
    score = missingResult.score;
    normalizedValue = (score / SCORING_CONSTANTS.MAX_COMPONENT_SCORE) * 100;
    confidence = missingResult.confidence;
    missingDataStrategy = missingResult.strategy;
    dataSource = {
      name: 'Default',
      type: 'default',
      reliability: 'low',
    };
    description = missingResult.note;
    notes.push(`${config.name}: ${missingResult.note}`);
  }

  return {
    component: {
      id: config.id,
      name: config.name,
      score: Math.round(score * 100) / 100,
      maxScore: SCORING_CONSTANTS.MAX_COMPONENT_SCORE,
      rawValue: rawValue,
      normalizedValue: Math.round(normalizedValue * 10) / 10,
      confidence: Math.round(confidence * 10) / 10,
      description,
      dataSource,
      missingDataStrategy,
    },
    notes,
    hasData,
  };
}

/**
 * Get raw value for a component from external data
 */
function getRawValue(
  componentId: LocationComponentId,
  externalData?: Partial<ExternalData> | null
): {
  hasData: boolean;
  value: number | null;
  source?: string;
} {
  if (!externalData) {
    return { hasData: false, value: null };
  }

  switch (componentId) {
    case 'walk_score':
      if (externalData.walkScore !== null && externalData.walkScore !== undefined) {
        return {
          hasData: true,
          value: externalData.walkScore,
          source: 'WalkScore',
        };
      }
      break;

    case 'crime_index':
      if (externalData.crimeData?.crimeIndex !== null && externalData.crimeData?.crimeIndex !== undefined) {
        return {
          hasData: true,
          value: externalData.crimeData.crimeIndex,
          source: externalData.crimeData.source || 'FBI/Local',
        };
      }
      break;

    case 'school_rating':
      if (externalData.schoolRating?.overallRating !== null && externalData.schoolRating?.overallRating !== undefined) {
        return {
          hasData: true,
          value: externalData.schoolRating.overallRating,
          source: externalData.schoolRating.source || 'GreatSchools',
        };
      }
      break;

    case 'amenity_count':
      if (externalData.nearbyAmenities?.totalScore !== null && externalData.nearbyAmenities?.totalScore !== undefined) {
        return {
          hasData: true,
          value: externalData.nearbyAmenities.totalScore,
          source: 'Google Places',
        };
      }
      // Calculate from individual amenity counts if totalScore not available
      if (externalData.nearbyAmenities) {
        const amenities = externalData.nearbyAmenities;
        const counts = [
          amenities.restaurants,
          amenities.groceryStores,
          amenities.parks,
          amenities.hospitals,
          amenities.shopping,
        ].filter((c) => c !== null && c !== undefined) as number[];

        if (counts.length > 0) {
          // Calculate a score based on amenity counts
          // More amenities = higher score, normalized to 0-100
          const total = counts.reduce((sum, c) => sum + c, 0);
          const score = Math.min(100, (total / 50) * 100); // 50+ amenities = 100
          return {
            hasData: true,
            value: score,
            source: 'Google Places',
          };
        }
      }
      break;

    case 'transit_score':
      if (externalData.transitScore !== null && externalData.transitScore !== undefined) {
        return {
          hasData: true,
          value: externalData.transitScore,
          source: 'WalkScore',
        };
      }
      break;
  }

  return { hasData: false, value: null };
}

/**
 * Normalize raw value to 0-100 scale
 */
function normalizeRawValue(
  value: number,
  config: LocationComponentConfig['normalization']
): number {
  // Clamp to expected range
  const clamped = Math.max(config.min, Math.min(config.max, value));

  // Normalize to 0-100
  const range = config.max - config.min;
  let normalized = ((clamped - config.min) / range) * 100;

  // Invert if needed (e.g., crime index)
  if (config.invert) {
    normalized = 100 - normalized;
  }

  return clampNormalized(normalized);
}

/**
 * Convert normalized value (0-100) to component score (0-5)
 */
function normalizedValueToScore(normalizedValue: number): number {
  return (normalizedValue / 100) * SCORING_CONSTANTS.MAX_COMPONENT_SCORE;
}

/**
 * Generate human-readable description for a component
 */
function generateDescription(
  componentId: LocationComponentId,
  rawValue: number,
  score: number
): string {
  const rating = getScoreRating(score);

  switch (componentId) {
    case 'walk_score':
      return `Walk Score of ${rawValue} (${getWalkScoreLabel(rawValue)}). ${rating} walkability.`;

    case 'crime_index':
      return `Crime index of ${rawValue}. ${rating} safety rating.`;

    case 'school_rating':
      return `School rating of ${rawValue}/10. ${rating} school quality.`;

    case 'amenity_count':
      return `Amenity score of ${rawValue.toFixed(0)}. ${rating} access to amenities.`;

    case 'transit_score':
      return `Transit Score of ${rawValue}. ${rating} public transit access.`;

    default:
      return `Score: ${score.toFixed(2)}/5`;
  }
}

/**
 * Get rating label based on score
 */
function getScoreRating(score: number): string {
  if (score >= 4.5) return 'Excellent';
  if (score >= 3.5) return 'Good';
  if (score >= 2.5) return 'Average';
  if (score >= 1.5) return 'Below average';
  return 'Poor';
}

/**
 * Get Walk Score label
 */
function getWalkScoreLabel(walkScore: number): string {
  if (walkScore >= 90) return "Walker's Paradise";
  if (walkScore >= 70) return 'Very Walkable';
  if (walkScore >= 50) return 'Somewhat Walkable';
  if (walkScore >= 25) return 'Car-Dependent';
  return 'Almost All Errands Require a Car';
}

// ============================================
// Individual Component Calculators
// ============================================

/**
 * Calculate walkability score
 *
 * @param walkScore - WalkScore.com score (0-100)
 * @returns Component score (0-5)
 */
export function calculateWalkabilityScore(walkScore: number | null): number {
  if (walkScore === null || walkScore === undefined) {
    // Use default handling
    const result = handleMissingData('walkability', false);
    return result.score;
  }

  // WalkScore is already 0-100, direct mapping
  const normalized = clampNormalized(walkScore);
  return (normalized / 100) * SCORING_CONSTANTS.MAX_COMPONENT_SCORE;
}

/**
 * Calculate crime safety score
 *
 * @param crimeIndex - Crime index (0-100, higher = more crime)
 * @returns Component score (0-5)
 */
export function calculateCrimeSafetyScore(crimeIndex: number | null): number {
  if (crimeIndex === null || crimeIndex === undefined) {
    const result = handleMissingData('crime_safety', false);
    return result.score;
  }

  // Invert crime index (higher crime = lower score)
  const normalized = 100 - clampNormalized(crimeIndex);
  return (normalized / 100) * SCORING_CONSTANTS.MAX_COMPONENT_SCORE;
}

/**
 * Calculate school quality score
 *
 * @param overallRating - School rating (1-10)
 * @returns Component score (0-5)
 */
export function calculateSchoolQualityScore(overallRating: number | null): number {
  if (overallRating === null || overallRating === undefined) {
    const result = handleMissingData('school_quality', false);
    return result.score;
  }

  // Normalize 1-10 to 0-100
  const normalized = ((Math.max(1, Math.min(10, overallRating)) - 1) / 9) * 100;
  return (normalized / 100) * SCORING_CONSTANTS.MAX_COMPONENT_SCORE;
}

/**
 * Calculate nearby amenities score
 *
 * @param amenityScore - Amenity score (0-100) or count
 * @returns Component score (0-5)
 */
export function calculateAmenitiesScore(amenityScore: number | null): number {
  if (amenityScore === null || amenityScore === undefined) {
    const result = handleMissingData('amenities', false);
    return result.score;
  }

  const normalized = clampNormalized(amenityScore);
  return (normalized / 100) * SCORING_CONSTANTS.MAX_COMPONENT_SCORE;
}

/**
 * Calculate transit access score
 *
 * @param transitScore - Transit Score (0-100)
 * @returns Component score (0-5)
 */
export function calculateTransitAccessScore(transitScore: number | null): number {
  if (transitScore === null || transitScore === undefined) {
    const result = handleMissingData('transit', false);
    return result.score;
  }

  const normalized = clampNormalized(transitScore);
  return (normalized / 100) * SCORING_CONSTANTS.MAX_COMPONENT_SCORE;
}

// ============================================
// Utility Exports
// ============================================

/**
 * Get location component IDs
 */
export function getLocationComponentIds(): LocationComponentId[] {
  return LOCATION_COMPONENTS.map((c) => c.id);
}

/**
 * Get location component configuration
 */
export function getLocationComponentConfig(
  componentId: LocationComponentId
): LocationComponentConfig | undefined {
  return LOCATION_COMPONENTS.find((c) => c.id === componentId);
}

/**
 * Check if all location data is available
 */
export function hasCompleteLocationData(
  externalData: Partial<ExternalData> | null
): boolean {
  if (!externalData) return false;

  return (
    externalData.walkScore !== null &&
    externalData.crimeData?.crimeIndex !== null &&
    externalData.schoolRating?.overallRating !== null &&
    externalData.nearbyAmenities !== null &&
    externalData.transitScore !== null
  );
}

/**
 * Get location data completeness percentage
 */
export function getLocationDataCompleteness(
  externalData: Partial<ExternalData> | null
): number {
  if (!externalData) return 0;

  let available = 0;
  const total = 5;

  if (externalData.walkScore !== null && externalData.walkScore !== undefined) available++;
  if (externalData.crimeData?.crimeIndex !== null && externalData.crimeData?.crimeIndex !== undefined) available++;
  if (externalData.schoolRating?.overallRating !== null && externalData.schoolRating?.overallRating !== undefined) available++;
  if (externalData.nearbyAmenities !== null) available++;
  if (externalData.transitScore !== null && externalData.transitScore !== undefined) available++;

  return (available / total) * 100;
}

/**
 * Missing Data Handling Utilities
 *
 * This file contains strategies and functions for handling missing data
 * during property scoring. Missing data is common in tax deed properties
 * and must be handled gracefully without compromising score validity.
 *
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-16
 */

import type {
  MissingDataStrategy,
  ComponentScore,
  DataSource,
  ComponentId,
} from '@/types/scoring';
import { MISSING_DATA_DEFAULTS, SCORING_CONSTANTS } from '../constants';

/**
 * Configuration for how to handle missing data for a specific component
 */
export interface MissingDataConfig {
  /** The component this config applies to */
  componentId: ComponentId;
  /** Default strategy to use when data is missing */
  defaultStrategy: MissingDataStrategy;
  /** Whether this component is required for scoring */
  isRequired: boolean;
  /** Alternative data sources to try if primary is missing */
  fallbackSources: string[];
  /** Human-readable explanation for missing data */
  explanation: string;
}

/**
 * Get the default score value for a missing data strategy
 *
 * @param strategy - The missing data strategy to use
 * @returns Default score value (0-5 scale)
 *
 * @example
 * getDefaultScoreForStrategy('default_neutral'); // Returns 2.5
 * getDefaultScoreForStrategy('default_conservative'); // Returns 1.5
 * getDefaultScoreForStrategy('default_optimistic'); // Returns 3.5
 */
export function getDefaultScoreForStrategy(
  strategy: MissingDataStrategy
): number {
  switch (strategy) {
    case 'default_neutral':
      return MISSING_DATA_DEFAULTS.NEUTRAL;
    case 'default_conservative':
      return MISSING_DATA_DEFAULTS.CONSERVATIVE;
    case 'default_optimistic':
      return MISSING_DATA_DEFAULTS.OPTIMISTIC;
    case 'skip_component':
      return 0; // Will be excluded from calculation
    case 'require_data':
      return 0; // Indicates scoring cannot proceed
    case 'estimate_from_peers':
      return MISSING_DATA_DEFAULTS.NEUTRAL; // Placeholder until estimate
    default:
      return MISSING_DATA_DEFAULTS.NEUTRAL;
  }
}

/**
 * Create a placeholder ComponentScore for missing data
 *
 * @param componentId - ID of the component with missing data
 * @param componentName - Display name of the component
 * @param strategy - Strategy being used to handle missing data
 * @param explanation - Why the data is missing
 * @returns ComponentScore with appropriate defaults
 */
export function createMissingDataScore(
  componentId: ComponentId,
  componentName: string,
  strategy: MissingDataStrategy,
  explanation: string
): ComponentScore {
  const defaultScore = getDefaultScoreForStrategy(strategy);

  // Create a data source indicating estimated/default data
  const dataSource: DataSource = {
    name: 'Default Value',
    type: 'default',
    reliability: strategy === 'default_conservative' ? 'low' : 'medium',
  };

  // Calculate confidence based on strategy
  // Lower confidence for missing data scenarios
  let confidence: number;
  switch (strategy) {
    case 'skip_component':
      confidence = 0;
      break;
    case 'require_data':
      confidence = 0;
      break;
    case 'estimate_from_peers':
      confidence = 40; // Moderate confidence for peer estimates
      break;
    case 'default_neutral':
      confidence = 30; // Low confidence for neutral default
      break;
    case 'default_conservative':
      confidence = 35; // Slightly higher for conservative (safer)
      break;
    case 'default_optimistic':
      confidence = 25; // Lower confidence for optimistic
      break;
    default:
      confidence = 30;
  }

  // Create description explaining the missing data situation
  const description = `Data unavailable. ${explanation} Using ${strategy.replace(/_/g, ' ')} strategy.`;

  return {
    id: componentId,
    name: componentName,
    score: defaultScore,
    maxScore: 5,
    rawValue: null,
    normalizedValue: (defaultScore / SCORING_CONSTANTS.MAX_COMPONENT_SCORE) * 100,
    confidence,
    description,
    dataSource,
    missingDataStrategy: strategy,
  };
}

/**
 * Determine the best missing data strategy for a component
 * Based on component importance and available alternatives
 *
 * @param componentId - ID of the component
 * @param isHighRisk - Whether conservative scoring is preferred
 * @param hasPeerData - Whether peer comparison data is available
 * @returns Recommended strategy
 */
export function determineMissingDataStrategy(
  componentId: ComponentId,
  isHighRisk: boolean = false,
  hasPeerData: boolean = false
): MissingDataStrategy {
  // Critical components that significantly impact investment decisions
  const criticalComponents: ComponentId[] = [
    'flood_zone',
    'environmental_hazards',
    'title_issues',
    'lien_complexity',
  ];

  // Components where peer data is particularly useful
  const peerComparableComponents: ComponentId[] = [
    'walk_score',
    'crime_index',
    'school_rating',
    'days_on_market',
    'price_trend',
  ];

  // Check if this is a critical component
  if (criticalComponents.includes(componentId)) {
    // For critical components, be conservative
    return 'default_conservative';
  }

  // If peer data is available for suitable components, use it
  if (hasPeerData && peerComparableComponents.includes(componentId)) {
    return 'estimate_from_peers';
  }

  // For high-risk scenarios, be conservative
  if (isHighRisk) {
    return 'default_conservative';
  }

  // Default to neutral for most components
  return 'default_neutral';
}

/**
 * Calculate adjusted category score when some components have missing data
 * Redistributes weight from skipped components to scored components
 *
 * @param components - Array of component scores (some may be from missing data)
 * @returns Adjusted category score and metadata
 */
export function calculateAdjustedCategoryScore(
  components: ComponentScore[]
): {
  score: number;
  maxScore: number;
  skippedComponents: string[];
  adjustmentReason: string | null;
} {
  // Separate components into scored and skipped
  const scoredComponents = components.filter(
    (c) => c.missingDataStrategy !== 'skip_component'
  );
  const skippedComponents = components.filter(
    (c) => c.missingDataStrategy === 'skip_component'
  );

  // If all components are skipped, cannot score this category
  if (scoredComponents.length === 0) {
    return {
      score: 0,
      maxScore: SCORING_CONSTANTS.MAX_CATEGORY_SCORE,
      skippedComponents: components.map((c) => c.name),
      adjustmentReason: 'All components skipped due to missing data',
    };
  }

  // Calculate raw score from scored components
  const rawScore = scoredComponents.reduce((sum, c) => sum + c.score, 0);

  // If some components were skipped, redistribute their weight
  if (skippedComponents.length > 0) {
    // Calculate what percentage of components we have
    const scoredRatio = scoredComponents.length / SCORING_CONSTANTS.COMPONENTS_PER_CATEGORY;

    // Scale the raw score to full category max
    // This assumes scored components are representative
    const adjustedScore = (rawScore / scoredComponents.length) * SCORING_CONSTANTS.COMPONENTS_PER_CATEGORY;

    // Cap at max category score
    const finalScore = Math.min(adjustedScore, SCORING_CONSTANTS.MAX_CATEGORY_SCORE);

    return {
      score: Math.round(finalScore * 10) / 10,
      maxScore: SCORING_CONSTANTS.MAX_CATEGORY_SCORE,
      skippedComponents: skippedComponents.map((c) => c.name),
      adjustmentReason: `Score adjusted to account for ${skippedComponents.length} skipped component(s)`,
    };
  }

  // All components scored normally
  return {
    score: rawScore,
    maxScore: SCORING_CONSTANTS.MAX_CATEGORY_SCORE,
    skippedComponents: [],
    adjustmentReason: null,
  };
}

/**
 * Check if required data is missing for scoring
 *
 * @param components - Array of component scores
 * @returns Object indicating if required data is missing and details
 */
export function checkRequiredDataMissing(
  components: ComponentScore[]
): {
  isMissing: boolean;
  missingRequired: string[];
  canProceed: boolean;
} {
  const missingRequired = components
    .filter((c) => c.missingDataStrategy === 'require_data')
    .map((c) => c.name);

  return {
    isMissing: missingRequired.length > 0,
    missingRequired,
    canProceed: missingRequired.length === 0,
  };
}

/**
 * Generate recommendations for improving data completeness
 *
 * @param missingFields - List of missing field names
 * @returns Array of recommendations
 */
export function generateDataRecommendations(
  missingFields: string[]
): string[] {
  const recommendations: string[] = [];

  // Map field names to specific recommendations
  const fieldRecommendations: Record<string, string> = {
    WalkScore: 'Fetch Walk Score data to improve location scoring accuracy',
    CrimeData: 'Add crime statistics for more accurate risk assessment',
    SchoolRating: 'Include school ratings for complete neighborhood analysis',
    FloodZone: 'Verify FEMA flood zone to assess natural hazard risk',
    EnvironmentalData: 'Check EPA databases for environmental hazards',
    MarketData: 'Gather local market data for better valuation',
    ComparableSales: 'Find comparable sales to validate market value',
    Coordinates: 'Add property coordinates for location-based scoring',
    AssessedValue: 'Include assessed value for financial analysis',
    MarketValue: 'Add market value estimate for profit calculations',
  };

  for (const field of missingFields) {
    const recommendation = fieldRecommendations[field];
    if (recommendation) {
      recommendations.push(recommendation);
    }
  }

  // Add general recommendation if many fields are missing
  if (missingFields.length > 5) {
    recommendations.unshift(
      'Consider running Regrid enrichment to fill multiple data gaps'
    );
  }

  return recommendations;
}

/**
 * Calculate the confidence penalty for missing data
 *
 * @param missingCritical - Number of missing critical fields
 * @param missingOptional - Number of missing optional fields
 * @returns Confidence penalty (0-50, to be subtracted from base confidence)
 */
export function calculateMissingDataPenalty(
  missingCritical: number,
  missingOptional: number
): number {
  // Each missing critical field reduces confidence by 8%
  const criticalPenalty = missingCritical * 8;

  // Each missing optional field reduces confidence by 2%
  const optionalPenalty = missingOptional * 2;

  // Cap total penalty at 50%
  return Math.min(50, criticalPenalty + optionalPenalty);
}

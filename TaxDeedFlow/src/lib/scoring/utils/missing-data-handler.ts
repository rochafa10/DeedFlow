/**
 * Missing Data Handler - Comprehensive Missing Data Management
 *
 * This file provides advanced strategies for handling missing data during
 * property scoring. It includes component-specific configurations, peer
 * estimation capabilities, and detailed handling for each scoring component.
 *
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-16
 */

import type { MissingDataStrategy } from '@/types/scoring';
import { MISSING_DATA_DEFAULTS } from '../constants';

// ============================================
// Type Definitions
// ============================================

/**
 * Configuration for a single component's missing data handling
 * Defines how to handle missing data for each of the ~25 scoring components
 */
export interface ComponentMissingDataConfig {
  /** Default strategy when data is unavailable */
  strategy: MissingDataStrategy;
  /** Default score to use (on 0-5 scale) */
  defaultScore: number;
  /** Confidence penalty percentage when using default */
  confidencePenalty: number;
  /** Human-readable explanation for using default */
  explanation: string;
}

/**
 * Criteria for finding peer properties for estimation
 */
export interface PeerCriteria {
  /** Require same county */
  sameCounty: boolean;
  /** Require same sale type (upset, judicial, repository) */
  sameSaleType: boolean;
  /** Similar assessed/market value range (+/- percentage) */
  similarValueRange: number;
  /** Maximum age of peer data in days */
  maxAgeDays: number;
}

/**
 * Result of peer-based estimation
 */
export interface EstimatedValue {
  /** Estimated value (on appropriate scale for the component) */
  value: number;
  /** Confidence in the estimate (0-100) */
  confidence: number;
  /** Number of peer properties used */
  peerCount: number;
  /** Methodology used for estimation */
  methodology: 'county_average' | 'sale_type_weighted' | 'value_range_weighted' | 'combined';
  /** Individual data points used */
  dataPoints: Array<{
    propertyId: string;
    value: number;
    weight: number;
  }>;
}

/**
 * Result of handling missing data for a component
 */
export interface MissingDataResult {
  /** Score to use (0-5 scale) */
  score: number;
  /** Confidence level for this score (0-100) */
  confidence: number;
  /** Strategy that was applied */
  strategy: MissingDataStrategy;
  /** Human-readable note about the handling */
  note: string;
  /** Whether the component should be skipped entirely */
  shouldSkip: boolean;
  /** Whether scoring cannot proceed without this data */
  isRequired: boolean;
}

// ============================================
// Missing Data Configuration
// ============================================

/**
 * Configuration for all scoring components' missing data handling
 *
 * Categories and their components:
 * - Location: walkability, crime_safety, school_quality, amenities, transit
 * - Risk: flood_risk, earthquake_risk, wildfire_risk, hurricane_risk, terrain_slope
 * - Property: property_condition
 * - Financial: tax_to_value_ratio, value_accuracy, rehab_costs, lien_exposure, title_clarity
 * - Market: appreciation_rate, days_on_market, inventory_level, competition, demand
 * - Profit: roi_potential, profit_margin, cash_flow, resale_value, rent_potential
 */
export const MISSING_DATA_CONFIG: Record<string, ComponentMissingDataConfig> = {
  // ============================================
  // Location Components
  // ============================================

  /** Walk Score - use neutral as most areas have average walkability */
  walkability: {
    strategy: 'default_neutral',
    defaultScore: MISSING_DATA_DEFAULTS.NEUTRAL,
    confidencePenalty: 20,
    explanation: 'Walk Score data unavailable. Using average walkability assumption.',
  },

  /** Crime Safety - be conservative as crime risk is a safety concern */
  crime_safety: {
    strategy: 'default_conservative',
    defaultScore: MISSING_DATA_DEFAULTS.CONSERVATIVE,
    confidencePenalty: 25,
    explanation: 'Crime data unavailable. Using conservative safety assumption.',
  },

  /** School Quality - neutral as school quality varies widely */
  school_quality: {
    strategy: 'default_neutral',
    defaultScore: MISSING_DATA_DEFAULTS.NEUTRAL,
    confidencePenalty: 15,
    explanation: 'School rating data unavailable. Using average quality assumption.',
  },

  /** Amenities - can estimate from peers in same area */
  amenities: {
    strategy: 'estimate_from_peers',
    defaultScore: MISSING_DATA_DEFAULTS.NEUTRAL,
    confidencePenalty: 10,
    explanation: 'Amenity data unavailable. Estimated from similar properties in area.',
  },

  /** Transit Score - neutral as transit access varies */
  transit: {
    strategy: 'default_neutral',
    defaultScore: MISSING_DATA_DEFAULTS.NEUTRAL,
    confidencePenalty: 15,
    explanation: 'Transit Score data unavailable. Using average transit access assumption.',
  },

  // ============================================
  // Risk Components
  // ============================================

  /** Flood Risk - conservative due to potential insurance/damage costs */
  flood_risk: {
    strategy: 'default_conservative',
    defaultScore: MISSING_DATA_DEFAULTS.CONSERVATIVE,
    confidencePenalty: 30,
    explanation: 'FEMA flood zone data unavailable. Assuming elevated flood risk.',
  },

  /** Earthquake Risk - optimistic as most areas have low seismic activity */
  earthquake_risk: {
    strategy: 'default_optimistic',
    defaultScore: MISSING_DATA_DEFAULTS.OPTIMISTIC,
    confidencePenalty: 10,
    explanation: 'Seismic data unavailable. Most areas have minimal earthquake risk.',
  },

  /** Wildfire Risk - optimistic as most areas are not in wildfire zones */
  wildfire_risk: {
    strategy: 'default_optimistic',
    defaultScore: MISSING_DATA_DEFAULTS.OPTIMISTIC,
    confidencePenalty: 10,
    explanation: 'Wildfire data unavailable. Most areas have minimal wildfire risk.',
  },

  /** Hurricane Risk - optimistic as most US areas not hurricane-prone */
  hurricane_risk: {
    strategy: 'default_optimistic',
    defaultScore: MISSING_DATA_DEFAULTS.OPTIMISTIC,
    confidencePenalty: 10,
    explanation: 'Hurricane data unavailable. Most areas have minimal hurricane risk.',
  },

  /** Terrain Slope - optimistic as most properties have buildable terrain */
  terrain_slope: {
    strategy: 'default_optimistic',
    defaultScore: MISSING_DATA_DEFAULTS.OPTIMISTIC,
    confidencePenalty: 15,
    explanation: 'Terrain data unavailable. Assuming standard buildable slope.',
  },

  // ============================================
  // Property Components
  // ============================================

  /** Property Condition - conservative as tax deed properties often need work */
  property_condition: {
    strategy: 'default_conservative',
    defaultScore: MISSING_DATA_DEFAULTS.CONSERVATIVE,
    confidencePenalty: 35,
    explanation:
      'Property condition data unavailable. Tax deed properties often require repairs.',
  },

  // ============================================
  // Financial Components
  // ============================================

  /** Tax to Value Ratio - required for financial analysis */
  tax_to_value_ratio: {
    strategy: 'require_data',
    defaultScore: 0,
    confidencePenalty: 50,
    explanation:
      'Tax/value ratio cannot be calculated. Missing total due or value data.',
  },

  /** Value Accuracy - skip if no comparable data available */
  value_accuracy: {
    strategy: 'skip_component',
    defaultScore: 0,
    confidencePenalty: 25,
    explanation:
      'Value accuracy cannot be determined without comparable sales data.',
  },

  /** Rehab Costs - can estimate from similar properties */
  rehab_costs: {
    strategy: 'estimate_from_peers',
    defaultScore: MISSING_DATA_DEFAULTS.NEUTRAL,
    confidencePenalty: 30,
    explanation:
      'Rehab cost estimate unavailable. Using regional average for property type.',
  },

  /** Lien Exposure - conservative as unknown liens are risky */
  lien_exposure: {
    strategy: 'default_conservative',
    defaultScore: MISSING_DATA_DEFAULTS.CONSERVATIVE,
    confidencePenalty: 35,
    explanation:
      'Complete lien data unavailable. Assuming potential lien exposure exists.',
  },

  /** Title Clarity - conservative as title issues are common in tax deeds */
  title_clarity: {
    strategy: 'default_conservative',
    defaultScore: MISSING_DATA_DEFAULTS.CONSERVATIVE,
    confidencePenalty: 40,
    explanation:
      'Title search data unavailable. Tax deed titles often have complications.',
  },

  // ============================================
  // Market Components
  // ============================================

  /** Appreciation Rate - neutral as market trends vary */
  appreciation_rate: {
    strategy: 'default_neutral',
    defaultScore: MISSING_DATA_DEFAULTS.NEUTRAL,
    confidencePenalty: 25,
    explanation:
      'Market appreciation data unavailable. Using neutral market assumption.',
  },

  /** Days on Market - neutral as turnover varies by area */
  days_on_market: {
    strategy: 'default_neutral',
    defaultScore: MISSING_DATA_DEFAULTS.NEUTRAL,
    confidencePenalty: 20,
    explanation:
      'Days on market data unavailable. Using average market turnover assumption.',
  },

  /** Inventory Level - neutral as inventory varies seasonally */
  inventory_level: {
    strategy: 'default_neutral',
    defaultScore: MISSING_DATA_DEFAULTS.NEUTRAL,
    confidencePenalty: 20,
    explanation:
      'Housing inventory data unavailable. Using balanced supply assumption.',
  },

  /** Competition - conservative as tax deed auctions often competitive */
  competition: {
    strategy: 'default_conservative',
    defaultScore: MISSING_DATA_DEFAULTS.CONSERVATIVE,
    confidencePenalty: 15,
    explanation:
      'Auction competition data unavailable. Assuming moderate competition.',
  },

  /** Demand - neutral as demand varies by location */
  demand: {
    strategy: 'default_neutral',
    defaultScore: MISSING_DATA_DEFAULTS.NEUTRAL,
    confidencePenalty: 20,
    explanation: 'Housing demand data unavailable. Using neutral demand assumption.',
  },

  // ============================================
  // Profit Components
  // ============================================

  /** ROI Potential - required for investment decision */
  roi_potential: {
    strategy: 'require_data',
    defaultScore: 0,
    confidencePenalty: 50,
    explanation:
      'ROI cannot be calculated without value and cost data. Scoring incomplete.',
  },

  /** Profit Margin - required for investment decision */
  profit_margin: {
    strategy: 'require_data',
    defaultScore: 0,
    confidencePenalty: 50,
    explanation:
      'Profit margin cannot be calculated without value and cost data.',
  },

  /** Cash Flow - skip if rental data unavailable */
  cash_flow: {
    strategy: 'skip_component',
    defaultScore: 0,
    confidencePenalty: 30,
    explanation:
      'Cash flow projection skipped. Rental income data unavailable.',
  },

  /** Resale Value - skip if no comparable data */
  resale_value: {
    strategy: 'skip_component',
    defaultScore: 0,
    confidencePenalty: 25,
    explanation:
      'Resale value estimate skipped. Insufficient comparable sales data.',
  },

  /** Rent Potential - skip if no rental market data */
  rent_potential: {
    strategy: 'skip_component',
    defaultScore: 0,
    confidencePenalty: 30,
    explanation:
      'Rent potential skipped. Rental market data unavailable for this area.',
  },
} as const;

// ============================================
// Core Functions
// ============================================

/**
 * Handle missing data for a specific component
 *
 * This function determines how to handle missing data based on the component's
 * configuration. It returns a score, confidence, and handling notes.
 *
 * @param componentKey - The component identifier (e.g., 'walkability', 'flood_risk')
 * @param hasData - Whether actual data is available for this component
 * @param estimatedValue - Optional pre-calculated estimate from peers
 * @returns MissingDataResult with score, confidence, and handling details
 *
 * @example
 * // Component has actual data
 * handleMissingData('walkability', true);
 * // Returns: { score: 0, confidence: 100, strategy: 'default_neutral', note: '...', shouldSkip: false, isRequired: false }
 *
 * @example
 * // Component is missing data
 * handleMissingData('flood_risk', false);
 * // Returns: { score: 1.5, confidence: 70, strategy: 'default_conservative', note: '...', shouldSkip: false, isRequired: false }
 */
export function handleMissingData(
  componentKey: string,
  hasData: boolean,
  estimatedValue?: EstimatedValue
): MissingDataResult {
  // If data is available, return full confidence placeholder
  // (actual scoring will be done elsewhere)
  if (hasData) {
    return {
      score: 0, // Placeholder - actual score calculated separately
      confidence: 100,
      strategy: 'default_neutral',
      note: 'Data available for scoring.',
      shouldSkip: false,
      isRequired: false,
    };
  }

  // Get configuration for this component
  const config = MISSING_DATA_CONFIG[componentKey];

  // Handle unknown component with default neutral strategy
  if (!config) {
    return {
      score: MISSING_DATA_DEFAULTS.NEUTRAL,
      confidence: 50,
      strategy: 'default_neutral',
      note: `Unknown component '${componentKey}'. Using neutral default.`,
      shouldSkip: false,
      isRequired: false,
    };
  }

  // Handle based on strategy
  switch (config.strategy) {
    case 'require_data':
      return {
        score: 0,
        confidence: 0,
        strategy: 'require_data',
        note: config.explanation,
        shouldSkip: false,
        isRequired: true,
      };

    case 'skip_component':
      return {
        score: -1, // Special indicator for skip
        confidence: 0,
        strategy: 'skip_component',
        note: config.explanation,
        shouldSkip: true,
        isRequired: false,
      };

    case 'estimate_from_peers':
      // If we have an estimated value from peers, use it
      if (estimatedValue && estimatedValue.confidence > 30) {
        const adjustedConfidence = Math.min(
          80,
          estimatedValue.confidence - config.confidencePenalty / 2
        );
        return {
          score: estimatedValue.value,
          confidence: adjustedConfidence,
          strategy: 'estimate_from_peers',
          note: `${config.explanation} Estimated from ${estimatedValue.peerCount} peer properties.`,
          shouldSkip: false,
          isRequired: false,
        };
      }
      // Fall back to neutral if no peer data
      return {
        score: config.defaultScore,
        confidence: Math.max(20, 100 - config.confidencePenalty - 10),
        strategy: 'default_neutral',
        note: `${config.explanation} No peer data available, using neutral default.`,
        shouldSkip: false,
        isRequired: false,
      };

    case 'default_neutral':
      return {
        score: config.defaultScore,
        confidence: Math.max(20, 100 - config.confidencePenalty),
        strategy: 'default_neutral',
        note: config.explanation,
        shouldSkip: false,
        isRequired: false,
      };

    case 'default_conservative':
      return {
        score: config.defaultScore,
        confidence: Math.max(15, 100 - config.confidencePenalty),
        strategy: 'default_conservative',
        note: config.explanation,
        shouldSkip: false,
        isRequired: false,
      };

    case 'default_optimistic':
      return {
        score: config.defaultScore,
        confidence: Math.max(25, 100 - config.confidencePenalty - 5),
        strategy: 'default_optimistic',
        note: config.explanation,
        shouldSkip: false,
        isRequired: false,
      };

    default:
      // Fallback for any unhandled strategy
      return {
        score: MISSING_DATA_DEFAULTS.NEUTRAL,
        confidence: 50,
        strategy: 'default_neutral',
        note: `Unhandled strategy for ${componentKey}. Using neutral default.`,
        shouldSkip: false,
        isRequired: false,
      };
  }
}

// ============================================
// Peer Estimation Functions
// ============================================

/**
 * Get default peer criteria for a component
 *
 * Different components have different requirements for peer matching.
 * For example, crime data should use same county, while market data
 * might allow broader geographic comparison.
 *
 * @param componentId - The component to get criteria for
 * @returns PeerCriteria for finding similar properties
 */
export function getDefaultPeerCriteria(componentId: string): PeerCriteria {
  // Components that require tight geographic matching
  const localComponents = [
    'crime_safety',
    'school_quality',
    'amenities',
    'walkability',
    'transit',
  ];

  // Components that can use broader matching
  const regionalComponents = [
    'appreciation_rate',
    'days_on_market',
    'inventory_level',
    'competition',
    'demand',
  ];

  // Components that should match by property characteristics
  const propertyComponents = [
    'property_condition',
    'rehab_costs',
    'cash_flow',
    'rent_potential',
  ];

  if (localComponents.includes(componentId)) {
    return {
      sameCounty: true,
      sameSaleType: false,
      similarValueRange: 0.5, // +/- 50%
      maxAgeDays: 180,
    };
  }

  if (regionalComponents.includes(componentId)) {
    return {
      sameCounty: false, // Can use metro/state level
      sameSaleType: false,
      similarValueRange: 1.0, // +/- 100% (broader range)
      maxAgeDays: 365,
    };
  }

  if (propertyComponents.includes(componentId)) {
    return {
      sameCounty: true,
      sameSaleType: true,
      similarValueRange: 0.3, // +/- 30% (tight match)
      maxAgeDays: 365,
    };
  }

  // Default criteria for unknown components
  return {
    sameCounty: true,
    sameSaleType: false,
    similarValueRange: 0.5,
    maxAgeDays: 180,
  };
}

/**
 * Estimate a component value from peer properties
 *
 * This is a placeholder implementation that will be connected to Supabase
 * for actual peer lookups. The function demonstrates the estimation methodology
 * using weighted averages from different peer groups.
 *
 * @param propertyId - The property needing estimation
 * @param componentId - The component to estimate
 * @param peerCriteria - Criteria for finding peer properties
 * @returns Promise<EstimatedValue> with the estimation result
 *
 * @example
 * const estimate = await estimateFromPeers(
 *   'property-uuid',
 *   'rehab_costs',
 *   { sameCounty: true, sameSaleType: true, similarValueRange: 0.3, maxAgeDays: 365 }
 * );
 * // Returns: { value: 2.8, confidence: 65, peerCount: 12, methodology: 'combined', dataPoints: [...] }
 */
export async function estimateFromPeers(
  propertyId: string,
  componentId: string,
  peerCriteria: PeerCriteria
): Promise<EstimatedValue> {
  /*
   * FUTURE IMPLEMENTATION: Supabase Query Structure
   *
   * This function will query the database to find peer properties and their
   * scores for the specified component. The query structure would be:
   *
   * ```sql
   * -- Find peer properties
   * SELECT
   *   p.id,
   *   p.assessed_value,
   *   p.market_value,
   *   p.sale_type,
   *   p.county_id,
   *   sc.component_scores->>$componentId as component_value,
   *   sc.calculated_at
   * FROM properties p
   * JOIN property_scores sc ON sc.property_id = p.id
   * WHERE p.id != $propertyId
   *   AND ($sameCounty = false OR p.county_id = (SELECT county_id FROM properties WHERE id = $propertyId))
   *   AND ($sameSaleType = false OR p.sale_type = (SELECT sale_type FROM properties WHERE id = $propertyId))
   *   AND p.assessed_value BETWEEN
   *       (SELECT assessed_value * (1 - $similarValueRange) FROM properties WHERE id = $propertyId)
   *       AND (SELECT assessed_value * (1 + $similarValueRange) FROM properties WHERE id = $propertyId)
   *   AND sc.calculated_at > NOW() - INTERVAL '$maxAgeDays days'
   * ORDER BY
   *   CASE WHEN p.county_id = (SELECT county_id FROM properties WHERE id = $propertyId) THEN 1 ELSE 2 END,
   *   ABS(p.assessed_value - (SELECT assessed_value FROM properties WHERE id = $propertyId))
   * LIMIT 50;
   * ```
   */

  // Placeholder implementation - returns a reasonable default
  // In production, this would query the database for peer properties

  // Simulated peer data (would come from database)
  const countyPeers: Array<{ value: number; weight: number }> = [];
  const saleTypePeers: Array<{ value: number; weight: number }> = [];
  const valueRangePeers: Array<{ value: number; weight: number }> = [];

  // Since we don't have actual peer data, return a placeholder
  // indicating no peers were found
  if (
    countyPeers.length === 0 &&
    saleTypePeers.length === 0 &&
    valueRangePeers.length === 0
  ) {
    return {
      value: MISSING_DATA_DEFAULTS.NEUTRAL,
      confidence: 25,
      peerCount: 0,
      methodology: 'combined',
      dataPoints: [],
    };
  }

  // Calculate weighted averages from each peer group
  // Weights: county avg (1x), sale type (1.5x), value range (2x)
  const COUNTY_WEIGHT = 1.0;
  const SALE_TYPE_WEIGHT = 1.5;
  const VALUE_RANGE_WEIGHT = 2.0;

  let totalWeight = 0;
  let weightedSum = 0;
  const allDataPoints: EstimatedValue['dataPoints'] = [];

  // County peers
  if (countyPeers.length > 0) {
    const countyAvg =
      countyPeers.reduce((sum, p) => sum + p.value, 0) / countyPeers.length;
    weightedSum += countyAvg * COUNTY_WEIGHT;
    totalWeight += COUNTY_WEIGHT;
  }

  // Sale type peers
  if (saleTypePeers.length > 0) {
    const saleTypeAvg =
      saleTypePeers.reduce((sum, p) => sum + p.value, 0) / saleTypePeers.length;
    weightedSum += saleTypeAvg * SALE_TYPE_WEIGHT;
    totalWeight += SALE_TYPE_WEIGHT;
  }

  // Value range peers (highest weight - most similar)
  if (valueRangePeers.length > 0) {
    const valueRangeAvg =
      valueRangePeers.reduce((sum, p) => sum + p.value, 0) /
      valueRangePeers.length;
    weightedSum += valueRangeAvg * VALUE_RANGE_WEIGHT;
    totalWeight += VALUE_RANGE_WEIGHT;
  }

  const estimatedValue = totalWeight > 0 ? weightedSum / totalWeight : 2.5;

  // Calculate confidence based on peer count and data quality
  const totalPeers =
    countyPeers.length + saleTypePeers.length + valueRangePeers.length;
  const baseConfidence = Math.min(80, 30 + totalPeers * 3);

  // Adjust confidence based on methodology diversity
  let methodologyBonus = 0;
  if (countyPeers.length > 0) methodologyBonus += 5;
  if (saleTypePeers.length > 0) methodologyBonus += 5;
  if (valueRangePeers.length > 0) methodologyBonus += 10;

  const finalConfidence = Math.min(85, baseConfidence + methodologyBonus);

  // Determine primary methodology
  let methodology: EstimatedValue['methodology'] = 'combined';
  if (valueRangePeers.length > 0 && countyPeers.length === 0) {
    methodology = 'value_range_weighted';
  } else if (saleTypePeers.length > 0 && countyPeers.length === 0) {
    methodology = 'sale_type_weighted';
  } else if (countyPeers.length > 0 && saleTypePeers.length === 0) {
    methodology = 'county_average';
  }

  return {
    value: Math.round(estimatedValue * 10) / 10,
    confidence: finalConfidence,
    peerCount: totalPeers,
    methodology,
    dataPoints: allDataPoints,
  };
}

// ============================================
// Utility Functions
// ============================================

/**
 * Get all components that require data (cannot use defaults)
 *
 * @returns Array of component keys that have 'require_data' strategy
 */
export function getRequiredDataComponents(): string[] {
  return Object.entries(MISSING_DATA_CONFIG)
    .filter(([, config]) => config.strategy === 'require_data')
    .map(([key]) => key);
}

/**
 * Get all components that will be skipped when data is missing
 *
 * @returns Array of component keys that have 'skip_component' strategy
 */
export function getSkippableComponents(): string[] {
  return Object.entries(MISSING_DATA_CONFIG)
    .filter(([, config]) => config.strategy === 'skip_component')
    .map(([key]) => key);
}

/**
 * Get the total confidence penalty for a set of missing components
 *
 * @param missingComponents - Array of component keys that are missing data
 * @returns Total confidence penalty (capped at 70)
 */
export function getTotalConfidencePenalty(missingComponents: string[]): number {
  let totalPenalty = 0;

  for (const componentKey of missingComponents) {
    const config = MISSING_DATA_CONFIG[componentKey];
    if (config) {
      totalPenalty += config.confidencePenalty;
    } else {
      // Unknown component penalty
      totalPenalty += 15;
    }
  }

  // Cap at 70% penalty (minimum 30% confidence)
  return Math.min(70, totalPenalty);
}

/**
 * Check if scoring can proceed with the available data
 *
 * @param availableComponents - Array of component keys that have data
 * @param requiredComponents - Optional override for required components
 * @returns Object indicating if scoring can proceed and what's missing
 */
export function canProceedWithScoring(
  availableComponents: string[],
  requiredComponents?: string[]
): {
  canProceed: boolean;
  missingRequired: string[];
  message: string;
} {
  const required = requiredComponents || getRequiredDataComponents();
  const missingRequired = required.filter(
    (c) => !availableComponents.includes(c)
  );

  if (missingRequired.length === 0) {
    return {
      canProceed: true,
      missingRequired: [],
      message: 'All required data available for scoring.',
    };
  }

  return {
    canProceed: false,
    missingRequired,
    message: `Cannot score: missing required data for ${missingRequired.join(', ')}.`,
  };
}

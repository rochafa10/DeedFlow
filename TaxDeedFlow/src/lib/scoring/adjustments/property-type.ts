/**
 * Property Type Adjustments
 *
 * This file handles property-type-specific scoring adjustments.
 * Different property types have different evaluation criteria,
 * and category weights should reflect what matters most for each type.
 *
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-16
 */

import type { PropertyType } from '@/types/scoring';

// ============================================
// Extended Property Type
// ============================================

/**
 * Extended property type with additional classifications
 *
 * This extends the base PropertyType from scoring.ts with more
 * specific property classifications for nuanced scoring.
 */
export type ExtendedPropertyType =
  | PropertyType // Base types from scoring.ts
  | 'multi_family_small' // 2-4 units
  | 'condo'
  | 'townhouse'
  | 'manufactured_home';

// ============================================
// Type Definitions
// ============================================

/**
 * Category weight configuration
 * Defines how much weight each category should have for a property type
 * All weights should sum to approximately 1.0 (or be normalized)
 */
export interface CategoryWeights {
  /** Location category weight (0-1) */
  location: number;
  /** Risk category weight (0-1) */
  risk: number;
  /** Financial category weight (0-1) */
  financial: number;
  /** Market category weight (0-1) */
  market: number;
  /** Profit category weight (0-1) */
  profit: number;
}

/**
 * Component-level weight adjustment
 */
export interface ComponentWeightAdjustment {
  /** Component identifier */
  component: string;
  /** Weight multiplier (1.0 = no change) */
  multiplier: number;
  /** Reason for adjustment */
  reason: string;
}

// ============================================
// Property Type Category Weights
// ============================================

/**
 * Category weight configurations for all property types
 *
 * These weights reflect what matters most for each property type:
 * - SFR: Balanced with slight emphasis on location and profit
 * - Multi-family: Emphasis on profit (cash flow) and financial
 * - Commercial: Emphasis on market and location
 * - Vacant land: Emphasis on market and location, less on profit
 * - etc.
 */
export const PROPERTY_TYPE_WEIGHTS: Record<
  ExtendedPropertyType | 'unknown',
  CategoryWeights
> = {
  // ============================================
  // Residential Types
  // ============================================

  /**
   * Single Family Residential - Most common tax deed property
   * Balanced weights with slight emphasis on location and profit
   */
  single_family_residential: {
    location: 0.22,
    risk: 0.18,
    financial: 0.20,
    market: 0.18,
    profit: 0.22,
  },

  /**
   * Multi-Family Small (2-4 units)
   * Emphasis on cash flow potential and financial analysis
   */
  multi_family_small: {
    location: 0.18,
    risk: 0.18,
    financial: 0.22,
    market: 0.18,
    profit: 0.24,
  },

  /**
   * Multi-Family Residential (5+ units)
   * Strong emphasis on cash flow and financial metrics
   */
  multi_family_residential: {
    location: 0.16,
    risk: 0.18,
    financial: 0.24,
    market: 0.16,
    profit: 0.26,
  },

  /**
   * Condominium
   * Location is crucial, but HOA/financial concerns are elevated
   */
  condo: {
    location: 0.24,
    risk: 0.20, // HOA risk, special assessments
    financial: 0.22, // HOA fees, assessments
    market: 0.16,
    profit: 0.18,
  },

  /**
   * Townhouse
   * Similar to SFR but with some HOA considerations
   */
  townhouse: {
    location: 0.22,
    risk: 0.18,
    financial: 0.20,
    market: 0.18,
    profit: 0.22,
  },

  /**
   * Manufactured/Mobile Home
   * Higher risk focus, land ownership critical
   */
  manufactured_home: {
    location: 0.16,
    risk: 0.26, // Depreciation, park lot rent
    financial: 0.22,
    market: 0.14,
    profit: 0.22,
  },

  // ============================================
  // Commercial Types
  // ============================================

  /**
   * Commercial Property
   * Location and market conditions are paramount
   */
  commercial: {
    location: 0.26,
    risk: 0.16,
    financial: 0.18,
    market: 0.24,
    profit: 0.16,
  },

  /**
   * Industrial Property
   * Market access (logistics) and financial efficiency
   */
  industrial: {
    location: 0.18, // Proximity to transportation
    risk: 0.20, // Environmental concerns higher
    financial: 0.22,
    market: 0.22,
    profit: 0.18,
  },

  /**
   * Mixed Use Property
   * Complex evaluation - balance all factors
   */
  mixed_use: {
    location: 0.22,
    risk: 0.18,
    financial: 0.20,
    market: 0.20,
    profit: 0.20,
  },

  // ============================================
  // Land Types
  // ============================================

  /**
   * Vacant Land
   * Location and market are key, profit is speculative
   */
  vacant_land: {
    location: 0.26,
    risk: 0.20, // Zoning, buildability
    financial: 0.18,
    market: 0.24,
    profit: 0.12, // Less emphasis - no immediate income
  },

  /**
   * Agricultural Property
   * Specialized - financial viability and risk matter most
   */
  agricultural: {
    location: 0.12, // Less urban-centric
    risk: 0.24, // Weather, crop prices
    financial: 0.24, // Operating costs, subsidies
    market: 0.20, // Farmland prices, demand
    profit: 0.20,
  },

  // ============================================
  // Unknown/Default
  // ============================================

  /**
   * Unknown Property Type
   * Equal weighting when we can't determine type
   */
  unknown: {
    location: 0.20,
    risk: 0.20,
    financial: 0.20,
    market: 0.20,
    profit: 0.20,
  },
} as const;

// ============================================
// Property Type Detection
// ============================================

/**
 * Detect property type from available data
 *
 * Uses multiple signals to determine property type:
 * 1. Explicit propertyType field
 * 2. Regrid data (property_class, use_type)
 * 3. Zoning inference
 * 4. Building characteristics
 *
 * @param property - Property data from database
 * @param externalData - Additional data sources (Regrid, etc.)
 * @returns Detected property type
 *
 * @example
 * detectPropertyType(
 *   { property_type: null, zoning: 'R-1', building_sqft: 1500 },
 *   { propertyClass: 'RESIDENTIAL' }
 * );
 * // Returns: 'single_family_residential'
 */
export function detectPropertyType(
  property: {
    property_type?: PropertyType | null;
    zoning?: string | null;
    land_use?: string | null;
    building_sqft?: number | null;
    lot_size_acres?: number | null;
    assessed_improvement_value?: number | null;
    is_vacant_lot?: boolean;
    is_likely_mobile_home?: boolean;
  },
  externalData?: {
    propertyClass?: string;
    useType?: string;
    unitCount?: number;
    buildingType?: string;
  } | null
): ExtendedPropertyType {
  // Step 1: Check explicit property_type field
  if (property.property_type && property.property_type !== 'unknown') {
    return normalizePropertyType(property.property_type);
  }

  // Step 2: Check Regrid/external data
  if (externalData) {
    const detected = detectFromExternalData(externalData);
    if (detected) return detected;
  }

  // Step 3: Infer from zoning
  if (property.zoning) {
    const zoningType = detectFromZoning(property.zoning);
    if (zoningType) return zoningType;
  }

  // Step 4: Infer from land use
  if (property.land_use) {
    const landUseType = detectFromLandUse(property.land_use);
    if (landUseType) return landUseType;
  }

  // Step 5: Check assessed improvement value (most reliable vacancy signal)
  // An improvement value of 0 from the county assessor means no structure exists.
  // This is far more reliable than building_sqft which is nearly always NULL.
  if (property.assessed_improvement_value !== undefined &&
      property.assessed_improvement_value !== null) {
    if (property.assessed_improvement_value === 0) {
      if (property.lot_size_acres && property.lot_size_acres > 5) {
        return 'agricultural';
      }
      return 'vacant_land';
    }
    // Has improvement value > 0, so has structure -- continue to type detection below
  }

  // Step 6: Check is_vacant_lot flag from database (Regrid or assessor data)
  if (property.is_vacant_lot === true) {
    if (property.lot_size_acres && property.lot_size_acres > 5) {
      return 'agricultural';
    }
    return 'vacant_land';
  }

  // Step 7: Check mobile home flag before falling back to building_sqft
  if (property.is_likely_mobile_home === true) {
    return 'manufactured_home';
  }

  // Step 8: Legacy fallback -- infer from building_sqft
  // NOTE: building_sqft is nearly always NULL in our data, so the checks
  // above (assessed_improvement_value, is_vacant_lot) should catch most cases.
  if (
    property.building_sqft === null ||
    property.building_sqft === undefined ||
    property.building_sqft === 0
  ) {
    // No building - likely vacant land
    if (property.lot_size_acres && property.lot_size_acres > 5) {
      return 'agricultural'; // Large lot without building
    }
    return 'vacant_land';
  }

  // Default to SFR if we have a building but can't determine type
  return 'single_family_residential';
}

/**
 * Detect property type from external data (Regrid, etc.)
 */
function detectFromExternalData(
  data: {
    propertyClass?: string;
    useType?: string;
    unitCount?: number;
    buildingType?: string;
  }
): ExtendedPropertyType | null {
  // Check property class
  if (data.propertyClass) {
    const classType = normalizePropertyType(data.propertyClass);
    if (classType !== 'unknown') return classType;
  }

  // Check use type
  if (data.useType) {
    const useType = normalizePropertyType(data.useType);
    if (useType !== 'unknown') return useType;
  }

  // Check unit count
  if (data.unitCount) {
    if (data.unitCount === 1) return 'single_family_residential';
    if (data.unitCount >= 2 && data.unitCount <= 4) return 'multi_family_small';
    if (data.unitCount > 4) return 'multi_family_residential';
  }

  // Check building type
  if (data.buildingType) {
    const normalizedType = data.buildingType.toLowerCase();
    if (normalizedType.includes('condo')) return 'condo';
    if (normalizedType.includes('townhouse') || normalizedType.includes('townhome')) {
      return 'townhouse';
    }
    if (normalizedType.includes('mobile') || normalizedType.includes('manufactured')) {
      return 'manufactured_home';
    }
  }

  return null;
}

/**
 * Detect property type from zoning code
 */
function detectFromZoning(zoning: string): ExtendedPropertyType | null {
  const z = zoning.toUpperCase();

  // Residential zones
  if (z.match(/^R-?1/)) return 'single_family_residential';
  if (z.match(/^R-?2/) || z.match(/^R-?3/) || z.match(/^R-?4/)) {
    return 'multi_family_small';
  }
  if (z.match(/^R-?[5-9]/) || z.match(/^RM/) || z.match(/^MF/)) {
    return 'multi_family_residential';
  }
  if (z.match(/^RSF/) || z.match(/^SFR/) || z.match(/^SF/)) {
    return 'single_family_residential';
  }

  // Commercial zones
  if (z.match(/^C-?[0-9]/) || z.match(/^CB/) || z.match(/^COM/)) {
    return 'commercial';
  }

  // Industrial zones
  if (z.match(/^I-?[0-9]/) || z.match(/^M-?[0-9]/) || z.match(/^IND/)) {
    return 'industrial';
  }

  // Mixed use zones
  if (z.match(/^MU/) || z.match(/^MX/) || z.includes('MIXED')) {
    return 'mixed_use';
  }

  // Agricultural zones
  if (z.match(/^A-?[0-9]/) || z.match(/^AG/) || z.includes('AGRICULTURAL')) {
    return 'agricultural';
  }

  return null;
}

/**
 * Detect property type from land use description
 */
function detectFromLandUse(landUse: string): ExtendedPropertyType | null {
  const lu = landUse.toLowerCase();

  // Residential
  if (lu.includes('single family') || lu.includes('sfr') || lu.includes('1 family')) {
    return 'single_family_residential';
  }
  if (lu.includes('multi') || lu.includes('duplex') || lu.includes('triplex')) {
    if (lu.includes('2-4') || lu.includes('duplex') || lu.includes('triplex')) {
      return 'multi_family_small';
    }
    return 'multi_family_residential';
  }
  if (lu.includes('condo')) return 'condo';
  if (lu.includes('townhouse') || lu.includes('townhome')) return 'townhouse';
  if (lu.includes('mobile') || lu.includes('manufactured')) return 'manufactured_home';

  // Commercial
  if (lu.includes('commercial') || lu.includes('retail') || lu.includes('office')) {
    return 'commercial';
  }

  // Industrial
  if (lu.includes('industrial') || lu.includes('warehouse') || lu.includes('manufacturing')) {
    return 'industrial';
  }

  // Mixed
  if (lu.includes('mixed')) return 'mixed_use';

  // Land
  if (lu.includes('vacant') || lu.includes('land') || lu.includes('lot')) {
    return 'vacant_land';
  }
  if (lu.includes('agricultural') || lu.includes('farm') || lu.includes('ranch')) {
    return 'agricultural';
  }

  return null;
}

/**
 * Normalize property type string to standard type
 *
 * Handles various naming conventions and abbreviations
 */
export function normalizePropertyType(
  type: string
): ExtendedPropertyType {
  const t = type.toLowerCase().trim();

  // Single family variations
  if (
    t.includes('single family') ||
    t.includes('sfr') ||
    t.includes('single-family') ||
    t === 'residential' ||
    t === 'res' ||
    t === 'house'
  ) {
    return 'single_family_residential';
  }

  // Multi-family variations
  if (t.includes('multi') || t.includes('apartment')) {
    if (t.includes('2-4') || t.includes('small') || t.includes('duplex')) {
      return 'multi_family_small';
    }
    return 'multi_family_residential';
  }

  // Condo variations
  if (t.includes('condo') || t.includes('condominium')) {
    return 'condo';
  }

  // Townhouse variations
  if (t.includes('townhouse') || t.includes('townhome') || t.includes('row')) {
    return 'townhouse';
  }

  // Mobile/manufactured variations
  if (t.includes('mobile') || t.includes('manufactured') || t.includes('mh')) {
    return 'manufactured_home';
  }

  // Commercial variations
  if (
    t.includes('commercial') ||
    t.includes('retail') ||
    t.includes('office') ||
    t === 'com'
  ) {
    return 'commercial';
  }

  // Industrial variations
  if (
    t.includes('industrial') ||
    t.includes('warehouse') ||
    t.includes('manufacturing') ||
    t === 'ind'
  ) {
    return 'industrial';
  }

  // Mixed use variations
  if (t.includes('mixed')) {
    return 'mixed_use';
  }

  // Vacant land variations
  if (
    t.includes('vacant') ||
    t === 'land' ||
    t === 'lot' ||
    t.includes('undeveloped')
  ) {
    return 'vacant_land';
  }

  // Agricultural variations
  if (
    t.includes('agricultural') ||
    t.includes('farm') ||
    t.includes('ranch') ||
    t.includes('ag')
  ) {
    return 'agricultural';
  }

  return 'unknown';
}

// ============================================
// Weight Functions
// ============================================

/**
 * Normalize category weights to sum to a target value
 *
 * @param weights - Original weights
 * @param targetSum - Target sum (default: 5.0 for 125-point system)
 * @returns Normalized weights
 */
export function normalizeWeights(
  weights: CategoryWeights,
  targetSum: number = 5.0
): CategoryWeights {
  const currentSum =
    weights.location +
    weights.risk +
    weights.financial +
    weights.market +
    weights.profit;

  if (currentSum === 0) {
    // Avoid division by zero - return equal weights
    const equalWeight = targetSum / 5;
    return {
      location: equalWeight,
      risk: equalWeight,
      financial: equalWeight,
      market: equalWeight,
      profit: equalWeight,
    };
  }

  const factor = targetSum / currentSum;

  return {
    location: weights.location * factor,
    risk: weights.risk * factor,
    financial: weights.financial * factor,
    market: weights.market * factor,
    profit: weights.profit * factor,
  };
}

/**
 * Get adjusted category weights for a property type
 *
 * @param propertyType - Type of property
 * @param normalize - Whether to normalize weights (default: true)
 * @returns Category weights for scoring
 */
export function getAdjustedWeights(
  propertyType: ExtendedPropertyType | 'unknown',
  normalize: boolean = true
): CategoryWeights {
  const weights = PROPERTY_TYPE_WEIGHTS[propertyType] || PROPERTY_TYPE_WEIGHTS.unknown;

  if (normalize) {
    return normalizeWeights(weights);
  }

  return { ...weights };
}

/**
 * Calculate weighted total score from category scores
 *
 * @param categoryScores - Scores for each category (0-25 each)
 * @param weights - Category weights (from getAdjustedWeights)
 * @param normalize - Whether to normalize weights before calculation
 * @returns Weighted total score (0-125)
 *
 * @example
 * calculateWeightedScore(
 *   { location: 20, risk: 18, financial: 15, market: 22, profit: 19 },
 *   getAdjustedWeights('single_family_residential')
 * );
 * // Returns weighted average based on property type
 */
export function calculateWeightedScore(
  categoryScores: CategoryWeights,
  weights: CategoryWeights,
  normalize: boolean = true
): number {
  // Normalize weights to sum to 1.0 for percentage calculation
  const normalizedWeights = normalize ? normalizeWeights(weights, 1.0) : weights;

  // Calculate weighted sum
  const weightedSum =
    categoryScores.location * normalizedWeights.location +
    categoryScores.risk * normalizedWeights.risk +
    categoryScores.financial * normalizedWeights.financial +
    categoryScores.market * normalizedWeights.market +
    categoryScores.profit * normalizedWeights.profit;

  // Scale to 125-point system (each category is 0-25, so max weighted sum is 25)
  // weightedSum is already on 0-25 scale if category scores are 0-25
  return Math.round(weightedSum * 100) / 100;
}

/**
 * Get component-level weight adjustment for a property type
 *
 * Some components matter more or less depending on property type.
 * This provides fine-grained adjustments beyond category weights.
 *
 * @param propertyType - Type of property
 * @param category - Category the component belongs to
 * @param component - Component identifier
 * @returns Weight multiplier (1.0 = no change)
 */
export function getComponentWeightAdjustment(
  propertyType: ExtendedPropertyType | 'unknown',
  category: string,
  component: string
): number {
  // Define component-specific adjustments by property type
  const adjustments: Partial<
    Record<ExtendedPropertyType, Record<string, Record<string, number>>>
  > = {
    // Vacant land: walkability matters less, flood zone matters more
    vacant_land: {
      location: {
        walk_score: 0.5, // Less relevant
        transit_score: 0.5, // Less relevant
      },
      risk: {
        flood_zone: 1.3, // More important
        zoning_compliance: 1.4, // Critical for development
      },
    },

    // Multi-family: cash flow components matter more
    multi_family_residential: {
      profit: {
        cash_flow: 1.4, // Very important
        roi_potential: 1.2,
      },
      financial: {
        holding_costs: 1.2, // Operating costs higher
      },
    },

    // Commercial: location and market are key
    commercial: {
      location: {
        walk_score: 1.3, // Foot traffic matters
        amenity_count: 1.2,
      },
      market: {
        days_on_market: 1.2,
        absorption_rate: 1.3, // Commercial vacancy rates
      },
    },

    // Agricultural: different risk profile
    agricultural: {
      risk: {
        flood_zone: 1.2, // Water is important for farming
        environmental_hazards: 1.3, // Soil contamination
      },
      location: {
        walk_score: 0.3, // Not relevant
        transit_score: 0.2, // Not relevant
      },
    },

    // Manufactured homes: depreciation and land concerns
    manufactured_home: {
      risk: {
        structural_risk: 1.3, // Construction quality concerns
      },
      financial: {
        assessment_ratio: 1.2, // Value assessments tricky
      },
    },
  };

  const typeAdjustments = adjustments[propertyType];
  if (!typeAdjustments) return 1.0;

  const categoryAdjustments = typeAdjustments[category];
  if (!categoryAdjustments) return 1.0;

  return categoryAdjustments[component] || 1.0;
}

/**
 * Get description of weight adjustments for a property type
 *
 * Useful for explaining to users why certain categories
 * have more/less weight for their property type.
 *
 * @param propertyType - Type of property
 * @returns Array of explanation strings
 */
export function getWeightExplanations(
  propertyType: ExtendedPropertyType | 'unknown'
): string[] {
  const explanations: Record<ExtendedPropertyType | 'unknown', string[]> = {
    single_family_residential: [
      'Location and profit potential are slightly emphasized for single-family homes.',
      'Balanced evaluation across all categories.',
    ],
    multi_family_small: [
      'Profit and financial categories are weighted higher for small multi-family.',
      'Cash flow potential is a key evaluation factor.',
    ],
    multi_family_residential: [
      'Strong emphasis on profit and financial metrics for apartment buildings.',
      'Cash flow and operating costs are critical evaluation factors.',
    ],
    condo: [
      'Location is highly weighted for condos.',
      'Risk and financial categories reflect HOA concerns and special assessments.',
    ],
    townhouse: [
      'Similar to single-family evaluation with balanced weights.',
      'HOA factors are considered where applicable.',
    ],
    manufactured_home: [
      'Risk category is weighted higher due to depreciation and construction concerns.',
      'Land ownership vs. lot rent is a critical financial factor.',
    ],
    commercial: [
      'Location and market conditions are paramount for commercial properties.',
      'Foot traffic and commercial vacancy rates are key factors.',
    ],
    industrial: [
      'Market access and financial efficiency are key for industrial properties.',
      'Environmental risk assessment is weighted higher.',
    ],
    mixed_use: [
      'Balanced evaluation required for complex mixed-use properties.',
      'Multiple use cases must be considered.',
    ],
    vacant_land: [
      'Location and market analysis are primary factors for vacant land.',
      'Profit evaluation is less emphasized as income is speculative.',
    ],
    agricultural: [
      'Financial viability and risk factors are emphasized.',
      'Location scores (walk/transit) are less relevant for farm properties.',
    ],
    unknown: [
      'Equal weighting applied when property type cannot be determined.',
      'Consider verifying property type for more accurate scoring.',
    ],
  };

  return explanations[propertyType] || explanations.unknown;
}

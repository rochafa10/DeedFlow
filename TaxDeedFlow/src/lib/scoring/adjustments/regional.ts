/**
 * Regional Score Adjustments
 *
 * This file contains state-level and metro-level score adjustments
 * that reflect regional market conditions, regulations, and risk factors.
 * These adjustments modify base scores to account for geographic variation.
 *
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-16
 */

import type { CategoryId } from '@/types/scoring';

// ============================================
// Type Definitions
// ============================================

/**
 * Configuration for a single adjustment
 */
export interface AdjustmentConfig {
  /** Scoring category this applies to */
  category: CategoryId;
  /** Specific component within category (or 'all' for entire category) */
  component: string;
  /** Multiplier factor (1.0 = no change, 1.1 = +10%, 0.9 = -10%) */
  factor: number;
  /** Explanation for why this adjustment exists */
  reason: string;
}

/**
 * Regional adjustment configuration for a state or metro
 */
export interface RegionalAdjustmentConfig {
  /** State code (e.g., 'FL', 'TX') */
  state: string;
  /** Metro area name (optional, for metro-specific adjustments) */
  metro?: string;
  /** Array of adjustments to apply */
  adjustments: AdjustmentConfig[];
}

/**
 * Result of applying a regional adjustment
 */
export interface ScoreAdjustment {
  /** Type of adjustment applied */
  type: 'regional' | 'property_type' | 'market_condition' | 'data_quality';
  /** Multiplier factor that was applied */
  factor: number;
  /** Explanation for the adjustment */
  reason: string;
  /** What the adjustment was applied to (category.component) */
  appliedTo: string;
}

// ============================================
// State-Level Regional Adjustments
// ============================================

/**
 * State-level regional adjustments for 11 key tax deed states
 *
 * These adjustments reflect:
 * - State-specific tax deed/lien processes
 * - Regional market conditions
 * - Natural disaster risk profiles
 * - Regulatory environments
 */
export const REGIONAL_ADJUSTMENTS: Record<string, RegionalAdjustmentConfig> = {
  // ============================================
  // Florida (FL) - Tax Deed State
  // ============================================
  FL: {
    state: 'FL',
    adjustments: [
      {
        category: 'market',
        component: 'appreciation_rate',
        factor: 1.1,
        reason: 'Florida has strong appreciation due to population growth and no state income tax.',
      },
      {
        category: 'risk',
        component: 'hurricane_risk',
        factor: 0.8,
        reason: 'Florida has elevated hurricane risk requiring additional insurance considerations.',
      },
      {
        category: 'risk',
        component: 'flood_risk',
        factor: 0.9,
        reason: 'Florida has higher flood risk, especially in coastal and low-lying areas.',
      },
    ],
  },

  // ============================================
  // Texas (TX) - Tax Deed State
  // ============================================
  TX: {
    state: 'TX',
    adjustments: [
      {
        category: 'market',
        component: 'demand',
        factor: 1.1,
        reason: 'Texas has strong housing demand due to business-friendly environment and job growth.',
      },
      {
        category: 'financial',
        component: 'tax_to_value_ratio',
        factor: 0.9,
        reason: 'Texas has high property taxes (no income tax), reducing net returns.',
      },
    ],
  },

  // ============================================
  // California (CA) - Tax Deed State
  // ============================================
  CA: {
    state: 'CA',
    adjustments: [
      {
        category: 'market',
        component: 'appreciation_rate',
        factor: 1.15,
        reason: 'California has historically strong appreciation despite high prices.',
      },
      {
        category: 'risk',
        component: 'earthquake_risk',
        factor: 0.7,
        reason: 'California has significant seismic risk requiring earthquake insurance.',
      },
      {
        category: 'risk',
        component: 'wildfire_risk',
        factor: 0.8,
        reason: 'California has elevated wildfire risk in many areas.',
      },
      {
        category: 'profit',
        component: 'rent_potential',
        factor: 1.1,
        reason: 'California has strong rental market with high rents in most metros.',
      },
    ],
  },

  // ============================================
  // Pennsylvania (PA) - Tax Deed State
  // ============================================
  PA: {
    state: 'PA',
    adjustments: [
      {
        category: 'market',
        component: 'appreciation_rate',
        factor: 0.95,
        reason: 'Pennsylvania has moderate appreciation, slower than national average.',
      },
      {
        category: 'financial',
        component: 'rehab_costs',
        factor: 0.9,
        reason: 'Pennsylvania has lower construction costs than coastal states.',
      },
    ],
  },

  // ============================================
  // Arizona (AZ) - Tax Lien State
  // ============================================
  AZ: {
    state: 'AZ',
    adjustments: [
      {
        category: 'market',
        component: 'demand',
        factor: 1.15,
        reason: 'Arizona has strong housing demand from migration and retirement.',
      },
      {
        category: 'risk',
        component: 'wildfire_risk',
        factor: 0.85,
        reason: 'Arizona has wildfire risk in forest and desert areas.',
      },
    ],
  },

  // ============================================
  // Georgia (GA) - Tax Deed State
  // ============================================
  GA: {
    state: 'GA',
    adjustments: [
      {
        category: 'market',
        component: 'demand',
        factor: 1.1,
        reason: 'Georgia has strong demand driven by Atlanta metro growth.',
      },
      {
        category: 'market',
        component: 'appreciation_rate',
        factor: 1.05,
        reason: 'Georgia has above-average appreciation in growing metros.',
      },
      {
        category: 'financial',
        component: 'foreclosure_process',
        factor: 0.95,
        reason: 'Georgia is a non-judicial foreclosure state with faster processes.',
      },
    ],
  },

  // ============================================
  // North Carolina (NC) - Tax Deed State
  // ============================================
  NC: {
    state: 'NC',
    adjustments: [
      {
        category: 'market',
        component: 'demand',
        factor: 1.1,
        reason: 'North Carolina has strong demand from job growth in Triangle and Charlotte.',
      },
      {
        category: 'market',
        component: 'appreciation_rate',
        factor: 1.08,
        reason: 'North Carolina has above-average appreciation in growing metros.',
      },
      {
        category: 'financial',
        component: 'upset_bid',
        factor: 0.9,
        reason: 'North Carolina upset bid process can extend redemption period.',
      },
    ],
  },

  // ============================================
  // Ohio (OH) - Tax Lien State
  // ============================================
  OH: {
    state: 'OH',
    adjustments: [
      {
        category: 'market',
        component: 'appreciation_rate',
        factor: 0.9,
        reason: 'Ohio has below-average appreciation in most markets.',
      },
      {
        category: 'financial',
        component: 'tax_lien_interest',
        factor: 1.1,
        reason: 'Ohio offers competitive tax lien interest rates.',
      },
      {
        category: 'profit',
        component: 'cash_flow',
        factor: 1.1,
        reason: 'Ohio has favorable rent-to-price ratios for cash flow investors.',
      },
    ],
  },

  // ============================================
  // Michigan (MI) - Tax Deed State
  // ============================================
  MI: {
    state: 'MI',
    adjustments: [
      {
        category: 'market',
        component: 'appreciation_rate',
        factor: 0.85,
        reason: 'Michigan has slower appreciation outside metro Detroit recovery.',
      },
      {
        category: 'financial',
        component: 'rehab_costs',
        factor: 0.85,
        reason: 'Michigan has lower construction and rehab costs.',
      },
      {
        category: 'market',
        component: 'vacancy',
        factor: 0.9,
        reason: 'Michigan has higher vacancy rates in some markets.',
      },
      {
        category: 'profit',
        component: 'cash_flow',
        factor: 1.15,
        reason: 'Michigan offers excellent cash flow opportunities due to low prices.',
      },
    ],
  },

  // ============================================
  // Nevada (NV) - Tax Deed State
  // ============================================
  NV: {
    state: 'NV',
    adjustments: [
      {
        category: 'market',
        component: 'demand',
        factor: 1.1,
        reason: 'Nevada has strong demand from California migration.',
      },
      {
        category: 'market',
        component: 'appreciation_rate',
        factor: 1.1,
        reason: 'Nevada has strong appreciation in Las Vegas and Reno metros.',
      },
      {
        category: 'market',
        component: 'volatility',
        factor: 0.85,
        reason: 'Nevada market is more volatile, with larger boom/bust cycles.',
      },
    ],
  },

  // ============================================
  // Colorado (CO) - Tax Lien State
  // ============================================
  CO: {
    state: 'CO',
    adjustments: [
      {
        category: 'market',
        component: 'demand',
        factor: 1.15,
        reason: 'Colorado has strong housing demand from population growth.',
      },
      {
        category: 'market',
        component: 'appreciation_rate',
        factor: 1.1,
        reason: 'Colorado has above-average appreciation, especially in Denver metro.',
      },
      {
        category: 'financial',
        component: 'tax_lien_interest',
        factor: 1.05,
        reason: 'Colorado offers competitive tax lien interest rates.',
      },
      {
        category: 'risk',
        component: 'wildfire_risk',
        factor: 0.85,
        reason: 'Colorado has elevated wildfire risk in mountain and foothill areas.',
      },
    ],
  },
} as const;

// ============================================
// Metro-Level Adjustments
// ============================================

/**
 * Metro-specific adjustments that override or supplement state-level
 *
 * These provide more granular adjustments for major metropolitan areas
 * where conditions differ significantly from state averages.
 */
export const METRO_ADJUSTMENTS: Record<string, RegionalAdjustmentConfig> = {
  // ============================================
  // Florida Metros
  // ============================================
  'FL_Miami': {
    state: 'FL',
    metro: 'Miami',
    adjustments: [
      {
        category: 'market',
        component: 'appreciation_rate',
        factor: 1.15,
        reason: 'Miami has strong appreciation from international demand.',
      },
      {
        category: 'risk',
        component: 'flood_risk',
        factor: 0.75,
        reason: 'Miami has significant flood risk from sea level rise.',
      },
      {
        category: 'market',
        component: 'competition',
        factor: 0.85,
        reason: 'Miami market is highly competitive with institutional buyers.',
      },
    ],
  },

  'FL_Tampa': {
    state: 'FL',
    metro: 'Tampa',
    adjustments: [
      {
        category: 'market',
        component: 'appreciation_rate',
        factor: 1.12,
        reason: 'Tampa has strong appreciation from migration.',
      },
      {
        category: 'profit',
        component: 'cash_flow',
        factor: 1.05,
        reason: 'Tampa offers better cash flow than South Florida.',
      },
    ],
  },

  'FL_Orlando': {
    state: 'FL',
    metro: 'Orlando',
    adjustments: [
      {
        category: 'market',
        component: 'demand',
        factor: 1.1,
        reason: 'Orlando has strong rental demand from tourism employment.',
      },
      {
        category: 'profit',
        component: 'rent_potential',
        factor: 1.08,
        reason: 'Orlando has strong short-term rental opportunities.',
      },
    ],
  },

  // ============================================
  // Texas Metros
  // ============================================
  'TX_Houston': {
    state: 'TX',
    metro: 'Houston',
    adjustments: [
      {
        category: 'risk',
        component: 'flood_risk',
        factor: 0.8,
        reason: 'Houston has significant flood risk from hurricanes and heavy rain.',
      },
      {
        category: 'market',
        component: 'volatility',
        factor: 0.9,
        reason: 'Houston market is tied to energy sector volatility.',
      },
    ],
  },

  'TX_Dallas': {
    state: 'TX',
    metro: 'Dallas',
    adjustments: [
      {
        category: 'market',
        component: 'demand',
        factor: 1.15,
        reason: 'Dallas has exceptional demand from corporate relocations.',
      },
      {
        category: 'market',
        component: 'competition',
        factor: 0.85,
        reason: 'Dallas market is competitive with institutional investors.',
      },
    ],
  },

  'TX_Austin': {
    state: 'TX',
    metro: 'Austin',
    adjustments: [
      {
        category: 'market',
        component: 'appreciation_rate',
        factor: 1.2,
        reason: 'Austin has exceptional appreciation from tech growth.',
      },
      {
        category: 'market',
        component: 'competition',
        factor: 0.8,
        reason: 'Austin is highly competitive with limited inventory.',
      },
    ],
  },

  'TX_SanAntonio': {
    state: 'TX',
    metro: 'San Antonio',
    adjustments: [
      {
        category: 'profit',
        component: 'cash_flow',
        factor: 1.1,
        reason: 'San Antonio offers good cash flow with moderate prices.',
      },
      {
        category: 'market',
        component: 'appreciation_rate',
        factor: 1.05,
        reason: 'San Antonio has steady but moderate appreciation.',
      },
    ],
  },

  // ============================================
  // California Metros
  // ============================================
  'CA_LosAngeles': {
    state: 'CA',
    metro: 'Los Angeles',
    adjustments: [
      {
        category: 'market',
        component: 'appreciation_rate',
        factor: 1.1,
        reason: 'Los Angeles has strong long-term appreciation.',
      },
      {
        category: 'profit',
        component: 'cash_flow',
        factor: 0.85,
        reason: 'Los Angeles has poor cash flow due to high prices.',
      },
      {
        category: 'risk',
        component: 'earthquake_risk',
        factor: 0.7,
        reason: 'Los Angeles has significant seismic risk.',
      },
    ],
  },

  'CA_SanFrancisco': {
    state: 'CA',
    metro: 'San Francisco',
    adjustments: [
      {
        category: 'market',
        component: 'appreciation_rate',
        factor: 1.1,
        reason: 'San Francisco has strong appreciation despite volatility.',
      },
      {
        category: 'profit',
        component: 'cash_flow',
        factor: 0.8,
        reason: 'San Francisco has very poor cash flow metrics.',
      },
      {
        category: 'financial',
        component: 'rent_control',
        factor: 0.9,
        reason: 'San Francisco has strict rent control limiting rental income.',
      },
    ],
  },

  'CA_SanDiego': {
    state: 'CA',
    metro: 'San Diego',
    adjustments: [
      {
        category: 'market',
        component: 'appreciation_rate',
        factor: 1.1,
        reason: 'San Diego has strong appreciation with more stability than LA.',
      },
      {
        category: 'risk',
        component: 'wildfire_risk',
        factor: 0.8,
        reason: 'San Diego has elevated wildfire risk in many areas.',
      },
    ],
  },

  // ============================================
  // Arizona Metros
  // ============================================
  'AZ_Phoenix': {
    state: 'AZ',
    metro: 'Phoenix',
    adjustments: [
      {
        category: 'market',
        component: 'appreciation_rate',
        factor: 1.15,
        reason: 'Phoenix has exceptional appreciation from migration.',
      },
      {
        category: 'market',
        component: 'volatility',
        factor: 0.85,
        reason: 'Phoenix market has higher boom/bust volatility.',
      },
    ],
  },

  // ============================================
  // Georgia Metros
  // ============================================
  'GA_Atlanta': {
    state: 'GA',
    metro: 'Atlanta',
    adjustments: [
      {
        category: 'market',
        component: 'demand',
        factor: 1.15,
        reason: 'Atlanta has strong demand from corporate relocations.',
      },
      {
        category: 'market',
        component: 'appreciation_rate',
        factor: 1.1,
        reason: 'Atlanta has above-average appreciation.',
      },
    ],
  },

  // ============================================
  // North Carolina Metros
  // ============================================
  'NC_Charlotte': {
    state: 'NC',
    metro: 'Charlotte',
    adjustments: [
      {
        category: 'market',
        component: 'demand',
        factor: 1.15,
        reason: 'Charlotte has strong demand from banking sector growth.',
      },
      {
        category: 'market',
        component: 'appreciation_rate',
        factor: 1.1,
        reason: 'Charlotte has strong appreciation.',
      },
    ],
  },

  'NC_Raleigh': {
    state: 'NC',
    metro: 'Raleigh',
    adjustments: [
      {
        category: 'market',
        component: 'demand',
        factor: 1.15,
        reason: 'Raleigh has strong demand from tech and research.',
      },
      {
        category: 'market',
        component: 'appreciation_rate',
        factor: 1.12,
        reason: 'Raleigh has exceptional appreciation.',
      },
    ],
  },

  // ============================================
  // Nevada Metros
  // ============================================
  'NV_LasVegas': {
    state: 'NV',
    metro: 'Las Vegas',
    adjustments: [
      {
        category: 'market',
        component: 'volatility',
        factor: 0.8,
        reason: 'Las Vegas has high market volatility tied to gaming/tourism.',
      },
      {
        category: 'profit',
        component: 'cash_flow',
        factor: 1.1,
        reason: 'Las Vegas offers good cash flow opportunities.',
      },
    ],
  },

  // ============================================
  // Colorado Metros
  // ============================================
  'CO_Denver': {
    state: 'CO',
    metro: 'Denver',
    adjustments: [
      {
        category: 'market',
        component: 'appreciation_rate',
        factor: 1.15,
        reason: 'Denver has strong appreciation from migration.',
      },
      {
        category: 'market',
        component: 'competition',
        factor: 0.85,
        reason: 'Denver is highly competitive.',
      },
    ],
  },

  // ============================================
  // Pennsylvania Metros
  // ============================================
  'PA_Philadelphia': {
    state: 'PA',
    metro: 'Philadelphia',
    adjustments: [
      {
        category: 'market',
        component: 'appreciation_rate',
        factor: 1.05,
        reason: 'Philadelphia has moderate appreciation.',
      },
      {
        category: 'profit',
        component: 'cash_flow',
        factor: 1.1,
        reason: 'Philadelphia offers good cash flow.',
      },
    ],
  },

  'PA_Pittsburgh': {
    state: 'PA',
    metro: 'Pittsburgh',
    adjustments: [
      {
        category: 'profit',
        component: 'cash_flow',
        factor: 1.15,
        reason: 'Pittsburgh offers excellent cash flow opportunities.',
      },
      {
        category: 'market',
        component: 'appreciation_rate',
        factor: 0.9,
        reason: 'Pittsburgh has slower appreciation.',
      },
    ],
  },
} as const;

// ============================================
// Core Functions
// ============================================

/**
 * Apply regional adjustments to a component score
 *
 * The function applies state-level adjustments first, then metro-level
 * adjustments which can override state-level for the same component.
 *
 * @param state - State code (e.g., 'FL', 'TX')
 * @param metro - Metro area name (optional, e.g., 'Miami')
 * @param category - Scoring category
 * @param component - Component within category
 * @param baseScore - Original score before adjustment (0-5 scale)
 * @returns Adjusted score (clamped to 0-5 scale) and adjustment details
 *
 * @example
 * // Apply Florida state adjustments to appreciation_rate
 * const result = applyRegionalAdjustments('FL', null, 'market', 'appreciation_rate', 3.0);
 * // Returns: { adjustedScore: 3.3, adjustments: [...] }
 *
 * @example
 * // Apply Miami-specific adjustments (overrides state for same component)
 * const result = applyRegionalAdjustments('FL', 'Miami', 'market', 'appreciation_rate', 3.0);
 * // Returns: { adjustedScore: 3.45, adjustments: [...] }
 */
export function applyRegionalAdjustments(
  state: string,
  metro: string | null,
  category: CategoryId,
  component: string,
  baseScore: number
): {
  adjustedScore: number;
  adjustments: ScoreAdjustment[];
} {
  const adjustments: ScoreAdjustment[] = [];
  let adjustedScore = baseScore;

  // Step 1: Apply state-level adjustments
  const stateConfig = REGIONAL_ADJUSTMENTS[state];
  if (stateConfig) {
    for (const adj of stateConfig.adjustments) {
      if (adj.category === category && (adj.component === component || adj.component === 'all')) {
        adjustedScore = adjustedScore * adj.factor;
        adjustments.push({
          type: 'regional',
          factor: adj.factor,
          reason: adj.reason,
          appliedTo: `${category}.${component}`,
        });
      }
    }
  }

  // Step 2: Apply metro-level adjustments (can override state for same component)
  if (metro) {
    const metroKey = `${state}_${metro}`;
    const metroConfig = METRO_ADJUSTMENTS[metroKey];
    if (metroConfig) {
      for (const adj of metroConfig.adjustments) {
        if (adj.category === category && (adj.component === component || adj.component === 'all')) {
          // Check if we already applied a state adjustment for this component
          const existingAdjIndex = adjustments.findIndex(
            (a) => a.appliedTo === `${category}.${component}`
          );

          if (existingAdjIndex >= 0) {
            // Replace state adjustment with metro adjustment
            // First, reverse the state adjustment
            const stateAdj = adjustments[existingAdjIndex];
            adjustedScore = adjustedScore / stateAdj.factor;
            // Then apply metro adjustment
            adjustedScore = adjustedScore * adj.factor;
            adjustments[existingAdjIndex] = {
              type: 'regional',
              factor: adj.factor,
              reason: `Metro override: ${adj.reason}`,
              appliedTo: `${category}.${component}`,
            };
          } else {
            // No state adjustment, just apply metro
            adjustedScore = adjustedScore * adj.factor;
            adjustments.push({
              type: 'regional',
              factor: adj.factor,
              reason: `Metro: ${adj.reason}`,
              appliedTo: `${category}.${component}`,
            });
          }
        }
      }
    }
  }

  // Clamp to valid score range (0-5)
  adjustedScore = Math.max(0, Math.min(5, adjustedScore));

  return {
    adjustedScore: Math.round(adjustedScore * 100) / 100, // Round to 2 decimal places
    adjustments,
  };
}

/**
 * Get all adjustments for a state (for display/documentation)
 *
 * @param state - State code
 * @returns Array of adjustment configs, or empty array if no adjustments
 */
export function getStateAdjustments(state: string): AdjustmentConfig[] {
  const config = REGIONAL_ADJUSTMENTS[state];
  return config ? [...config.adjustments] : [];
}

/**
 * Get all adjustments for a metro (for display/documentation)
 *
 * @param state - State code
 * @param metro - Metro area name
 * @returns Array of adjustment configs, or empty array if no adjustments
 */
export function getMetroAdjustments(
  state: string,
  metro: string
): AdjustmentConfig[] {
  const metroKey = `${state}_${metro}`;
  const config = METRO_ADJUSTMENTS[metroKey];
  return config ? [...config.adjustments] : [];
}

/**
 * Get all available metros for a state
 *
 * @param state - State code
 * @returns Array of metro names with adjustments defined
 */
export function getAvailableMetros(state: string): string[] {
  return Object.keys(METRO_ADJUSTMENTS)
    .filter((key) => key.startsWith(`${state}_`))
    .map((key) => key.replace(`${state}_`, ''));
}

/**
 * Check if regional adjustments exist for a state
 *
 * @param state - State code
 * @returns True if state has adjustments defined
 */
export function hasStateAdjustments(state: string): boolean {
  return state in REGIONAL_ADJUSTMENTS;
}

/**
 * Check if metro-specific adjustments exist
 *
 * @param state - State code
 * @param metro - Metro area name
 * @returns True if metro has adjustments defined
 */
export function hasMetroAdjustments(state: string, metro: string): boolean {
  return `${state}_${metro}` in METRO_ADJUSTMENTS;
}

/**
 * Get a summary of regional factors for a location
 *
 * Useful for displaying to users what adjustments will be applied.
 *
 * @param state - State code
 * @param metro - Metro area name (optional)
 * @returns Summary object with positive/negative factors
 */
export function getRegionalSummary(
  state: string,
  metro?: string
): {
  state: string;
  metro?: string;
  positiveFactors: string[];
  negativeFactors: string[];
  neutralNote: string;
} {
  const positiveFactors: string[] = [];
  const negativeFactors: string[] = [];

  // Collect state adjustments
  const stateAdjs = getStateAdjustments(state);
  for (const adj of stateAdjs) {
    if (adj.factor > 1.0) {
      positiveFactors.push(adj.reason);
    } else if (adj.factor < 1.0) {
      negativeFactors.push(adj.reason);
    }
  }

  // Collect metro adjustments if applicable
  if (metro) {
    const metroAdjs = getMetroAdjustments(state, metro);
    for (const adj of metroAdjs) {
      if (adj.factor > 1.0) {
        positiveFactors.push(`[${metro}] ${adj.reason}`);
      } else if (adj.factor < 1.0) {
        negativeFactors.push(`[${metro}] ${adj.reason}`);
      }
    }
  }

  let neutralNote = 'No specific regional adjustments for this location.';
  if (positiveFactors.length > 0 || negativeFactors.length > 0) {
    neutralNote = '';
  }

  return {
    state,
    metro,
    positiveFactors,
    negativeFactors,
    neutralNote,
  };
}

/**
 * Input scores for batch regional adjustment
 */
export interface BatchScoreInput {
  location: number;
  risk: number;
  financial: number;
  market: number;
  profit: number;
}

/**
 * Result of batch regional adjustment
 */
export interface BatchAdjustmentResult {
  adjustedScores: BatchScoreInput;
  totalAdjusted: number;
  adjustmentsApplied: ScoreAdjustment[];
}

/**
 * Apply regional adjustments to all category scores at once
 *
 * This is a convenience function that applies state and metro adjustments
 * to all five scoring categories and returns the adjusted results.
 *
 * @param scores - Object with all category base scores
 * @param state - State code (e.g., 'PA', 'FL')
 * @param county - County name (optional, used to determine metro area)
 * @returns Adjusted scores for all categories and list of adjustments applied
 */
export function applyAllRegionalAdjustments(
  scores: BatchScoreInput,
  state: string,
  county?: string
): BatchAdjustmentResult {
  const adjustmentsApplied: ScoreAdjustment[] = [];

  // Apply adjustments to each category
  const locationResult = applyRegionalAdjustments(state, county || null, 'location', 'all', scores.location);
  const riskResult = applyRegionalAdjustments(state, county || null, 'risk', 'all', scores.risk);
  const financialResult = applyRegionalAdjustments(state, county || null, 'financial', 'all', scores.financial);
  const marketResult = applyRegionalAdjustments(state, county || null, 'market', 'all', scores.market);
  const profitResult = applyRegionalAdjustments(state, county || null, 'profit', 'all', scores.profit);

  // Collect all adjustments
  adjustmentsApplied.push(...locationResult.adjustments);
  adjustmentsApplied.push(...riskResult.adjustments);
  adjustmentsApplied.push(...financialResult.adjustments);
  adjustmentsApplied.push(...marketResult.adjustments);
  adjustmentsApplied.push(...profitResult.adjustments);

  const adjustedScores: BatchScoreInput = {
    location: locationResult.adjustedScore,
    risk: riskResult.adjustedScore,
    financial: financialResult.adjustedScore,
    market: marketResult.adjustedScore,
    profit: profitResult.adjustedScore,
  };

  const totalAdjusted =
    adjustedScores.location +
    adjustedScores.risk +
    adjustedScores.financial +
    adjustedScores.market +
    adjustedScores.profit;

  return {
    adjustedScores,
    totalAdjusted,
    adjustmentsApplied,
  };
}

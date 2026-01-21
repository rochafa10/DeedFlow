/**
 * Cost Estimation Engine - Constants and Regional Multipliers
 *
 * Contains regional cost multipliers for all 50 U.S. states plus DC,
 * metro-level overrides for major metropolitan areas, and default
 * cost estimates for each category.
 *
 * Data sources:
 * - RSMeans Construction Cost Data
 * - U.S. Census Bureau Property Tax Data
 * - Bureau of Labor Statistics Regional Labor Costs
 *
 * @module lib/costs/constants
 * @author Claude Code Agent
 * @date 2026-01-16
 */

import type {
  RegionalMultiplier,
  MetroMultiplier,
  RehabScope,
  PropertyCondition,
  AuctionPlatform,
} from '@/types/costs';

// ============================================
// Regional Multipliers - All 50 States + DC
// ============================================

/**
 * Regional cost multipliers for each U.S. state
 *
 * Labor multiplier: Relative to national average (1.0)
 *   - Below 1.0 = Lower labor costs than average
 *   - Above 1.0 = Higher labor costs than average
 *
 * Materials multiplier: Relative to national average (1.0)
 *   - Accounts for shipping, local supply, demand
 *
 * Tax rate: Effective property tax rate (annual tax / assessed value)
 *   - Based on median rates, actual rates vary by county
 */
export const REGIONAL_MULTIPLIERS: Record<string, RegionalMultiplier> = {
  // ============================================
  // NORTHEAST REGION
  // ============================================

  /** Pennsylvania - Varied costs, higher taxes */
  PA: { labor: 1.00, materials: 1.00, taxRate: 0.0153 },

  /** New York - High costs especially NYC area */
  NY: { labor: 1.40, materials: 1.20, taxRate: 0.0168 },

  /** New Jersey - High costs, highest property taxes */
  NJ: { labor: 1.25, materials: 1.15, taxRate: 0.0249 },

  /** Massachusetts - High costs in Boston metro */
  MA: { labor: 1.30, materials: 1.15, taxRate: 0.0121 },

  /** Connecticut - High costs, high taxes */
  CT: { labor: 1.25, materials: 1.12, taxRate: 0.0221 },

  /** Rhode Island - Moderate-high costs */
  RI: { labor: 1.15, materials: 1.08, taxRate: 0.0153 },

  /** Vermont - Higher costs due to rural logistics */
  VT: { labor: 1.10, materials: 1.10, taxRate: 0.0188 },

  /** New Hampshire - No income tax, higher property tax */
  NH: { labor: 1.12, materials: 1.08, taxRate: 0.0205 },

  /** Maine - Moderate costs, rural premiums */
  ME: { labor: 1.05, materials: 1.08, taxRate: 0.0128 },

  /** Delaware - No sales tax, moderate costs */
  DE: { labor: 1.05, materials: 1.00, taxRate: 0.0056 },

  /** Maryland - Higher costs near DC */
  MD: { labor: 1.18, materials: 1.10, taxRate: 0.0109 },

  /** Washington DC - Highest costs in region */
  DC: { labor: 1.45, materials: 1.25, taxRate: 0.0085 },

  // ============================================
  // SOUTHEAST REGION
  // ============================================

  /** Florida - Moderate costs, no income tax */
  FL: { labor: 1.05, materials: 1.02, taxRate: 0.0089 },

  /** Georgia - Lower costs outside Atlanta */
  GA: { labor: 0.92, materials: 0.98, taxRate: 0.0092 },

  /** North Carolina - Lower costs, growing markets */
  NC: { labor: 0.90, materials: 0.95, taxRate: 0.0084 },

  /** South Carolina - Low costs overall */
  SC: { labor: 0.88, materials: 0.95, taxRate: 0.0057 },

  /** Virginia - Moderate, higher in NoVa */
  VA: { labor: 1.02, materials: 1.00, taxRate: 0.0082 },

  /** West Virginia - Lowest costs in East */
  WV: { labor: 0.78, materials: 0.92, taxRate: 0.0058 },

  /** Kentucky - Low labor costs */
  KY: { labor: 0.85, materials: 0.95, taxRate: 0.0086 },

  /** Tennessee - No income tax, moderate costs */
  TN: { labor: 0.90, materials: 0.98, taxRate: 0.0071 },

  /** Alabama - Very low costs */
  AL: { labor: 0.82, materials: 0.92, taxRate: 0.0041 },

  /** Mississippi - Lowest costs in US */
  MS: { labor: 0.75, materials: 0.90, taxRate: 0.0081 },

  /** Louisiana - Low costs, variable taxes */
  LA: { labor: 0.88, materials: 0.95, taxRate: 0.0055 },

  /** Arkansas - Very low costs */
  AR: { labor: 0.80, materials: 0.92, taxRate: 0.0063 },

  // ============================================
  // MIDWEST REGION
  // ============================================

  /** Ohio - Moderate costs, stable markets */
  OH: { labor: 0.92, materials: 0.98, taxRate: 0.0156 },

  /** Michigan - Varied by region */
  MI: { labor: 0.95, materials: 1.00, taxRate: 0.0154 },

  /** Illinois - Higher in Chicago */
  IL: { labor: 1.08, materials: 1.02, taxRate: 0.0227 },

  /** Indiana - Lower costs overall */
  IN: { labor: 0.88, materials: 0.95, taxRate: 0.0085 },

  /** Wisconsin - Moderate costs */
  WI: { labor: 0.98, materials: 1.00, taxRate: 0.0176 },

  /** Minnesota - Higher costs, cold climate */
  MN: { labor: 1.05, materials: 1.02, taxRate: 0.0111 },

  /** Iowa - Lower costs, rural markets */
  IA: { labor: 0.90, materials: 0.95, taxRate: 0.0157 },

  /** Missouri - Low costs overall */
  MO: { labor: 0.88, materials: 0.95, taxRate: 0.0097 },

  /** Kansas - Low costs */
  KS: { labor: 0.85, materials: 0.95, taxRate: 0.0141 },

  /** Nebraska - Moderate costs */
  NE: { labor: 0.90, materials: 0.98, taxRate: 0.0173 },

  /** South Dakota - No income tax */
  SD: { labor: 0.85, materials: 0.98, taxRate: 0.0122 },

  /** North Dakota - Oil industry inflation */
  ND: { labor: 0.92, materials: 1.02, taxRate: 0.0098 },

  // ============================================
  // SOUTHWEST REGION
  // ============================================

  /** Texas - No income tax, moderate costs */
  TX: { labor: 0.95, materials: 0.98, taxRate: 0.0181 },

  /** Arizona - Moderate costs, growing markets */
  AZ: { labor: 0.98, materials: 1.00, taxRate: 0.0066 },

  /** Nevada - No income tax */
  NV: { labor: 1.08, materials: 1.05, taxRate: 0.0055 },

  /** New Mexico - Lower costs */
  NM: { labor: 0.90, materials: 0.98, taxRate: 0.0080 },

  /** Oklahoma - Very low costs */
  OK: { labor: 0.82, materials: 0.92, taxRate: 0.0090 },

  // ============================================
  // WEST REGION
  // ============================================

  /** California - Highest costs overall */
  CA: { labor: 1.35, materials: 1.15, taxRate: 0.0073 },

  /** Washington - High Seattle area */
  WA: { labor: 1.18, materials: 1.08, taxRate: 0.0093 },

  /** Oregon - High Portland area */
  OR: { labor: 1.12, materials: 1.05, taxRate: 0.0097 },

  /** Colorado - Moderate-high, Denver area */
  CO: { labor: 1.08, materials: 1.02, taxRate: 0.0051 },

  /** Utah - Moderate costs */
  UT: { labor: 1.00, materials: 1.00, taxRate: 0.0058 },

  /** Idaho - Growing market, rising costs */
  ID: { labor: 0.95, materials: 1.00, taxRate: 0.0069 },

  /** Montana - Rural premiums */
  MT: { labor: 0.95, materials: 1.05, taxRate: 0.0083 },

  /** Wyoming - No income tax, sparse labor */
  WY: { labor: 0.92, materials: 1.08, taxRate: 0.0061 },

  /** Alaska - Highest logistics costs */
  AK: { labor: 1.40, materials: 1.35, taxRate: 0.0119 },

  /** Hawaii - Island premium */
  HI: { labor: 1.45, materials: 1.40, taxRate: 0.0028 },
};

// ============================================
// Metro-Level Overrides
// ============================================

/**
 * Metro area cost multipliers that override state defaults
 * Used when property is in a major metropolitan area
 *
 * Key format: "StateCode_MetroName" (e.g., "NY_NewYorkCity")
 */
export const METRO_OVERRIDES: Record<string, MetroMultiplier> = {
  // ---- Northeast High-Cost Metros ----
  NY_NewYorkCity: { labor: 1.60, materials: 1.30 },
  NY_Manhattan: { labor: 1.75, materials: 1.40 },
  NY_Brooklyn: { labor: 1.50, materials: 1.25 },
  NY_Buffalo: { labor: 1.00, materials: 1.05 },

  MA_Boston: { labor: 1.40, materials: 1.20 },
  MA_Cambridge: { labor: 1.45, materials: 1.22 },

  CT_Stamford: { labor: 1.35, materials: 1.18 },
  CT_Hartford: { labor: 1.15, materials: 1.08 },

  NJ_Newark: { labor: 1.30, materials: 1.18 },
  NJ_JerseyCity: { labor: 1.40, materials: 1.22 },

  PA_Philadelphia: { labor: 1.15, materials: 1.08 },
  PA_Pittsburgh: { labor: 0.95, materials: 0.98 },
  PA_Allentown: { labor: 1.00, materials: 1.02 },
  PA_Harrisburg: { labor: 0.90, materials: 0.95 },
  PA_Scranton: { labor: 0.85, materials: 0.92 },

  // ---- DC Area ----
  DC_Washington: { labor: 1.45, materials: 1.25 },
  MD_Baltimore: { labor: 1.12, materials: 1.05 },
  MD_Bethesda: { labor: 1.40, materials: 1.20 },
  VA_Arlington: { labor: 1.38, materials: 1.18 },
  VA_Alexandria: { labor: 1.35, materials: 1.15 },

  // ---- Southeast Metros ----
  FL_Miami: { labor: 1.18, materials: 1.10 },
  FL_FortLauderdale: { labor: 1.12, materials: 1.08 },
  FL_Tampa: { labor: 1.02, materials: 1.00 },
  FL_Orlando: { labor: 1.00, materials: 1.00 },
  FL_Jacksonville: { labor: 0.95, materials: 0.98 },
  FL_Naples: { labor: 1.20, materials: 1.12 },

  GA_Atlanta: { labor: 1.05, materials: 1.02 },
  GA_Savannah: { labor: 0.95, materials: 0.98 },

  NC_Charlotte: { labor: 1.00, materials: 1.00 },
  NC_Raleigh: { labor: 0.98, materials: 0.98 },
  NC_Asheville: { labor: 1.05, materials: 1.02 },

  SC_Charleston: { labor: 1.02, materials: 1.00 },

  TN_Nashville: { labor: 1.05, materials: 1.02 },
  TN_Memphis: { labor: 0.88, materials: 0.95 },

  // ---- Midwest Metros ----
  IL_Chicago: { labor: 1.22, materials: 1.10 },
  IL_Naperville: { labor: 1.15, materials: 1.08 },

  OH_Columbus: { labor: 0.98, materials: 1.00 },
  OH_Cleveland: { labor: 0.95, materials: 0.98 },
  OH_Cincinnati: { labor: 0.95, materials: 0.98 },

  MI_Detroit: { labor: 0.98, materials: 1.00 },
  MI_AnnArbor: { labor: 1.10, materials: 1.05 },
  MI_GrandRapids: { labor: 0.92, materials: 0.98 },

  MN_Minneapolis: { labor: 1.12, materials: 1.05 },
  MN_StPaul: { labor: 1.10, materials: 1.05 },

  MO_StLouis: { labor: 0.98, materials: 1.00 },
  MO_KansasCity: { labor: 0.95, materials: 0.98 },

  WI_Milwaukee: { labor: 1.02, materials: 1.00 },
  WI_Madison: { labor: 1.05, materials: 1.02 },

  IN_Indianapolis: { labor: 0.92, materials: 0.98 },

  // ---- Southwest Metros ----
  TX_Austin: { labor: 1.12, materials: 1.05 },
  TX_Dallas: { labor: 1.05, materials: 1.02 },
  TX_Houston: { labor: 1.00, materials: 1.00 },
  TX_SanAntonio: { labor: 0.92, materials: 0.98 },
  TX_FortWorth: { labor: 1.02, materials: 1.00 },

  AZ_Phoenix: { labor: 1.02, materials: 1.02 },
  AZ_Scottsdale: { labor: 1.18, materials: 1.10 },
  AZ_Tucson: { labor: 0.92, materials: 0.98 },

  NV_LasVegas: { labor: 1.10, materials: 1.08 },
  NV_Reno: { labor: 1.15, materials: 1.10 },

  // ---- West Coast Metros ----
  CA_SanFrancisco: { labor: 1.55, materials: 1.25 },
  CA_SanJose: { labor: 1.50, materials: 1.22 },
  CA_LosAngeles: { labor: 1.45, materials: 1.20 },
  CA_SanDiego: { labor: 1.38, materials: 1.15 },
  CA_Oakland: { labor: 1.48, materials: 1.22 },
  CA_Sacramento: { labor: 1.25, materials: 1.10 },
  CA_Irvine: { labor: 1.42, materials: 1.18 },

  WA_Seattle: { labor: 1.35, materials: 1.12 },
  WA_Bellevue: { labor: 1.40, materials: 1.15 },
  WA_Tacoma: { labor: 1.15, materials: 1.05 },

  OR_Portland: { labor: 1.22, materials: 1.08 },
  OR_Bend: { labor: 1.18, materials: 1.10 },

  CO_Denver: { labor: 1.18, materials: 1.08 },
  CO_Boulder: { labor: 1.28, materials: 1.12 },
  CO_ColoradoSprings: { labor: 1.05, materials: 1.02 },

  UT_SaltLakeCity: { labor: 1.08, materials: 1.02 },
  UT_ParkCity: { labor: 1.35, materials: 1.15 },

  ID_Boise: { labor: 1.05, materials: 1.02 },

  AK_Anchorage: { labor: 1.40, materials: 1.35 },

  HI_Honolulu: { labor: 1.50, materials: 1.42 },
};

// ============================================
// Default Cost Estimates
// ============================================

/**
 * Default costs per category when specific data is unavailable
 * Values are in dollars and represent national averages
 */
export const DEFAULT_COSTS = {
  // Acquisition defaults
  acquisition: {
    /** Default recording fees */
    recordingFees: 150,
    /** Default title search cost */
    titleSearch: 350,
    /** Minimum title insurance */
    titleInsuranceMin: 500,
    /** Title insurance rate (per $1000 of value) */
    titleInsuranceRate: 0.005,
    /** Default legal fees */
    legalFees: 750,
    /** Minimum closing costs */
    closingCostMin: 2500,
    /** Closing costs as % of purchase */
    closingCostRate: 0.02,
  },

  // Holding defaults
  holding: {
    /** Monthly utilities for vacant property */
    monthlyUtilities: 150,
    /** Monthly maintenance reserve */
    monthlyMaintenance: 100,
    /** Insurance rate (annual as % of value) */
    annualInsuranceRate: 0.005,
    /** Default holding period (months) */
    defaultHoldingMonths: 6,
  },

  // Selling defaults
  selling: {
    /** Agent commission rate */
    agentCommissionRate: 0.06,
    /** Seller closing cost rate */
    closingCostRate: 0.015,
    /** Default staging cost */
    stagingCost: 2000,
    /** Default marketing cost */
    marketingCost: 1000,
    /** Default home warranty */
    homeWarranty: 500,
  },

  // Contingency
  /** Default contingency percentage */
  contingencyRate: 0.10,
};

/**
 * Rehab costs per square foot by scope level
 * Format: { low, mid, high } representing cost ranges
 *
 * @formula totalRehab = sqft * costPerSqft * laborMultiplier * conditionMultiplier
 */
export const REHAB_COSTS_PER_SQFT: Record<RehabScope, { low: number; mid: number; high: number }> = {
  /** Paint, carpet, fixtures only */
  cosmetic: { low: 12, mid: 18, high: 25 },
  /** Cosmetic + minor repairs */
  light: { low: 22, mid: 30, high: 40 },
  /** Light + kitchen/bath updates */
  moderate: { low: 35, mid: 45, high: 58 },
  /** Moderate + systems updates */
  heavy: { low: 55, mid: 68, high: 85 },
  /** Complete renovation - high end reflects high-cost metro rates */
  gut: { low: 80, mid: 110, high: 150 },
};

/**
 * Condition multipliers for rehab cost adjustment
 * Applied to base rehab cost to account for starting condition
 */
export const CONDITION_MULTIPLIERS: Record<PropertyCondition, number> = {
  excellent: 0.5,   // Minimal work needed
  good: 0.7,        // Minor updates
  fair: 1.0,        // Average expected work
  poor: 1.3,        // Significant deferred maintenance
  distressed: 1.6,  // Major renovation required
};

/**
 * Age multipliers for rehab cost adjustment
 * Older homes typically require more extensive work
 *
 * @param age - Property age in years
 * @returns Multiplier to apply to rehab costs
 */
export function getAgeMultiplier(age: number): number {
  if (age > 80) return 1.5;    // Pre-1946, major systems likely original
  if (age > 60) return 1.35;   // 1946-1966, older systems
  if (age > 40) return 1.2;    // 1967-1986, may need updates
  if (age > 25) return 1.1;    // 1987-2001, approaching update cycle
  if (age > 15) return 1.0;    // 2002-2011, standard condition
  return 0.9;                   // 2012+, newer construction
}

/**
 * Buyer's premium rates by auction platform
 * Applied as percentage of winning bid
 */
export const BUYERS_PREMIUM_RATES: Record<AuctionPlatform, number> = {
  bid4assets: 0.05,        // 5% buyer's premium
  govease: 0.05,           // 5% buyer's premium
  realauction: 0.05,       // 5% buyer's premium
  grant_street: 0.05,      // 5% buyer's premium
  county_direct: 0.03,     // 3% or flat fee varies
  in_person: 0.02,         // 2% or none
  other: 0.05,             // Default 5%
};

/**
 * State transfer tax rates
 * Rate applied to sale price for deed transfer
 * Some states have no transfer tax (rate = 0)
 */
export const TRANSFER_TAX_RATES: Record<string, number> = {
  // States with no transfer tax
  AK: 0, ID: 0, IN: 0, LA: 0, MS: 0, MO: 0, MT: 0, NM: 0, ND: 0, OR: 0, TX: 0, UT: 0, WY: 0,

  // States with transfer tax
  AL: 0.001,    // $0.50 per $500
  AZ: 0.00022,  // $2.20 per $1000
  AR: 0.0033,   // $3.30 per $1000
  CA: 0.0011,   // $1.10 per $1000
  CO: 0.0001,   // $0.01 per $100
  CT: 0.0125,   // 1.25% (varies by price)
  DC: 0.0145,   // 1.45%
  DE: 0.04,     // 4% (2% buyer, 2% seller)
  FL: 0.007,    // $0.70 per $100
  GA: 0.001,    // $1.00 per $1000
  HI: 0.001,    // $0.10 per $100
  IL: 0.001,    // $0.50 per $500
  IA: 0.0016,   // $0.80 per $500
  KS: 0.00026,  // $0.26 per $1000
  KY: 0.001,    // $0.50 per $500
  ME: 0.0044,   // $2.20 per $500
  MD: 0.01,     // 1%
  MA: 0.00456,  // $4.56 per $1000
  MI: 0.0075,   // $7.50 per $1000
  MN: 0.0033,   // $3.30 per $1000
  NE: 0.00225,  // $2.25 per $1000
  NV: 0.0026,   // $2.60 per $1000
  NH: 0.015,    // $7.50 per $1000 (both parties)
  NJ: 0.01,     // 1% (varies)
  NY: 0.004,    // $4.00 per $1000
  NC: 0.002,    // $1.00 per $500
  OH: 0.001,    // $1.00 per $1000
  OK: 0.00075,  // $0.75 per $1000
  PA: 0.02,     // 2% (1% state + 1% local)
  RI: 0.0046,   // $2.30 per $500
  SC: 0.00185,  // $1.85 per $500
  SD: 0.001,    // $0.50 per $500
  TN: 0.0037,   // $0.37 per $100
  VT: 0.0125,   // 1.25%
  VA: 0.0025,   // $0.25 per $100
  WA: 0.0178,   // 1.78%
  WV: 0.00275,  // $2.75 per $1000 (varies)
  WI: 0.003,    // $0.30 per $100
};

// ============================================
// Helper Functions
// ============================================

/**
 * Get regional multiplier for a state, optionally with metro override
 *
 * @param state - Two-letter state code
 * @param metro - Optional metro area name
 * @returns RegionalMultiplier with labor and materials factors
 *
 * @example
 * // State-level multiplier
 * getRegionalMultiplier('PA'); // { labor: 1.00, materials: 1.00, taxRate: 0.0153 }
 *
 * // Metro-level override
 * getRegionalMultiplier('PA', 'Philadelphia'); // { labor: 1.15, materials: 1.08, taxRate: 0.0153 }
 */
export function getRegionalMultiplier(state: string, metro?: string): RegionalMultiplier {
  const stateUpper = state.toUpperCase();
  const stateMultiplier = REGIONAL_MULTIPLIERS[stateUpper];

  // Default multiplier if state not found
  if (!stateMultiplier) {
    return { labor: 1.0, materials: 1.0, taxRate: 0.01 };
  }

  // Check for metro override
  if (metro) {
    // Normalize metro name: remove spaces, special chars
    const normalizedMetro = metro.replace(/[^a-zA-Z]/g, '');
    const metroKey = `${stateUpper}_${normalizedMetro}`;
    const metroMultiplier = METRO_OVERRIDES[metroKey];

    if (metroMultiplier) {
      return {
        labor: metroMultiplier.labor,
        materials: metroMultiplier.materials,
        taxRate: metroMultiplier.taxRate ?? stateMultiplier.taxRate,
      };
    }
  }

  return stateMultiplier;
}

/**
 * Get transfer tax rate for a state
 *
 * @param state - Two-letter state code
 * @returns Transfer tax rate as decimal
 *
 * @example
 * getTransferTaxRate('PA'); // 0.02 (2%)
 * getTransferTaxRate('TX'); // 0 (no transfer tax)
 */
export function getTransferTaxRate(state: string): number {
  const rate = TRANSFER_TAX_RATES[state.toUpperCase()];
  return rate ?? 0.01; // Default 1% if not found
}

/**
 * Get buyer's premium rate for an auction platform
 *
 * @param platform - Auction platform identifier
 * @returns Premium rate as decimal
 *
 * @example
 * getBuyersPremiumRate('bid4assets'); // 0.05 (5%)
 */
export function getBuyersPremiumRate(platform: AuctionPlatform): number {
  return BUYERS_PREMIUM_RATES[platform] ?? 0.05;
}

/**
 * Get rehab cost per sqft for a given scope
 *
 * @param scope - Rehab scope level
 * @param estimate - Which estimate to use ('low', 'mid', 'high')
 * @returns Cost per square foot in dollars
 *
 * @example
 * getRehabCostPerSqft('moderate', 'mid'); // 45
 */
export function getRehabCostPerSqft(
  scope: RehabScope,
  estimate: 'low' | 'mid' | 'high' = 'mid'
): number {
  return REHAB_COSTS_PER_SQFT[scope][estimate];
}

/**
 * Get condition multiplier for property condition
 *
 * @param condition - Property condition assessment
 * @returns Multiplier to apply to rehab costs
 *
 * @example
 * getConditionMultiplier('poor'); // 1.3
 */
export function getConditionMultiplier(condition: PropertyCondition): number {
  return CONDITION_MULTIPLIERS[condition] ?? 1.0;
}

/**
 * Validate that a state code exists in our data
 *
 * @param state - Two-letter state code
 * @returns True if state is valid
 */
export function isValidState(state: string): boolean {
  return state.toUpperCase() in REGIONAL_MULTIPLIERS;
}

/**
 * Get list of all supported state codes
 *
 * @returns Array of two-letter state codes
 */
export function getSupportedStates(): string[] {
  return Object.keys(REGIONAL_MULTIPLIERS);
}

/**
 * Holding Costs Calculator - Financial Analysis Module
 *
 * This module provides detailed holding cost estimation for tax deed property
 * investments. It calculates monthly and total holding costs including taxes,
 * insurance, utilities, maintenance, financing, and property-specific expenses.
 *
 * @module lib/analysis/financial/holdingCosts
 * @author Claude Code Agent
 * @date 2026-01-16
 */

import type {
  HoldingBreakdown,
  FinancingParams,
  RegionalMultiplier,
} from '@/types/costs';

// ============================================
// Type Definitions
// ============================================

/**
 * Input parameters for holding cost calculation
 */
export interface HoldingCostInputs {
  /** Property value for insurance/tax calculations */
  propertyValue: number;
  /** Assessed value (if different from property value) */
  assessedValue?: number;
  /** Two-letter state code */
  state: string;
  /** County name for regional adjustments */
  county?: string;
  /** Annual property taxes (if known) */
  annualTaxes?: number;
  /** Property square footage */
  sqft?: number;
  /** Year property was built */
  yearBuilt?: number;
  /** Whether property is vacant */
  isVacant?: boolean;
  /** Whether property has pool */
  hasPool?: boolean;
  /** Monthly HOA dues */
  monthlyHoa?: number;
  /** Financing parameters */
  financing?: FinancingParams;
  /** Estimated holding period in months */
  holdingMonths: number;
  /** Property type (SFR, condo, multi-family, etc.) */
  propertyType?: string;
  /** Whether property will have active rehab during holding */
  activeRehab?: boolean;
}

/**
 * Detailed holding cost breakdown
 */
export interface HoldingCostBreakdown {
  /** Property taxes (monthly) */
  monthlyPropertyTax: number;
  /** Property insurance (monthly) */
  monthlyInsurance: number;
  /** Utility costs (monthly) */
  monthlyUtilities: number;
  /** Maintenance costs (monthly) */
  monthlyMaintenance: number;
  /** Loan payment (monthly, if financed) */
  monthlyLoanPayment: number;
  /** HOA fees (monthly) */
  monthlyHoa: number;
  /** Security/monitoring (monthly) */
  monthlySecurity: number;
  /** Lawn care/landscaping (monthly) */
  monthlyLawnCare: number;
  /** Pool maintenance (monthly, if applicable) */
  monthlyPoolMaintenance: number;
  /** Pest control (monthly) */
  monthlyPestControl: number;
  /** Total monthly holding cost */
  totalMonthly: number;
  /** Total holding cost for entire period */
  totalHolding: number;
  /** Holding period in months */
  holdingPeriodMonths: number;
  /** Breakdown by category */
  categoryBreakdown: {
    taxes: number;
    insurance: number;
    utilities: number;
    maintenance: number;
    financing: number;
    other: number;
  };
}

/**
 * Insurance cost estimate result
 */
export interface InsuranceCostEstimate {
  /** Monthly premium */
  monthlyPremium: number;
  /** Annual premium */
  annualPremium: number;
  /** Insurance type (standard, vacant, builder's risk) */
  insuranceType: 'standard' | 'vacant' | 'builders_risk';
  /** Estimated coverage amount */
  coverageAmount: number;
  /** Deductible amount */
  deductible: number;
}

/**
 * Utility cost estimate result
 */
export interface UtilityCostEstimate {
  /** Electric (monthly) */
  electric: number;
  /** Gas (monthly) */
  gas: number;
  /** Water/sewer (monthly) */
  waterSewer: number;
  /** Trash (monthly) */
  trash: number;
  /** Total monthly utilities */
  totalMonthly: number;
  /** Seasonal adjustment factor applied */
  seasonalFactor: number;
}

// ============================================
// Constants
// ============================================

/**
 * State property tax rates (effective rate as decimal)
 *
 * Data Sources:
 * - Tax Foundation Annual Report (2024)
 * - National Association of Realtors (NAR) state averages
 * - Lincoln Institute of Land Policy database
 *
 * Notes:
 * - These are statewide median effective rates on assessed value
 * - Actual rates vary significantly by county/municipality (e.g., TX can range 0.8%-3.5%)
 * - Some states have homestead exemptions that reduce taxable value
 * - Assessment ratios vary: 100% market value (CA, FL) vs 80% (some states)
 * - Highest: NJ (2.49%), CT (2.21%), IL (2.27%)
 * - Lowest: HI (0.28%), AL (0.41%), CO (0.51%)
 */
const STATE_TAX_RATES: Record<string, number> = {
  AL: 0.0041, AK: 0.0119, AZ: 0.0066, AR: 0.0062, CA: 0.0076,
  CO: 0.0051, CT: 0.0221, DE: 0.0056, FL: 0.0089, GA: 0.0092,
  HI: 0.0028, ID: 0.0069, IL: 0.0227, IN: 0.0085, IA: 0.0157,
  KS: 0.0141, KY: 0.0086, LA: 0.0055, ME: 0.0136, MD: 0.0109,
  MA: 0.0123, MI: 0.0154, MN: 0.0112, MS: 0.0081, MO: 0.0097,
  MT: 0.0083, NE: 0.0173, NV: 0.0060, NH: 0.0218, NJ: 0.0249,
  NM: 0.0080, NY: 0.0172, NC: 0.0084, ND: 0.0098, OH: 0.0157,
  OK: 0.0090, OR: 0.0097, PA: 0.0153, RI: 0.0163, SC: 0.0057,
  SD: 0.0131, TN: 0.0071, TX: 0.0180, UT: 0.0063, VT: 0.0190,
  VA: 0.0082, WA: 0.0098, WV: 0.0058, WI: 0.0185, WY: 0.0061,
  DC: 0.0056,
};

/**
 * Insurance rate per $1,000 of coverage by state
 *
 * Data Sources:
 * - Insurance Information Institute (III) state averages
 * - National Association of Insurance Commissioners (NAIC)
 * - ValuePenguin insurance cost studies (2024)
 *
 * Notes:
 * - Rates represent cost per $1,000 of dwelling coverage for homeowner's insurance
 * - Coastal/disaster-prone states have significantly higher rates:
 *   * Hurricane zones: FL ($6.20), LA ($5.80), TX ($5.20)
 *   * Tornado alley: OK ($5.60), MS ($5.40), KS ($4.80)
 * - Lowest rates in mild-weather states: WA ($2.60), OR ($2.60), WI ($2.60)
 * - Example: $200K coverage in FL = ($200K / $1,000) × $6.20 = $1,240/year
 * - These are base rates before vacant/builder's risk multipliers
 */
const STATE_INSURANCE_RATES: Record<string, number> = {
  AL: 4.80, AK: 3.20, AZ: 3.40, AR: 4.60, CA: 3.80,
  CO: 4.20, CT: 3.40, DE: 3.00, FL: 6.20, GA: 4.40,
  HI: 2.80, ID: 3.00, IL: 3.20, IN: 3.00, IA: 3.40,
  KS: 4.80, KY: 3.40, LA: 5.80, ME: 2.80, MD: 2.80,
  MA: 3.00, MI: 2.80, MN: 3.00, MS: 5.40, MO: 3.80,
  MT: 3.40, NE: 4.20, NV: 2.80, NH: 2.80, NJ: 3.00,
  NM: 3.60, NY: 3.20, NC: 4.20, ND: 3.60, OH: 2.80,
  OK: 5.60, OR: 2.60, PA: 2.80, RI: 3.40, SC: 4.20,
  SD: 3.80, TN: 4.00, TX: 5.20, UT: 2.80, VT: 2.80,
  VA: 3.00, WA: 2.60, WV: 2.80, WI: 2.60, WY: 3.00,
  DC: 2.60,
};

/**
 * Utility cost factors by state (relative to national average = 1.0)
 *
 * Data Sources:
 * - U.S. Energy Information Administration (EIA) state electricity rates
 * - American Gas Association (AGA) state natural gas rates
 * - Department of Energy residential energy consumption data
 *
 * Notes:
 * - Factors account for both energy rates and climate-driven usage
 * - Highest costs: HI (1.75 - island isolation), AK (1.45 - extreme cold)
 * - High costs: CA (1.25), CT (1.35), MA (1.30) - high energy rates
 * - Lowest costs: ID (0.85), UT (0.85), WA (0.85) - hydroelectric power
 * - Climate impacts:
 *   * Hot states (AZ, TX): Higher AC usage but moderate rates
 *   * Cold states (AK, ME): Higher heating costs
 *   * Mild states (WA, OR): Lower overall usage
 * - Example: $150 base × 1.75 (HI) = $262.50/month in Hawaii
 */
const STATE_UTILITY_FACTORS: Record<string, number> = {
  AL: 1.05, AK: 1.45, AZ: 1.08, AR: 0.95, CA: 1.25,
  CO: 0.95, CT: 1.35, DE: 1.10, FL: 1.05, GA: 1.00,
  HI: 1.75, ID: 0.85, IL: 1.00, IN: 0.95, IA: 0.95,
  KS: 1.00, KY: 0.90, LA: 0.95, ME: 1.20, MD: 1.15,
  MA: 1.30, MI: 1.00, MN: 1.00, MS: 1.00, MO: 0.95,
  MT: 0.90, NE: 0.95, NV: 1.00, NH: 1.25, NJ: 1.20,
  NM: 0.90, NY: 1.20, NC: 1.00, ND: 1.00, OH: 0.95,
  OK: 0.95, OR: 0.90, PA: 1.05, RI: 1.30, SC: 1.05,
  SD: 0.95, TN: 0.90, TX: 1.00, UT: 0.85, VT: 1.20,
  VA: 1.05, WA: 0.85, WV: 0.90, WI: 1.00, WY: 0.90,
  DC: 1.20,
};

/** Base monthly utility cost for a 1,500 sqft vacant property */
const BASE_MONTHLY_UTILITIES = 150;

/** Base monthly maintenance cost for a 1,500 sqft property */
const BASE_MONTHLY_MAINTENANCE = 100;

/** Vacant property insurance multiplier (higher risk) */
const VACANT_INSURANCE_MULTIPLIER = 1.5;

/** Builder's risk insurance multiplier (during active rehab) */
const BUILDERS_RISK_MULTIPLIER = 1.75;

/** Age factor for maintenance (properties > 30 years old) */
const AGED_PROPERTY_MAINTENANCE_FACTOR = 1.3;

/** Monthly lawn care base cost */
const BASE_LAWN_CARE = 75;

/** Monthly pool maintenance cost */
const MONTHLY_POOL_MAINTENANCE = 150;

/** Monthly pest control cost */
const MONTHLY_PEST_CONTROL = 40;

/** Monthly security monitoring cost */
const MONTHLY_SECURITY = 50;

// ============================================
// Property Tax Functions
// ============================================

/**
 * Calculate monthly property tax
 *
 * @param inputs Holding cost inputs
 * @returns Monthly property tax amount
 */
export function calculateMonthlyPropertyTax(inputs: HoldingCostInputs): number {
  /**
   * PROPERTY TAX CALCULATION PRIORITY
   *
   * Priority 1: Use actual annual taxes if known (most accurate)
   * - Tax deed auctions often provide exact tax amounts in property lists
   * - Avoids estimation errors from assessment ratio differences
   * - Simply divide by 12 for monthly cost
   */
  if (inputs.annualTaxes && inputs.annualTaxes > 0) {
    return inputs.annualTaxes / 12;
  }

  /**
   * PROPERTY TAX ESTIMATION (when actual taxes unknown)
   *
   * Formula: Tax = Taxable Value × Tax Rate
   *
   * TAXABLE VALUE DETERMINATION:
   * - Use assessedValue if provided (official county assessment)
   * - Otherwise use propertyValue as-is (market value)
   *
   * Important context:
   * - Some states tax at 100% of assessed value (FL, CA)
   * - Others use assessment ratios (e.g., 80% in some jurisdictions)
   * - Tax deed properties may have outdated assessments
   * - After purchase, property will be reassessed at sale price
   *
   * Example scenarios:
   * 1. Property with known assessment: Use assessedValue directly
   *    - Assessed: $180K, Rate: 1.5% → Tax = $2,700/year
   *
   * 2. Property without assessment: Estimate from market value
   *    - Market: $200K, Rate: 1.5% → Tax = $3,000/year
   *    - May overestimate if assessment ratio < 100%
   */
  const taxableValue = inputs.assessedValue || inputs.propertyValue;

  /**
   * TAX RATE SELECTION
   *
   * Use state-specific rate from STATE_TAX_RATES lookup
   * - Falls back to 1.2% (0.012) if state not found
   * - 1.2% is approximate U.S. median effective rate
   *
   * Note: Actual rates vary widely within states by county/city
   * - Always verify with county tax assessor for accuracy
   * - These are planning estimates, not final calculations
   */
  const taxRate = STATE_TAX_RATES[inputs.state] || 0.012; // Default to 1.2% national median

  /**
   * MONTHLY TAX CALCULATION
   *
   * Convert annual tax to monthly holding cost:
   * - Annual Tax = Taxable Value × Tax Rate
   * - Monthly Tax = Annual Tax / 12
   *
   * Example: $200K property in TX (1.8% rate)
   * - Annual: $200,000 × 0.018 = $3,600
   * - Monthly: $3,600 / 12 = $300
   */
  const annualTax = taxableValue * taxRate;
  return annualTax / 12;
}

/**
 * Estimate annual property taxes
 *
 * @param propertyValue Property value
 * @param state Two-letter state code
 * @param assessedValue Optional assessed value (often 80-100% of market)
 * @returns Estimated annual property tax
 */
export function estimateAnnualPropertyTax(
  propertyValue: number,
  state: string,
  assessedValue?: number
): number {
  /**
   * ASSESSMENT RATIO ASSUMPTION
   *
   * When assessed value is unknown, apply 90% ratio to market value:
   * - Taxable Value = Market Value × 0.9
   *
   * Rationale:
   * - Many jurisdictions assess at 80-100% of market value
   * - 90% is a conservative middle ground for estimation
   * - Prevents overestimation of tax burden
   * - Common practice in tax deed investment analysis
   *
   * State assessment ratio examples:
   * - California: 100% of purchase price (Prop 13)
   * - Texas: 100% of appraised value
   * - Pennsylvania: Often 80-90% of market
   * - Some states: Varies by county
   *
   * Important: After tax deed purchase, property will be reassessed
   * - Assessment will be at or near purchase price
   * - May significantly increase taxes if bought below market
   * - Factor this into hold period cost projections
   *
   * Example: $200K market value
   * - Estimated assessed value: $200K × 0.9 = $180K
   * - If state rate is 1.5%: $180K × 0.015 = $2,700/year
   */
  const taxableValue = assessedValue || propertyValue * 0.9;
  const taxRate = STATE_TAX_RATES[state] || 0.012;
  return taxableValue * taxRate;
}

// ============================================
// Insurance Functions
// ============================================

/**
 * Calculate insurance cost estimate
 *
 * @param inputs Holding cost inputs
 * @returns Insurance cost estimate with details
 */
export function calculateInsuranceCost(
  inputs: HoldingCostInputs
): InsuranceCostEstimate {
  // Get state-specific base rate ($ per $1,000 coverage)
  const baseRate = STATE_INSURANCE_RATES[inputs.state] || 3.5;

  /**
   * INSURANCE TYPE SELECTION LOGIC
   *
   * Priority order (first match wins):
   * 1. Builder's Risk: Active construction/rehab (multiplier: 1.75x)
   *    - Covers construction risks, theft of materials, work in progress
   *    - Required when property is actively being renovated
   *    - Most expensive due to elevated risk during construction
   *
   * 2. Vacant Property: Unoccupied but not under construction (multiplier: 1.5x)
   *    - Higher risk: vandalism, theft, undetected damage (pipes freezing)
   *    - No one monitoring the property daily
   *    - Some insurers require inspection every 30-60 days
   *
   * 3. Standard Homeowner's: Occupied or ready-to-occupy (multiplier: 1.0x)
   *    - Lowest cost baseline insurance
   *    - Assumes property is maintained and monitored
   */
  let insuranceType: 'standard' | 'vacant' | 'builders_risk' = 'standard';
  let multiplier = 1.0;

  if (inputs.activeRehab) {
    insuranceType = 'builders_risk';
    multiplier = BUILDERS_RISK_MULTIPLIER; // 1.75x - Construction risk premium
  } else if (inputs.isVacant) {
    insuranceType = 'vacant';
    multiplier = VACANT_INSURANCE_MULTIPLIER; // 1.5x - Vacancy risk premium
  }

  /**
   * COVERAGE AMOUNT CALCULATION
   *
   * Using 80% of property value for dwelling coverage:
   * - Most lenders require minimum 80% coverage to avoid co-insurance penalty
   * - Land value (~20%) is not insured (only structures)
   * - For tax deed properties, market value often includes land at ~20-25%
   *
   * Example: $250K property → $200K coverage (excludes ~$50K land value)
   */
  const coverageAmount = inputs.propertyValue * 0.8;

  /**
   * AGE-BASED INSURANCE ADJUSTMENT
   *
   * Older properties cost more to insure due to:
   * - Outdated electrical/plumbing (fire/water damage risk)
   * - Roof age (claims more likely)
   * - Building code changes (replacement cost higher)
   * - Higher likelihood of claims
   *
   * Age tiers based on insurance industry standards:
   * - 0-30 years: 1.0x (modern construction, low risk)
   * - 31-50 years: 1.15x (+15% for aging systems)
   * - 50+ years: 1.25x (+25% for dated infrastructure)
   *
   * Assumption: If yearBuilt unknown, assume 30 years (neutral factor)
   */
  const currentYear = new Date().getFullYear();
  const propertyAge = inputs.yearBuilt ? currentYear - inputs.yearBuilt : 30;
  const ageFactor = propertyAge > 50 ? 1.25 : propertyAge > 30 ? 1.15 : 1.0;

  /**
   * ANNUAL PREMIUM FORMULA
   *
   * Formula: Premium = (Coverage / 1000) × BaseRate × TypeMultiplier × AgeFactor
   *
   * Example calculation for FL vacant property built 1960:
   * - Coverage: $200,000
   * - Base rate: $6.20 per $1,000 (FL state rate)
   * - Type multiplier: 1.5x (vacant)
   * - Age factor: 1.25x (64 years old)
   * - Annual: (200,000 / 1000) × 6.20 × 1.5 × 1.25 = $2,325/year
   * - Monthly: $2,325 / 12 = $193.75/month
   */
  const annualPremium =
    (coverageAmount / 1000) * baseRate * multiplier * ageFactor;
  const monthlyPremium = annualPremium / 12;

  /**
   * DEDUCTIBLE CALCULATION
   *
   * Standard deductible: Greater of $1,000 or 1% of coverage
   * - Minimum $1,000 (industry standard)
   * - Or 1% of dwelling coverage (common for higher-value properties)
   * - Example: $200K coverage → $2,000 deductible (1%)
   * - Example: $80K coverage → $1,000 deductible (minimum)
   */
  const deductible = Math.max(1000, coverageAmount * 0.01);

  return {
    monthlyPremium,
    annualPremium,
    insuranceType,
    coverageAmount,
    deductible,
  };
}

/**
 * Calculate monthly insurance premium
 *
 * @param inputs Holding cost inputs
 * @returns Monthly insurance cost
 */
export function calculateMonthlyInsurance(inputs: HoldingCostInputs): number {
  const estimate = calculateInsuranceCost(inputs);
  return estimate.monthlyPremium;
}

// ============================================
// Utility Functions
// ============================================

/**
 * Calculate utility cost estimate
 *
 * @param inputs Holding cost inputs
 * @returns Detailed utility cost estimate
 */
export function calculateUtilityCost(
  inputs: HoldingCostInputs
): UtilityCostEstimate {
  /**
   * STATE-SPECIFIC UTILITY ADJUSTMENT
   *
   * Accounts for variations in energy costs and climate across states
   * - Factor of 1.0 = national average ($150/month baseline)
   * - Example: HI (1.75) = 75% higher than average
   * - Example: WA (0.85) = 15% lower than average
   */
  const stateFactor = STATE_UTILITY_FACTORS[inputs.state] || 1.0;

  /**
   * SQUARE FOOTAGE ADJUSTMENT
   *
   * Baseline: 1,500 sqft property = 1.0x factor
   * - Linear scaling: 3,000 sqft = 2.0x, 750 sqft = 0.5x
   * - Accounts for more space to heat/cool, more outlets, more water usage
   * - Assumes standard insulation and efficiency
   *
   * Example: 2,500 sqft property = 2500/1500 = 1.67x factor
   */
  const sqftFactor = inputs.sqft ? inputs.sqft / 1500 : 1.0;

  /**
   * VACANCY ADJUSTMENT
   *
   * Vacant properties use 40% of normal utilities:
   * - Thermostat set to 55°F (winter) / 85°F (summer) to prevent damage
   * - Minimal electricity: no appliances running, lights off
   * - Water: only basic service to prevent pipe issues
   * - Gas: minimal heating, no cooking/hot water usage
   *
   * Critical: Must maintain minimal utilities to:
   * - Prevent frozen pipes in winter (insurance requirement)
   * - Prevent mold/mildew in summer (property preservation)
   * - Maintain insurability and pass periodic inspections
   */
  const vacantFactor = inputs.isVacant ? 0.4 : 1.0;

  /**
   * SEASONAL ADJUSTMENT FACTORS
   *
   * Based on typical U.S. residential energy usage patterns:
   *
   * SUMMER (June-Sept, months 5-8): 1.2x factor
   * - Air conditioning dominates (especially in hot states)
   * - Peak usage in July/August
   * - Can spike to 1.5x in extreme heat states (AZ, TX, FL)
   *
   * WINTER (Dec-March, months 11, 0-2): 1.3x factor
   * - Heating costs (gas + electric)
   * - Shorter days = more lighting
   * - Holiday season usage
   * - Highest factor due to heating being most expensive
   *
   * SPRING/FALL (April-May, Oct-Nov): 1.0x baseline
   * - Mild weather = minimal HVAC usage
   * - Natural light = reduced lighting costs
   * - Optimal seasons for minimal utility costs
   *
   * Note: getMonth() returns 0-11 (0=Jan, 11=Dec)
   */
  const month = new Date().getMonth();
  const seasonalFactor =
    month >= 5 && month <= 8
      ? 1.2 // Summer (Jun-Sep): AC season
      : month >= 11 || month <= 2
        ? 1.3 // Winter (Dec-Mar): Heating season
        : 1.0; // Spring/Fall (Apr-May, Oct-Nov): Mild weather

  /**
   * BASE UTILITY CALCULATION
   *
   * Formula: Base × State × Size × Vacancy
   * - Starts with $150 national baseline for 1,500 sqft vacant property
   * - Adjusts for state costs, property size, and occupancy
   *
   * Example: 2,000 sqft vacant property in CA
   * - $150 × 1.25 (CA) × 1.33 (2000/1500) × 0.4 (vacant) = $99.75 base
   */
  const baseUtility = BASE_MONTHLY_UTILITIES * stateFactor * sqftFactor * vacantFactor;

  /**
   * UTILITY BREAKDOWN BY TYPE
   *
   * Typical residential utility split (national averages):
   * - Electric: 50% (HVAC, appliances, lighting)
   * - Gas: 25% (heating, water heater, cooking)
   * - Water/Sewer: 20% (water usage, sewer fees)
   * - Trash: 5% (waste collection)
   *
   * Seasonal impacts:
   * - Electric: Varies with AC/heating (apply seasonalFactor)
   * - Gas: Varies with heating only (apply seasonalFactor only if > 1.0)
   * - Water/Sewer: Constant (no seasonal variation)
   * - Trash: Constant (fixed service fee)
   */
  const electric = baseUtility * 0.50 * seasonalFactor;
  const gas = baseUtility * 0.25 * (seasonalFactor > 1 ? seasonalFactor : 1.0);
  const waterSewer = baseUtility * 0.20; // No seasonal adjustment
  const trash = baseUtility * 0.05; // Fixed fee

  const totalMonthly = electric + gas + waterSewer + trash;

  return {
    electric,
    gas,
    waterSewer,
    trash,
    totalMonthly,
    seasonalFactor,
  };
}

/**
 * Calculate monthly utilities
 *
 * @param inputs Holding cost inputs
 * @returns Monthly utility cost
 */
export function calculateMonthlyUtilities(inputs: HoldingCostInputs): number {
  const estimate = calculateUtilityCost(inputs);
  return estimate.totalMonthly;
}

// ============================================
// Maintenance Functions
// ============================================

/**
 * Calculate monthly maintenance costs
 *
 * @param inputs Holding cost inputs
 * @returns Monthly maintenance cost
 */
export function calculateMonthlyMaintenance(inputs: HoldingCostInputs): number {
  /**
   * SQUARE FOOTAGE ADJUSTMENT
   *
   * Baseline: 1,500 sqft = $100/month maintenance
   * - Scales linearly with property size
   * - More sqft = more roof, HVAC capacity, plumbing, etc.
   * - Example: 3,000 sqft = 2.0x = $200/month base
   */
  const sqftFactor = inputs.sqft ? inputs.sqft / 1500 : 1.0;

  /**
   * AGE-BASED MAINTENANCE MULTIPLIER
   *
   * Properties age > 30 years require significantly more maintenance:
   * - Multiplier: 1.3x (AGED_PROPERTY_MAINTENANCE_FACTOR)
   *
   * Rationale:
   * - Original systems reaching end of useful life (25-30 year lifespan):
   *   * HVAC systems: 15-20 years
   *   * Water heaters: 10-15 years
   *   * Roofing: 20-30 years
   *   * Plumbing fixtures: 20-30 years
   * - Building materials degrading (siding, windows, foundation settling)
   * - Deferred maintenance compounds over time
   * - More frequent repairs vs. newer properties
   *
   * Threshold at 30 years based on:
   * - IRS residential property depreciation schedule (27.5 years)
   * - Typical major system replacement cycles
   * - Industry maintenance cost studies
   *
   * Example: 45-year-old property = 1.3x maintenance vs. 20-year-old
   *
   * Assumption: If yearBuilt unknown, assume 30 years (neutral, no multiplier)
   */
  const currentYear = new Date().getFullYear();
  const propertyAge = inputs.yearBuilt ? currentYear - inputs.yearBuilt : 30;
  const ageFactor = propertyAge > 30 ? AGED_PROPERTY_MAINTENANCE_FACTOR : 1.0;

  /**
   * PROPERTY TYPE ADJUSTMENTS
   *
   * Different property types have varying maintenance requirements:
   *
   * MULTI-FAMILY (1.3x):
   * - Multiple units = multiple kitchens, bathrooms, HVAC systems
   * - Common areas require maintenance (hallways, laundry, parking)
   * - Tenant turnover causes wear and tear
   * - More plumbing/electrical systems to maintain
   *
   * CONDO (0.5x):
   * - HOA covers exterior maintenance (roof, siding, landscaping)
   * - HOA handles common area upkeep
   * - Owner only maintains interior space
   * - Significantly reduced maintenance burden vs. SFR
   *
   * SINGLE-FAMILY / DEFAULT (1.0x):
   * - Owner responsible for all maintenance
   * - Baseline maintenance factor
   * - Includes interior, exterior, systems, grounds
   */
  let typeFactor = 1.0;
  if (inputs.propertyType === 'multi-family') {
    typeFactor = 1.3; // More units = more maintenance
  } else if (inputs.propertyType === 'condo') {
    typeFactor = 0.5; // HOA covers exterior maintenance
  }

  /**
   * FINAL MAINTENANCE COST FORMULA
   *
   * Formula: BaseRate × Size × Age × PropertyType
   *
   * Example: 2,200 sqft multi-family built 1985 (39 years old)
   * - Base: $100/month (1,500 sqft baseline)
   * - Size: 2200/1500 = 1.47x
   * - Age: 1.3x (> 30 years)
   * - Type: 1.3x (multi-family)
   * - Total: $100 × 1.47 × 1.3 × 1.3 = $249/month
   */
  return BASE_MONTHLY_MAINTENANCE * sqftFactor * ageFactor * typeFactor;
}

/**
 * Calculate monthly lawn care cost
 *
 * @param inputs Holding cost inputs
 * @returns Monthly lawn care cost
 */
export function calculateMonthlyLawnCare(inputs: HoldingCostInputs): number {
  // Condos typically don't need lawn care
  if (inputs.propertyType === 'condo') {
    return 0;
  }

  // Adjust for lot size (assume larger sqft = larger lot)
  const sizeFactor = inputs.sqft ? Math.max(0.5, Math.min(2.0, inputs.sqft / 1500)) : 1.0;

  return BASE_LAWN_CARE * sizeFactor;
}

// ============================================
// Financing Functions
// ============================================

/**
 * Calculate monthly loan payment
 *
 * @param financing Financing parameters
 * @returns Monthly payment amount
 */
export function calculateMonthlyLoanPayment(
  financing?: FinancingParams
): number {
  // No financing or loan amount = no payment
  if (!financing || !financing.isFinanced || financing.loanAmount <= 0) {
    return 0;
  }

  /**
   * INTEREST RATE CONVERSION
   *
   * Convert annual interest rate to monthly rate:
   * - Input: Annual rate as decimal (e.g., 0.08 = 8% APR)
   * - Monthly rate: r = APR / 12
   *
   * Example: 8% annual = 0.08 / 12 = 0.00667 monthly (0.667%)
   */
  const monthlyRate = financing.interestRate / 12;
  const termMonths = financing.termMonths;

  /**
   * INTEREST-ONLY LOAN PAYMENT
   *
   * Formula: Payment = Principal × Monthly Rate
   *
   * Used for:
   * - Bridge loans (short-term financing)
   * - Fix-and-flip scenarios
   * - Properties held < 12 months
   *
   * Characteristics:
   * - Lower monthly payment (no principal reduction)
   * - Balloon payment due at end (full principal)
   * - Simple calculation, no amortization
   *
   * Example: $200K loan at 10% annual (0.00833 monthly)
   * - Payment = $200,000 × 0.00833 = $1,666.67/month
   * - After 6 months: Still owe $200,000 (no principal paid)
   */
  if (financing.interestOnly) {
    return financing.loanAmount * monthlyRate;
  }

  /**
   * ZERO INTEREST RATE EDGE CASE
   *
   * If no interest charged (0% financing):
   * - Payment = Principal / Number of Months
   * - Simple division, no compound interest calculation
   *
   * Example: $60K loan for 12 months at 0%
   * - Payment = $60,000 / 12 = $5,000/month
   */
  if (monthlyRate === 0) {
    return financing.loanAmount / termMonths;
  }

  /**
   * STANDARD AMORTIZING LOAN PAYMENT (PMT Formula)
   *
   * Formula: PMT = P × [r(1+r)^n] / [(1+r)^n - 1]
   *
   * Where:
   * - P = Principal (loan amount)
   * - r = Monthly interest rate (annual rate / 12)
   * - n = Total number of payments (term in months)
   * - PMT = Fixed monthly payment
   *
   * Mathematical breakdown:
   * 1. Compound factor: (1+r)^n
   *    - Represents total growth of $1 over n months at rate r
   *    - Example: (1.00667)^360 = 10.9357 for 8% over 30 years
   *
   * 2. Numerator: P × r × (1+r)^n
   *    - Future value of interest if all paid at end
   *
   * 3. Denominator: (1+r)^n - 1
   *    - Adjusts for present value of payments over time
   *
   * 4. Result: Fixed payment that fully amortizes loan
   *    - Early payments mostly interest
   *    - Later payments mostly principal
   *    - Loan balance reaches $0 at end of term
   *
   * Example calculation: $200K loan, 8% APR, 30 years (360 months)
   * - P = $200,000
   * - r = 0.08 / 12 = 0.00667
   * - n = 360
   * - (1+r)^n = (1.00667)^360 = 10.9357
   * - Numerator = 200,000 × 0.00667 × 10.9357 = 14,583.33
   * - Denominator = 10.9357 - 1 = 9.9357
   * - PMT = 14,583.33 / 9.9357 = $1,467.53/month
   *
   * Amortization over time:
   * - Month 1: Interest = $1,333.33, Principal = $134.20
   * - Month 180: Interest = $933.33, Principal = $534.20
   * - Month 360: Interest = $9.78, Principal = $1,457.75
   *
   * This is the standard formula used by banks, Excel PMT(), and mortgage calculators.
   */
  const compoundFactor = Math.pow(1 + monthlyRate, termMonths);
  const payment =
    (financing.loanAmount * monthlyRate * compoundFactor) / (compoundFactor - 1);

  return payment;
}

/**
 * Calculate interest portion of a loan payment for a specific month
 *
 * @param financing Financing parameters
 * @param monthNumber Month number (1-based)
 * @returns Interest portion of payment
 */
export function calculateInterestPortion(
  financing: FinancingParams,
  monthNumber: number
): number {
  if (!financing.isFinanced || financing.loanAmount <= 0) {
    return 0;
  }

  const monthlyRate = financing.interestRate / 12;
  const payment = calculateMonthlyLoanPayment(financing);

  /**
   * LOAN AMORTIZATION CALCULATION
   *
   * Purpose: Calculate the interest portion of payment for a specific month
   *
   * Key Concept: Interest is calculated on the remaining balance
   * - Each payment = Interest + Principal
   * - Interest this month = Remaining Balance × Monthly Rate
   * - Principal this month = Payment - Interest
   * - New Balance = Old Balance - Principal
   *
   * Why this matters for ROI calculations:
   * - Interest is a deductible expense (reduces taxable income)
   * - Principal payments are not deductible
   * - Need to track separately for tax purposes
   * - Helps calculate true cost of financing during hold period
   *
   * Algorithm: Iterative amortization
   * 1. Start with original loan amount
   * 2. For each month before target month:
   *    a. Calculate interest on current balance
   *    b. Calculate principal paid (payment - interest)
   *    c. Reduce balance by principal
   * 3. Return interest for target month
   *
   * Example: $200K loan at 8% APR, find interest in month 6
   * - Month 1: Balance $200,000 → Interest $1,333.33
   * - Month 2: Balance $199,865.80 → Interest $1,332.44
   * - Month 3: Balance $199,730.70 → Interest $1,331.54
   * - ... (iterate through each month)
   * - Month 6: Balance $199,325.50 → Interest $1,328.84
   *
   * Note: This is computationally expensive for large month numbers
   * For production optimization, could use closed-form formula:
   * Interest_n = P × r × [(1+r)^n - (1+r)^(month-1)] / [(1+r)^n - 1]
   */
  let balance = financing.loanAmount;
  for (let i = 1; i < monthNumber; i++) {
    // Interest this month = current balance × monthly rate
    const interest = balance * monthlyRate;

    // Principal paid this month = total payment - interest
    const principal = payment - interest;

    // Reduce balance by principal payment
    balance -= principal;
  }

  // Return interest portion for the target month
  return balance * monthlyRate;
}

// ============================================
// Complete Holding Cost Calculation
// ============================================

/**
 * Calculate complete holding cost breakdown
 *
 * @param inputs Holding cost inputs
 * @returns Complete holding cost breakdown
 */
export function calculateHoldingCosts(
  inputs: HoldingCostInputs
): HoldingCostBreakdown {
  // Calculate individual components
  const monthlyPropertyTax = calculateMonthlyPropertyTax(inputs);
  const monthlyInsurance = calculateMonthlyInsurance(inputs);
  const monthlyUtilities = calculateMonthlyUtilities(inputs);
  const monthlyMaintenance = calculateMonthlyMaintenance(inputs);
  const monthlyLoanPayment = calculateMonthlyLoanPayment(inputs.financing);
  const monthlyHoa = inputs.monthlyHoa || 0;
  const monthlySecurity = inputs.isVacant ? MONTHLY_SECURITY : 0;
  const monthlyLawnCare = calculateMonthlyLawnCare(inputs);
  const monthlyPoolMaintenance = inputs.hasPool ? MONTHLY_POOL_MAINTENANCE : 0;
  const monthlyPestControl = MONTHLY_PEST_CONTROL;

  // Calculate totals
  const totalMonthly =
    monthlyPropertyTax +
    monthlyInsurance +
    monthlyUtilities +
    monthlyMaintenance +
    monthlyLoanPayment +
    monthlyHoa +
    monthlySecurity +
    monthlyLawnCare +
    monthlyPoolMaintenance +
    monthlyPestControl;

  const totalHolding = totalMonthly * inputs.holdingMonths;

  // Category breakdown
  const categoryBreakdown = {
    taxes: monthlyPropertyTax * inputs.holdingMonths,
    insurance: monthlyInsurance * inputs.holdingMonths,
    utilities: monthlyUtilities * inputs.holdingMonths,
    maintenance:
      (monthlyMaintenance + monthlyLawnCare + monthlyPoolMaintenance + monthlyPestControl) *
      inputs.holdingMonths,
    financing: monthlyLoanPayment * inputs.holdingMonths,
    other: (monthlyHoa + monthlySecurity) * inputs.holdingMonths,
  };

  return {
    monthlyPropertyTax,
    monthlyInsurance,
    monthlyUtilities,
    monthlyMaintenance,
    monthlyLoanPayment,
    monthlyHoa,
    monthlySecurity,
    monthlyLawnCare,
    monthlyPoolMaintenance,
    monthlyPestControl,
    totalMonthly,
    totalHolding,
    holdingPeriodMonths: inputs.holdingMonths,
    categoryBreakdown,
  };
}

/**
 * Convert holding cost breakdown to the simpler HoldingBreakdown type
 *
 * @param breakdown Detailed holding cost breakdown
 * @returns Simplified HoldingBreakdown
 */
export function toHoldingBreakdown(
  breakdown: HoldingCostBreakdown
): HoldingBreakdown {
  return {
    monthlyTaxes: breakdown.monthlyPropertyTax,
    monthlyInsurance: breakdown.monthlyInsurance,
    monthlyUtilities: breakdown.monthlyUtilities,
    monthlyMaintenance:
      breakdown.monthlyMaintenance +
      breakdown.monthlyLawnCare +
      breakdown.monthlyPoolMaintenance +
      breakdown.monthlyPestControl,
    monthlyLoanPayment: breakdown.monthlyLoanPayment,
    monthlyHoa: breakdown.monthlyHoa,
    totalMonthly: breakdown.totalMonthly,
    holdingPeriodMonths: breakdown.holdingPeriodMonths,
    totalHolding: breakdown.totalHolding,
  };
}

// ============================================
// Utility Functions
// ============================================

/**
 * Estimate holding period based on rehab scope and market conditions
 *
 * @param rehabScope Rehab scope (cosmetic, light, moderate, heavy, gut)
 * @param marketConditions Market conditions (hot, normal, slow)
 * @returns Estimated holding period in months
 */
export function estimateHoldingPeriod(
  rehabScope: 'cosmetic' | 'light' | 'moderate' | 'heavy' | 'gut',
  marketConditions: 'hot' | 'normal' | 'slow' = 'normal'
): number {
  /**
   * REHAB DURATION ESTIMATES
   *
   * Based on typical fix-and-flip timelines:
   *
   * COSMETIC (1 month):
   * - Paint, flooring, fixtures, landscaping
   * - No structural work or permits required
   * - Can be completed quickly with crew
   *
   * LIGHT (2 months):
   * - Cosmetic + kitchen/bath updates
   * - Minor electrical/plumbing work
   * - Basic permits and inspections
   *
   * MODERATE (3 months):
   * - Light rehab + HVAC, roof, windows
   * - Significant system updates
   * - Multiple contractor coordination
   *
   * HEAVY (5 months):
   * - Moderate + structural repairs
   * - Major system replacements
   * - Permit delays and inspection cycles
   *
   * GUT REHAB (8 months):
   * - Complete interior demolition and rebuild
   * - All systems replaced
   * - Extensive permit/inspection process
   * - Weather delays, material lead times
   *
   * Note: These are conservative estimates
   * - Actual timelines vary by contractor availability
   * - Weather can impact schedules (especially exterior work)
   * - Permit approval times vary by jurisdiction
   * - Material supply chain issues can cause delays
   */
  const rehabMonths: Record<string, number> = {
    cosmetic: 1,
    light: 2,
    moderate: 3,
    heavy: 5,
    gut: 8,
  };

  /**
   * MARKETING & SALE DURATION ESTIMATES
   *
   * Time from listing to closing by market conditions:
   *
   * HOT MARKET (1 month):
   * - Low inventory, high demand
   * - Multiple offers within days
   * - Quick closings (cash buyers common)
   * - Example: Austin TX 2020-2022, Phoenix 2021
   *
   * NORMAL MARKET (3 months):
   * - Balanced supply and demand
   * - 30-45 days to offer
   * - 30-45 day closing period
   * - Most markets in typical conditions
   *
   * SLOW MARKET (6 months):
   * - High inventory, low demand
   * - Extended time on market
   * - Price reductions often needed
   * - Buyer financing contingencies
   * - Example: 2008-2011 recession, some rural markets
   *
   * Conservative approach: Default to 'normal' market conditions
   * - Protects against overoptimistic projections
   * - Better to be pleasantly surprised than cash-strapped
   */
  const saleMonths: Record<string, number> = {
    hot: 1,
    normal: 3,
    slow: 6,
  };

  /**
   * TOTAL HOLDING PERIOD CALCULATION
   *
   * Formula: Rehab Time + Sale Time
   *
   * Examples:
   * - Light rehab, hot market: 2 + 1 = 3 months
   * - Moderate rehab, normal market: 3 + 3 = 6 months
   * - Gut rehab, slow market: 8 + 6 = 14 months
   *
   * Critical for financial planning:
   * - Holding costs compound over time
   * - Longer holds = more carrying costs
   * - Financing terms must cover full period
   * - Seasonal factors: Don't finish reno in winter for slow spring market
   *
   * Risk factors not accounted for:
   * - Unexpected repair discoveries (+1-2 months)
   * - Contractor delays/no-shows (+1-3 months)
   * - Failed inspections requiring rework (+0.5-1 month)
   * - Financing delays for buyers (+0.5-1 month)
   *
   * Best practice: Add 20-30% buffer to these estimates
   */
  return rehabMonths[rehabScope] + saleMonths[marketConditions];
}

/**
 * Format holding cost as monthly summary string
 *
 * @param breakdown Holding cost breakdown
 * @returns Formatted summary string
 */
export function formatHoldingCostSummary(
  breakdown: HoldingCostBreakdown
): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });

  return [
    `Monthly Holding Costs: ${formatter.format(breakdown.totalMonthly)}`,
    `  - Taxes: ${formatter.format(breakdown.monthlyPropertyTax)}`,
    `  - Insurance: ${formatter.format(breakdown.monthlyInsurance)}`,
    `  - Utilities: ${formatter.format(breakdown.monthlyUtilities)}`,
    `  - Maintenance: ${formatter.format(breakdown.monthlyMaintenance)}`,
    breakdown.monthlyLoanPayment > 0
      ? `  - Loan Payment: ${formatter.format(breakdown.monthlyLoanPayment)}`
      : '',
    breakdown.monthlyHoa > 0
      ? `  - HOA: ${formatter.format(breakdown.monthlyHoa)}`
      : '',
    `Total for ${breakdown.holdingPeriodMonths} months: ${formatter.format(breakdown.totalHolding)}`,
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Validate holding cost inputs
 *
 * @param inputs Holding cost inputs
 * @returns Array of validation error messages
 */
export function validateHoldingCostInputs(
  inputs: Partial<HoldingCostInputs>
): string[] {
  const errors: string[] = [];

  if (!inputs.propertyValue || inputs.propertyValue <= 0) {
    errors.push('Property value must be greater than zero');
  }

  if (!inputs.state || inputs.state.length !== 2) {
    errors.push('Valid two-letter state code is required');
  }

  if (!inputs.holdingMonths || inputs.holdingMonths <= 0) {
    errors.push('Holding period must be at least 1 month');
  }

  if (inputs.holdingMonths && inputs.holdingMonths > 60) {
    errors.push('Warning: Holding period exceeds 5 years');
  }

  if (inputs.financing?.isFinanced && inputs.financing.loanAmount <= 0) {
    errors.push('Loan amount must be greater than zero if financing');
  }

  if (inputs.financing?.interestRate && inputs.financing.interestRate > 0.25) {
    errors.push('Warning: Interest rate seems unusually high (>25%)');
  }

  return errors;
}

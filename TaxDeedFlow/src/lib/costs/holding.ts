/**
 * Cost Estimation Engine - Holding Cost Calculator
 *
 * Calculates the ongoing costs of holding a property during the
 * renovation and marketing period, including taxes, insurance,
 * utilities, maintenance, and financing costs.
 *
 * @module lib/costs/holding
 * @author Claude Code Agent
 * @date 2026-01-16
 */

import type {
  HoldingBreakdown,
  FinancingParams,
} from '@/types/costs';

import { DEFAULT_COSTS, getRegionalMultiplier } from './constants';

// ============================================
// Property Tax Calculator
// ============================================

/**
 * Estimate monthly property taxes
 *
 * Property taxes are calculated based on assessed value and
 * the state's effective tax rate. Rates vary significantly
 * by state, from 0.28% (Hawaii) to 2.49% (New Jersey).
 *
 * @param assessedValue - Property assessed value
 * @param state - Two-letter state code
 * @param county - Optional county name for local adjustments
 * @returns Monthly property tax estimate
 *
 * @formula monthlyTax = (assessedValue * effectiveRate) / 12
 *
 * @example
 * // Property assessed at $100,000 in Pennsylvania
 * estimateMonthlyTaxes(100000, 'PA'); // ~127.50 (1.53% annual)
 *
 * // Same property in Texas with higher rate
 * estimateMonthlyTaxes(100000, 'TX'); // ~150.83 (1.81% annual)
 */
export function estimateMonthlyTaxes(
  assessedValue: number,
  state: string,
  county?: string
): number {
  const multiplier = getRegionalMultiplier(state);
  let effectiveRate = multiplier.taxRate;

  // County-level adjustments for high-tax areas
  if (county) {
    const countyAdjustments: Record<string, number> = {
      // New Jersey high-tax counties
      'NJ_Essex': 0.0285,
      'NJ_Bergen': 0.0265,
      'NJ_Passaic': 0.0270,
      // Illinois high-tax counties
      'IL_Cook': 0.0230,
      // Texas high-tax counties
      'TX_Travis': 0.0200,
      'TX_Harris': 0.0195,
      // Pennsylvania variations
      'PA_Philadelphia': 0.0137,  // City rate
      'PA_Allegheny': 0.0175,
    };

    const countyKey = `${state.toUpperCase()}_${county.replace(/[^a-zA-Z]/g, '')}`;
    if (countyAdjustments[countyKey]) {
      effectiveRate = countyAdjustments[countyKey];
    }
  }

  const annualTaxes = assessedValue * effectiveRate;
  return Math.round((annualTaxes / 12) * 100) / 100;
}

// ============================================
// Insurance Calculator
// ============================================

/**
 * Property type options for insurance calculation
 */
export type PropertyInsuranceType =
  | 'single_family'
  | 'condo'
  | 'townhouse'
  | 'multi_family'
  | 'vacant_land'
  | 'vacant_building';

/**
 * Estimate monthly property insurance premium
 *
 * Insurance costs vary by property value, type, location,
 * and risk factors. Vacant properties typically cost more
 * to insure due to increased risk.
 *
 * @param propertyValue - Property market value or coverage amount
 * @param state - Two-letter state code
 * @param propertyType - Type of property for rate calculation
 * @returns Monthly insurance premium estimate
 *
 * @formula
 *   baseRate = 0.5% of value for occupied homes
 *   vacantRate = 1.0% of value for vacant properties
 *   adjusted = baseRate * stateMultiplier
 *
 * @example
 * // Occupied single family home worth $150,000 in PA
 * estimateMonthlyInsurance(150000, 'PA', 'single_family'); // ~62.50
 *
 * // Vacant building worth $150,000 in PA
 * estimateMonthlyInsurance(150000, 'PA', 'vacant_building'); // ~125
 */
export function estimateMonthlyInsurance(
  propertyValue: number,
  state: string,
  propertyType: PropertyInsuranceType = 'vacant_building'
): number {
  // Base annual rates by property type (as decimal)
  const baseRates: Record<PropertyInsuranceType, number> = {
    single_family: 0.005,      // 0.5% of value
    condo: 0.004,              // 0.4% (HOA covers building)
    townhouse: 0.0045,         // 0.45%
    multi_family: 0.006,       // 0.6%
    vacant_land: 0.002,        // 0.2% (liability only)
    vacant_building: 0.010,    // 1.0% (higher risk)
  };

  // State multipliers for insurance costs
  // Based on natural disaster risk, crime rates, etc.
  const stateMultipliers: Record<string, number> = {
    // High-risk states (hurricanes, floods, earthquakes)
    FL: 1.80,  // Hurricane risk
    LA: 1.70,  // Hurricane + flood
    TX: 1.40,  // Wind + hail
    OK: 1.50,  // Tornado alley
    CA: 1.35,  // Earthquake + wildfire
    MS: 1.45,  // Hurricane
    AL: 1.35,  // Hurricane
    SC: 1.30,  // Hurricane
    NC: 1.20,  // Hurricane
    // Moderate risk states
    CO: 1.20,  // Hail
    KS: 1.25,  // Tornado
    NE: 1.15,  // Tornado
    NY: 1.10,  // High property values
    NJ: 1.10,  // High values + coastal
    MA: 1.08,  // Coastal
    // Lower risk states
    PA: 1.00,  // Baseline
    OH: 0.95,
    IN: 0.95,
    MI: 1.00,
    WI: 0.98,
    MN: 1.02,
    OR: 0.95,
    WA: 0.98,
    ID: 0.90,
    UT: 0.88,
  };

  const baseRate = baseRates[propertyType] ?? DEFAULT_COSTS.holding.annualInsuranceRate;
  const stateMult = stateMultipliers[state.toUpperCase()] ?? 1.0;

  const annualPremium = propertyValue * baseRate * stateMult;
  return Math.round((annualPremium / 12) * 100) / 100;
}

// ============================================
// Utilities Calculator
// ============================================

/**
 * Estimate monthly utility costs for a property
 *
 * Estimates base utilities needed to maintain a vacant/rehab
 * property: electricity, gas (if applicable), water, sewer.
 *
 * @param sqft - Property square footage
 * @param state - Two-letter state code
 * @param isVacant - Whether property is vacant (lower usage)
 * @returns Monthly utility estimate
 *
 * @formula
 *   baseUtilities = 150 (vacant) or 200 (occupied)
 *   sizeAdjust = sqft / 1500 * 0.3 + 0.7 (capped at 1.5x)
 *   climateAdjust = based on state heating/cooling needs
 *
 * @example
 * estimateUtilities(1500, 'PA', true); // ~150
 * estimateUtilities(2500, 'AZ', true); // ~195 (larger + cooling)
 */
export function estimateUtilities(
  sqft: number,
  state: string,
  isVacant: boolean = true
): number {
  const baseUtilities = isVacant
    ? DEFAULT_COSTS.holding.monthlyUtilities
    : 200;

  // Size adjustment: larger homes = more utilities
  // Scale from 0.7x (small) to 1.5x (large)
  const sizeMultiplier = Math.min(1.5, Math.max(0.7, (sqft / 1500) * 0.3 + 0.7));

  // Climate adjustment based on heating/cooling needs
  const climateMultipliers: Record<string, number> = {
    // Cold states (high heating)
    AK: 1.50,
    MN: 1.30,
    WI: 1.25,
    MI: 1.20,
    ND: 1.30,
    MT: 1.25,
    VT: 1.20,
    NH: 1.18,
    ME: 1.22,
    // Hot states (high cooling)
    AZ: 1.35,
    NV: 1.25,
    TX: 1.20,
    FL: 1.15,
    LA: 1.18,
    // Moderate states
    PA: 1.00,
    OH: 1.02,
    NY: 1.05,
    CA: 0.95,  // Mild climate
    OR: 0.92,
    WA: 0.95,
  };

  const climateMult = climateMultipliers[state.toUpperCase()] ?? 1.0;

  return Math.round(baseUtilities * sizeMultiplier * climateMult);
}

// ============================================
// Maintenance Calculator
// ============================================

/**
 * Estimate monthly maintenance costs
 *
 * Covers basic maintenance during holding: lawn care,
 * snow removal, pest control, minor repairs.
 *
 * @param sqft - Property square footage
 * @param state - Two-letter state code
 * @param lotSizeAcres - Optional lot size for lawn care
 * @returns Monthly maintenance estimate
 *
 * @example
 * estimateMonthlyMaintenance(1500, 'PA'); // ~100
 * estimateMonthlyMaintenance(2500, 'FL', 0.5); // ~135
 */
export function estimateMonthlyMaintenance(
  sqft: number,
  state: string,
  lotSizeAcres?: number
): number {
  const baseMaintenance = DEFAULT_COSTS.holding.monthlyMaintenance;

  // Lot size affects lawn care costs
  const lotMultiplier = lotSizeAcres
    ? Math.min(2.0, 0.8 + (lotSizeAcres * 0.4))
    : 1.0;

  // Regional cost adjustment
  const multiplier = getRegionalMultiplier(state);
  const regionalMult = multiplier.labor;

  // Seasonal adjustment (higher in climates requiring snow removal or frequent lawn care)
  const seasonalAdjustments: Record<string, number> = {
    // Cold states need snow removal
    MN: 1.15,
    WI: 1.12,
    MI: 1.10,
    ND: 1.15,
    NY: 1.08,
    PA: 1.05,
    // Hot humid states need frequent lawn care
    FL: 1.10,
    TX: 1.08,
    GA: 1.05,
    // Mild climates
    CA: 0.95,
    AZ: 0.90,  // Less vegetation
  };

  const seasonalMult = seasonalAdjustments[state.toUpperCase()] ?? 1.0;

  return Math.round(baseMaintenance * lotMultiplier * regionalMult * seasonalMult);
}

// ============================================
// Loan Payment Calculator
// ============================================

/**
 * Calculate monthly loan payment (principal + interest)
 *
 * For investment properties, often uses interest-only payments
 * during the holding period to minimize cash requirements.
 *
 * @param loanAmount - Total loan amount
 * @param annualRate - Annual interest rate (decimal)
 * @param termMonths - Loan term in months
 * @param interestOnly - Calculate interest-only payment
 * @returns Monthly payment amount
 *
 * @formula
 *   Interest only: payment = loanAmount * monthlyRate
 *   Amortizing: payment = P * [r(1+r)^n] / [(1+r)^n - 1]
 *
 * @example
 * // Interest-only on $70,000 at 8% annual
 * calculateMonthlyLoanPayment(70000, 0.08, 60, true); // ~466.67
 *
 * // Fully amortizing
 * calculateMonthlyLoanPayment(70000, 0.08, 60, false); // ~1,419.73
 */
export function calculateMonthlyLoanPayment(
  loanAmount: number,
  annualRate: number,
  termMonths: number,
  interestOnly: boolean = true
): number {
  if (loanAmount <= 0 || annualRate <= 0) return 0;

  const monthlyRate = annualRate / 12;

  if (interestOnly) {
    return Math.round(loanAmount * monthlyRate * 100) / 100;
  }

  // Standard amortization formula
  const numerator = monthlyRate * Math.pow(1 + monthlyRate, termMonths);
  const denominator = Math.pow(1 + monthlyRate, termMonths) - 1;
  const payment = loanAmount * (numerator / denominator);

  return Math.round(payment * 100) / 100;
}

// ============================================
// Main Holding Cost Calculator
// ============================================

/**
 * Input parameters for holding cost calculation
 */
export interface HoldingCostInput {
  /** Property assessed value (for tax calculation) */
  assessedValue?: number;
  /** Property market value (for insurance calculation) */
  propertyValue: number;
  /** Property square footage */
  sqft?: number;
  /** Two-letter state code */
  state: string;
  /** County name for local tax adjustments */
  county?: string;
  /** Estimated holding period in months */
  holdingMonths?: number;
  /** Monthly property taxes (override calculation) */
  monthlyTaxesOverride?: number;
  /** Monthly insurance (override calculation) */
  monthlyInsuranceOverride?: number;
  /** Monthly HOA dues */
  monthlyHoa?: number;
  /** Lot size in acres (for maintenance calculation) */
  lotSizeAcres?: number;
  /** Whether property is vacant */
  isVacant?: boolean;
  /** Financing parameters if using loan */
  financing?: FinancingParams;
}

/**
 * Calculate complete holding cost breakdown
 *
 * This function calculates all ongoing costs during the holding
 * period, including taxes, insurance, utilities, maintenance,
 * and financing costs.
 *
 * @param input - Holding cost calculation inputs
 * @returns Complete holding cost breakdown
 *
 * @formula
 *   monthlyTotal = taxes + insurance + utilities + maintenance + hoa + loanPayment
 *   totalHolding = monthlyTotal * holdingPeriodMonths
 *
 * @example
 * const costs = calculateHoldingCosts({
 *   assessedValue: 80000,
 *   propertyValue: 100000,
 *   sqft: 1500,
 *   state: 'PA',
 *   holdingMonths: 6,
 * });
 *
 * // Returns:
 * // {
 * //   monthlyTaxes: 102,
 * //   monthlyInsurance: 83,
 * //   monthlyUtilities: 150,
 * //   monthlyMaintenance: 100,
 * //   monthlyLoanPayment: 0,
 * //   monthlyHoa: 0,
 * //   totalMonthly: 435,
 * //   holdingPeriodMonths: 6,
 * //   totalHolding: 2610
 * // }
 */
export function calculateHoldingCosts(input: HoldingCostInput): HoldingBreakdown {
  const {
    assessedValue,
    propertyValue,
    sqft = 1500,
    state,
    county,
    holdingMonths = DEFAULT_COSTS.holding.defaultHoldingMonths,
    monthlyTaxesOverride,
    monthlyInsuranceOverride,
    monthlyHoa = 0,
    lotSizeAcres,
    isVacant = true,
    financing,
  } = input;

  // Use assessed value for taxes if provided, otherwise estimate from property value
  const taxableValue = assessedValue ?? (propertyValue * 0.8);

  // Calculate individual monthly costs
  const monthlyTaxes = monthlyTaxesOverride ?? estimateMonthlyTaxes(taxableValue, state, county);
  const monthlyInsurance = monthlyInsuranceOverride ?? estimateMonthlyInsurance(
    propertyValue,
    state,
    isVacant ? 'vacant_building' : 'single_family'
  );
  const monthlyUtilities = estimateUtilities(sqft, state, isVacant);
  const monthlyMaintenance = estimateMonthlyMaintenance(sqft, state, lotSizeAcres);

  // Calculate loan payment if financing
  let monthlyLoanPayment = 0;
  if (financing?.isFinanced && financing.loanAmount > 0) {
    monthlyLoanPayment = calculateMonthlyLoanPayment(
      financing.loanAmount,
      financing.interestRate,
      financing.termMonths,
      financing.interestOnly ?? true
    );
  }

  // Sum monthly costs
  const totalMonthly =
    monthlyTaxes +
    monthlyInsurance +
    monthlyUtilities +
    monthlyMaintenance +
    monthlyLoanPayment +
    monthlyHoa;

  // Calculate total holding cost
  const totalHolding = Math.round(totalMonthly * holdingMonths * 100) / 100;

  return {
    monthlyTaxes: Math.round(monthlyTaxes * 100) / 100,
    monthlyInsurance: Math.round(monthlyInsurance * 100) / 100,
    monthlyUtilities,
    monthlyMaintenance,
    monthlyLoanPayment,
    monthlyHoa,
    totalMonthly: Math.round(totalMonthly * 100) / 100,
    holdingPeriodMonths: holdingMonths,
    totalHolding,
  };
}

/**
 * Quick estimate of total holding costs
 *
 * @param propertyValue - Property value
 * @param holdingMonths - Number of months
 * @param state - Two-letter state code
 * @returns Estimated total holding costs
 *
 * @example
 * estimateHoldingTotal(100000, 6, 'PA'); // ~2610
 */
export function estimateHoldingTotal(
  propertyValue: number,
  holdingMonths: number,
  state: string
): number {
  const costs = calculateHoldingCosts({
    propertyValue,
    holdingMonths,
    state,
  });

  return costs.totalHolding;
}

/**
 * Calculate holding cost per month per $1000 of value
 *
 * Useful for quick comparisons across properties
 *
 * @param state - Two-letter state code
 * @returns Monthly cost per $1000 of property value
 *
 * @example
 * getHoldingRatePer1000('PA'); // ~4.35
 * getHoldingRatePer1000('NJ'); // ~6.50 (higher taxes)
 */
export function getHoldingRatePer1000(state: string): number {
  // Calculate for a standard $100,000 property
  const costs = calculateHoldingCosts({
    propertyValue: 100000,
    holdingMonths: 1,
    state,
  });

  // Return rate per $1000
  return Math.round((costs.totalMonthly / 100) * 100) / 100;
}

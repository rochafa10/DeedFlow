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
 * These are approximate statewide averages - actual rates vary by county
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
 * Higher rates in coastal/disaster-prone areas
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
  // If annual taxes are known, use them directly
  if (inputs.annualTaxes && inputs.annualTaxes > 0) {
    return inputs.annualTaxes / 12;
  }

  // Calculate from assessed value or property value
  const taxableValue = inputs.assessedValue || inputs.propertyValue;
  const taxRate = STATE_TAX_RATES[inputs.state] || 0.012; // Default to 1.2%

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
  const taxableValue = assessedValue || propertyValue * 0.9; // Assume 90% assessment ratio
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
  const baseRate = STATE_INSURANCE_RATES[inputs.state] || 3.5;

  // Determine insurance type and multiplier
  let insuranceType: 'standard' | 'vacant' | 'builders_risk' = 'standard';
  let multiplier = 1.0;

  if (inputs.activeRehab) {
    insuranceType = 'builders_risk';
    multiplier = BUILDERS_RISK_MULTIPLIER;
  } else if (inputs.isVacant) {
    insuranceType = 'vacant';
    multiplier = VACANT_INSURANCE_MULTIPLIER;
  }

  // Calculate coverage amount (typically 80-100% of property value)
  const coverageAmount = inputs.propertyValue * 0.8;

  // Age factor - older properties cost more to insure
  const currentYear = new Date().getFullYear();
  const propertyAge = inputs.yearBuilt ? currentYear - inputs.yearBuilt : 30;
  const ageFactor = propertyAge > 50 ? 1.25 : propertyAge > 30 ? 1.15 : 1.0;

  // Calculate annual premium
  const annualPremium =
    (coverageAmount / 1000) * baseRate * multiplier * ageFactor;
  const monthlyPremium = annualPremium / 12;

  // Standard deductible based on coverage
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
  const stateFactor = STATE_UTILITY_FACTORS[inputs.state] || 1.0;
  const sqftFactor = inputs.sqft ? inputs.sqft / 1500 : 1.0;

  // Vacant properties use minimal utilities (keep pipes from freezing, etc.)
  const vacantFactor = inputs.isVacant ? 0.4 : 1.0;

  // Seasonal adjustment (higher in summer/winter, lower in spring/fall)
  const month = new Date().getMonth();
  const seasonalFactor =
    month >= 5 && month <= 8
      ? 1.2 // Summer - AC
      : month >= 11 || month <= 2
        ? 1.3 // Winter - heating
        : 1.0; // Spring/Fall

  const baseUtility = BASE_MONTHLY_UTILITIES * stateFactor * sqftFactor * vacantFactor;

  // Individual utility breakdown
  const electric = baseUtility * 0.50 * seasonalFactor;
  const gas = baseUtility * 0.25 * (seasonalFactor > 1 ? seasonalFactor : 1.0);
  const waterSewer = baseUtility * 0.20;
  const trash = baseUtility * 0.05;

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
  const sqftFactor = inputs.sqft ? inputs.sqft / 1500 : 1.0;

  // Age factor - older properties require more maintenance
  const currentYear = new Date().getFullYear();
  const propertyAge = inputs.yearBuilt ? currentYear - inputs.yearBuilt : 30;
  const ageFactor = propertyAge > 30 ? AGED_PROPERTY_MAINTENANCE_FACTOR : 1.0;

  // Property type factor
  let typeFactor = 1.0;
  if (inputs.propertyType === 'multi-family') {
    typeFactor = 1.3;
  } else if (inputs.propertyType === 'condo') {
    typeFactor = 0.5; // HOA covers exterior
  }

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
  if (!financing || !financing.isFinanced || financing.loanAmount <= 0) {
    return 0;
  }

  const monthlyRate = financing.interestRate / 12;
  const termMonths = financing.termMonths;

  if (financing.interestOnly) {
    // Interest-only payment
    return financing.loanAmount * monthlyRate;
  }

  // Standard amortizing payment (PMT formula)
  // PMT = P * [r(1+r)^n] / [(1+r)^n - 1]
  if (monthlyRate === 0) {
    return financing.loanAmount / termMonths;
  }

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

  // Calculate remaining balance at start of this month
  let balance = financing.loanAmount;
  for (let i = 1; i < monthNumber; i++) {
    const interest = balance * monthlyRate;
    const principal = payment - interest;
    balance -= principal;
  }

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
  // Base rehab time by scope
  const rehabMonths: Record<string, number> = {
    cosmetic: 1,
    light: 2,
    moderate: 3,
    heavy: 5,
    gut: 8,
  };

  // Marketing/sale time by market conditions
  const saleMonths: Record<string, number> = {
    hot: 1,
    normal: 3,
    slow: 6,
  };

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

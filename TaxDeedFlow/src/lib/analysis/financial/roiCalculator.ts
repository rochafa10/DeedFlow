/**
 * ROI Calculator - Financial Analysis Module
 *
 * This module provides comprehensive ROI (Return on Investment) and IRR (Internal
 * Rate of Return) calculations for tax deed property investments. It includes
 * Newton-Raphson iterative IRR calculation, NPV computation, cash flow generation,
 * and various investment metrics.
 *
 * @module lib/analysis/financial/roiCalculator
 * @author Claude Code Agent
 * @date 2026-01-16
 */

import type {
  CostBreakdown,
  HoldingBreakdown,
  FinancingParams,
} from '@/types/costs';

// ============================================
// Type Definitions
// ============================================

/**
 * Complete ROI analysis result containing all investment metrics
 */
export interface ROIAnalysis {
  /** Initial bid/purchase price at auction */
  acquisitionCost: number;
  /** Total closing and transaction costs */
  estimatedClosingCosts: number;
  /** Current estimated market value (as-is) */
  estimatedMarketValue: number;
  /** After-repair value estimate */
  estimatedARV: number;
  /** Total estimated rehabilitation costs */
  estimatedRehabCost: number;

  // Return Metrics
  /** Gross ROI: (Sale Price - Total Investment) / Total Investment */
  grossROI: number;
  /** Net ROI: (Net Profit) / Total Investment */
  netROI: number;
  /** Annualized ROI using CAGR formula */
  annualizedROI: number;

  // IRR Calculations
  /** Internal Rate of Return (annualized) */
  irr: number;
  /** Monthly IRR values for cash flow timeline */
  irrMonthly: number[];

  // Rental Analysis (if hold strategy)
  /** Estimated monthly rent */
  monthlyRentEstimate: number;
  /** Monthly cash flow after all expenses */
  monthlyCashFlow: number;
  /** Capitalization rate: NOI / Property Value */
  capRate: number;
  /** Cash-on-Cash return: Annual Cash Flow / Cash Invested */
  cashOnCashReturn: number;

  // Equity Analysis
  /** Immediate equity gain on purchase */
  instantEquity: number;
  /** Instant equity as percentage of market value */
  instantEquityPercent: number;

  // Risk-Adjusted Returns
  /** ROI adjusted for confidence/risk level */
  riskAdjustedROI: number;
  /** Confidence range for ROI estimate */
  confidenceRange: { min: number; max: number };
}

/**
 * Input parameters for ROI calculation
 */
export interface ROIInputs {
  /** Acquisition/bid price */
  bidAmount: number;
  /** Current market value (as-is) */
  marketValue: number;
  /** After-repair value */
  arv: number;
  /** Estimated rehab costs */
  rehabCost: number;
  /** Total closing costs */
  closingCosts: number;
  /** Holding period in months */
  holdingMonths: number;
  /** Monthly holding costs */
  monthlyHoldingCosts: number;
  /** Selling costs (commissions, closing) */
  sellingCosts: number;
  /** Optional financing parameters */
  financing?: FinancingParams;
  /** Estimated monthly rent (for hold analysis) */
  monthlyRent?: number;
  /** Monthly operating expenses (taxes, insurance, maintenance) */
  monthlyOperatingExpenses?: number;
  /** Confidence level in estimates (0-1) */
  confidenceLevel?: number;
}

/**
 * Cash flow entry for IRR calculation
 */
export interface CashFlowEntry {
  /** Month number (0 = initial investment) */
  month: number;
  /** Cash flow amount (negative = outflow, positive = inflow) */
  amount: number;
  /** Description of the cash flow */
  description: string;
}

/**
 * Investment metrics summary for quick display
 */
export interface InvestmentMetrics {
  /** Total cash required to execute investment */
  totalCashRequired: number;
  /** Expected gross profit */
  expectedGrossProfit: number;
  /** Expected net profit after all costs */
  expectedNetProfit: number;
  /** Gross ROI percentage */
  grossROIPercent: number;
  /** Net ROI percentage */
  netROIPercent: number;
  /** Annualized return percentage */
  annualizedReturn: number;
  /** Break-even sale price */
  breakEvenPrice: number;
  /** Profit per month */
  profitPerMonth: number;
}

// ============================================
// Constants
// ============================================

/**
 * Maximum iterations for Newton-Raphson IRR calculation
 *
 * Rationale: 100 iterations provides sufficient convergence for most real-world
 * investment scenarios. Newton-Raphson typically converges in <20 iterations,
 * but we allow 100 to handle edge cases with unusual cash flow patterns.
 * If convergence fails, we fall back to bisection method.
 */
const MAX_IRR_ITERATIONS = 100;

/**
 * Convergence tolerance for IRR calculation (0.01% = 1 basis point)
 *
 * Rationale: 0.0001 (0.01%) is sufficient precision for financial decision-making.
 * Going tighter (e.g., 0.00001) adds computational cost with negligible benefit.
 * For tax deed investments, decisions typically hinge on differences >1%, making
 * this tolerance more than adequate.
 */
const IRR_TOLERANCE = 0.0001;

/**
 * Initial IRR guess (10%)
 *
 * Rationale: 10% is a reasonable starting point for tax deed investments.
 * - Below typical market expectations (15-30% for distressed properties)
 * - Above typical stock market returns (7-10% historically)
 * - Provides good convergence for both low and high return scenarios
 * Starting guess affects convergence speed but not final result.
 */
const INITIAL_IRR_GUESS = 0.1;

/**
 * Minimum IRR bound for calculation (-99%)
 *
 * Rationale: -99% is a practical lower bound. An IRR of -100% would mean
 * total investment loss (infinite negative return). We stop at -99% to:
 * - Prevent division by zero in NPV calculation when rate = -1
 * - Flag catastrophic investment scenarios (nearly total loss)
 * - Maintain numerical stability in Newton-Raphson iteration
 */
const MIN_IRR_BOUND = -0.99;

/**
 * Maximum IRR bound for calculation (1000%)
 *
 * Rationale: 1000% (10x return) is an extremely optimistic upper bound.
 * For tax deed investments:
 * - Typical good deals: 20-50% IRR
 * - Excellent deals: 50-100% IRR
 * - Extraordinary deals: 100-200% IRR
 * - >1000% would be unprecedented (likely data error)
 * This bound prevents numerical overflow and flags unrealistic projections.
 */
const MAX_IRR_BOUND = 10;

// ============================================
// NPV and IRR Calculation Functions
// ============================================

/**
 * Calculate Net Present Value (NPV) of cash flows at a given discount rate
 *
 * NPV = sum of (Cash Flow / (1 + rate)^period) for all periods
 *
 * @param cashFlows Array of cash flow amounts (index 0 = initial investment, typically negative)
 * @param discountRate The discount rate to apply (as decimal, e.g., 0.10 for 10%)
 * @returns The NPV of the cash flows
 */
export function calculateNPV(cashFlows: number[], discountRate: number): number {
  if (cashFlows.length === 0) return 0;

  return cashFlows.reduce((npv, cashFlow, period) => {
    // Handle edge case where discount rate is -1 (would cause division by zero)
    // When rate = -1, denominator (1 + rate) = 0, causing division by zero
    // This represents a scenario where money loses all value over time
    // Return Infinity to signal invalid calculation (but only for periods > 0,
    // as period 0 cash flows are not discounted)
    if (discountRate === -1 && period > 0) {
      return Infinity;
    }

    // Standard NPV formula: PV = CF / (1 + r)^t
    // Each cash flow is discounted back to present value
    // - Positive cash flows (income) are worth less in present terms
    // - Negative cash flows (expenses) are also worth less in present terms
    // - Period 0 is not discounted (already at present value)
    return npv + cashFlow / Math.pow(1 + discountRate, period);
  }, 0);
}

/**
 * Calculate the derivative of NPV with respect to the discount rate
 * Used in Newton-Raphson iteration for IRR calculation
 *
 * d(NPV)/dr = sum of (-period * Cash Flow / (1 + rate)^(period+1))
 *
 * @param cashFlows Array of cash flow amounts
 * @param discountRate The discount rate
 * @returns The derivative of NPV
 */
export function calculateNPVDerivative(
  cashFlows: number[],
  discountRate: number
): number {
  if (cashFlows.length === 0) return 0;

  return cashFlows.reduce((derivative, cashFlow, period) => {
    // Skip period 0 because it's not discounted (derivative of a constant is 0)
    // Period 0 represents initial investment, which occurs "now" and has no
    // time-based discount factor, so it doesn't contribute to the rate of change
    if (period === 0) return derivative;

    // Derivative of NPV formula: d(NPV)/dr = sum of (-t * CF / (1 + r)^(t+1))
    // This measures how sensitive NPV is to changes in the discount rate
    // Used in Newton-Raphson to find where NPV crosses zero (the IRR)
    //
    // Intuition: The derivative tells us how fast NPV changes as we adjust
    // the discount rate. Steeper slope = faster convergence to IRR.
    // The negative sign reflects that higher discount rates reduce NPV.
    return (
      derivative -
      (period * cashFlow) / Math.pow(1 + discountRate, period + 1)
    );
  }, 0);
}

/**
 * Calculate Internal Rate of Return (IRR) using Newton-Raphson method
 *
 * IRR is the discount rate that makes NPV = 0. This function uses the
 * Newton-Raphson iterative method for fast convergence:
 *
 * new_rate = old_rate - f(old_rate) / f'(old_rate)
 *
 * where f = NPV function and f' = NPV derivative
 *
 * @param cashFlows Array of cash flows (index 0 = initial investment)
 * @param maxIterations Maximum iterations before giving up
 * @param tolerance Convergence tolerance
 * @returns The IRR as a decimal (e.g., 0.15 = 15%), or NaN if no solution
 */
export function calculateIRR(
  cashFlows: number[],
  maxIterations: number = MAX_IRR_ITERATIONS,
  tolerance: number = IRR_TOLERANCE
): number {
  // VALIDATION STEP: Ensure we have at least 2 cash flows (investment + return)
  // IRR is undefined for single cash flow scenarios
  if (cashFlows.length < 2) {
    return NaN;
  }

  // VALIDATION STEP: Check for sign change in cash flows
  // IRR only exists when there are both inflows and outflows
  // Example: [-100, +110] has IRR, but [-100, -50] does not
  // Business context: Tax deed investments should have negative initial cost
  // followed by positive returns (sale proceeds or rental income)
  const hasPositive = cashFlows.some((cf) => cf > 0);
  const hasNegative = cashFlows.some((cf) => cf < 0);
  if (!hasPositive || !hasNegative) {
    return NaN; // No IRR exists without sign change
  }

  // INITIALIZATION: Start with 10% guess (reasonable for real estate)
  let irr = INITIAL_IRR_GUESS;

  // NEWTON-RAPHSON ITERATION
  // This method finds the root of f(x) = NPV(rate) = 0
  // Formula: x_new = x_old - f(x) / f'(x)
  // Converges quadratically (doubles precision each iteration)
  for (let i = 0; i < maxIterations; i++) {
    // STEP 1: Calculate NPV at current guess
    // We're looking for the rate where NPV = 0
    const npv = calculateNPV(cashFlows, irr);

    // STEP 2: Calculate derivative of NPV (slope of the function)
    // Derivative tells us how to adjust our guess
    const npvDerivative = calculateNPVDerivative(cashFlows, irr);

    // STABILITY CHECK: Derivative too small means we're at a flat part of the curve
    // This can cause wild swings in the next guess (division by near-zero)
    // Fallback to bisection method which is more stable but slower
    if (Math.abs(npvDerivative) < tolerance) {
      return calculateIRRBisection(cashFlows);
    }

    // STEP 3: Newton-Raphson update formula
    // Move in direction opposite to NPV, scaled by slope
    // - If NPV > 0: Rate too low, increase it
    // - If NPV < 0: Rate too high, decrease it
    // - Larger derivative = smaller adjustment (steeper curve)
    const newIRR = irr - npv / npvDerivative;

    // CONVERGENCE CHECK: Stop when change between iterations is tiny
    // This means we've found the IRR to within our tolerance
    if (Math.abs(newIRR - irr) < tolerance) {
      // BOUNDS CHECK: Ensure solution is economically reasonable
      // IRR outside bounds likely indicates data error or edge case
      if (newIRR >= MIN_IRR_BOUND && newIRR <= MAX_IRR_BOUND) {
        return newIRR;
      }
    }

    // STEP 4: Clamp IRR to prevent divergence
    // Newton-Raphson can overshoot on non-convex functions
    // Bounding keeps us in a reasonable search space
    // Example: Without bounds, algorithm might try -500% or +5000%
    irr = Math.max(MIN_IRR_BOUND, Math.min(MAX_IRR_BOUND, newIRR));
  }

  // FALLBACK: If Newton-Raphson didn't converge after max iterations,
  // switch to bisection method which is guaranteed to converge (though slower)
  // This handles edge cases with unusual cash flow patterns
  return calculateIRRBisection(cashFlows);
}

/**
 * Calculate IRR using bisection method (fallback for Newton-Raphson)
 *
 * Bisection is slower but more robust when Newton-Raphson fails to converge.
 *
 * @param cashFlows Array of cash flows
 * @returns The IRR or NaN if no solution found
 */
/**
 * BISECTION METHOD ALGORITHM
 *
 * This is a fallback method when Newton-Raphson fails. It's slower (linear convergence
 * vs quadratic) but guaranteed to converge if a solution exists.
 *
 * How it works:
 * 1. Start with two bounds where NPV has opposite signs
 * 2. Check midpoint - if NPV is positive/negative, solution is in lower/upper half
 * 3. Narrow the range by half each iteration
 * 4. Stop when range is smaller than tolerance
 *
 * Convergence: Each iteration cuts search space in half, so we gain ~1 bit of
 * precision per iteration. With MAX_IRR_BOUND - MIN_IRR_BOUND ≈ 11, we need
 * about 17 iterations to reach 0.0001 tolerance (log2(11/0.0001) ≈ 17).
 */
function calculateIRRBisection(cashFlows: number[]): number {
  // INITIALIZATION: Set up search bounds
  let lowerBound = MIN_IRR_BOUND;  // -99%
  let upperBound = MAX_IRR_BOUND;  // 1000%

  // Calculate NPV at both bounds
  let npvLower = calculateNPV(cashFlows, lowerBound);
  let npvUpper = calculateNPV(cashFlows, upperBound);

  // VALIDATION: Check for sign change (required for bisection to work)
  // If both NPVs are positive or both negative, no zero-crossing exists
  // Business context: This would indicate impossible cash flows
  // (e.g., all negative = pure loss, all positive = free money)
  if (npvLower * npvUpper > 0) {
    return NaN;
  }

  // BISECTION ITERATION
  // Repeatedly halve the search interval until we find the IRR
  for (let i = 0; i < MAX_IRR_ITERATIONS; i++) {
    // STEP 1: Find midpoint of current interval
    const midpoint = (lowerBound + upperBound) / 2;
    const npvMid = calculateNPV(cashFlows, midpoint);

    // CONVERGENCE CHECK 1: NPV is essentially zero (found the IRR)
    // CONVERGENCE CHECK 2: Interval is smaller than tolerance (close enough)
    // Business context: Either condition means we have IRR to sufficient precision
    if (Math.abs(npvMid) < IRR_TOLERANCE || (upperBound - lowerBound) / 2 < IRR_TOLERANCE) {
      return midpoint;
    }

    // STEP 2: Determine which half contains the solution
    // If NPV(mid) and NPV(lower) have opposite signs, solution is in lower half
    // Otherwise, solution is in upper half
    //
    // Example: If lower=-99% (NPV=+$50k) and mid=0% (NPV=-$10k),
    // sign changed, so IRR is between -99% and 0%
    if (npvMid * npvLower < 0) {
      // Solution in lower half: keep lower bound, move upper to midpoint
      upperBound = midpoint;
      npvUpper = npvMid;
    } else {
      // Solution in upper half: move lower to midpoint, keep upper bound
      lowerBound = midpoint;
      npvLower = npvMid;
    }
  }

  // FALLBACK: If we exhausted iterations, return best guess (midpoint)
  // This should rarely happen with reasonable cash flows
  return (lowerBound + upperBound) / 2;
}

/**
 * Convert monthly IRR to annualized IRR using compound interest formula
 *
 * Formula: Annual Rate = (1 + Monthly Rate)^12 - 1
 *
 * This accounts for compounding. Simple multiplication (monthlyIRR * 12) would
 * underestimate the true annual return because it ignores reinvestment gains.
 *
 * Example: 2% monthly IRR
 * - Simple: 2% × 12 = 24% annual
 * - Compound: (1.02)^12 - 1 = 26.8% annual
 * - Difference: 2.8% is the reinvestment gain
 *
 * Business context: For tax deed deals with positive monthly cash flows
 * (rentals), compound formula captures the true wealth accumulation over time.
 *
 * @param monthlyIRR Monthly IRR as decimal (e.g., 0.02 = 2%)
 * @returns Annualized IRR (e.g., 0.268 = 26.8%)
 */
export function annualizeMonthlyIRR(monthlyIRR: number): number {
  // Compound 12 months of returns: (1 + r)^12 - 1
  // The -1 converts from future value multiplier back to rate of return
  return Math.pow(1 + monthlyIRR, 12) - 1;
}

/**
 * Convert annualized IRR to monthly IRR (inverse of annualization)
 *
 * Formula: Monthly Rate = (1 + Annual Rate)^(1/12) - 1
 *
 * This decompounds the annual rate to find the equivalent monthly rate.
 * It's the 12th root of the annual growth factor.
 *
 * Example: 26.8% annual IRR
 * - Monthly: (1.268)^(1/12) - 1 = 2% per month
 *
 * Business context: Useful for comparing properties with different holding
 * periods or converting annual rental yield to monthly cash flow expectations.
 *
 * @param annualIRR Annual IRR as decimal (e.g., 0.268 = 26.8%)
 * @returns Monthly IRR (e.g., 0.02 = 2%)
 */
export function monthlyFromAnnualIRR(annualIRR: number): number {
  // Take 12th root of annual growth: (1 + r)^(1/12) - 1
  // This finds the monthly rate that, when compounded 12 times, yields annual rate
  return Math.pow(1 + annualIRR, 1 / 12) - 1;
}

// ============================================
// Cash Flow Generation
// ============================================

/**
 * Generate cash flow timeline for a flip/sale investment
 *
 * @param inputs ROI calculation inputs
 * @returns Array of monthly cash flow entries
 */
export function generateFlipCashFlows(inputs: ROIInputs): CashFlowEntry[] {
  const cashFlows: CashFlowEntry[] = [];

  // MONTH 0: Initial capital outlay (all negative cash flow)
  // Assumption: All acquisition, closing, and rehab costs paid upfront
  // Business rationale: Tax deed auctions typically require full payment within
  // days of winning bid. Rehab costs are assumed paid immediately for
  // conservative IRR calculation (delays would improve IRR).
  const initialInvestment =
    -(inputs.bidAmount + inputs.closingCosts + inputs.rehabCost);
  cashFlows.push({
    month: 0,
    amount: initialInvestment,
    description: 'Initial investment (acquisition + closing + rehab)',
  });

  // MONTHS 1 to N-1: Ongoing holding costs (negative cash flow each month)
  // Includes: property taxes, insurance, utilities, maintenance, opportunity cost
  // Business context: These are "carrying costs" that erode profit during rehab/sale
  // For tax deed properties, holding costs are critical because:
  // - Properties may have deferred maintenance
  // - Title seasoning may require 6-12 month holds
  // - Market conditions may delay optimal sale timing
  for (let month = 1; month < inputs.holdingMonths; month++) {
    cashFlows.push({
      month,
      amount: -inputs.monthlyHoldingCosts,
      description: `Monthly holding costs (month ${month})`,
    });
  }

  // FINAL MONTH: Sale proceeds (large positive cash flow)
  // Net of selling costs (realtor commission, title, closing) and final month holding
  // Assumption: Property sells at ARV (After Repair Value)
  // Business context: ARV is conservative estimate of post-rehab market value
  // Real-world factors: market timing, buyer negotiations, appraisal gaps
  const saleProceeds = inputs.arv - inputs.sellingCosts - inputs.monthlyHoldingCosts;
  cashFlows.push({
    month: inputs.holdingMonths,
    amount: saleProceeds,
    description: 'Sale proceeds (ARV - selling costs - final holding)',
  });

  return cashFlows;
}

/**
 * Generate cash flow timeline for a buy-and-hold investment
 *
 * @param inputs ROI calculation inputs
 * @param holdYears Number of years to hold
 * @returns Array of monthly cash flow entries
 */
export function generateHoldCashFlows(
  inputs: ROIInputs,
  holdYears: number = 5
): CashFlowEntry[] {
  const cashFlows: CashFlowEntry[] = [];

  // Calculate net monthly cash flow (rent minus all operating expenses)
  // Operating expenses typically include:
  // - Property taxes, insurance, HOA fees (fixed costs)
  // - Maintenance, repairs, capital expenditures (variable)
  // - Property management fees (typically 8-10% of rent)
  // - Vacancy reserves (typically 5-8% of rent)
  const monthlyRent = inputs.monthlyRent || 0;
  const monthlyExpenses = inputs.monthlyOperatingExpenses || 0;
  const monthlyCashFlow = monthlyRent - monthlyExpenses;

  // MONTH 0: Initial capital outlay (same as flip strategy)
  // Assumption: Property is rent-ready after rehab (no additional delay)
  // Business context: Tax deed properties may need title seasoning before
  // they can be financed, making cash purchases common for hold strategies
  const initialInvestment =
    -(inputs.bidAmount + inputs.closingCosts + inputs.rehabCost);
  cashFlows.push({
    month: 0,
    amount: initialInvestment,
    description: 'Initial investment (acquisition + closing + rehab)',
  });

  const totalMonths = holdYears * 12;

  // MONTHS 1 to N-1: Monthly net rental income (positive or negative cash flow)
  // Positive cash flow: Property "cash flows" (income > expenses)
  // Negative cash flow: Property has "alligator" (expenses > income)
  // Business context: For tax deed investments, positive cash flow is critical
  // because these properties often lack traditional financing options
  for (let month = 1; month < totalMonths; month++) {
    cashFlows.push({
      month,
      amount: monthlyCashFlow,
      description: `Monthly rental cash flow (month ${month})`,
    });
  }

  // FINAL MONTH: Sale proceeds plus final month's rent
  //
  // CRITICAL ASSUMPTION: 3% annual appreciation rate
  //
  // Source/Rationale:
  // - Historical U.S. median: 3-4% annually (Case-Shiller, FHFA data)
  // - Below stock market (~10%) but above inflation (~2-3%)
  // - Conservative for improved properties in stable markets
  //
  // Business context for tax deed properties:
  // - May appreciate faster if in gentrifying areas
  // - May appreciate slower if in declining markets
  // - 3% is a neutral baseline; adjust based on local market research
  //
  // Example: $100k property held 5 years
  // - Future value: $100k × (1.03)^5 = $115,927
  // - Total appreciation: $15,927 (3.2% CAGR accounting for compounding)
  const appreciationRate = 0.03;
  const futureValue = inputs.arv * Math.pow(1 + appreciationRate, holdYears);
  const finalSaleProceeds = futureValue - inputs.sellingCosts + monthlyCashFlow;

  cashFlows.push({
    month: totalMonths,
    amount: finalSaleProceeds,
    description: 'Sale proceeds (appreciated value) + final month cash flow',
  });

  return cashFlows;
}

// ============================================
// ROI Calculation Functions
// ============================================

/**
 * Calculate gross ROI (before all costs)
 *
 * Gross ROI = (Sale Price - Acquisition Cost) / Acquisition Cost
 *
 * @param acquisitionCost Total acquisition cost
 * @param salePrice Expected sale price
 * @returns Gross ROI as decimal
 */
export function calculateGrossROI(
  acquisitionCost: number,
  salePrice: number
): number {
  if (acquisitionCost <= 0) return 0;
  return (salePrice - acquisitionCost) / acquisitionCost;
}

/**
 * Calculate net ROI (after all costs)
 *
 * Net ROI = Net Profit / Total Investment
 *
 * @param totalInvestment Total cash invested
 * @param netProfit Net profit after all costs
 * @returns Net ROI as decimal
 */
export function calculateNetROI(
  totalInvestment: number,
  netProfit: number
): number {
  if (totalInvestment <= 0) return 0;
  return netProfit / totalInvestment;
}

/**
 * Calculate annualized ROI using CAGR (Compound Annual Growth Rate) formula
 *
 * CAGR = (Ending Value / Beginning Value)^(1/years) - 1
 *
 * This converts a total return over any time period into an equivalent annual rate.
 * It answers: "What constant annual return would produce this result?"
 *
 * FORMULA EXPLANATION:
 * 1. Growth multiplier = Final Value / Initial Investment
 * 2. Annual multiplier = multiplier^(1/years) [take Nth root]
 * 3. Annual rate = multiplier - 1 [convert to percentage]
 *
 * EXAMPLE 1: 6-month flip with 20% total return
 * - Investment: $100,000
 * - Final Value: $120,000
 * - Years: 0.5
 * - CAGR: (120,000/100,000)^(1/0.5) - 1 = 1.2^2 - 1 = 0.44 = 44%
 * - Interpretation: 20% in 6 months = 44% annualized
 *
 * EXAMPLE 2: 3-year hold with 60% total return
 * - Investment: $100,000
 * - Final Value: $160,000
 * - Years: 3
 * - CAGR: (160,000/100,000)^(1/3) - 1 = 1.6^0.333 - 1 = 0.169 = 16.9%
 * - Interpretation: 60% in 3 years = 16.9% annualized
 *
 * BUSINESS CONTEXT:
 * - Enables apples-to-apples comparison of investments with different time horizons
 * - Standard metric for real estate investors (IRR is more complex but more accurate)
 * - CAGR assumes smooth growth; actual returns may be lumpy (all at sale)
 * - For tax deed flips: CAGR often 30-100%+ due to short hold periods
 * - For tax deed rentals: CAGR typically 10-25% (lower but steadier)
 *
 * @param totalInvestment Initial investment (all-in basis)
 * @param finalValue Final value (investment + profit)
 * @param holdingMonths Holding period in months
 * @returns Annualized ROI as decimal (e.g., 0.44 = 44%)
 */
export function calculateAnnualizedROI(
  totalInvestment: number,
  finalValue: number,
  holdingMonths: number
): number {
  // Validation: Prevent division by zero or negative time periods
  if (totalInvestment <= 0 || holdingMonths <= 0) return 0;

  // Convert months to years for annualization
  const years = holdingMonths / 12;

  // Apply CAGR formula: (FV/PV)^(1/years) - 1
  // The exponent (1/years) takes the Nth root to find the annual rate
  return Math.pow(finalValue / totalInvestment, 1 / years) - 1;
}

/**
 * Calculate capitalization rate (Cap Rate)
 *
 * Cap Rate = Net Operating Income / Property Value
 *
 * DEFINITION:
 * Cap rate measures the annual return from a property based on income alone
 * (excludes appreciation, financing, and taxes). It's the "yield" of real estate.
 *
 * FORMULA:
 * - NOI (Net Operating Income) = Annual Rent - Operating Expenses
 * - Operating expenses include: taxes, insurance, maintenance, management
 * - Operating expenses EXCLUDE: mortgage payments, depreciation, capital improvements
 * - Property Value = Current market value or purchase price
 *
 * INTERPRETATION:
 * - Higher cap rate = Higher income relative to value (better yield)
 * - Lower cap rate = Lower income relative to value (premium property or area)
 *
 * EXAMPLE:
 * - Annual rent: $12,000
 * - Operating expenses: $4,000
 * - NOI: $8,000
 * - Property value: $100,000
 * - Cap rate: $8,000 / $100,000 = 0.08 = 8%
 *
 * BUSINESS CONTEXT FOR TAX DEED PROPERTIES:
 * - Typical residential cap rates: 4-8% (stable markets)
 * - Typical tax deed cap rates: 8-15% (higher risk, lower value areas)
 * - Very high cap rates (>15%) may indicate: declining area, deferred maintenance, or great deal
 * - Very low cap rates (<4%) may indicate: premium area, appreciation play, or poor deal
 *
 * USE CASES:
 * - Compare rental properties in same market
 * - Assess if property is priced fairly (compare to market cap rates)
 * - Decide between appreciation vs cash flow strategy
 *
 * @param annualNOI Annual net operating income (rent - expenses)
 * @param propertyValue Property value (purchase price or current market value)
 * @returns Cap rate as decimal (e.g., 0.08 = 8%)
 */
export function calculateCapRate(
  annualNOI: number,
  propertyValue: number
): number {
  // Prevent division by zero
  if (propertyValue <= 0) return 0;

  // Simple ratio: income / value
  // Note: This is the "unlevered" cap rate (assumes no mortgage)
  return annualNOI / propertyValue;
}

/**
 * Calculate cash-on-cash return (CoC Return)
 *
 * CoC = Annual Pre-Tax Cash Flow / Total Cash Invested
 *
 * DEFINITION:
 * Cash-on-cash measures the annual cash return on the actual cash invested.
 * It's the "cash yield" - how much cash you get back each year per dollar invested.
 *
 * FORMULA:
 * - Annual Cash Flow = (Annual Rent - Annual Expenses - Annual Debt Service)
 * - Total Cash Invested = Down Payment + Closing Costs + Rehab Costs
 * - For all-cash purchases: Cash Flow = NOI (no debt service)
 * - For financed purchases: Cash Flow = NOI - Mortgage Payments
 *
 * DIFFERENCE FROM CAP RATE:
 * - Cap Rate = Income / Property Value (ignores financing)
 * - CoC Return = Cash Flow / Cash Invested (accounts for financing)
 * - CoC can be much higher than cap rate if using leverage
 *
 * INTERPRETATION:
 * - 8-12% CoC = Good cash flow property
 * - 12-20% CoC = Excellent cash flow (typical target for tax deed investors)
 * - >20% CoC = Exceptional (verify assumptions aren't too optimistic)
 * - Negative CoC = "Alligator" property (feeding it cash monthly)
 *
 * EXAMPLE 1: All-Cash Purchase (Tax Deed Typical)
 * - Cash invested: $50,000 (purchase + rehab)
 * - Annual rent: $9,600 ($800/month)
 * - Annual expenses: $3,000 (taxes, insurance, maintenance)
 * - Annual cash flow: $6,600
 * - CoC: $6,600 / $50,000 = 0.132 = 13.2%
 *
 * EXAMPLE 2: Leveraged Purchase
 * - Property value: $100,000
 * - Down payment: $25,000 + $5,000 closing = $30,000 cash invested
 * - Annual NOI: $8,000
 * - Annual mortgage: $5,000
 * - Annual cash flow: $3,000 ($8,000 NOI - $5,000 mortgage)
 * - CoC: $3,000 / $30,000 = 0.10 = 10%
 * - Note: Cap rate would be 8% ($8,000/$100,000), but CoC is 10% due to leverage
 *
 * BUSINESS CONTEXT FOR TAX DEED PROPERTIES:
 * - Tax deed properties often purchased all-cash (title issues prevent financing)
 * - CoC = Cap Rate for all-cash deals (no debt service to subtract)
 * - After title seasoning (6-12 months), refinancing can boost CoC via leverage
 * - High CoC compensates for risk (unknown condition, title issues, declining areas)
 *
 * USE CASES:
 * - Evaluate if property generates sufficient cash return
 * - Compare to alternative investments (stocks, bonds, other properties)
 * - Assess impact of financing vs all-cash purchase
 * - Determine if property meets investor's cash flow requirements
 *
 * @param annualCashFlow Annual cash flow before taxes (rent - expenses - debt service)
 * @param totalCashInvested Total cash invested (down payment + closing + rehab)
 * @returns Cash-on-cash return as decimal (e.g., 0.132 = 13.2%)
 */
export function calculateCashOnCash(
  annualCashFlow: number,
  totalCashInvested: number
): number {
  // Prevent division by zero
  if (totalCashInvested <= 0) return 0;

  // Simple ratio: annual cash income / cash invested
  // This is the "levered" return (accounts for debt if any)
  return annualCashFlow / totalCashInvested;
}

/**
 * Calculate instant equity (immediate gain on purchase)
 *
 * @param marketValue Current market value
 * @param purchasePrice Purchase price (including closing costs)
 * @returns Instant equity amount
 */
export function calculateInstantEquity(
  marketValue: number,
  purchasePrice: number
): number {
  return marketValue - purchasePrice;
}

/**
 * Calculate break-even sale price (minimum sale price to recover all investment)
 *
 * FORMULA DERIVATION:
 * We need to solve for Sale Price where Net Proceeds = Total Investment
 *
 * Net Proceeds = Sale Price - Selling Costs
 * Selling Costs = Sale Price × sellingCostRate
 * Therefore: Sale Price - (Sale Price × sellingCostRate) = Total Investment
 * Factor out: Sale Price × (1 - sellingCostRate) = Total Investment
 * Solve: Sale Price = Total Investment / (1 - sellingCostRate)
 *
 * EXAMPLE:
 * - Total Investment: $100,000
 * - Selling Cost Rate: 8% (6% realtor + 2% closing)
 * - Break-even = $100,000 / (1 - 0.08) = $108,696
 * - Verification: $108,696 × 0.92 = $100,000 ✓
 *
 * BUSINESS CONTEXT:
 * Default 8% selling cost assumption based on:
 * - 6% realtor commission (typical for residential)
 * - 1-2% title, escrow, and closing costs
 * - May be higher in some markets or for commercial properties
 * - May be lower if selling FSBO or with discount broker
 *
 * @param totalInvestment Total cash invested (acquisition + rehab + holding)
 * @param sellingCostRate Selling costs as percentage of sale (default 0.08 = 8%)
 * @returns Break-even sale price
 */
export function calculateBreakEvenPrice(
  totalInvestment: number,
  sellingCostRate: number = 0.08
): number {
  // Edge case: If selling costs are 100%+, break-even is impossible (infinite)
  // This would mean you pay more in commissions than you receive from sale
  if (sellingCostRate >= 1) return Infinity;

  // Apply formula: Investment / (1 - cost rate)
  // The division effectively "grosses up" the investment to account for costs
  return totalInvestment / (1 - sellingCostRate);
}

// ============================================
// Complete ROI Analysis
// ============================================

/**
 * Perform complete ROI analysis for a property investment
 *
 * @param inputs ROI calculation inputs
 * @returns Complete ROI analysis with all metrics
 */
export function calculateROIAnalysis(inputs: ROIInputs): ROIAnalysis {
  // Calculate total investment
  const totalInvestment =
    inputs.bidAmount +
    inputs.closingCosts +
    inputs.rehabCost +
    inputs.monthlyHoldingCosts * inputs.holdingMonths;

  // Calculate expected profit
  const grossProceeds = inputs.arv;
  const netProceeds = grossProceeds - inputs.sellingCosts;
  const netProfit = netProceeds - totalInvestment;

  // Calculate ROI metrics
  const grossROI = calculateGrossROI(inputs.bidAmount, inputs.arv);
  const netROI = calculateNetROI(totalInvestment, netProfit);
  const annualizedROI = calculateAnnualizedROI(
    totalInvestment,
    totalInvestment + netProfit,
    inputs.holdingMonths
  );

  // Generate cash flows and calculate IRR
  const cashFlows = generateFlipCashFlows(inputs);
  const cashFlowAmounts = cashFlows.map((cf) => cf.amount);
  const monthlyIRR = calculateIRR(cashFlowAmounts);
  const irr = annualizeMonthlyIRR(monthlyIRR);

  // Calculate monthly IRR progression (IRR at each month if sold early)
  // This shows how IRR evolves over the holding period
  // Business context: Helps assess opportunity cost of early exit vs holding
  const irrMonthly: number[] = [];
  for (let month = 1; month <= inputs.holdingMonths; month++) {
    // Get cash flows up to this month
    const partialCashFlows = cashFlowAmounts.slice(0, month + 1);

    // For months before final sale, calculate hypothetical sale proceeds
    // Assumption: Property value increases linearly from market value to ARV
    // This is simplified; real appreciation may be step-function (post-rehab)
    if (month < inputs.holdingMonths) {
      // Linear interpolation: current value = market + (progress × gain)
      // Example: Month 3 of 6 = market + 0.5 × (ARV - market)
      const partialValue = inputs.marketValue + (inputs.arv - inputs.marketValue) * (month / inputs.holdingMonths);
      partialCashFlows[month] = partialValue - inputs.sellingCosts;
    }

    // Calculate IRR for this partial timeline
    const partialIRR = calculateIRR(partialCashFlows);
    irrMonthly.push(isNaN(partialIRR) ? 0 : annualizeMonthlyIRR(partialIRR));
  }

  // Rental analysis
  const monthlyRent = inputs.monthlyRent || 0;
  const monthlyExpenses = inputs.monthlyOperatingExpenses || 0;
  const monthlyCashFlow = monthlyRent - monthlyExpenses;
  const annualNOI = monthlyCashFlow * 12;
  const capRate = calculateCapRate(annualNOI, inputs.arv);
  const cashOnCashReturn = calculateCashOnCash(annualNOI, totalInvestment);

  // Equity analysis
  const totalPurchaseCost = inputs.bidAmount + inputs.closingCosts;
  const instantEquity = calculateInstantEquity(inputs.marketValue, totalPurchaseCost);
  const instantEquityPercent = inputs.marketValue > 0 ? instantEquity / inputs.marketValue : 0;

  // RISK-ADJUSTED RETURNS
  // Accounts for uncertainty in estimates (ARV, rehab costs, timing)
  //
  // Confidence Level (default 0.7 = 70%):
  // - 0.9+ : High confidence (recent comps, minor rehab, stable market)
  // - 0.7-0.8 : Moderate confidence (typical tax deed scenario)
  // - 0.5-0.6 : Low confidence (major unknowns, volatile market, title issues)
  // - <0.5 : Very speculative (avoid or require much higher returns)
  //
  // Business rationale: Tax deed properties have inherent uncertainties:
  // - Unknown interior condition (many sold sight-unseen)
  // - Title/lien risks (redemption periods, unclear ownership)
  // - Market timing risk (forced quick sale for liens)
  // - Repair estimate accuracy (hidden defects common)
  const confidence = inputs.confidenceLevel || 0.7;

  // Risk-Adjusted ROI = Expected ROI × Confidence Level
  // This is a simplified expected value calculation
  // Example: 50% ROI with 70% confidence → 35% risk-adjusted ROI
  // Interpretation: "We're 70% sure we'll hit 50% ROI"
  const riskAdjustedROI = netROI * confidence;

  // Confidence Range: Estimate the spread of possible outcomes
  //
  // VARIANCE CALCULATION:
  // variance = (1 - confidence) × 0.5
  //
  // Rationale for 0.5 multiplier:
  // - Lower confidence = wider outcome range
  // - 50% confidence → ±25% variance (wide uncertainty)
  // - 90% confidence → ±5% variance (tight band)
  //
  // Formula:
  // - Min = ROI × (1 - variance) = ROI × (1 - (1-confidence)×0.5)
  // - Max = ROI × (1 + variance) = ROI × (1 + (1-confidence)×0.5)
  //
  // Example: 50% ROI with 70% confidence
  // - variance = (1 - 0.7) × 0.5 = 0.15 (15%)
  // - min = 50% × (1 - 0.15) = 42.5%
  // - max = 50% × (1 + 0.15) = 57.5%
  // - range = 42.5% to 57.5% (±15% from base)
  //
  // Business context: This range helps assess downside risk
  // - Wide range = higher uncertainty = require higher ROI for safety margin
  // - Narrow range = predictable outcome = acceptable with lower ROI
  const variance = (1 - confidence) * 0.5;
  const confidenceRange = {
    min: netROI * (1 - variance),
    max: netROI * (1 + variance),
  };

  return {
    acquisitionCost: inputs.bidAmount,
    estimatedClosingCosts: inputs.closingCosts,
    estimatedMarketValue: inputs.marketValue,
    estimatedARV: inputs.arv,
    estimatedRehabCost: inputs.rehabCost,

    grossROI,
    netROI,
    annualizedROI,

    irr: isNaN(irr) ? 0 : irr,
    irrMonthly,

    monthlyRentEstimate: monthlyRent,
    monthlyCashFlow,
    capRate,
    cashOnCashReturn,

    instantEquity,
    instantEquityPercent,

    riskAdjustedROI,
    confidenceRange,
  };
}

/**
 * Generate quick investment metrics summary
 *
 * @param inputs ROI calculation inputs
 * @returns Investment metrics summary
 */
export function calculateInvestmentMetrics(inputs: ROIInputs): InvestmentMetrics {
  // TOTAL CASH REQUIRED: All money needed from pocket to execute the deal
  // Includes: acquisition, closing, rehab, AND carrying costs during hold period
  // Business context: This is the "all-in" number investors need to have liquid
  const totalCashRequired =
    inputs.bidAmount +
    inputs.closingCosts +
    inputs.rehabCost +
    inputs.monthlyHoldingCosts * inputs.holdingMonths;

  // GROSS PROFIT: Simple profit before holding and selling costs
  // Used for quick "back of napkin" deal evaluation
  const expectedGrossProfit = inputs.arv - inputs.bidAmount - inputs.closingCosts;

  // NET PROFIT: True profit after ALL costs (holding + selling)
  // This is the actual cash return the investor will receive
  const expectedNetProfit = inputs.arv - totalCashRequired - inputs.sellingCosts;

  // GROSS ROI: Percentage return before holding/selling costs
  // Example: Buy for $50k, sell for $75k = 50% gross ROI
  const grossROIPercent = calculateGrossROI(inputs.bidAmount + inputs.closingCosts, inputs.arv) * 100;

  // NET ROI: True percentage return after all costs
  // This is what actually goes in the investor's pocket
  const netROIPercent = calculateNetROI(totalCashRequired, expectedNetProfit) * 100;

  // ANNUALIZED RETURN: Time-adjusted return for comparing deals
  // Converts total return to "per year" equivalent using CAGR
  const annualizedReturn = calculateAnnualizedROI(
    totalCashRequired,
    totalCashRequired + expectedNetProfit,
    inputs.holdingMonths
  ) * 100;

  // BREAK-EVEN PRICE: Minimum sale price to not lose money
  //
  // ASSUMPTION: 8% selling costs (0.08)
  // Breakdown:
  // - 6% realtor commission (typical residential)
  // - 1-2% title, escrow, transfer taxes, closing costs
  //
  // Source: National Association of Realtors (NAR) data
  // - Median commission: 5-6% (split between buyer/seller agents)
  // - Closing costs: 1-3% depending on state/county
  //
  // Business context for tax deed sales:
  // - May be able to reduce (FSBO, discount broker) if good condition
  // - May need to increase (wholesaling, distressed buyer market)
  // - Critical metric: If ARV < break-even, deal is not viable
  const breakEvenPrice = calculateBreakEvenPrice(totalCashRequired, 0.08);

  // PROFIT PER MONTH: Average monthly profit (simple division)
  // Used to compare opportunity cost vs other investments
  // Example: $10k profit over 5 months = $2k/month
  const profitPerMonth = expectedNetProfit / inputs.holdingMonths;

  return {
    totalCashRequired,
    expectedGrossProfit,
    expectedNetProfit,
    grossROIPercent,
    netROIPercent,
    annualizedReturn,
    breakEvenPrice,
    profitPerMonth,
  };
}

/**
 * Compare ROI metrics between flip and hold strategies
 *
 * @param inputs ROI calculation inputs
 * @param holdYears Number of years to hold for rental analysis
 * @returns Comparison object with both strategies
 */
export function compareStrategies(
  inputs: ROIInputs,
  holdYears: number = 5
): {
  flip: { irr: number; netROI: number; totalProfit: number };
  hold: { irr: number; netROI: number; totalProfit: number; monthlyCashFlow: number };
} {
  // FLIP STRATEGY ANALYSIS
  // Quick turnaround: Buy → Rehab → Sell (typically 3-12 months)
  const flipCashFlows = generateFlipCashFlows(inputs);
  const flipIRR = annualizeMonthlyIRR(calculateIRR(flipCashFlows.map((cf) => cf.amount)));

  // Total investment includes holding costs (carrying costs during rehab/sale)
  const flipTotalInvestment =
    inputs.bidAmount + inputs.closingCosts + inputs.rehabCost +
    inputs.monthlyHoldingCosts * inputs.holdingMonths;

  // Profit = Sale proceeds minus all costs
  const flipProfit = inputs.arv - flipTotalInvestment - inputs.sellingCosts;
  const flipNetROI = flipProfit / flipTotalInvestment;

  // HOLD STRATEGY ANALYSIS (BUY-AND-HOLD RENTAL)
  // Long-term: Buy → Rehab → Rent → Sell later (typically 5-30 years)
  const holdCashFlows = generateHoldCashFlows(inputs, holdYears);
  const holdIRR = annualizeMonthlyIRR(calculateIRR(holdCashFlows.map((cf) => cf.amount)));

  // Calculate monthly net cash flow (rent - expenses)
  const monthlyRent = inputs.monthlyRent || 0;
  const monthlyExpenses = inputs.monthlyOperatingExpenses || 0;
  const monthlyCashFlow = monthlyRent - monthlyExpenses;

  // Initial investment excludes holding costs (replaced by rental income)
  const holdInitialInvestment =
    inputs.bidAmount + inputs.closingCosts + inputs.rehabCost;

  // Total rental income over holding period
  const totalRentalIncome = monthlyCashFlow * holdYears * 12;

  // Future property value with appreciation
  //
  // CRITICAL ASSUMPTION: 3% annual appreciation (1.03 growth factor)
  // This is the SAME assumption as in generateHoldCashFlows()
  //
  // Source/Rationale (repeated for visibility):
  // - Historical U.S. average: 3-4% annually (Case-Shiller Index)
  // - Conservative baseline for diversified markets
  // - Excludes bubble/bust cycles (2008 crash, 2020-2022 surge)
  //
  // Business context: For tax deed buy-and-hold strategy
  // - Appreciation is CRITICAL to returns (often exceeds rental income)
  // - Example: $100k property × 1.03^5 = $115,927 (16% gain from appreciation)
  // - Plus rental income: 5 years × $500/mo × 12 = $30,000
  // - Total return: $45,927 (appreciation + rent) vs $15,927 (appreciation only)
  //
  // Risk factors for tax deed properties:
  // - May be in declining neighborhoods (lower/negative appreciation)
  // - May be in gentrifying areas (higher appreciation)
  // - Adjust this assumption based on local market research
  const appreciatedValue = inputs.arv * Math.pow(1.03, holdYears);

  // Total profit = Appreciation + Rental Income - Selling Costs
  const holdProfit = appreciatedValue - holdInitialInvestment + totalRentalIncome - inputs.sellingCosts;
  const holdNetROI = holdProfit / holdInitialInvestment;

  return {
    flip: {
      irr: isNaN(flipIRR) ? 0 : flipIRR,
      netROI: flipNetROI,
      totalProfit: flipProfit,
    },
    hold: {
      irr: isNaN(holdIRR) ? 0 : holdIRR,
      netROI: holdNetROI,
      totalProfit: holdProfit,
      monthlyCashFlow,
    },
  };
}

// ============================================
// Utility Functions
// ============================================

/**
 * Format ROI as percentage string
 *
 * @param roi ROI as decimal
 * @param decimals Number of decimal places
 * @returns Formatted percentage string
 */
export function formatROIPercent(roi: number, decimals: number = 1): string {
  if (isNaN(roi) || !isFinite(roi)) return 'N/A';
  return `${(roi * 100).toFixed(decimals)}%`;
}

/**
 * Format currency value
 *
 * @param value Dollar amount
 * @returns Formatted currency string
 */
export function formatCurrency(value: number): string {
  if (isNaN(value) || !isFinite(value)) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Validate ROI inputs
 *
 * @param inputs ROI inputs to validate
 * @returns Array of validation error messages
 */
export function validateROIInputs(inputs: Partial<ROIInputs>): string[] {
  const errors: string[] = [];

  if (!inputs.bidAmount || inputs.bidAmount <= 0) {
    errors.push('Bid amount must be greater than zero');
  }

  if (!inputs.arv || inputs.arv <= 0) {
    errors.push('ARV must be greater than zero');
  }

  if (inputs.arv && inputs.bidAmount && inputs.arv < inputs.bidAmount) {
    errors.push('Warning: ARV is less than bid amount - verify this is intentional');
  }

  if (!inputs.holdingMonths || inputs.holdingMonths <= 0) {
    errors.push('Holding period must be at least 1 month');
  }

  if (inputs.holdingMonths && inputs.holdingMonths > 60) {
    errors.push('Warning: Holding period exceeds 5 years - projections may be less accurate');
  }

  if (inputs.rehabCost && inputs.rehabCost < 0) {
    errors.push('Rehab cost cannot be negative');
  }

  return errors;
}

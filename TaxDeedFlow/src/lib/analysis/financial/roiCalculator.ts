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

/** Maximum iterations for Newton-Raphson IRR calculation */
const MAX_IRR_ITERATIONS = 100;

/** Convergence tolerance for IRR calculation */
const IRR_TOLERANCE = 0.0001;

/** Initial IRR guess (10%) */
const INITIAL_IRR_GUESS = 0.1;

/** Minimum IRR bound for calculation */
const MIN_IRR_BOUND = -0.99;

/** Maximum IRR bound for calculation */
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
    if (discountRate === -1 && period > 0) {
      return Infinity;
    }
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
    if (period === 0) return derivative; // First period has no contribution to derivative
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
  // Validate input
  if (cashFlows.length < 2) {
    return NaN;
  }

  // Check if there's a sign change (required for IRR to exist)
  const hasPositive = cashFlows.some((cf) => cf > 0);
  const hasNegative = cashFlows.some((cf) => cf < 0);
  if (!hasPositive || !hasNegative) {
    return NaN; // No IRR exists without sign change
  }

  let irr = INITIAL_IRR_GUESS;

  for (let i = 0; i < maxIterations; i++) {
    const npv = calculateNPV(cashFlows, irr);
    const npvDerivative = calculateNPVDerivative(cashFlows, irr);

    // Check if derivative is too small (would cause instability)
    if (Math.abs(npvDerivative) < tolerance) {
      // Try bisection method as fallback
      return calculateIRRBisection(cashFlows);
    }

    // Newton-Raphson step
    const newIRR = irr - npv / npvDerivative;

    // Check for convergence
    if (Math.abs(newIRR - irr) < tolerance) {
      // Verify the solution is within reasonable bounds
      if (newIRR >= MIN_IRR_BOUND && newIRR <= MAX_IRR_BOUND) {
        return newIRR;
      }
    }

    // Bound the IRR to prevent divergence
    irr = Math.max(MIN_IRR_BOUND, Math.min(MAX_IRR_BOUND, newIRR));
  }

  // If Newton-Raphson didn't converge, try bisection method
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
function calculateIRRBisection(cashFlows: number[]): number {
  let lowerBound = MIN_IRR_BOUND;
  let upperBound = MAX_IRR_BOUND;

  // Find initial bounds where NPV changes sign
  let npvLower = calculateNPV(cashFlows, lowerBound);
  let npvUpper = calculateNPV(cashFlows, upperBound);

  // If NPV doesn't change sign, no IRR exists in this range
  if (npvLower * npvUpper > 0) {
    return NaN;
  }

  // Bisection iteration
  for (let i = 0; i < MAX_IRR_ITERATIONS; i++) {
    const midpoint = (lowerBound + upperBound) / 2;
    const npvMid = calculateNPV(cashFlows, midpoint);

    if (Math.abs(npvMid) < IRR_TOLERANCE || (upperBound - lowerBound) / 2 < IRR_TOLERANCE) {
      return midpoint;
    }

    if (npvMid * npvLower < 0) {
      upperBound = midpoint;
      npvUpper = npvMid;
    } else {
      lowerBound = midpoint;
      npvLower = npvMid;
    }
  }

  return (lowerBound + upperBound) / 2;
}

/**
 * Convert monthly IRR to annualized IRR
 *
 * @param monthlyIRR Monthly IRR as decimal
 * @returns Annualized IRR
 */
export function annualizeMonthlyIRR(monthlyIRR: number): number {
  return Math.pow(1 + monthlyIRR, 12) - 1;
}

/**
 * Convert annualized IRR to monthly IRR
 *
 * @param annualIRR Annual IRR as decimal
 * @returns Monthly IRR
 */
export function monthlyFromAnnualIRR(annualIRR: number): number {
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

  // Month 0: Initial investment (acquisition + closing + rehab upfront)
  const initialInvestment =
    -(inputs.bidAmount + inputs.closingCosts + inputs.rehabCost);
  cashFlows.push({
    month: 0,
    amount: initialInvestment,
    description: 'Initial investment (acquisition + closing + rehab)',
  });

  // Months 1 to holdingMonths-1: Monthly holding costs
  for (let month = 1; month < inputs.holdingMonths; month++) {
    cashFlows.push({
      month,
      amount: -inputs.monthlyHoldingCosts,
      description: `Monthly holding costs (month ${month})`,
    });
  }

  // Final month: Sale proceeds minus selling costs minus final holding cost
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
  const monthlyRent = inputs.monthlyRent || 0;
  const monthlyExpenses = inputs.monthlyOperatingExpenses || 0;
  const monthlyCashFlow = monthlyRent - monthlyExpenses;

  // Month 0: Initial investment
  const initialInvestment =
    -(inputs.bidAmount + inputs.closingCosts + inputs.rehabCost);
  cashFlows.push({
    month: 0,
    amount: initialInvestment,
    description: 'Initial investment (acquisition + closing + rehab)',
  });

  const totalMonths = holdYears * 12;

  // Monthly rental income (net of expenses)
  for (let month = 1; month < totalMonths; month++) {
    cashFlows.push({
      month,
      amount: monthlyCashFlow,
      description: `Monthly rental cash flow (month ${month})`,
    });
  }

  // Final month: Sale + last month's rent
  // Assume 3% annual appreciation for hold period
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
 * @param totalInvestment Initial investment
 * @param finalValue Final value (investment + profit)
 * @param holdingMonths Holding period in months
 * @returns Annualized ROI as decimal
 */
export function calculateAnnualizedROI(
  totalInvestment: number,
  finalValue: number,
  holdingMonths: number
): number {
  if (totalInvestment <= 0 || holdingMonths <= 0) return 0;
  const years = holdingMonths / 12;
  return Math.pow(finalValue / totalInvestment, 1 / years) - 1;
}

/**
 * Calculate capitalization rate
 *
 * Cap Rate = Net Operating Income / Property Value
 *
 * @param annualNOI Annual net operating income
 * @param propertyValue Property value
 * @returns Cap rate as decimal
 */
export function calculateCapRate(
  annualNOI: number,
  propertyValue: number
): number {
  if (propertyValue <= 0) return 0;
  return annualNOI / propertyValue;
}

/**
 * Calculate cash-on-cash return
 *
 * CoC = Annual Pre-Tax Cash Flow / Total Cash Invested
 *
 * @param annualCashFlow Annual cash flow before taxes
 * @param totalCashInvested Total cash invested (including down payment, closing, rehab)
 * @returns Cash-on-cash return as decimal
 */
export function calculateCashOnCash(
  annualCashFlow: number,
  totalCashInvested: number
): number {
  if (totalCashInvested <= 0) return 0;
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
 * Calculate break-even sale price
 *
 * Break-even = Total Investment + Selling Costs
 * Accounting for selling costs as % of sale price requires solving:
 * Sale * (1 - commissionRate) = Total Investment
 *
 * @param totalInvestment Total cash invested
 * @param sellingCostRate Selling costs as percentage of sale (e.g., 0.08 for 8%)
 * @returns Break-even sale price
 */
export function calculateBreakEvenPrice(
  totalInvestment: number,
  sellingCostRate: number = 0.08
): number {
  if (sellingCostRate >= 1) return Infinity;
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

  // Calculate monthly IRR progression
  const irrMonthly: number[] = [];
  for (let month = 1; month <= inputs.holdingMonths; month++) {
    const partialCashFlows = cashFlowAmounts.slice(0, month + 1);
    // Add hypothetical sale at current month for partial IRR
    if (month < inputs.holdingMonths) {
      const partialValue = inputs.marketValue + (inputs.arv - inputs.marketValue) * (month / inputs.holdingMonths);
      partialCashFlows[month] = partialValue - inputs.sellingCosts;
    }
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

  // Risk-adjusted returns
  const confidence = inputs.confidenceLevel || 0.7;
  const riskAdjustedROI = netROI * confidence;
  const variance = (1 - confidence) * 0.5; // Higher uncertainty = wider range
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
  const totalCashRequired =
    inputs.bidAmount +
    inputs.closingCosts +
    inputs.rehabCost +
    inputs.monthlyHoldingCosts * inputs.holdingMonths;

  const expectedGrossProfit = inputs.arv - inputs.bidAmount - inputs.closingCosts;
  const expectedNetProfit = inputs.arv - totalCashRequired - inputs.sellingCosts;

  const grossROIPercent = calculateGrossROI(inputs.bidAmount + inputs.closingCosts, inputs.arv) * 100;
  const netROIPercent = calculateNetROI(totalCashRequired, expectedNetProfit) * 100;
  const annualizedReturn = calculateAnnualizedROI(
    totalCashRequired,
    totalCashRequired + expectedNetProfit,
    inputs.holdingMonths
  ) * 100;

  const breakEvenPrice = calculateBreakEvenPrice(totalCashRequired, 0.08);
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
  // Flip analysis
  const flipCashFlows = generateFlipCashFlows(inputs);
  const flipIRR = annualizeMonthlyIRR(calculateIRR(flipCashFlows.map((cf) => cf.amount)));
  const flipTotalInvestment =
    inputs.bidAmount + inputs.closingCosts + inputs.rehabCost +
    inputs.monthlyHoldingCosts * inputs.holdingMonths;
  const flipProfit = inputs.arv - flipTotalInvestment - inputs.sellingCosts;
  const flipNetROI = flipProfit / flipTotalInvestment;

  // Hold analysis
  const holdCashFlows = generateHoldCashFlows(inputs, holdYears);
  const holdIRR = annualizeMonthlyIRR(calculateIRR(holdCashFlows.map((cf) => cf.amount)));
  const monthlyRent = inputs.monthlyRent || 0;
  const monthlyExpenses = inputs.monthlyOperatingExpenses || 0;
  const monthlyCashFlow = monthlyRent - monthlyExpenses;
  const holdInitialInvestment =
    inputs.bidAmount + inputs.closingCosts + inputs.rehabCost;
  const totalRentalIncome = monthlyCashFlow * holdYears * 12;
  const appreciatedValue = inputs.arv * Math.pow(1.03, holdYears);
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

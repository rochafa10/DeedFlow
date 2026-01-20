# Phase 8B: ROI Calculator & Investment Metrics

## Overview

This implementation plan focuses specifically on the ROI (Return on Investment) calculation engine, including IRR (Internal Rate of Return) using the Newton-Raphson method, cash-on-cash returns, annualized returns, and equity buildup calculations. These metrics are critical for evaluating tax deed investment opportunities.

## Dependencies

- Phase 1: Database Schema (property_reports table)
- Phase 8: Cost Breakdown Functions (acquisition, rehab, holding, selling costs)
- Phase 6: Scoring Algorithm (for risk-adjusted returns)

## Investment Metrics Interfaces

### Core Type Definitions

```typescript
// src/lib/analysis/financial/types.ts

/**
 * Complete investment metrics for a property analysis
 */
export interface InvestmentMetrics {
  // Profitability
  grossProfit: number;          // Sale price - purchase price
  netProfit: number;            // Net proceeds - total investment
  profitMargin: number;         // Net profit as percentage of total investment

  // Returns
  roi: number;                  // Return on Investment (net profit / cash invested * 100)
  annualizedRoi: number;        // Annualized ROI using CAGR formula
  cashOnCash: number;           // Annual cash flow / cash invested (for rentals)
  irr: number;                  // Internal Rate of Return (Newton-Raphson)

  // Value Ratios
  priceToARV: number;           // Purchase price / After Repair Value
  totalInvestmentToARV: number; // All-in cost / ARV

  // Break-even Analysis
  breakEvenPrice: number;       // Minimum sale price to recover costs
  breakEvenMonths: number;      // Months to recover investment (rentals)

  // Risk-adjusted Returns
  riskAdjustedReturn: number;   // ROI adjusted by risk score factor
}

/**
 * Revenue projection for both sale and rental scenarios
 */
export interface RevenueProjection {
  // Sale Scenario
  sale: {
    estimatedARV: number;       // After Repair Value
    arvConfidence: 'low' | 'medium' | 'high';
    arvRange: { low: number; mid: number; high: number };
    projectedSalePrice: number; // Conservative sale price (95% of ARV)
    netProceeds: number;        // After selling costs
  };

  // Rental Scenario
  rental: {
    monthlyRent: number;
    annualRent: number;
    vacancyRate: number;        // Typically 5-10%
    effectiveGrossIncome: number;
    operatingExpenses: number;
    netOperatingIncome: number; // NOI
    capRate: number;            // NOI / Property Value
  };
}

/**
 * Cost breakdown for all phases of investment
 */
export interface CostBreakdown {
  acquisition: {
    purchasePrice: number;
    closingCosts: number;
    transferTaxes: number;
    auctionFees: number;
    totalAcquisition: number;
  };

  rehab: {
    estimatedTotal: number;
    breakdown: RehabBreakdown;
    contingency: number;
    confidence: 'low' | 'medium' | 'high';
  };

  holding: {
    monthlyTotal: number;
    projectedMonths: number;
    breakdown: HoldingBreakdown;
    totalHolding: number;
  };

  selling: {
    agentCommission: number;
    closingCosts: number;
    stagingMarketing: number;
    totalSelling: number;
  };

  totalInvestment: number;
}

/**
 * Inflation adjustment for multi-year projections
 */
export interface InflationAdjustment {
  baseYear: number;
  targetYear: number;
  inflationRate: number;        // Annual inflation rate (default 3%)
  adjustedValue: number;
  nominalValue: number;
}

/**
 * BRRRR Strategy Analysis (Buy, Rehab, Rent, Refinance, Repeat)
 */
export interface BRRRRAnalysis {
  initialInvestment: number;
  rehabCosts: number;
  afterRepairValue: number;
  refinanceAmount: number;      // Typically 75% of ARV
  cashOutAmount: number;        // Cash returned after refinance
  cashLeftInDeal: number;       // Remaining equity
  monthlyRent: number;
  monthlyMortgage: number;      // After refinance
  monthlyCashFlow: number;
  cashOnCashReturn: number;     // Based on cash left in deal
  infiniteReturn: boolean;      // True if all cash recovered
}
```

## ROI Calculator Implementation

### Core ROI Functions

```typescript
// src/lib/analysis/financial/roiCalculator.ts

import { CostBreakdown, RevenueProjection, InvestmentMetrics, InflationAdjustment } from './types';

/**
 * Adjust value for inflation over time
 * Uses compound growth formula: FV = PV * (1 + r)^n
 *
 * @param value - Present value to adjust
 * @param yearsFromNow - Number of years for projection
 * @param inflationRate - Annual inflation rate (default 3%)
 * @returns Inflation adjustment details
 */
export function adjustForInflation(
  value: number,
  yearsFromNow: number,
  inflationRate: number = 0.03
): InflationAdjustment {
  const currentYear = new Date().getFullYear();
  const adjustedValue = value * Math.pow(1 + inflationRate, yearsFromNow);

  return {
    baseYear: currentYear,
    targetYear: currentYear + yearsFromNow,
    inflationRate,
    nominalValue: value,
    adjustedValue,
  };
}

/**
 * Calculate real (inflation-adjusted) returns using Fisher equation
 * Formula: (1 + real) = (1 + nominal) / (1 + inflation)
 *
 * @param nominalReturn - Nominal return percentage
 * @param inflationRate - Annual inflation rate (default 3%)
 * @returns Real return percentage
 */
export function calculateRealReturn(
  nominalReturn: number,
  inflationRate: number = 0.03
): number {
  return ((1 + nominalReturn / 100) / (1 + inflationRate) - 1) * 100;
}
```

### Internal Rate of Return (IRR) - Newton-Raphson Method

```typescript
// src/lib/analysis/financial/roiCalculator.ts (continued)

/**
 * Calculate Internal Rate of Return (IRR) using Newton-Raphson iteration
 *
 * The IRR is the discount rate that makes NPV = 0
 * NPV = sum(CF_t / (1 + r)^t) = 0
 *
 * Newton-Raphson formula: r_new = r - f(r) / f'(r)
 * Where f(r) = NPV at rate r
 * And f'(r) = derivative of NPV with respect to r
 *
 * @param cashFlows - Array of cash flows (first value typically negative)
 * @param initialGuess - Starting rate estimate (default 10%)
 * @returns IRR as a percentage
 */
export function calculateIRR(
  cashFlows: number[],
  initialGuess: number = 0.1
): number {
  const maxIterations = 100;
  const tolerance = 0.0001;  // Convergence threshold

  let rate = initialGuess;

  for (let i = 0; i < maxIterations; i++) {
    // Calculate NPV and its derivative at current rate
    let npv = 0;
    let npvDerivative = 0;

    for (let t = 0; t < cashFlows.length; t++) {
      const discountFactor = Math.pow(1 + rate, t);
      npv += cashFlows[t] / discountFactor;

      // Derivative: d/dr of CF/(1+r)^t = -t * CF / (1+r)^(t+1)
      if (t > 0) {
        npvDerivative -= (t * cashFlows[t]) / Math.pow(1 + rate, t + 1);
      }
    }

    // Avoid division by zero
    if (Math.abs(npvDerivative) < 1e-10) {
      break;
    }

    // Newton-Raphson update: r_new = r - NPV / NPV'
    const newRate = rate - npv / npvDerivative;

    // Check for convergence
    if (Math.abs(newRate - rate) < tolerance) {
      return newRate * 100; // Return as percentage
    }

    rate = newRate;
  }

  return rate * 100; // Return best estimate as percentage
}

/**
 * Generate cash flow array for IRR calculation
 *
 * Cash flow structure for a flip:
 * - Month 0: Initial investment (negative)
 * - Months 1 to n-1: Monthly holding costs (negative)
 * - Month n: Sale proceeds minus final holding cost
 *
 * @param initialInvestment - Upfront cash (acquisition + rehab)
 * @param holdingMonths - Project duration in months
 * @param monthlyHoldingCosts - Monthly holding expense
 * @param saleProceeds - Net proceeds from sale
 * @returns Array of monthly cash flows
 */
export function generateCashFlows(
  initialInvestment: number,
  holdingMonths: number,
  monthlyHoldingCosts: number,
  saleProceeds: number
): number[] {
  const cashFlows: number[] = [];

  // Initial investment (negative - cash out)
  cashFlows.push(-initialInvestment);

  // Monthly holding costs (negative)
  for (let month = 1; month < holdingMonths; month++) {
    cashFlows.push(-monthlyHoldingCosts);
  }

  // Final month: sale proceeds minus last holding cost
  cashFlows.push(saleProceeds - monthlyHoldingCosts);

  return cashFlows;
}
```

### ROI and Cash-on-Cash Return Calculations

```typescript
// src/lib/analysis/financial/roiCalculator.ts (continued)

/**
 * Calculate all investment metrics for a property
 *
 * Key calculations:
 * - ROI = Net Profit / Cash Invested * 100
 * - Annualized ROI uses CAGR: (1 + ROI)^(1/years) - 1
 * - Cash-on-Cash = Annual Cash Flow / Cash Invested * 100
 * - IRR uses Newton-Raphson iteration on cash flows
 *
 * @param costs - Complete cost breakdown
 * @param revenue - Revenue projections (sale and rental)
 * @param riskScore - Risk score from 0-25 (higher = lower risk)
 * @param holdingMonths - Expected project duration
 * @returns Complete investment metrics
 */
export function calculateInvestmentMetrics(
  costs: CostBreakdown,
  revenue: RevenueProjection,
  riskScore: number = 15,
  holdingMonths: number = 6
): InvestmentMetrics {
  const { totalInvestment } = costs;
  const { sale, rental } = revenue;

  // Cash invested = out-of-pocket cash (acquisition + rehab)
  // This is the correct denominator for ROI - excludes selling costs
  // which are paid from sale proceeds, not upfront
  const cashInvested = costs.acquisition.totalAcquisition + costs.rehab.estimatedTotal;

  // ═══════════════════════════════════════════════════════════
  // PROFITABILITY METRICS
  // ═══════════════════════════════════════════════════════════

  // Gross Profit = Sale Price - Purchase Price
  const grossProfit = sale.projectedSalePrice - costs.acquisition.purchasePrice;

  // Net Profit = Net Proceeds - Total Investment (all-in cost)
  const netProfit = sale.netProceeds - totalInvestment;

  // Profit Margin = Net Profit / Total Investment * 100
  const profitMargin = (netProfit / totalInvestment) * 100;

  // ═══════════════════════════════════════════════════════════
  // RETURN METRICS
  // ═══════════════════════════════════════════════════════════

  // ROI = Net Profit / Cash Invested * 100
  // Uses cash invested (not total investment) as denominator
  const roi = (netProfit / cashInvested) * 100;

  // Annualized ROI using CAGR formula
  const yearsHeld = holdingMonths / 12;
  let annualizedRoi: number;

  if (yearsHeld >= 1) {
    // Standard CAGR: (1 + ROI)^(1/years) - 1
    annualizedRoi = (Math.pow(1 + roi / 100, 1 / yearsHeld) - 1) * 100;
  } else if (yearsHeld > 0) {
    // For short holds < 1 year, calculate monthly return and compound
    const monthlyReturn = roi / holdingMonths;
    annualizedRoi = (Math.pow(1 + monthlyReturn / 100, 12) - 1) * 100;
  } else {
    annualizedRoi = roi;
  }

  // IRR Calculation using Newton-Raphson
  const initialOutlay = cashInvested;
  const monthlyHoldingCost = costs.holding.monthlyTotal;
  const cashFlows = generateCashFlows(
    initialOutlay,
    holdingMonths,
    monthlyHoldingCost,
    sale.netProceeds
  );
  const irr = calculateIRR(cashFlows);

  // Cash-on-Cash Return (primarily for rental scenario)
  // Formula: Annual Cash Flow / Cash Invested * 100
  const annualCashFlow = rental.netOperatingIncome;
  const cashOnCash = cashInvested > 0 ? (annualCashFlow / cashInvested) * 100 : 0;

  // ═══════════════════════════════════════════════════════════
  // VALUE RATIOS
  // ═══════════════════════════════════════════════════════════

  // Price to ARV Ratio (lower is better, target < 70%)
  const priceToARV = sale.estimatedARV > 0
    ? costs.acquisition.purchasePrice / sale.estimatedARV
    : 1;

  // Total Investment to ARV (all-in ratio)
  const totalInvestmentToARV = sale.estimatedARV > 0
    ? totalInvestment / sale.estimatedARV
    : 1;

  // ═══════════════════════════════════════════════════════════
  // BREAK-EVEN ANALYSIS
  // ═══════════════════════════════════════════════════════════

  // Break-even Price: minimum sale price to recover cash invested
  // Net proceeds = salePrice * (1 - commission - closing%) - staging
  // Set equal to cashInvested and solve for salePrice
  const commissionRate = 0.06;   // 6% agent commission
  const closingRate = 0.015;     // 1.5% seller closing costs
  const stagingCost = 2000;      // Staging and marketing
  const breakEvenPrice = (cashInvested + stagingCost) / (1 - commissionRate - closingRate);

  // Break-even months for rental (time to recover investment)
  const monthlyNetCashFlow = rental.netOperatingIncome / 12;
  const breakEvenMonths = monthlyNetCashFlow > 0
    ? cashInvested / monthlyNetCashFlow
    : Infinity;

  // ═══════════════════════════════════════════════════════════
  // RISK-ADJUSTED RETURN
  // ═══════════════════════════════════════════════════════════

  // Risk score 0-25: 0 = high risk, 25 = low risk
  // Adjust ROI by risk factor ranging 0.5 to 1.5
  const riskFactor = 0.5 + (riskScore / 25);  // 0.5 to 1.5
  const riskAdjustedReturn = roi * riskFactor;

  return {
    grossProfit,
    netProfit,
    profitMargin,
    roi,
    annualizedRoi,
    cashOnCash,
    irr,
    priceToARV,
    totalInvestmentToARV,
    breakEvenPrice,
    breakEvenMonths,
    riskAdjustedReturn,
  };
}
```

### ARV and Rental Projection Calculators

```typescript
// src/lib/analysis/financial/roiCalculator.ts (continued)

import { ComparableSale } from './types';

/**
 * Calculate After Repair Value (ARV) from comparable sales
 *
 * Uses weighted average based on similarity scores
 * Confidence determined by:
 * - Number of comparables (5+ = high)
 * - Average similarity score (>70 = high)
 * - Price spread (<20% = high)
 *
 * @param comparables - Array of adjusted comparable sales
 * @param subjectProperty - Subject property characteristics
 * @returns Sale revenue projection with ARV range
 */
export function calculateARV(
  comparables: ComparableSale[],
  subjectProperty: { sqft: number; bedrooms: number; bathrooms: number }
): RevenueProjection['sale'] {
  if (comparables.length === 0) {
    return {
      estimatedARV: 0,
      arvConfidence: 'low',
      arvRange: { low: 0, mid: 0, high: 0 },
      projectedSalePrice: 0,
      netProceeds: 0,
    };
  }

  // Use adjusted prices from comparables
  const adjustedPrices = comparables.map(c => c.adjustedPrice);

  // Calculate statistics
  const sorted = [...adjustedPrices].sort((a, b) => a - b);
  const low = sorted[0];
  const high = sorted[sorted.length - 1];
  const mid = adjustedPrices.reduce((a, b) => a + b, 0) / adjustedPrices.length;

  // Weight by similarity score for more accurate estimate
  const weightedSum = comparables.reduce(
    (sum, c) => sum + c.adjustedPrice * c.similarityScore,
    0
  );
  const totalWeight = comparables.reduce((sum, c) => sum + c.similarityScore, 0);
  const weightedARV = totalWeight > 0 ? weightedSum / totalWeight : mid;

  // Determine confidence level
  const avgSimilarity = totalWeight / comparables.length;
  const priceSpread = (high - low) / mid;

  let confidence: 'low' | 'medium' | 'high' = 'low';
  if (comparables.length >= 5 && avgSimilarity > 70 && priceSpread < 0.2) {
    confidence = 'high';
  } else if (comparables.length >= 3 && avgSimilarity > 50 && priceSpread < 0.35) {
    confidence = 'medium';
  }

  // Project conservative sale price (95% of ARV)
  const projectedSalePrice = weightedARV * 0.95;

  // Net proceeds (after 6% total selling costs)
  const netProceeds = projectedSalePrice * 0.94;

  return {
    estimatedARV: weightedARV,
    arvConfidence: confidence,
    arvRange: { low, mid, high },
    projectedSalePrice,
    netProceeds,
  };
}

/**
 * Calculate rental income projection
 *
 * Uses 1% rule as baseline (0.9% conservative)
 * Accounts for vacancy, management, and operating expenses
 *
 * @param estimatedARV - After repair value
 * @param monthlyTaxes - Monthly property taxes
 * @param monthlyInsurance - Monthly insurance cost
 * @param state - State code for regional adjustments
 * @returns Rental revenue projection
 */
export function calculateRentalProjection(
  estimatedARV: number,
  monthlyTaxes: number,
  monthlyInsurance: number,
  state: string
): RevenueProjection['rental'] {
  // Rent estimate: 0.8-1.2% of value monthly
  // Use 0.9% as conservative estimate
  const monthlyRent = estimatedARV * 0.009;
  const annualRent = monthlyRent * 12;

  // Vacancy rate (8% average)
  const vacancyRate = 0.08;
  const effectiveGrossIncome = annualRent * (1 - vacancyRate);

  // Operating expenses breakdown
  const propertyManagement = annualRent * 0.10;  // 10% of rent
  const maintenance = annualRent * 0.05;         // 5% of rent
  const annualTaxes = monthlyTaxes * 12;
  const annualInsurance = monthlyInsurance * 12;

  const operatingExpenses =
    propertyManagement +
    maintenance +
    annualTaxes +
    annualInsurance;

  // Net Operating Income (NOI)
  const netOperatingIncome = effectiveGrossIncome - operatingExpenses;

  // Cap Rate = NOI / Property Value
  const capRate = (netOperatingIncome / estimatedARV) * 100;

  return {
    monthlyRent,
    annualRent,
    vacancyRate,
    effectiveGrossIncome,
    operatingExpenses,
    netOperatingIncome,
    capRate,
  };
}
```

### Equity Buildup Calculator

```typescript
// src/lib/analysis/financial/equityCalculator.ts

/**
 * Calculate equity buildup over time for rental properties
 * Includes: principal paydown, appreciation, and initial equity
 */

export interface EquityBuildupResult {
  year: number;
  initialEquity: number;
  principalPaid: number;
  appreciation: number;
  totalEquity: number;
  loanBalance: number;
  propertyValue: number;
  equityPercent: number;
}

export interface EquityBuildupSummary {
  yearByYear: EquityBuildupResult[];
  totalEquityYear5: number;
  totalEquityYear10: number;
  averageAnnualGrowth: number;
  wealthMultiplier: number;  // Final equity / initial equity
}

/**
 * Calculate equity buildup over multiple years
 *
 * Equity components:
 * 1. Initial equity (down payment + closing costs paid)
 * 2. Principal paydown (portion of mortgage going to principal)
 * 3. Appreciation (property value increase over time)
 *
 * @param purchasePrice - Property purchase price
 * @param downPayment - Initial down payment
 * @param loanAmount - Mortgage amount
 * @param interestRate - Annual interest rate
 * @param appreciationRate - Annual appreciation rate (default 3%)
 * @param years - Years to project
 * @returns Year-by-year equity buildup
 */
export function calculateEquityBuildup(
  purchasePrice: number,
  downPayment: number,
  loanAmount: number,
  interestRate: number,
  appreciationRate: number = 0.03,
  years: number = 10
): EquityBuildupSummary {
  const yearByYear: EquityBuildupResult[] = [];

  // Calculate monthly payment
  const monthlyRate = interestRate / 12;
  const termMonths = 360; // 30-year mortgage
  const monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
                         (Math.pow(1 + monthlyRate, termMonths) - 1);

  let currentBalance = loanAmount;
  let currentValue = purchasePrice;
  let totalPrincipalPaid = 0;

  const initialEquity = downPayment;

  for (let year = 1; year <= years; year++) {
    // Calculate principal paid this year
    let yearPrincipal = 0;
    for (let month = 1; month <= 12; month++) {
      const interestPayment = currentBalance * monthlyRate;
      const principalPayment = monthlyPayment - interestPayment;
      yearPrincipal += principalPayment;
      currentBalance -= principalPayment;
    }
    totalPrincipalPaid += yearPrincipal;

    // Property appreciation
    currentValue = currentValue * (1 + appreciationRate);
    const totalAppreciation = currentValue - purchasePrice;

    // Total equity = initial + principal + appreciation
    const totalEquity = initialEquity + totalPrincipalPaid + totalAppreciation;
    const equityPercent = (totalEquity / currentValue) * 100;

    yearByYear.push({
      year,
      initialEquity,
      principalPaid: totalPrincipalPaid,
      appreciation: totalAppreciation,
      totalEquity,
      loanBalance: Math.max(0, currentBalance),
      propertyValue: currentValue,
      equityPercent,
    });
  }

  // Summary calculations
  const totalEquityYear5 = yearByYear[4]?.totalEquity || 0;
  const totalEquityYear10 = yearByYear[9]?.totalEquity || 0;

  const finalEquity = yearByYear[years - 1]?.totalEquity || initialEquity;
  const averageAnnualGrowth = ((finalEquity / initialEquity) ** (1 / years) - 1) * 100;
  const wealthMultiplier = finalEquity / initialEquity;

  return {
    yearByYear,
    totalEquityYear5,
    totalEquityYear10,
    averageAnnualGrowth,
    wealthMultiplier,
  };
}

/**
 * Calculate forced equity through renovation (BRRRR)
 *
 * Forced equity = ARV - Purchase Price - Rehab Costs
 *
 * @param purchasePrice - Property purchase price
 * @param rehabCosts - Total rehabilitation costs
 * @param afterRepairValue - Property value after repairs
 * @returns Forced equity amount and percentage
 */
export function calculateForcedEquity(
  purchasePrice: number,
  rehabCosts: number,
  afterRepairValue: number
): {
  forcedEquity: number;
  equityPercent: number;
  valueAdded: number;
  valueAddedPercent: number;
} {
  const totalInvestment = purchasePrice + rehabCosts;
  const forcedEquity = afterRepairValue - totalInvestment;
  const equityPercent = (forcedEquity / afterRepairValue) * 100;

  const valueAdded = afterRepairValue - purchasePrice;
  const valueAddedPercent = (valueAdded / purchasePrice) * 100;

  return {
    forcedEquity,
    equityPercent,
    valueAdded,
    valueAddedPercent,
  };
}
```

## UI Components

### Investment Metrics Card

```typescript
// src/components/reports/sections/InvestmentMetricsCard.tsx

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  Calculator,
  Clock,
  Target,
  AlertCircle,
} from 'lucide-react';
import { InvestmentMetrics } from '@/lib/analysis/financial/types';
import { formatCurrency, formatPercent } from '@/lib/utils/format';

interface InvestmentMetricsCardProps {
  metrics: InvestmentMetrics;
  holdingMonths: number;
}

export function InvestmentMetricsCard({ metrics, holdingMonths }: InvestmentMetricsCardProps) {
  // Determine metric status (good/neutral/warning)
  const getMetricStatus = (metric: string, value: number): 'good' | 'neutral' | 'warning' => {
    const thresholds: Record<string, { good: number; warning: number }> = {
      roi: { good: 25, warning: 10 },
      annualizedRoi: { good: 40, warning: 15 },
      cashOnCash: { good: 10, warning: 5 },
      irr: { good: 20, warning: 8 },
      profitMargin: { good: 20, warning: 10 },
      priceToARV: { good: 0.65, warning: 0.80 },
    };

    const t = thresholds[metric];
    if (!t) return 'neutral';

    if (metric === 'priceToARV') {
      // Lower is better for price-to-ARV
      return value <= t.good ? 'good' : value >= t.warning ? 'warning' : 'neutral';
    }
    return value >= t.good ? 'good' : value <= t.warning ? 'warning' : 'neutral';
  };

  const statusColors = {
    good: 'text-green-600 bg-green-50 border-green-200',
    neutral: 'text-blue-600 bg-blue-50 border-blue-200',
    warning: 'text-amber-600 bg-amber-50 border-amber-200',
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Investment Returns
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Primary Returns Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricTile
            label="ROI"
            value={formatPercent(metrics.roi)}
            icon={TrendingUp}
            status={getMetricStatus('roi', metrics.roi)}
            tooltip="Return on Investment: Net profit as percentage of cash invested"
          />
          <MetricTile
            label="Annualized ROI"
            value={formatPercent(metrics.annualizedRoi)}
            icon={TrendingUp}
            status={getMetricStatus('annualizedRoi', metrics.annualizedRoi)}
            tooltip="ROI converted to annual rate using CAGR formula"
          />
          <MetricTile
            label="IRR"
            value={formatPercent(metrics.irr)}
            icon={Percent}
            status={getMetricStatus('irr', metrics.irr)}
            tooltip="Internal Rate of Return: Discount rate where NPV equals zero"
          />
          <MetricTile
            label="Cash-on-Cash"
            value={formatPercent(metrics.cashOnCash)}
            icon={DollarSign}
            status={getMetricStatus('cashOnCash', metrics.cashOnCash)}
            tooltip="Annual cash flow divided by total cash invested"
          />
        </div>

        {/* Profitability Section */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-gray-600">Profitability</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500">Gross Profit</div>
              <div className={`text-lg font-semibold ${metrics.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(metrics.grossProfit)}
              </div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500">Net Profit</div>
              <div className={`text-lg font-semibold ${metrics.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(metrics.netProfit)}
              </div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500">Profit Margin</div>
              <div className={`text-lg font-semibold ${metrics.profitMargin >= 15 ? 'text-green-600' : 'text-amber-600'}`}>
                {formatPercent(metrics.profitMargin)}
              </div>
            </div>
          </div>
        </div>

        {/* Value Ratios */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-gray-600">Value Ratios</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Price to ARV</span>
              <div className="flex items-center gap-2">
                <Progress
                  value={Math.min(metrics.priceToARV * 100, 100)}
                  className="w-24 h-2"
                />
                <span className={`text-sm font-medium ${metrics.priceToARV <= 0.70 ? 'text-green-600' : 'text-amber-600'}`}>
                  {formatPercent(metrics.priceToARV * 100)}
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Target: Below 70% for healthy margin
            </p>

            <div className="flex items-center justify-between mt-3">
              <span className="text-sm">Total Investment to ARV</span>
              <div className="flex items-center gap-2">
                <Progress
                  value={Math.min(metrics.totalInvestmentToARV * 100, 100)}
                  className="w-24 h-2"
                />
                <span className={`text-sm font-medium ${metrics.totalInvestmentToARV <= 0.80 ? 'text-green-600' : 'text-amber-600'}`}>
                  {formatPercent(metrics.totalInvestmentToARV * 100)}
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Target: Below 80% for profit buffer
            </p>
          </div>
        </div>

        {/* Break-even Analysis */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-gray-600">Break-even Analysis</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 border rounded-lg">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <Target className="h-4 w-4" />
                <span className="text-xs">Break-even Sale Price</span>
              </div>
              <div className="text-lg font-semibold">
                {formatCurrency(metrics.breakEvenPrice)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Minimum price to recover all costs
              </p>
            </div>
            <div className="p-3 border rounded-lg">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <Clock className="h-4 w-4" />
                <span className="text-xs">Break-even (Rental)</span>
              </div>
              <div className="text-lg font-semibold">
                {metrics.breakEvenMonths === Infinity
                  ? 'N/A'
                  : `${Math.round(metrics.breakEvenMonths)} months`}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Time to recover investment
              </p>
            </div>
          </div>
        </div>

        {/* Risk-adjusted Return */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-gray-600" />
              <span className="font-medium">Risk-Adjusted Return</span>
            </div>
            <span className={`text-xl font-bold ${metrics.riskAdjustedReturn >= 20 ? 'text-green-600' : 'text-amber-600'}`}>
              {formatPercent(metrics.riskAdjustedReturn)}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            ROI adjusted for property risk factors. Higher risk = lower adjusted return.
          </p>
        </div>

        {/* Timeline Note */}
        <div className="text-center text-sm text-gray-500">
          Based on {holdingMonths} month holding period
        </div>
      </CardContent>
    </Card>
  );
}

function MetricTile({
  label,
  value,
  icon: Icon,
  status,
  tooltip,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  status: 'good' | 'neutral' | 'warning';
  tooltip: string;
}) {
  const statusColors = {
    good: 'bg-green-50 border-green-200',
    neutral: 'bg-blue-50 border-blue-200',
    warning: 'bg-amber-50 border-amber-200',
  };

  const textColors = {
    good: 'text-green-700',
    neutral: 'text-blue-700',
    warning: 'text-amber-700',
  };

  return (
    <div
      className={`p-4 rounded-lg border ${statusColors[status]} transition-all hover:shadow-md cursor-help`}
      title={tooltip}
    >
      <div className="flex items-center gap-2 text-gray-600 mb-2">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${textColors[status]}`}>
        {value}
      </div>
    </div>
  );
}
```

### ROI Comparison Chart

```typescript
// src/components/reports/sections/ROIComparisonChart.tsx

'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatPercent } from '@/lib/utils/format';

interface ROIComparisonChartProps {
  roi: number;
  annualizedRoi: number;
  irr: number;
  cashOnCash: number;
  riskAdjustedReturn: number;
}

export function ROIComparisonChart({
  roi,
  annualizedRoi,
  irr,
  cashOnCash,
  riskAdjustedReturn,
}: ROIComparisonChartProps) {
  const data = [
    {
      name: 'ROI',
      value: roi,
      benchmark: 20,
      description: 'Total return on cash invested',
    },
    {
      name: 'Annualized',
      value: annualizedRoi,
      benchmark: 30,
      description: 'ROI converted to annual rate',
    },
    {
      name: 'IRR',
      value: irr,
      benchmark: 15,
      description: 'Internal Rate of Return',
    },
    {
      name: 'Cash-on-Cash',
      value: cashOnCash,
      benchmark: 8,
      description: 'Annual cash flow return',
    },
    {
      name: 'Risk-Adjusted',
      value: riskAdjustedReturn,
      benchmark: 15,
      description: 'ROI adjusted for risk',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Return Metrics Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" tickFormatter={(v) => `${v}%`} />
            <YAxis type="category" dataKey="name" width={100} />
            <Tooltip
              formatter={(value: number) => formatPercent(value)}
              labelFormatter={(label) => {
                const item = data.find(d => d.name === label);
                return item?.description || label;
              }}
            />
            <Legend />
            <Bar
              dataKey="value"
              name="Actual"
              fill="#10b981"
              radius={[0, 4, 4, 0]}
            />
            <Bar
              dataKey="benchmark"
              name="Target"
              fill="#94a3b8"
              radius={[0, 4, 4, 0]}
            />
            <ReferenceLine x={0} stroke="#000" />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-4 text-center text-sm text-gray-500">
          Green bars above gray targets indicate strong performance
        </div>
      </CardContent>
    </Card>
  );
}
```

### Equity Buildup Chart

```typescript
// src/components/reports/sections/EquityBuildupChart.tsx

'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EquityBuildupSummary } from '@/lib/analysis/financial/equityCalculator';
import { formatCurrency } from '@/lib/utils/format';

interface EquityBuildupChartProps {
  equityData: EquityBuildupSummary;
}

export function EquityBuildupChart({ equityData }: EquityBuildupChartProps) {
  const chartData = equityData.yearByYear.map(year => ({
    year: `Year ${year.year}`,
    'Initial Equity': year.initialEquity,
    'Principal Paid': year.principalPaid,
    'Appreciation': year.appreciation,
    'Total Equity': year.totalEquity,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Equity Buildup Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(value: number) => formatCurrency(value)} />
            <Legend />
            <Area
              type="monotone"
              dataKey="Initial Equity"
              stackId="1"
              stroke="#8884d8"
              fill="#8884d8"
              fillOpacity={0.6}
            />
            <Area
              type="monotone"
              dataKey="Principal Paid"
              stackId="1"
              stroke="#82ca9d"
              fill="#82ca9d"
              fillOpacity={0.6}
            />
            <Area
              type="monotone"
              dataKey="Appreciation"
              stackId="1"
              stroke="#ffc658"
              fill="#ffc658"
              fillOpacity={0.6}
            />
          </AreaChart>
        </ResponsiveContainer>

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-500">Year 5 Equity</div>
            <div className="text-lg font-semibold text-green-600">
              {formatCurrency(equityData.totalEquityYear5)}
            </div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-500">Year 10 Equity</div>
            <div className="text-lg font-semibold text-green-600">
              {formatCurrency(equityData.totalEquityYear10)}
            </div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-500">Annual Growth</div>
            <div className="text-lg font-semibold text-blue-600">
              {equityData.averageAnnualGrowth.toFixed(1)}%
            </div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-500">Wealth Multiplier</div>
            <div className="text-lg font-semibold text-purple-600">
              {equityData.wealthMultiplier.toFixed(2)}x
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

## Utility Functions

### Formatting Helpers

```typescript
// src/lib/utils/format.ts

/**
 * Format number as currency
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format number as percentage
 */
export function formatPercent(value: number): string {
  const sign = value >= 0 ? '' : '-';
  return `${sign}${Math.abs(value).toFixed(1)}%`;
}

/**
 * Format number with abbreviation (K, M, B)
 */
export function formatCompact(value: number): string {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}
```

## Testing

### Unit Tests for IRR Calculator

```typescript
// src/lib/analysis/financial/__tests__/roiCalculator.test.ts

import { describe, it, expect } from 'vitest';
import {
  calculateIRR,
  generateCashFlows,
  calculateInvestmentMetrics,
  adjustForInflation,
  calculateRealReturn,
} from '../roiCalculator';

describe('IRR Calculator', () => {
  it('calculates IRR for simple cash flows', () => {
    // Invest $100, get back $110 after 1 year = 10% IRR
    const cashFlows = [-100, 110];
    const irr = calculateIRR(cashFlows);
    expect(irr).toBeCloseTo(10, 1);
  });

  it('calculates IRR for multi-period cash flows', () => {
    // Standard example: invest $1000, receive $400 for 4 years
    const cashFlows = [-1000, 400, 400, 400, 400];
    const irr = calculateIRR(cashFlows);
    // Expected IRR is approximately 21.9%
    expect(irr).toBeCloseTo(21.9, 1);
  });

  it('handles negative IRR (loss)', () => {
    // Invest $100, get back $90 = negative IRR
    const cashFlows = [-100, 90];
    const irr = calculateIRR(cashFlows);
    expect(irr).toBeLessThan(0);
    expect(irr).toBeCloseTo(-10, 1);
  });
});

describe('Cash Flow Generator', () => {
  it('generates correct cash flow structure', () => {
    const flows = generateCashFlows(100000, 6, 1000, 120000);

    expect(flows[0]).toBe(-100000);  // Initial investment
    expect(flows.length).toBe(6);     // 6 months
    expect(flows[5]).toBe(119000);    // Sale proceeds - final holding cost
  });
});

describe('Inflation Adjustment', () => {
  it('adjusts value for inflation correctly', () => {
    const result = adjustForInflation(100000, 5, 0.03);

    expect(result.nominalValue).toBe(100000);
    expect(result.adjustedValue).toBeCloseTo(115927, 0);
    expect(result.targetYear - result.baseYear).toBe(5);
  });
});

describe('Real Return Calculator', () => {
  it('calculates real return using Fisher equation', () => {
    const nominalReturn = 10;  // 10%
    const inflation = 0.03;    // 3%

    const realReturn = calculateRealReturn(nominalReturn, inflation);

    // (1.10 / 1.03 - 1) * 100 = 6.8%
    expect(realReturn).toBeCloseTo(6.8, 1);
  });
});
```

## File Structure

```
src/lib/analysis/financial/
├── types.ts                    # Type definitions
├── roiCalculator.ts            # ROI, IRR, cash-on-cash calculations
├── equityCalculator.ts         # Equity buildup calculations
├── costEstimator.ts            # Cost breakdown (from Phase 8)
├── financingAnalysis.ts        # Loan options (from Phase 8)
├── exitStrategies.ts           # BRRRR, owner finance (from Phase 8)
└── __tests__/
    └── roiCalculator.test.ts   # Unit tests

src/components/reports/sections/
├── InvestmentMetricsCard.tsx   # Main metrics display
├── ROIComparisonChart.tsx      # Bar chart comparison
├── EquityBuildupChart.tsx      # Area chart for equity
└── FinancialSummary.tsx        # Summary card (from Phase 8)
```

## Implementation Checklist

- [ ] Create `types.ts` with all investment metric interfaces
- [ ] Implement `calculateIRR()` with Newton-Raphson method
- [ ] Implement `generateCashFlows()` for IRR input
- [ ] Implement `calculateInvestmentMetrics()` main function
- [ ] Implement `calculateARV()` for after-repair-value
- [ ] Implement `calculateRentalProjection()` for rental returns
- [ ] Implement `calculateEquityBuildup()` for long-term projections
- [ ] Implement `calculateForcedEquity()` for BRRRR analysis
- [ ] Create `InvestmentMetricsCard` component
- [ ] Create `ROIComparisonChart` component
- [ ] Create `EquityBuildupChart` component
- [ ] Add unit tests for IRR calculator
- [ ] Add unit tests for equity calculator
- [ ] Integrate with property report page

## Key Formulas Reference

| Metric | Formula | Description |
|--------|---------|-------------|
| ROI | (Net Profit / Cash Invested) * 100 | Return on cash invested |
| Annualized ROI | ((1 + ROI)^(1/years) - 1) * 100 | CAGR formula |
| IRR | Rate where NPV = 0 | Newton-Raphson iteration |
| Cash-on-Cash | (Annual Cash Flow / Cash Invested) * 100 | Annual return on cash |
| Cap Rate | (NOI / Property Value) * 100 | Rental yield |
| Break-even Price | Cash Invested / (1 - Selling Costs %) | Minimum sale price |
| Risk-Adjusted Return | ROI * (0.5 + Risk Score / 25) | ROI with risk factor |

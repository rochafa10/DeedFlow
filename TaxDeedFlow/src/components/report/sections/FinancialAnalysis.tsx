"use client";

import * as React from "react";
import {
  DollarSign,
  Calculator,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Receipt,
  Hammer,
  Clock,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ReportSection, ReportSubsection } from "../shared/ReportSection";
import { MetricDisplay, MetricGrid, ComparisonMetric } from "../shared/MetricDisplay";
import { CategoryGrade } from "../shared/GradeDisplay";
import { CostBreakdownPie, CostBreakdownList, COST_COLORS } from "../charts/CostBreakdownPie";
import { DataUnavailable, PartialDataWarning } from "../shared/ErrorState";
import { ScreenReaderOnly } from "../shared/AccessibilityHelpers";
import type { Grade } from "@/types/report";
import { formatValue } from "@/types/report";

/**
 * Acquisition costs breakdown
 */
export interface AcquisitionCosts {
  /** Starting bid / Tax amount owed */
  startingBid: number;
  /** Buyer's premium percentage */
  buyersPremiumPct?: number;
  /** Buyer's premium amount */
  buyersPremium?: number;
  /** Recording fees */
  recordingFees?: number;
  /** Title search cost */
  titleSearchCost?: number;
  /** Attorney fees */
  attorneyFees?: number;
  /** Other acquisition costs */
  otherCosts?: number;
  /** Total acquisition cost */
  total: number;
}

/**
 * Rehab/repair costs breakdown
 */
export interface RehabCosts {
  /** Structural repairs */
  structural?: number;
  /** Roof repairs */
  roof?: number;
  /** HVAC */
  hvac?: number;
  /** Plumbing */
  plumbing?: number;
  /** Electrical */
  electrical?: number;
  /** Interior (flooring, paint, etc.) */
  interior?: number;
  /** Exterior (siding, landscaping, etc.) */
  exterior?: number;
  /** Appliances */
  appliances?: number;
  /** Permits */
  permits?: number;
  /** Contingency percentage */
  contingencyPct?: number;
  /** Contingency amount */
  contingency?: number;
  /** Total rehab cost */
  total: number;
  /** Confidence level */
  confidence?: "low" | "medium" | "high";
}

/**
 * Holding costs breakdown
 */
export interface HoldingCosts {
  /** Monthly property tax */
  propertyTaxMonthly?: number;
  /** Monthly insurance */
  insuranceMonthly?: number;
  /** Monthly utilities */
  utilitiesMonthly?: number;
  /** Monthly maintenance */
  maintenanceMonthly?: number;
  /** HOA fees monthly */
  hoaMonthly?: number;
  /** Expected holding period in months */
  holdingPeriodMonths: number;
  /** Monthly total */
  monthlyTotal?: number;
  /** Total holding cost */
  total: number;
}

/**
 * Selling costs breakdown
 */
export interface SellingCosts {
  /** Agent commission percentage */
  commissionPct?: number;
  /** Agent commission amount */
  commission?: number;
  /** Closing costs percentage */
  closingCostsPct?: number;
  /** Closing costs amount */
  closingCosts?: number;
  /** Transfer taxes */
  transferTaxes?: number;
  /** Staging costs */
  staging?: number;
  /** Marketing costs */
  marketing?: number;
  /** Total selling cost */
  total: number;
}

/**
 * Props for the FinancialAnalysis component
 */
export interface FinancialAnalysisProps {
  /** Financial score (0-25) */
  score: number;
  /** Maximum score */
  maxScore?: number;
  /** Financial grade */
  grade: Grade;
  /** Acquisition costs */
  acquisitionCosts: AcquisitionCosts;
  /** Rehab costs */
  rehabCosts?: RehabCosts;
  /** Holding costs */
  holdingCosts?: HoldingCosts;
  /** Selling costs */
  sellingCosts?: SellingCosts;
  /** Total investment required */
  totalInvestment: number;
  /** Estimated market value (ARV) */
  afterRepairValue?: number;
  /** Cash required at closing */
  cashToClose?: number;
  /** Key financial factors */
  factors?: string[];
  /** Financial concerns */
  concerns?: string[];
  /** Whether section is initially collapsed */
  defaultCollapsed?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * FinancialAnalysis - Section 5: Comprehensive cost and financial analysis
 *
 * Features:
 * - Total investment breakdown
 * - Acquisition costs (bid, premium, fees)
 * - Rehab cost estimates
 * - Holding costs (taxes, insurance, utilities)
 * - Selling costs (commission, closing)
 * - Cost breakdown pie chart
 * - Cash to close calculation
 *
 * @example
 * ```tsx
 * <FinancialAnalysis
 *   score={20}
 *   grade="A-"
 *   acquisitionCosts={{
 *     startingBid: 15000,
 *     buyersPremium: 1500,
 *     recordingFees: 200,
 *     total: 16700
 *   }}
 *   rehabCosts={{ total: 25000 }}
 *   holdingCosts={{ holdingPeriodMonths: 6, total: 3000 }}
 *   sellingCosts={{ total: 12000 }}
 *   totalInvestment: 56700
 *   afterRepairValue: 125000
 * />
 * ```
 */
export function FinancialAnalysis({
  score,
  maxScore = 25,
  grade,
  acquisitionCosts,
  rehabCosts,
  holdingCosts,
  sellingCosts,
  totalInvestment,
  afterRepairValue,
  cashToClose,
  factors = [],
  concerns = [],
  defaultCollapsed = false,
  className,
}: FinancialAnalysisProps) {
  // Calculate percentage
  const percentage = Math.round((score / maxScore) * 100);

  // Prepare pie chart data
  const costBreakdownData = [
    {
      category: "Acquisition",
      amount: acquisitionCosts.total,
      color: COST_COLORS.acquisition,
    },
    ...(rehabCosts
      ? [
          {
            category: "Rehab",
            amount: rehabCosts.total,
            color: COST_COLORS.rehab,
          },
        ]
      : []),
    ...(holdingCosts
      ? [
          {
            category: "Holding",
            amount: holdingCosts.total,
            color: COST_COLORS.holding,
          },
        ]
      : []),
    ...(sellingCosts
      ? [
          {
            category: "Selling",
            amount: sellingCosts.total,
            color: COST_COLORS.selling,
          },
        ]
      : []),
  ];

  // Calculate potential profit (if ARV known)
  const potentialProfit =
    afterRepairValue !== undefined
      ? afterRepairValue - totalInvestment
      : undefined;

  const profitMargin =
    potentialProfit !== undefined && afterRepairValue
      ? (potentialProfit / afterRepairValue) * 100
      : undefined;

  // Check for missing data
  const missingData: string[] = [];
  if (!rehabCosts) missingData.push("rehab costs");
  if (!holdingCosts) missingData.push("holding costs");
  if (!sellingCosts) missingData.push("selling costs");

  return (
    <ReportSection
      id="financial-analysis"
      title="Financial Analysis"
      icon={<DollarSign className="h-5 w-5" />}
      defaultCollapsed={defaultCollapsed}
      className={className}
      headerRight={
        <div className="flex items-center gap-3">
          <CategoryGrade grade={grade} />
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {score}/{maxScore} pts
          </span>
        </div>
      }
    >
      {missingData.length > 0 && (
        <PartialDataWarning
          missingFields={missingData}
          impact="Some cost estimates may be incomplete."
          className="mb-4"
        />
      )}

      {/* Investment Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Key Metrics */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <span className="text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                Total Investment
              </span>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">
                {formatValue(totalInvestment, "currency")}
              </p>
            </div>

            {afterRepairValue !== undefined && (
              <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <span className="text-xs text-green-600 dark:text-green-400 uppercase tracking-wide">
                  After Repair Value
                </span>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300 mt-1">
                  {formatValue(afterRepairValue, "currency")}
                </p>
              </div>
            )}

            {potentialProfit !== undefined && (
              <div
                className={cn(
                  "p-4 rounded-lg border",
                  potentialProfit >= 0
                    ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
                    : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                )}
              >
                <span
                  className={cn(
                    "text-xs uppercase tracking-wide",
                    potentialProfit >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-600 dark:text-red-400"
                  )}
                >
                  Potential Profit
                </span>
                <p
                  className={cn(
                    "text-2xl font-bold mt-1",
                    potentialProfit >= 0
                      ? "text-emerald-700 dark:text-emerald-300"
                      : "text-red-700 dark:text-red-300"
                  )}
                >
                  {formatValue(potentialProfit, "currency")}
                </p>
              </div>
            )}

            {cashToClose !== undefined && (
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  Cash to Close
                </span>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {formatValue(cashToClose, "currency")}
                </p>
              </div>
            )}
          </div>

          {/* Profit Margin */}
          {profitMargin !== undefined && (
            <div className="mt-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  Profit Margin
                </span>
                <span
                  className={cn(
                    "font-semibold",
                    profitMargin >= 20
                      ? "text-green-600 dark:text-green-400"
                      : profitMargin >= 10
                      ? "text-yellow-600 dark:text-yellow-400"
                      : "text-red-600 dark:text-red-400"
                  )}
                >
                  {profitMargin.toFixed(1)}%
                </span>
              </div>
              <div className="mt-2 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    profitMargin >= 20
                      ? "bg-green-500"
                      : profitMargin >= 10
                      ? "bg-yellow-500"
                      : "bg-red-500"
                  )}
                  style={{ width: `${Math.min(profitMargin, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Cost Breakdown Chart */}
        <div className="flex flex-col items-center">
          <CostBreakdownPie
            data={costBreakdownData}
            height={200}
            showLegend={false}
            innerRadius={50}
          />
        </div>
      </div>

      {/* Acquisition Costs */}
      <ReportSubsection
        title="Acquisition Costs"
        icon={<Wallet className="h-4 w-4" />}
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <MetricDisplay
            label="Starting Bid"
            value={acquisitionCosts.startingBid}
            format="currency"
            highlight
          />
          {acquisitionCosts.buyersPremium !== undefined && (
            <MetricDisplay
              label="Buyer's Premium"
              value={acquisitionCosts.buyersPremium}
              format="currency"
              secondaryValue={
                acquisitionCosts.buyersPremiumPct
                  ? `${acquisitionCosts.buyersPremiumPct}%`
                  : undefined
              }
            />
          )}
          {acquisitionCosts.recordingFees !== undefined && (
            <MetricDisplay
              label="Recording Fees"
              value={acquisitionCosts.recordingFees}
              format="currency"
            />
          )}
          {acquisitionCosts.titleSearchCost !== undefined && (
            <MetricDisplay
              label="Title Search"
              value={acquisitionCosts.titleSearchCost}
              format="currency"
            />
          )}
          {acquisitionCosts.attorneyFees !== undefined && (
            <MetricDisplay
              label="Attorney Fees"
              value={acquisitionCosts.attorneyFees}
              format="currency"
            />
          )}
          {acquisitionCosts.otherCosts !== undefined && (
            <MetricDisplay
              label="Other Costs"
              value={acquisitionCosts.otherCosts}
              format="currency"
            />
          )}
        </div>
        <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <span className="font-medium text-slate-700 dark:text-slate-300">
            Total Acquisition
          </span>
          <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
            {formatValue(acquisitionCosts.total, "currency")}
          </span>
        </div>
      </ReportSubsection>

      {/* Rehab Costs */}
      {rehabCosts && (
        <ReportSubsection
          title="Rehab Costs"
          icon={<Hammer className="h-4 w-4" />}
          className="mt-6"
        >
          {rehabCosts.confidence && (
            <div className="mb-3 flex items-center gap-2">
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Estimate Confidence:
              </span>
              <span
                className={cn(
                  "px-2 py-0.5 text-xs rounded-full font-medium",
                  rehabCosts.confidence === "high"
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : rehabCosts.confidence === "medium"
                    ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                )}
              >
                {rehabCosts.confidence}
              </span>
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {rehabCosts.structural !== undefined && (
              <MetricDisplay label="Structural" value={rehabCosts.structural} format="currency" />
            )}
            {rehabCosts.roof !== undefined && (
              <MetricDisplay label="Roof" value={rehabCosts.roof} format="currency" />
            )}
            {rehabCosts.hvac !== undefined && (
              <MetricDisplay label="HVAC" value={rehabCosts.hvac} format="currency" />
            )}
            {rehabCosts.plumbing !== undefined && (
              <MetricDisplay label="Plumbing" value={rehabCosts.plumbing} format="currency" />
            )}
            {rehabCosts.electrical !== undefined && (
              <MetricDisplay label="Electrical" value={rehabCosts.electrical} format="currency" />
            )}
            {rehabCosts.interior !== undefined && (
              <MetricDisplay label="Interior" value={rehabCosts.interior} format="currency" />
            )}
            {rehabCosts.exterior !== undefined && (
              <MetricDisplay label="Exterior" value={rehabCosts.exterior} format="currency" />
            )}
            {rehabCosts.appliances !== undefined && (
              <MetricDisplay label="Appliances" value={rehabCosts.appliances} format="currency" />
            )}
            {rehabCosts.permits !== undefined && (
              <MetricDisplay label="Permits" value={rehabCosts.permits} format="currency" />
            )}
            {rehabCosts.contingency !== undefined && (
              <MetricDisplay
                label="Contingency"
                value={rehabCosts.contingency}
                format="currency"
                secondaryValue={
                  rehabCosts.contingencyPct ? `${rehabCosts.contingencyPct}%` : undefined
                }
              />
            )}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
            <span className="font-medium text-slate-700 dark:text-slate-300">Total Rehab</span>
            <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
              {formatValue(rehabCosts.total, "currency")}
            </span>
          </div>
        </ReportSubsection>
      )}

      {/* Holding Costs */}
      {holdingCosts && (
        <ReportSubsection
          title="Holding Costs"
          icon={<Clock className="h-4 w-4" />}
          className="mt-6"
        >
          <div className="mb-3 flex items-center gap-2">
            <span className="text-sm text-slate-500 dark:text-slate-400">
              Holding Period:
            </span>
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {holdingCosts.holdingPeriodMonths} months
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {holdingCosts.propertyTaxMonthly !== undefined && (
              <MetricDisplay
                label="Property Tax"
                value={holdingCosts.propertyTaxMonthly}
                format="currency"
                secondaryValue="/month"
              />
            )}
            {holdingCosts.insuranceMonthly !== undefined && (
              <MetricDisplay
                label="Insurance"
                value={holdingCosts.insuranceMonthly}
                format="currency"
                secondaryValue="/month"
              />
            )}
            {holdingCosts.utilitiesMonthly !== undefined && (
              <MetricDisplay
                label="Utilities"
                value={holdingCosts.utilitiesMonthly}
                format="currency"
                secondaryValue="/month"
              />
            )}
            {holdingCosts.maintenanceMonthly !== undefined && (
              <MetricDisplay
                label="Maintenance"
                value={holdingCosts.maintenanceMonthly}
                format="currency"
                secondaryValue="/month"
              />
            )}
            {holdingCosts.hoaMonthly !== undefined && (
              <MetricDisplay
                label="HOA Fees"
                value={holdingCosts.hoaMonthly}
                format="currency"
                secondaryValue="/month"
              />
            )}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
            <span className="font-medium text-slate-700 dark:text-slate-300">
              Total Holding ({holdingCosts.holdingPeriodMonths} mo)
            </span>
            <span className="text-lg font-bold text-violet-600 dark:text-violet-400">
              {formatValue(holdingCosts.total, "currency")}
            </span>
          </div>
        </ReportSubsection>
      )}

      {/* Selling Costs */}
      {sellingCosts && (
        <ReportSubsection
          title="Selling Costs"
          icon={<Receipt className="h-4 w-4" />}
          className="mt-6"
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {sellingCosts.commission !== undefined && (
              <MetricDisplay
                label="Agent Commission"
                value={sellingCosts.commission}
                format="currency"
                secondaryValue={
                  sellingCosts.commissionPct ? `${sellingCosts.commissionPct}%` : undefined
                }
              />
            )}
            {sellingCosts.closingCosts !== undefined && (
              <MetricDisplay
                label="Closing Costs"
                value={sellingCosts.closingCosts}
                format="currency"
                secondaryValue={
                  sellingCosts.closingCostsPct ? `${sellingCosts.closingCostsPct}%` : undefined
                }
              />
            )}
            {sellingCosts.transferTaxes !== undefined && (
              <MetricDisplay
                label="Transfer Taxes"
                value={sellingCosts.transferTaxes}
                format="currency"
              />
            )}
            {sellingCosts.staging !== undefined && (
              <MetricDisplay
                label="Staging"
                value={sellingCosts.staging}
                format="currency"
              />
            )}
            {sellingCosts.marketing !== undefined && (
              <MetricDisplay
                label="Marketing"
                value={sellingCosts.marketing}
                format="currency"
              />
            )}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
            <span className="font-medium text-slate-700 dark:text-slate-300">Total Selling</span>
            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {formatValue(sellingCosts.total, "currency")}
            </span>
          </div>
        </ReportSubsection>
      )}

      {/* Cost Breakdown List */}
      <ReportSubsection
        title="Cost Summary"
        icon={<Calculator className="h-4 w-4" />}
        className="mt-6"
      >
        <CostBreakdownList data={costBreakdownData} showPercentages />
      </ReportSubsection>

      {/* Factors and Concerns */}
      {(factors.length > 0 || concerns.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {factors.length > 0 && (
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <h4 className="font-medium text-green-800 dark:text-green-300 mb-2 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Financial Strengths
              </h4>
              <ul className="space-y-1">
                {factors.map((factor, idx) => (
                  <li
                    key={idx}
                    className="text-sm text-green-700 dark:text-green-400 flex items-start gap-2"
                  >
                    <span className="text-green-500">+</span>
                    {factor}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {concerns.length > 0 && (
            <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <h4 className="font-medium text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                Financial Concerns
              </h4>
              <ul className="space-y-1">
                {concerns.map((concern, idx) => (
                  <li
                    key={idx}
                    className="text-sm text-amber-700 dark:text-amber-400 flex items-start gap-2"
                  >
                    <span className="text-amber-500">-</span>
                    {concern}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Screen Reader Summary */}
      <ScreenReaderOnly>
        <div>
          <h4>Financial Analysis Summary</h4>
          <p>Total Investment: {formatValue(totalInvestment, "currency")}</p>
          {afterRepairValue && <p>After Repair Value: {formatValue(afterRepairValue, "currency")}</p>}
          {potentialProfit !== undefined && <p>Potential Profit: {formatValue(potentialProfit, "currency")}</p>}
          <table>
            <caption>Cost Breakdown</caption>
            <thead>
              <tr>
                <th>Category</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {costBreakdownData.map((item) => (
                <tr key={item.category}>
                  <td>{item.category}</td>
                  <td>{formatValue(item.amount, "currency")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ScreenReaderOnly>
    </ReportSection>
  );
}

export default FinancialAnalysis;

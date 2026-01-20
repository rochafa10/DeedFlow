"use client";

import * as React from "react";
import {
  TrendingUp,
  DollarSign,
  Percent,
  Clock,
  Target,
  PieChart,
  BarChart2,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ReportSection, ReportSubsection } from "../shared/ReportSection";
import { MetricDisplay, MetricGrid, ComparisonMetric } from "../shared/MetricDisplay";
import { CategoryGrade } from "../shared/GradeDisplay";
import { ScoreBar } from "../charts/ScoreGauge";
import { DataUnavailable } from "../shared/ErrorState";
import { ScreenReaderOnly } from "../shared/AccessibilityHelpers";
import type { Grade } from "@/types/report";
import { formatValue } from "@/types/report";

/**
 * Exit strategy option
 */
export interface ExitStrategy {
  /** Strategy name */
  name: string;
  /** Strategy type */
  type: "flip" | "wholesale" | "rental" | "hold" | "lease_option";
  /** Estimated profit */
  estimatedProfit: number;
  /** Timeline in months */
  timelineMonths: number;
  /** ROI percentage */
  roi: number;
  /** Cash on cash return */
  cashOnCash?: number;
  /** Risk level */
  riskLevel: "low" | "medium" | "high";
  /** Description */
  description?: string;
  /** Confidence level */
  confidence?: "low" | "medium" | "high";
}

/**
 * ROI breakdown
 */
export interface ROIBreakdown {
  /** Total investment */
  totalInvestment: number;
  /** Expected sale price / ARV */
  expectedSalePrice: number;
  /** Gross profit */
  grossProfit: number;
  /** Net profit (after all costs) */
  netProfit: number;
  /** ROI percentage */
  roiPercent: number;
  /** Annualized ROI */
  annualizedRoi?: number;
  /** Cash on cash return */
  cashOnCash?: number;
  /** Break-even price */
  breakEvenPrice?: number;
}

/**
 * Cash flow projection for rentals
 */
export interface CashFlowProjection {
  /** Monthly rent estimate */
  monthlyRent: number;
  /** Monthly expenses */
  monthlyExpenses: number;
  /** Monthly cash flow */
  monthlyCashFlow: number;
  /** Annual cash flow */
  annualCashFlow: number;
  /** Cap rate */
  capRate?: number;
  /** Gross rent multiplier */
  grm?: number;
}

/**
 * Props for the ProfitPotential component
 */
export interface ProfitPotentialProps {
  /** Profit score (0-25) */
  score: number;
  /** Maximum score */
  maxScore?: number;
  /** Profit grade */
  grade: Grade;
  /** ROI breakdown */
  roiBreakdown: ROIBreakdown;
  /** Exit strategies */
  exitStrategies?: ExitStrategy[];
  /** Recommended strategy */
  recommendedStrategy?: string;
  /** Cash flow projection (for rentals) */
  cashFlow?: CashFlowProjection;
  /** Key profit factors */
  factors?: string[];
  /** Profit concerns */
  concerns?: string[];
  /** Whether section is initially collapsed */
  defaultCollapsed?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Strategy type configuration
 */
const STRATEGY_CONFIG: Record<
  string,
  { label: string; icon: React.ReactNode; color: string }
> = {
  flip: {
    label: "Fix & Flip",
    icon: <TrendingUp className="h-4 w-4" />,
    color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  },
  wholesale: {
    label: "Wholesale",
    icon: <ArrowRight className="h-4 w-4" />,
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  rental: {
    label: "Buy & Hold",
    icon: <DollarSign className="h-4 w-4" />,
    color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  },
  hold: {
    label: "Long-term Hold",
    icon: <Clock className="h-4 w-4" />,
    color: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
  },
  lease_option: {
    label: "Lease Option",
    icon: <Target className="h-4 w-4" />,
    color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  },
};

/**
 * Risk level colors
 */
const RISK_COLORS: Record<string, string> = {
  low: "text-green-600 dark:text-green-400",
  medium: "text-yellow-600 dark:text-yellow-400",
  high: "text-red-600 dark:text-red-400",
};

/**
 * ProfitPotential - Section 7: ROI and profit analysis
 *
 * Features:
 * - Overall profit score and grade
 * - ROI breakdown with visual indicators
 * - Exit strategy comparison
 * - Recommended strategy highlight
 * - Cash flow projections (for rentals)
 * - Break-even analysis
 * - Profit factors and concerns
 *
 * @example
 * ```tsx
 * <ProfitPotential
 *   score={22}
 *   grade="A-"
 *   roiBreakdown={{
 *     totalInvestment: 56700,
 *     expectedSalePrice: 125000,
 *     grossProfit: 68300,
 *     netProfit: 45000,
 *     roiPercent: 79.4,
 *     annualizedRoi: 158.8,
 *   }}
 *   exitStrategies={[
 *     { name: "Fix & Flip", type: "flip", estimatedProfit: 45000, timelineMonths: 6, roi: 79.4, riskLevel: "medium" },
 *     { name: "Wholesale", type: "wholesale", estimatedProfit: 15000, timelineMonths: 1, roi: 26.5, riskLevel: "low" },
 *   ]}
 *   recommendedStrategy="flip"
 * />
 * ```
 */
export function ProfitPotential({
  score,
  maxScore = 25,
  grade,
  roiBreakdown,
  exitStrategies = [],
  recommendedStrategy,
  cashFlow,
  factors = [],
  concerns = [],
  defaultCollapsed = false,
  className,
}: ProfitPotentialProps) {
  // Calculate percentage
  const percentage = Math.round((score / maxScore) * 100);

  // Determine if ROI is good
  const isGoodRoi = roiBreakdown.roiPercent >= 20;
  const isExcellentRoi = roiBreakdown.roiPercent >= 50;

  return (
    <ReportSection
      id="profit-potential"
      title="Profit Potential"
      icon={<TrendingUp className="h-5 w-5" />}
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
      {/* ROI Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
        {/* Net Profit */}
        <div
          className={cn(
            "p-4 rounded-lg border",
            roiBreakdown.netProfit >= 0
              ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
              : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
          )}
        >
          <span
            className={cn(
              "text-xs uppercase tracking-wide",
              roiBreakdown.netProfit >= 0
                ? "text-green-600 dark:text-green-400"
                : "text-red-600 dark:text-red-400"
            )}
          >
            Est. Net Profit
          </span>
          <p
            className={cn(
              "text-2xl font-bold mt-1",
              roiBreakdown.netProfit >= 0
                ? "text-green-700 dark:text-green-300"
                : "text-red-700 dark:text-red-300"
            )}
          >
            {formatValue(roiBreakdown.netProfit, "currency")}
          </p>
        </div>

        {/* ROI Percent */}
        <div
          className={cn(
            "p-4 rounded-lg border",
            isExcellentRoi
              ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
              : isGoodRoi
              ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
              : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
          )}
        >
          <span
            className={cn(
              "text-xs uppercase tracking-wide",
              isExcellentRoi
                ? "text-emerald-600 dark:text-emerald-400"
                : isGoodRoi
                ? "text-blue-600 dark:text-blue-400"
                : "text-slate-500 dark:text-slate-400"
            )}
          >
            Return on Investment
          </span>
          <p
            className={cn(
              "text-2xl font-bold mt-1",
              isExcellentRoi
                ? "text-emerald-700 dark:text-emerald-300"
                : isGoodRoi
                ? "text-blue-700 dark:text-blue-300"
                : "text-slate-900 dark:text-slate-100"
            )}
          >
            {roiBreakdown.roiPercent.toFixed(1)}%
          </p>
        </div>

        {/* Annualized ROI */}
        {roiBreakdown.annualizedRoi !== undefined && (
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Annualized ROI
            </span>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
              {roiBreakdown.annualizedRoi.toFixed(1)}%
            </p>
          </div>
        )}

        {/* Cash on Cash */}
        {roiBreakdown.cashOnCash !== undefined && (
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Cash on Cash
            </span>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
              {roiBreakdown.cashOnCash.toFixed(1)}%
            </p>
          </div>
        )}
      </div>

      {/* ROI Breakdown */}
      <ReportSubsection
        title="ROI Breakdown"
        icon={<PieChart className="h-4 w-4" />}
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <MetricDisplay
            label="Total Investment"
            value={roiBreakdown.totalInvestment}
            format="currency"
          />
          <MetricDisplay
            label="Expected Sale Price"
            value={roiBreakdown.expectedSalePrice}
            format="currency"
          />
          <MetricDisplay
            label="Gross Profit"
            value={roiBreakdown.grossProfit}
            format="currency"
            trend={roiBreakdown.grossProfit >= 0 ? "positive" : "negative"}
          />
          {roiBreakdown.breakEvenPrice !== undefined && (
            <MetricDisplay
              label="Break-Even Price"
              value={roiBreakdown.breakEvenPrice}
              format="currency"
            />
          )}
        </div>

        {/* Profit Margin Bar */}
        <div className="mt-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600 dark:text-slate-400">
              Profit Margin
            </span>
            <span
              className={cn(
                "font-semibold",
                roiBreakdown.roiPercent >= 30
                  ? "text-green-600 dark:text-green-400"
                  : roiBreakdown.roiPercent >= 15
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-slate-600 dark:text-slate-400"
              )}
            >
              {((roiBreakdown.netProfit / roiBreakdown.expectedSalePrice) * 100).toFixed(1)}%
            </span>
          </div>
          <div className="relative h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            {/* Investment portion */}
            <div
              className="absolute left-0 top-0 h-full bg-blue-500"
              style={{
                width: `${(roiBreakdown.totalInvestment / roiBreakdown.expectedSalePrice) * 100}%`,
              }}
            />
            {/* Profit portion */}
            <div
              className="absolute top-0 h-full bg-green-500"
              style={{
                left: `${(roiBreakdown.totalInvestment / roiBreakdown.expectedSalePrice) * 100}%`,
                width: `${(roiBreakdown.netProfit / roiBreakdown.expectedSalePrice) * 100}%`,
              }}
            />
          </div>
          <div className="flex justify-between mt-1 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-blue-500" />
              Investment
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-green-500" />
              Profit
            </span>
          </div>
        </div>
      </ReportSubsection>

      {/* Exit Strategies */}
      {exitStrategies.length > 0 && (
        <ReportSubsection
          title="Exit Strategies"
          icon={<BarChart2 className="h-4 w-4" />}
          className="mt-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exitStrategies.map((strategy, idx) => {
              const config = STRATEGY_CONFIG[strategy.type] || STRATEGY_CONFIG.hold;
              const isRecommended = strategy.type === recommendedStrategy;

              return (
                <div
                  key={idx}
                  className={cn(
                    "p-4 rounded-lg border",
                    isRecommended
                      ? "bg-primary/5 border-primary dark:bg-primary/10"
                      : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={cn("p-1.5 rounded", config.color)}>
                        {config.icon}
                      </span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {strategy.name}
                      </span>
                    </div>
                    {isRecommended && (
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary text-primary-foreground">
                        Recommended
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 block">
                        Profit
                      </span>
                      <span className="font-semibold text-green-600 dark:text-green-400">
                        {formatValue(strategy.estimatedProfit, "currency")}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 block">
                        ROI
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {strategy.roi.toFixed(1)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 block">
                        Timeline
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {strategy.timelineMonths} mo
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className={RISK_COLORS[strategy.riskLevel]}>
                      {strategy.riskLevel.charAt(0).toUpperCase() + strategy.riskLevel.slice(1)} Risk
                    </span>
                    {strategy.confidence && (
                      <span className="text-slate-500 dark:text-slate-400">
                        {strategy.confidence.charAt(0).toUpperCase() + strategy.confidence.slice(1)} confidence
                      </span>
                    )}
                  </div>

                  {strategy.description && (
                    <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                      {strategy.description}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </ReportSubsection>
      )}

      {/* Cash Flow Projection */}
      {cashFlow && (
        <ReportSubsection
          title="Rental Cash Flow"
          icon={<DollarSign className="h-4 w-4" />}
          className="mt-6"
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MetricDisplay
              label="Monthly Rent"
              value={cashFlow.monthlyRent}
              format="currency"
            />
            <MetricDisplay
              label="Monthly Expenses"
              value={cashFlow.monthlyExpenses}
              format="currency"
            />
            <MetricDisplay
              label="Monthly Cash Flow"
              value={cashFlow.monthlyCashFlow}
              format="currency"
              trend={cashFlow.monthlyCashFlow >= 0 ? "positive" : "negative"}
            />
            <MetricDisplay
              label="Annual Cash Flow"
              value={cashFlow.annualCashFlow}
              format="currency"
              trend={cashFlow.annualCashFlow >= 0 ? "positive" : "negative"}
            />
            {cashFlow.capRate !== undefined && (
              <MetricDisplay
                label="Cap Rate"
                value={cashFlow.capRate}
                format="percentage"
              />
            )}
            {cashFlow.grm !== undefined && (
              <MetricDisplay
                label="Gross Rent Multiplier"
                value={cashFlow.grm.toFixed(1)}
              />
            )}
          </div>
        </ReportSubsection>
      )}

      {/* Factors and Concerns */}
      {(factors.length > 0 || concerns.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {factors.length > 0 && (
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <h4 className="font-medium text-green-800 dark:text-green-300 mb-2 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Profit Drivers
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
                <Percent className="h-4 w-4" />
                Profit Risks
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
          <h4>Profit Potential Summary</h4>
          <p>Net Profit: {formatValue(roiBreakdown.netProfit, "currency")}</p>
          <p>ROI: {roiBreakdown.roiPercent.toFixed(1)}%</p>
          {exitStrategies.length > 0 && (
            <table>
              <caption>Exit Strategies</caption>
              <thead>
                <tr>
                  <th>Strategy</th>
                  <th>Profit</th>
                  <th>ROI</th>
                  <th>Timeline</th>
                </tr>
              </thead>
              <tbody>
                {exitStrategies.map((s, idx) => (
                  <tr key={idx}>
                    <td>{s.name}</td>
                    <td>{formatValue(s.estimatedProfit, "currency")}</td>
                    <td>{s.roi.toFixed(1)}%</td>
                    <td>{s.timelineMonths} months</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </ScreenReaderOnly>
    </ReportSection>
  );
}

export default ProfitPotential;

"use client";

/**
 * Financial Summary Component
 *
 * Displays a summary card with key financial metrics including
 * recommendation banner, ROI metrics grid, quick stats, and data quality indicator.
 *
 * @component
 * @author Claude Code Agent
 * @date 2026-01-16
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calculator,
  Percent,
  Info,
} from "lucide-react";
import type {
  FinancialAnalysis,
  RecommendationVerdict,
} from "@/lib/analysis/financial/types";
import { formatCurrency, formatPercent } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

// ============================================
// Type Definitions
// ============================================

interface FinancialSummaryProps {
  /** Complete financial analysis data */
  analysis: FinancialAnalysis;
  /** Optional additional class names */
  className?: string;
}

interface MetricCardProps {
  /** Metric label */
  label: string;
  /** Formatted value to display */
  value: string;
  /** Icon component */
  icon: React.ElementType;
  /** Whether the metric is positive/favorable */
  positive: boolean;
  /** Optional tooltip description */
  tooltip?: string;
}

// ============================================
// Verdict Configuration
// ============================================

const verdictConfig: Record<
  RecommendationVerdict,
  {
    color: string;
    bgColor: string;
    textColor: string;
    icon: React.ElementType;
    label: string;
  }
> = {
  strong_buy: {
    color: "bg-green-500",
    bgColor: "bg-green-500",
    textColor: "text-green-500",
    icon: CheckCircle,
    label: "Strong Buy",
  },
  buy: {
    color: "bg-green-400",
    bgColor: "bg-green-400",
    textColor: "text-green-400",
    icon: CheckCircle,
    label: "Buy",
  },
  hold: {
    color: "bg-yellow-500",
    bgColor: "bg-yellow-500",
    textColor: "text-yellow-500",
    icon: AlertTriangle,
    label: "Hold",
  },
  pass: {
    color: "bg-orange-500",
    bgColor: "bg-orange-500",
    textColor: "text-orange-500",
    icon: AlertTriangle,
    label: "Pass",
  },
  avoid: {
    color: "bg-red-500",
    bgColor: "bg-red-500",
    textColor: "text-red-500",
    icon: XCircle,
    label: "Avoid",
  },
};

// ============================================
// Sub-components
// ============================================

/**
 * Single metric display card with icon and tooltip
 */
function MetricCard({
  label,
  value,
  icon: Icon,
  positive,
  tooltip,
}: MetricCardProps) {
  const content = (
    <div
      className={cn(
        "p-3 rounded-lg border transition-colors",
        positive
          ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
          : "bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700"
      )}
    >
      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 mb-1">
        <Icon className="h-4 w-4" />
        <span className="text-xs">{label}</span>
        {tooltip && <Info className="h-3 w-3 opacity-50" />}
      </div>
      <div
        className={cn(
          "text-lg font-bold",
          positive
            ? "text-green-700 dark:text-green-400"
            : "text-slate-900 dark:text-slate-100"
        )}
      >
        {value}
      </div>
    </div>
  );

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs text-sm">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
}

// ============================================
// Main Component
// ============================================

export function FinancialSummary({
  analysis,
  className,
}: FinancialSummaryProps) {
  const { costs, metrics, recommendation, revenue, dataQuality } = analysis;

  // Get verdict configuration
  const config = verdictConfig[recommendation?.verdict || "hold"];
  const VerdictIcon = config.icon;

  // Calculate total investment
  const totalInvestment = costs?.grandTotal || costs?.totalCosts || 0;
  const estimatedARV = revenue?.sale?.estimatedARV || 0;
  const breakEvenPrice = metrics?.breakEvenPrice || 0;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Financial Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Recommendation Banner */}
        <div className={cn(config.bgColor, "text-white p-4 rounded-lg")}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <VerdictIcon className="h-6 w-6" />
              <span className="text-xl font-bold">{config.label}</span>
            </div>
            <div className="text-right">
              <div className="text-sm opacity-90">Max Bid</div>
              <div className="text-2xl font-bold">
                {formatCurrency(recommendation?.maxBid || 0)}
              </div>
            </div>
          </div>
          <div className="mt-2 text-sm opacity-90">
            {recommendation?.confidence || 0}% confidence |{" "}
            {recommendation?.exitStrategy || "flip"} strategy
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            label="ROI"
            value={formatPercent(metrics?.roi || 0)}
            icon={TrendingUp}
            positive={(metrics?.roi || 0) > 20}
            tooltip="Return on Investment - Net profit divided by total cash invested"
          />
          <MetricCard
            label="Net Profit"
            value={formatCurrency(metrics?.netProfit || 0)}
            icon={DollarSign}
            positive={(metrics?.netProfit || 0) > 0}
            tooltip="Total profit after all costs including selling expenses"
          />
          <MetricCard
            label="Profit Margin"
            value={formatPercent(metrics?.profitMargin || 0)}
            icon={Percent}
            positive={(metrics?.profitMargin || 0) > 15}
            tooltip="Net profit as a percentage of total investment"
          />
          <MetricCard
            label="Price to ARV"
            value={formatPercent((metrics?.priceToARV || 0) * 100)}
            icon={Calculator}
            positive={(metrics?.priceToARV || 0) < 0.7}
            tooltip="Purchase price divided by After Repair Value (lower is better, target <70%)"
          />
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <div className="text-center">
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Total Investment
            </div>
            <div className="text-lg font-semibold">
              {formatCurrency(totalInvestment)}
            </div>
          </div>
          <div className="text-center border-x border-slate-200 dark:border-slate-700">
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Estimated ARV
            </div>
            <div className="text-lg font-semibold">
              {formatCurrency(estimatedARV)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Break-Even
            </div>
            <div className="text-lg font-semibold">
              {formatCurrency(breakEvenPrice)}
            </div>
          </div>
        </div>

        {/* Data Quality Indicator */}
        <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Analysis Quality</span>
            <span className="text-sm">{dataQuality?.overallScore || 0}%</span>
          </div>
          <Progress
            value={dataQuality?.overallScore || 0}
            className="h-2"
            indicatorClassName={cn(
              (dataQuality?.overallScore || 0) >= 80
                ? "bg-green-500"
                : (dataQuality?.overallScore || 0) >= 60
                  ? "bg-yellow-500"
                  : "bg-red-500"
            )}
          />
          {dataQuality?.assumptions && dataQuality.assumptions.length > 0 && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              * {dataQuality.assumptions[0]}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default FinancialSummary;

"use client";

/**
 * ROI Metrics Card Component
 *
 * Displays comprehensive investment metrics including ROI, IRR,
 * cash-on-cash return, profit margin, and other key indicators.
 *
 * @component
 * @author Claude Code Agent
 * @date 2026-01-16
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  Clock,
  Target,
  BarChart3,
  Info,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import type { InvestmentMetrics } from "@/lib/analysis/financial/types";
import { formatCurrency, formatPercent } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

// ============================================
// Type Definitions
// ============================================

interface ROIMetricsCardProps {
  /** Investment metrics data */
  metrics?: InvestmentMetrics;
  /** Optional additional class names */
  className?: string;
}

interface MetricRowProps {
  /** Metric label */
  label: string;
  /** Metric value (formatted) */
  value: string;
  /** Icon component */
  icon: React.ElementType;
  /** Whether the metric is positive */
  positive?: boolean;
  /** Optional target value */
  target?: string;
  /** Tooltip description */
  tooltip?: string;
  /** Whether to highlight this metric */
  highlight?: boolean;
}

// ============================================
// Thresholds for Metrics
// ============================================

const thresholds = {
  roi: { excellent: 30, good: 20, fair: 10 },
  annualizedRoi: { excellent: 50, good: 30, fair: 15 },
  profitMargin: { excellent: 25, good: 15, fair: 10 },
  cashOnCash: { excellent: 20, good: 12, fair: 8 },
  priceToARV: { excellent: 0.6, good: 0.7, fair: 0.8 },
};

// ============================================
// Helper Functions
// ============================================

function getMetricRating(
  value: number,
  threshold: { excellent: number; good: number; fair: number },
  inverse = false
): "excellent" | "good" | "fair" | "poor" {
  if (inverse) {
    if (value <= threshold.excellent) return "excellent";
    if (value <= threshold.good) return "good";
    if (value <= threshold.fair) return "fair";
    return "poor";
  }
  if (value >= threshold.excellent) return "excellent";
  if (value >= threshold.good) return "good";
  if (value >= threshold.fair) return "fair";
  return "poor";
}

function getRatingColor(rating: "excellent" | "good" | "fair" | "poor") {
  switch (rating) {
    case "excellent":
      return "text-green-600 dark:text-green-400";
    case "good":
      return "text-blue-600 dark:text-blue-400";
    case "fair":
      return "text-yellow-600 dark:text-yellow-400";
    case "poor":
      return "text-red-600 dark:text-red-400";
  }
}

function getRatingBg(rating: "excellent" | "good" | "fair" | "poor") {
  switch (rating) {
    case "excellent":
      return "bg-green-100 dark:bg-green-900/30";
    case "good":
      return "bg-blue-100 dark:bg-blue-900/30";
    case "fair":
      return "bg-yellow-100 dark:bg-yellow-900/30";
    case "poor":
      return "bg-red-100 dark:bg-red-900/30";
  }
}

// ============================================
// Sub-components
// ============================================

/**
 * Single metric row with label, value, and optional target
 */
function MetricRow({
  label,
  value,
  icon: Icon,
  positive,
  target,
  tooltip,
  highlight,
}: MetricRowProps) {
  const content = (
    <div
      className={cn(
        "flex items-center justify-between p-3 rounded-lg transition-colors",
        highlight
          ? "bg-slate-100 dark:bg-slate-800"
          : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "p-2 rounded-lg",
            positive === true
              ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
              : positive === false
                ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="flex items-center gap-1">
            <span className="text-sm text-slate-600 dark:text-slate-400">
              {label}
            </span>
            {tooltip && <Info className="h-3 w-3 text-slate-400" />}
          </div>
          {target && (
            <div className="text-xs text-slate-500 dark:text-slate-500">
              Target: {target}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "text-lg font-semibold",
            positive === true
              ? "text-green-600 dark:text-green-400"
              : positive === false
                ? "text-red-600 dark:text-red-400"
                : "text-slate-900 dark:text-slate-100"
          )}
        >
          {value}
        </span>
        {positive !== undefined && (
          positive ? (
            <ArrowUpRight className="h-4 w-4 text-green-500" />
          ) : (
            <ArrowDownRight className="h-4 w-4 text-red-500" />
          )
        )}
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

export function ROIMetricsCard({ metrics, className }: ROIMetricsCardProps) {
  // Extract values with defaults
  const roi = metrics?.roi || 0;
  const annualizedRoi = metrics?.irr || 0; // Using IRR as annualized
  const netProfit = metrics?.netProfit || 0;
  const profitMargin = metrics?.profitMargin || 0;
  const cashOnCash = metrics?.cashOnCash || 0;
  const priceToARV = metrics?.priceToARV || 0;
  const breakEvenPrice = metrics?.breakEvenPrice || 0;
  const capRate = metrics?.capRate || 0;

  // Calculate ratings
  const roiRating = getMetricRating(roi, thresholds.roi);
  const annualizedRating = getMetricRating(annualizedRoi, thresholds.annualizedRoi);
  const marginRating = getMetricRating(profitMargin, thresholds.profitMargin);
  const arvRating = getMetricRating(priceToARV, thresholds.priceToARV, true);

  // Overall rating (simple average)
  const ratings = [roiRating, annualizedRating, marginRating, arvRating];
  const ratingScores = ratings.map((r) =>
    r === "excellent" ? 4 : r === "good" ? 3 : r === "fair" ? 2 : 1
  );
  const avgScore = ratingScores.reduce((a, b) => a + b, 0) / ratingScores.length;
  const overallRating: "excellent" | "good" | "fair" | "poor" =
    avgScore >= 3.5 ? "excellent" : avgScore >= 2.5 ? "good" : avgScore >= 1.5 ? "fair" : "poor";

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Investment Metrics
          </div>
          <Badge variant={overallRating} className="text-sm">
            {overallRating.charAt(0).toUpperCase() + overallRating.slice(1)} Investment
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Primary Metrics */}
        <div className="space-y-1">
          <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">
            Primary Returns
          </h4>

          <MetricRow
            label="Return on Investment (ROI)"
            value={formatPercent(roi)}
            icon={TrendingUp}
            positive={roi > 0}
            target=">20%"
            tooltip="Net profit divided by total cash invested. Shows overall return efficiency."
            highlight
          />

          <MetricRow
            label="Annualized ROI"
            value={formatPercent(annualizedRoi)}
            icon={TrendingUp}
            positive={annualizedRoi > 0}
            target=">30%"
            tooltip="ROI adjusted to annual rate. Useful for comparing investments with different holding periods."
          />

          <MetricRow
            label="Net Profit"
            value={formatCurrency(netProfit)}
            icon={DollarSign}
            positive={netProfit > 0}
            tooltip="Total profit after all costs including acquisition, rehab, holding, and selling expenses."
          />

          <MetricRow
            label="Profit Margin"
            value={formatPercent(profitMargin)}
            icon={Percent}
            positive={profitMargin > 15}
            target=">15%"
            tooltip="Net profit as a percentage of total investment. Measures efficiency of capital deployment."
          />
        </div>

        {/* Secondary Metrics */}
        <div className="space-y-1">
          <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">
            Risk & Efficiency
          </h4>

          <MetricRow
            label="Price to ARV"
            value={formatPercent(priceToARV * 100)}
            icon={Target}
            positive={priceToARV < 0.7}
            target="<70%"
            tooltip="Purchase price divided by After Repair Value. Lower is better - the 70% rule suggests buying at 70% or less of ARV minus repairs."
          />

          <MetricRow
            label="Break-Even Price"
            value={formatCurrency(breakEvenPrice)}
            icon={DollarSign}
            tooltip="Minimum sale price needed to recover all costs (no profit, no loss)."
          />

          {cashOnCash > 0 && (
            <MetricRow
              label="Cash-on-Cash Return"
              value={formatPercent(cashOnCash)}
              icon={DollarSign}
              positive={cashOnCash > 10}
              target=">10%"
              tooltip="Annual cash flow divided by total cash invested. More relevant for rental properties."
            />
          )}

          {capRate > 0 && (
            <MetricRow
              label="Cap Rate"
              value={formatPercent(capRate)}
              icon={BarChart3}
              positive={capRate > 6}
              target=">6%"
              tooltip="Net Operating Income divided by property value. Standard measure for rental property performance."
            />
          )}
        </div>

        {/* Visual Rating Summary */}
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">
            Metric Ratings
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className={cn("p-3 rounded-lg", getRatingBg(roiRating))}>
              <div className="text-xs text-slate-500 dark:text-slate-400">ROI</div>
              <div className={cn("font-semibold", getRatingColor(roiRating))}>
                {roiRating.charAt(0).toUpperCase() + roiRating.slice(1)}
              </div>
            </div>
            <div className={cn("p-3 rounded-lg", getRatingBg(annualizedRating))}>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Annualized
              </div>
              <div className={cn("font-semibold", getRatingColor(annualizedRating))}>
                {annualizedRating.charAt(0).toUpperCase() + annualizedRating.slice(1)}
              </div>
            </div>
            <div className={cn("p-3 rounded-lg", getRatingBg(marginRating))}>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Margin
              </div>
              <div className={cn("font-semibold", getRatingColor(marginRating))}>
                {marginRating.charAt(0).toUpperCase() + marginRating.slice(1)}
              </div>
            </div>
            <div className={cn("p-3 rounded-lg", getRatingBg(arvRating))}>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Price/ARV
              </div>
              <div className={cn("font-semibold", getRatingColor(arvRating))}>
                {arvRating.charAt(0).toUpperCase() + arvRating.slice(1)}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default ROIMetricsCard;

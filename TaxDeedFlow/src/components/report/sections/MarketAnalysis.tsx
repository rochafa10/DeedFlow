"use client";

import * as React from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Home,
  Calendar,
  DollarSign,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ReportSection, ReportSubsection } from "../shared/ReportSection";
import { MetricDisplay, MetricGrid, ComparisonMetric } from "../shared/MetricDisplay";
import { CategoryGrade } from "../shared/GradeDisplay";
import { ScoreBar } from "../charts/ScoreGauge";
import { DataUnavailable, PartialDataWarning } from "../shared/ErrorState";
import { ScreenReaderOnly } from "../shared/AccessibilityHelpers";
import { DataSourceBadge } from "@/components/ui/data-source-badge";
import type { Grade } from "@/types/report";
import { formatValue } from "@/types/report";

/**
 * Market metrics data
 */
export interface MarketMetrics {
  /** Median sale price in area */
  medianSalePrice?: number;
  /** Median price per square foot */
  pricePerSqft?: number;
  /** Average days on market */
  daysOnMarket?: number;
  /** Number of active listings */
  activeListings?: number;
  /** Number of sales in last 6 months */
  recentSales?: number;
  /** Absorption rate (months of inventory) */
  absorptionRate?: number;
  /** List to sale price ratio */
  listToSaleRatio?: number;
  /** Price change YoY percentage */
  priceChangeYoY?: number;
  /** Sales volume change YoY */
  salesVolumeChangeYoY?: number;
  /** Inventory change YoY */
  inventoryChangeYoY?: number;
}

/**
 * Market trend data point
 */
export interface MarketTrendPoint {
  /** Period label (e.g., "Jan 2026") */
  period: string;
  /** Metric value */
  value: number;
}

/**
 * Market trends collection
 */
export interface MarketTrends {
  /** Price trends */
  priceTrends?: MarketTrendPoint[];
  /** Sales volume trends */
  volumeTrends?: MarketTrendPoint[];
  /** Days on market trends */
  domTrends?: MarketTrendPoint[];
}

/**
 * Market segment comparison
 */
export interface MarketSegment {
  /** Segment name */
  name: string;
  /** Segment value */
  value: number;
  /** Format type */
  format?: "currency" | "number" | "percentage";
  /** Comparison to subject */
  comparison?: "above" | "below" | "similar";
  /** Difference amount */
  difference?: number;
}

/**
 * Props for the MarketAnalysis component
 */
export interface MarketAnalysisProps {
  /** Market score (0-25) */
  score: number;
  /** Maximum score */
  maxScore?: number;
  /** Market grade */
  grade: Grade;
  /** Market metrics */
  metrics: MarketMetrics;
  /** Market trends */
  trends?: MarketTrends;
  /** Market type (buyer's, seller's, balanced) */
  marketType?: "buyers" | "sellers" | "balanced";
  /** Market health score (0-100) */
  marketHealth?: number;
  /** Supply vs demand indicator */
  supplyDemand?: "undersupply" | "balanced" | "oversupply";
  /** Comparable segments */
  segments?: MarketSegment[];
  /** Key market factors */
  factors?: string[];
  /** Market concerns */
  concerns?: string[];
  /** Data source */
  dataSource?: string;
  /** Data as of date */
  dataAsOf?: Date;
  /** Whether section is initially collapsed */
  defaultCollapsed?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Data source type for badge display */
  dataSourceType?: "live" | "sample" | "partial" | "error";
}

/**
 * Market type configuration
 */
const MARKET_TYPE_CONFIG: Record<
  string,
  { label: string; color: string; icon: React.ReactNode; description: string }
> = {
  buyers: {
    label: "Buyer's Market",
    color: "text-blue-600 dark:text-blue-400",
    icon: <ArrowDownRight className="h-5 w-5" />,
    description: "More inventory than demand. Favorable for buyers.",
  },
  sellers: {
    label: "Seller's Market",
    color: "text-orange-600 dark:text-orange-400",
    icon: <ArrowUpRight className="h-5 w-5" />,
    description: "More demand than inventory. Favorable for sellers.",
  },
  balanced: {
    label: "Balanced Market",
    color: "text-green-600 dark:text-green-400",
    icon: <Minus className="h-5 w-5" />,
    description: "Supply and demand are relatively balanced.",
  },
};

/**
 * Trend indicator component
 */
function TrendIndicator({
  value,
  format = "percentage",
  positiveIsGood = true,
}: {
  value: number;
  format?: "percentage" | "number";
  positiveIsGood?: boolean;
}) {
  const isPositive = value > 0;
  const isGood = positiveIsGood ? isPositive : !isPositive;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 font-medium",
        isGood
          ? "text-green-600 dark:text-green-400"
          : "text-red-600 dark:text-red-400"
      )}
    >
      {isPositive ? (
        <TrendingUp className="h-3.5 w-3.5" />
      ) : (
        <TrendingDown className="h-3.5 w-3.5" />
      )}
      {format === "percentage"
        ? `${Math.abs(value).toFixed(1)}%`
        : Math.abs(value).toLocaleString()}
    </span>
  );
}

/**
 * MarketAnalysis - Section 6: Market conditions and trends
 *
 * Features:
 * - Market type indicator (buyer's/seller's/balanced)
 * - Key market metrics (median price, DOM, inventory)
 * - Year-over-year changes
 * - Market health score
 * - Supply/demand indicator
 * - Comparable segment analysis
 * - Market factors and concerns
 *
 * @example
 * ```tsx
 * <MarketAnalysis
 *   score={18}
 *   grade="B"
 *   metrics={{
 *     medianSalePrice: 185000,
 *     pricePerSqft: 125,
 *     daysOnMarket: 45,
 *     activeListings: 120,
 *     priceChangeYoY: 5.2,
 *   }}
 *   marketType="balanced"
 *   marketHealth={72}
 * />
 * ```
 */
export function MarketAnalysis({
  score,
  maxScore = 25,
  grade,
  metrics,
  trends,
  marketType,
  marketHealth,
  supplyDemand,
  segments = [],
  factors = [],
  concerns = [],
  dataSource,
  dataAsOf,
  defaultCollapsed = false,
  className,
  dataSourceType,
}: MarketAnalysisProps) {
  // Calculate percentage
  const percentage = Math.round((score / maxScore) * 100);

  // Check if we have enough data
  const hasMetrics =
    metrics.medianSalePrice !== undefined ||
    metrics.daysOnMarket !== undefined ||
    metrics.activeListings !== undefined;

  if (!hasMetrics) {
    return (
      <ReportSection
        id="market-analysis"
        title="Market Analysis"
        icon={<BarChart3 className="h-5 w-5" />}
        defaultCollapsed={defaultCollapsed}
        className={className}
      >
        <DataUnavailable
          title="Market Data Unavailable"
          description="Market analysis data could not be retrieved for this area."
        />
      </ReportSection>
    );
  }

  const marketConfig = marketType ? MARKET_TYPE_CONFIG[marketType] : null;

  return (
    <ReportSection
      id="market-analysis"
      title="Market Analysis"
      icon={<BarChart3 className="h-5 w-5" />}
      defaultCollapsed={defaultCollapsed}
      className={className}
      headerRight={
        <div className="flex items-center gap-3">
          <CategoryGrade grade={grade} />
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {score}/{maxScore} pts
          </span>
          {dataSourceType && <DataSourceBadge type={dataSourceType} />}
        </div>
      }
    >
      {/* Market Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Market Type */}
        {marketConfig && (
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-2">
              <div className={marketConfig.color}>{marketConfig.icon}</div>
              <span className={cn("font-semibold", marketConfig.color)}>
                {marketConfig.label}
              </span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {marketConfig.description}
            </p>
          </div>
        )}

        {/* Market Health */}
        {marketHealth !== undefined && (
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Market Health
              </span>
              <span
                className={cn(
                  "font-semibold",
                  marketHealth >= 70
                    ? "text-green-600 dark:text-green-400"
                    : marketHealth >= 40
                    ? "text-yellow-600 dark:text-yellow-400"
                    : "text-red-600 dark:text-red-400"
                )}
              >
                {marketHealth}/100
              </span>
            </div>
            <ScoreBar
              score={marketHealth}
              maxScore={100}
              color={
                marketHealth >= 70
                  ? "#10b981"
                  : marketHealth >= 40
                  ? "#f59e0b"
                  : "#ef4444"
              }
              height={8}
            />
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {marketHealth >= 70
                ? "Strong market conditions"
                : marketHealth >= 40
                ? "Moderate market conditions"
                : "Weak market conditions"}
            </p>
          </div>
        )}

        {/* Supply/Demand */}
        {supplyDemand && (
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <span className="text-sm text-slate-500 dark:text-slate-400 block mb-2">
              Supply vs Demand
            </span>
            <div className="flex items-center gap-2">
              <Activity
                className={cn(
                  "h-5 w-5",
                  supplyDemand === "undersupply"
                    ? "text-orange-500"
                    : supplyDemand === "oversupply"
                    ? "text-blue-500"
                    : "text-green-500"
                )}
              />
              <span className="font-medium text-slate-900 dark:text-slate-100 capitalize">
                {supplyDemand === "undersupply"
                  ? "Undersupply"
                  : supplyDemand === "oversupply"
                  ? "Oversupply"
                  : "Balanced"}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {supplyDemand === "undersupply"
                ? "Demand exceeds available inventory"
                : supplyDemand === "oversupply"
                ? "Inventory exceeds current demand"
                : "Supply and demand are well matched"}
            </p>
          </div>
        )}
      </div>

      {/* Key Metrics */}
      <ReportSubsection
        title="Market Metrics"
        icon={<Activity className="h-4 w-4" />}
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {metrics.medianSalePrice !== undefined && (
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Median Sale Price
              </span>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {formatValue(metrics.medianSalePrice, "currency")}
              </p>
              {metrics.priceChangeYoY !== undefined && (
                <TrendIndicator value={metrics.priceChangeYoY} positiveIsGood />
              )}
            </div>
          )}

          {metrics.pricePerSqft !== undefined && (
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Price per Sqft
              </span>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                ${metrics.pricePerSqft.toFixed(0)}
              </p>
            </div>
          )}

          {metrics.daysOnMarket !== undefined && (
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Avg Days on Market
              </span>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {metrics.daysOnMarket} days
              </p>
              <span
                className={cn(
                  "text-xs",
                  metrics.daysOnMarket < 30
                    ? "text-orange-600 dark:text-orange-400"
                    : metrics.daysOnMarket > 90
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-slate-500 dark:text-slate-400"
                )}
              >
                {metrics.daysOnMarket < 30
                  ? "Fast moving"
                  : metrics.daysOnMarket > 90
                  ? "Slow moving"
                  : "Average"}
              </span>
            </div>
          )}

          {metrics.activeListings !== undefined && (
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Active Listings
              </span>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {metrics.activeListings.toLocaleString()}
              </p>
              {metrics.inventoryChangeYoY !== undefined && (
                <TrendIndicator value={metrics.inventoryChangeYoY} positiveIsGood={false} />
              )}
            </div>
          )}

          {metrics.recentSales !== undefined && (
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Sales (6 months)
              </span>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {metrics.recentSales.toLocaleString()}
              </p>
              {metrics.salesVolumeChangeYoY !== undefined && (
                <TrendIndicator value={metrics.salesVolumeChangeYoY} positiveIsGood />
              )}
            </div>
          )}

          {metrics.absorptionRate !== undefined && (
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Months of Inventory
              </span>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {metrics.absorptionRate.toFixed(1)}
              </p>
              <span
                className={cn(
                  "text-xs",
                  metrics.absorptionRate < 4
                    ? "text-orange-600 dark:text-orange-400"
                    : metrics.absorptionRate > 6
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-green-600 dark:text-green-400"
                )}
              >
                {metrics.absorptionRate < 4
                  ? "Seller's advantage"
                  : metrics.absorptionRate > 6
                  ? "Buyer's advantage"
                  : "Balanced"}
              </span>
            </div>
          )}

          {metrics.listToSaleRatio !== undefined && (
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                List to Sale Ratio
              </span>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {(metrics.listToSaleRatio * 100).toFixed(1)}%
              </p>
              <span
                className={cn(
                  "text-xs",
                  metrics.listToSaleRatio > 1
                    ? "text-orange-600 dark:text-orange-400"
                    : metrics.listToSaleRatio < 0.95
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-slate-500 dark:text-slate-400"
                )}
              >
                {metrics.listToSaleRatio > 1
                  ? "Above asking"
                  : metrics.listToSaleRatio < 0.95
                  ? "Below asking"
                  : "Near asking"}
              </span>
            </div>
          )}
        </div>
      </ReportSubsection>

      {/* Market Segments Comparison */}
      {segments.length > 0 && (
        <ReportSubsection
          title="Market Comparison"
          icon={<Home className="h-4 w-4" />}
          className="mt-6"
        >
          <div className="space-y-3">
            {segments.map((segment, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50"
              >
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {segment.name}
                </span>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {segment.format === "currency"
                      ? formatValue(segment.value, "currency")
                      : segment.format === "percentage"
                      ? `${segment.value.toFixed(1)}%`
                      : segment.value.toLocaleString()}
                  </span>
                  {segment.comparison && (
                    <span
                      className={cn(
                        "text-xs px-2 py-0.5 rounded-full",
                        segment.comparison === "above"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : segment.comparison === "below"
                          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400"
                      )}
                    >
                      {segment.comparison === "above"
                        ? "Above avg"
                        : segment.comparison === "below"
                        ? "Below avg"
                        : "Average"}
                    </span>
                  )}
                </div>
              </div>
            ))}
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
                Positive Market Factors
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
                Market Concerns
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

      {/* Data Source */}
      {(dataSource || dataAsOf) && (
        <div className="mt-4 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
          {dataSource && <span>Source: {dataSource}</span>}
          {dataSource && dataAsOf && <span>|</span>}
          {dataAsOf && <span>Data as of {formatValue(dataAsOf, "date")}</span>}
        </div>
      )}

      {/* Screen Reader Summary */}
      <ScreenReaderOnly>
        <div>
          <h4>Market Analysis Summary</h4>
          <p>Market Type: {marketType || "Unknown"}</p>
          {marketHealth !== undefined && <p>Market Health: {marketHealth}/100</p>}
          {metrics.medianSalePrice !== undefined && (
            <p>Median Sale Price: {formatValue(metrics.medianSalePrice, "currency")}</p>
          )}
          {metrics.daysOnMarket !== undefined && (
            <p>Average Days on Market: {metrics.daysOnMarket}</p>
          )}
        </div>
      </ScreenReaderOnly>
    </ReportSection>
  );
}

export default MarketAnalysis;

"use client";

/**
 * Price Prediction Card Component
 *
 * Displays estimated price ranges for property auctions with confidence levels,
 * historical data influence, and visual price range indicators.
 *
 * @component
 * @author Claude Code Agent
 * @date 2026-01-22
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
  TrendingDown,
  Target,
  BarChart3,
  Info,
  AlertCircle,
} from "lucide-react";
import type { ARVAnalysis } from "@/lib/analysis/financial/types";
import { formatCurrency, formatPercent } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

// ============================================
// Type Definitions
// ============================================

interface PricePredictionCardProps {
  /** ARV analysis data containing price estimates */
  arvAnalysis: ARVAnalysis;
  /** Current auction price or total due */
  currentPrice?: number;
  /** Number of historical auctions used for prediction */
  historicalCount?: number;
  /** Optional additional class names */
  className?: string;
}

interface PriceRangeBarProps {
  /** Low estimate price */
  lowEstimate: number;
  /** Mid/estimated price */
  estimatedPrice: number;
  /** High estimate price */
  highEstimate: number;
  /** Current price marker */
  currentPrice?: number;
}

interface ConfidenceBadgeProps {
  /** Confidence level */
  level: "low" | "medium" | "high";
  /** Number of comparables used */
  comparablesCount: number;
}

// ============================================
// Confidence Configuration
// ============================================

const confidenceConfig = {
  low: {
    color: "bg-orange-500",
    textColor: "text-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    label: "Low Confidence",
    icon: AlertCircle,
  },
  medium: {
    color: "bg-yellow-500",
    textColor: "text-yellow-600",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
    label: "Medium Confidence",
    icon: Target,
  },
  high: {
    color: "bg-green-500",
    textColor: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    label: "High Confidence",
    icon: Target,
  },
};

// ============================================
// Sub-components
// ============================================

/**
 * Visual price range bar showing low, mid, high estimates
 */
function PriceRangeBar({
  lowEstimate,
  estimatedPrice,
  highEstimate,
  currentPrice,
}: PriceRangeBarProps) {
  const range = highEstimate - lowEstimate;
  const midPosition = ((estimatedPrice - lowEstimate) / range) * 100;
  const currentPosition = currentPrice
    ? ((currentPrice - lowEstimate) / range) * 100
    : null;

  return (
    <div className="space-y-2">
      <div className="relative h-8 bg-gradient-to-r from-red-100 via-yellow-100 to-green-100 dark:from-red-900/30 dark:via-yellow-900/30 dark:to-green-900/30 rounded-lg border border-slate-200 dark:border-slate-700">
        {/* Mid estimate marker */}
        <div
          className="absolute top-0 bottom-0 w-1 bg-blue-600"
          style={{ left: `${midPosition}%` }}
        >
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium text-blue-600 whitespace-nowrap">
            Est: {formatCurrency(estimatedPrice)}
          </div>
        </div>

        {/* Current price marker (if provided) */}
        {currentPosition !== null && (
          <div
            className="absolute top-0 bottom-0 w-1 bg-purple-600"
            style={{ left: `${Math.max(0, Math.min(100, currentPosition))}%` }}
          >
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-medium text-purple-600 whitespace-nowrap">
              Current: {formatCurrency(currentPrice!)}
            </div>
          </div>
        )}
      </div>

      {/* Range labels */}
      <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1">
          <TrendingDown className="h-3 w-3" />
          Low: {formatCurrency(lowEstimate)}
        </span>
        <span className="flex items-center gap-1">
          <TrendingUp className="h-3 w-3" />
          High: {formatCurrency(highEstimate)}
        </span>
      </div>
    </div>
  );
}

/**
 * Confidence badge showing reliability of prediction
 */
function ConfidenceBadge({ level, comparablesCount }: ConfidenceBadgeProps) {
  const config = confidenceConfig[level];
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border",
              config.bgColor,
              config.borderColor
            )}
          >
            <Icon className={cn("h-4 w-4", config.textColor)} />
            <span className={cn("text-sm font-medium", config.textColor)}>
              {config.label}
            </span>
            <Info className="h-3 w-3 opacity-50" />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs text-sm">
            Based on {comparablesCount} comparable{comparablesCount !== 1 ? "s" : ""}.{" "}
            {level === "high"
              ? "Strong data support with multiple recent comparables."
              : level === "medium"
              ? "Moderate data support. Consider additional research."
              : "Limited data available. Exercise caution with estimates."}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================
// Main Component
// ============================================

export function PricePredictionCard({
  arvAnalysis,
  currentPrice,
  historicalCount = 0,
  className,
}: PricePredictionCardProps) {
  const {
    estimatedARV,
    lowEstimate,
    highEstimate,
    pricePerSqft,
    comparablesUsed,
    confidence,
  } = arvAnalysis;

  // Calculate price range metrics
  const priceRange = highEstimate - lowEstimate;
  const priceRangePercent = (priceRange / estimatedARV) * 100;
  const spreadIndicator = priceRangePercent < 15 ? "Narrow" : priceRangePercent < 30 ? "Moderate" : "Wide";

  // Calculate potential value if current price is provided
  const potentialGain = currentPrice ? estimatedARV - currentPrice : null;
  const potentialGainPercent = currentPrice
    ? ((estimatedARV - currentPrice) / currentPrice) * 100
    : null;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Price Prediction
          </div>
          <ConfidenceBadge level={confidence} comparablesCount={comparablesUsed} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Estimate Banner */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-lg">
          <div className="text-sm opacity-90 mb-1">Estimated Market Value</div>
          <div className="text-4xl font-bold mb-2">
            {formatCurrency(estimatedARV)}
          </div>
          <div className="text-sm opacity-90">
            {formatCurrency(pricePerSqft)}/sqft • {comparablesUsed} comparables
          </div>
        </div>

        {/* Price Range Visualization */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
            <span className="font-medium">Price Range</span>
            <span className="text-xs">
              {spreadIndicator} spread ({formatPercent(priceRangePercent / 100)})
            </span>
          </div>
          <PriceRangeBar
            lowEstimate={lowEstimate}
            estimatedPrice={estimatedARV}
            highEstimate={highEstimate}
            currentPrice={currentPrice}
          />
        </div>

        {/* Detailed Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Low Estimate */}
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-1">
              <TrendingDown className="h-4 w-4" />
              <span className="text-xs font-medium">Low Estimate</span>
            </div>
            <div className="text-lg font-bold text-red-700 dark:text-red-400">
              {formatCurrency(lowEstimate)}
            </div>
            <div className="text-xs text-red-600 dark:text-red-500 mt-1">
              {formatPercent((lowEstimate - estimatedARV) / estimatedARV)} from mid
            </div>
          </div>

          {/* High Estimate */}
          <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs font-medium">High Estimate</span>
            </div>
            <div className="text-lg font-bold text-green-700 dark:text-green-400">
              {formatCurrency(highEstimate)}
            </div>
            <div className="text-xs text-green-600 dark:text-green-500 mt-1">
              +{formatPercent((highEstimate - estimatedARV) / estimatedARV)} from mid
            </div>
          </div>
        </div>

        {/* Potential Gain (if current price provided) */}
        {potentialGain !== null && potentialGainPercent !== null && (
          <div
            className={cn(
              "p-4 rounded-lg border",
              potentialGain > 0
                ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                : "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                  Potential {potentialGain > 0 ? "Gain" : "Loss"}
                </div>
                <div
                  className={cn(
                    "text-2xl font-bold",
                    potentialGain > 0
                      ? "text-green-700 dark:text-green-400"
                      : "text-red-700 dark:text-red-400"
                  )}
                >
                  {formatCurrency(Math.abs(potentialGain))}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                  Return
                </div>
                <div
                  className={cn(
                    "text-2xl font-bold",
                    potentialGainPercent > 0
                      ? "text-green-700 dark:text-green-400"
                      : "text-red-700 dark:text-red-400"
                  )}
                >
                  {potentialGainPercent > 0 ? "+" : ""}
                  {formatPercent(potentialGainPercent / 100)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Historical Data Indicator */}
        {historicalCount > 0 && (
          <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Data Quality</span>
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {historicalCount} historical auctions
              </span>
            </div>
            <Progress
              value={Math.min(100, (historicalCount / 10) * 100)}
              className="h-2"
              indicatorClassName={cn(
                historicalCount >= 10
                  ? "bg-green-500"
                  : historicalCount >= 5
                    ? "bg-yellow-500"
                    : "bg-orange-500"
              )}
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              {historicalCount >= 10
                ? "Excellent historical data support"
                : historicalCount >= 5
                  ? "Good historical data available"
                  : "Limited historical data - use caution"}
            </p>
          </div>
        )}

        {/* Price Per Square Foot */}
        <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            <span className="text-sm font-medium">Price per Sqft</span>
          </div>
          <span className="text-lg font-bold">{formatCurrency(pricePerSqft)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default PricePredictionCard;

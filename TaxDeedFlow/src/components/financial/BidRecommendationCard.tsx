"use client";

/**
 * Bid Recommendation Card Component
 *
 * Displays AI-powered bid recommendations with conservative/moderate/aggressive
 * ranges, confidence level, risk warnings, and transparent calculation basis.
 *
 * @component
 * @author Claude Code Agent
 * @date 2026-01-23
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
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Info,
  Target,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  CheckCircle,
} from "lucide-react";
import type { BidRecommendation, RiskWarning } from "@/lib/analysis/bidding/types";
import { formatCurrency, formatPercent } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

// ============================================
// Type Definitions
// ============================================

interface BidRecommendationCardProps {
  /** Bid recommendation data */
  recommendation?: BidRecommendation;
  /** Optional additional class names */
  className?: string;
}

interface BidTierProps {
  /** Tier label */
  label: string;
  /** Bid amount */
  amount: number;
  /** Description */
  description: string;
  /** Color scheme */
  color: "green" | "blue" | "orange";
  /** Whether this is the recommended tier */
  recommended?: boolean;
  /** Confidence level for this tier (0-1) */
  confidence?: number;
}

// ============================================
// Helper Functions
// ============================================

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return "bg-green-500";
  if (confidence >= 0.6) return "bg-yellow-500";
  return "bg-red-500";
}

function getConfidenceLabel(confidence: number): string {
  if (confidence >= 0.8) return "High Confidence";
  if (confidence >= 0.6) return "Moderate Confidence";
  return "Low Confidence";
}

function getRiskSeverityColor(severity: RiskWarning["severity"]): string {
  switch (severity) {
    case "critical":
      return "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800";
    case "high":
      return "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800";
    case "medium":
      return "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800";
    case "low":
      return "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800";
  }
}

function getBidTierColor(color: "green" | "blue" | "orange"): {
  bg: string;
  text: string;
  border: string;
  icon: string;
} {
  switch (color) {
    case "green":
      return {
        bg: "bg-green-50 dark:bg-green-900/20",
        text: "text-green-900 dark:text-green-100",
        border: "border-green-200 dark:border-green-800",
        icon: "text-green-600 dark:text-green-400",
      };
    case "blue":
      return {
        bg: "bg-blue-50 dark:bg-blue-900/20",
        text: "text-blue-900 dark:text-blue-100",
        border: "border-blue-200 dark:border-blue-800",
        icon: "text-blue-600 dark:text-blue-400",
      };
    case "orange":
      return {
        bg: "bg-orange-50 dark:bg-orange-900/20",
        text: "text-orange-900 dark:text-orange-100",
        border: "border-orange-200 dark:border-orange-800",
        icon: "text-orange-600 dark:text-orange-400",
      };
  }
}

// ============================================
// Sub-components
// ============================================

/**
 * Single bid tier card (conservative/moderate/aggressive) with confidence indicator
 */
function BidTier({ label, amount, description, color, recommended, confidence }: BidTierProps) {
  const colors = getBidTierColor(color);
  const confidencePercent = confidence ? Math.round(confidence * 100) : undefined;

  return (
    <div
      className={cn(
        "relative p-4 rounded-lg border-2 transition-all hover:shadow-md",
        colors.bg,
        colors.border,
        recommended && "ring-2 ring-offset-2 ring-blue-500 shadow-lg"
      )}
    >
      {recommended && (
        <Badge
          variant="secondary"
          className="absolute -top-2 left-4 bg-blue-500 text-white shadow-sm"
        >
          Recommended
        </Badge>
      )}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className={cn("text-sm font-medium mb-1 flex items-center gap-2", colors.text)}>
            {label}
            {confidencePercent && (
              <Badge variant="outline" className={cn("text-xs", colors.border)}>
                {confidencePercent}%
              </Badge>
            )}
          </div>
          <div className={cn("text-2xl font-bold mb-1", colors.text)}>
            {formatCurrency(amount)}
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-400">
            {description}
          </div>
        </div>
        <div className={cn("p-2 rounded-lg", colors.bg)}>
          <Target className={cn("h-5 w-5", colors.icon)} />
        </div>
      </div>
      {/* Visual confidence bar for this tier */}
      {confidencePercent && confidence !== undefined && (
        <div className="mt-2">
          <div className="h-1 bg-slate-200 rounded-full overflow-hidden dark:bg-slate-700">
            <div
              className={cn("h-full transition-all duration-300", getConfidenceColor(confidence))}
              style={{ width: `${confidencePercent}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Risk warning item
 */
function RiskWarningItem({ warning }: { warning: RiskWarning }) {
  const severityColors = getRiskSeverityColor(warning.severity);

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border",
        severityColors
      )}
    >
      <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold capitalize">
            {warning.severity} Risk
          </span>
        </div>
        <div className="text-sm">{warning.message}</div>
      </div>
    </div>
  );
}

/**
 * Calculation basis detail row
 */
function CalculationRow({
  label,
  value,
  tooltip,
}: {
  label: string;
  value: string | number;
  tooltip?: string;
}) {
  const content = (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-1">
        <span className="text-sm text-slate-600 dark:text-slate-400">
          {label}
        </span>
        {tooltip && <Info className="h-3 w-3 text-slate-400" />}
      </div>
      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
        {typeof value === "number" ? formatCurrency(value) : value}
      </span>
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

export function BidRecommendationCard({
  recommendation,
  className,
}: BidRecommendationCardProps) {
  if (!recommendation) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Bid Recommendation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-slate-500">
            <Info className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No bid recommendation available yet.</p>
            <p className="text-sm mt-2">
              Complete financial analysis to generate recommendations.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const {
    bidRange,
    confidenceLevel,
    riskWarnings = [],
    calculationBasis,
    openingBid,
    exceedsMaxBid,
    roiProjection,
    dataQualityScore,
  } = recommendation;

  const confidencePercent = Math.round(confidenceLevel * 100);
  const confidenceColor = getConfidenceColor(confidenceLevel);
  const confidenceLabel = getConfidenceLabel(confidenceLevel);

  // Sort risk warnings by severity
  const sortedWarnings = [...riskWarnings].sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Bid Recommendation
          </div>
          <Badge variant="outline" className="text-xs">
            v{recommendation.recommendationVersion}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Opening Bid Exceeds Max Warning */}
        {exceedsMaxBid && openingBid && (
          <div className="bg-red-50 border-2 border-red-500 rounded-lg p-4 dark:bg-red-900/20">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-100 rounded-lg dark:bg-red-900/30">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-red-900 dark:text-red-100 mb-1">
                  Opening Bid Exceeds Recommended Max
                </div>
                <div className="text-sm text-red-800 dark:text-red-200">
                  The property&apos;s opening bid of{" "}
                  <span className="font-semibold">
                    {formatCurrency(openingBid)}
                  </span>{" "}
                  exceeds our recommended maximum bid of{" "}
                  <span className="font-semibold">
                    {formatCurrency(bidRange.aggressive)}
                  </span>
                  . Bidding on this property may not meet your target ROI.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Confidence Level - Enhanced Visual Indicator */}
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={cn("p-2 rounded-lg", confidenceColor)}>
                <ShieldCheck className="h-4 w-4 text-white" />
              </div>
              <div>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Confidence Level
                </span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 text-slate-400 ml-1 inline" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-sm">
                        Based on data quality, ARV confidence, and comparable
                        properties available
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {confidencePercent}%
              </div>
              <Badge
                variant="outline"
                className={cn("text-xs mt-1", confidenceColor, "text-white border-0")}
              >
                {confidenceLabel}
              </Badge>
            </div>
          </div>
          <div className="relative">
            <div className="h-3 bg-slate-200 rounded-full overflow-hidden dark:bg-slate-700 shadow-inner">
              <div
                className={cn(
                  "h-full transition-all duration-500 rounded-full shadow-sm",
                  confidenceColor
                )}
                style={{ width: `${confidencePercent}%` }}
              />
            </div>
            {/* Confidence threshold markers */}
            <div className="absolute top-0 left-[60%] w-px h-3 bg-slate-400/50" />
            <div className="absolute top-0 left-[80%] w-px h-3 bg-slate-400/50" />
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
            <span>Low</span>
            <span>Moderate</span>
            <span>High</span>
          </div>
          {dataQualityScore && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
              <span className="text-xs text-slate-600 dark:text-slate-400">
                Data Quality Score
              </span>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-16 bg-slate-200 rounded-full overflow-hidden dark:bg-slate-700">
                  <div
                    className={cn("h-full", getConfidenceColor(dataQualityScore))}
                    style={{ width: `${dataQualityScore * 100}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {Math.round(dataQualityScore * 100)}%
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Bid Ranges with Visual Confidence Indicators */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Target className="h-4 w-4" />
              Recommended Bid Ranges
            </h4>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="outline" className="text-xs">
                    3 Strategies
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs text-sm">
                    Choose a strategy based on your risk tolerance and target returns.
                    Moderate is recommended for most investors.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="grid gap-3">
            <BidTier
              label="Conservative"
              amount={bidRange.conservative}
              description="Highest profit margin, lowest risk"
              color="green"
              confidence={Math.min(1, confidenceLevel * 1.05)} // Slightly higher confidence
            />
            <BidTier
              label="Moderate"
              amount={bidRange.moderate}
              description="Balanced approach - recommended for most investors"
              color="blue"
              recommended
              confidence={confidenceLevel}
            />
            <BidTier
              label="Aggressive"
              amount={bidRange.aggressive}
              description="Maximum bid - thinner margins, higher risk"
              color="orange"
              confidence={Math.max(0.3, confidenceLevel * 0.85)} // Lower confidence
            />
          </div>

          {/* Visual Bid Range Spectrum */}
          <div className="mt-4 p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
              Bid Strategy Spectrum
            </div>
            <div className="relative h-8 flex items-center">
              {/* Background gradient bar */}
              <div className="absolute inset-0 bg-gradient-to-r from-green-200 via-blue-200 to-orange-200 dark:from-green-900/30 dark:via-blue-900/30 dark:to-orange-900/30 rounded-full" />

              {/* Markers for each bid level */}
              <div className="relative w-full flex justify-between items-center px-2">
                {/* Conservative marker */}
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full bg-green-500 border-2 border-white shadow-md" />
                </div>

                {/* Moderate marker */}
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-lg ring-2 ring-blue-300" />
                </div>

                {/* Aggressive marker */}
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full bg-orange-500 border-2 border-white shadow-md" />
                </div>
              </div>
            </div>

            {/* Labels */}
            <div className="flex justify-between items-center mt-1">
              <div className="text-xs text-slate-500">
                {formatCurrency(bidRange.conservative)}
              </div>
              <div className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                {formatCurrency(bidRange.moderate)}
              </div>
              <div className="text-xs text-slate-500">
                {formatCurrency(bidRange.aggressive)}
              </div>
            </div>

            {/* Opening bid indicator if available */}
            {openingBid && !exceedsMaxBid && (
              <div className="mt-2 text-xs text-slate-600 dark:text-slate-400 flex items-center justify-center gap-1">
                <DollarSign className="h-3 w-3" />
                Opening bid: {formatCurrency(openingBid)}
                {openingBid <= bidRange.conservative && " (Below conservative)"}
                {openingBid > bidRange.conservative && openingBid <= bidRange.moderate && " (In conservative-moderate range)"}
                {openingBid > bidRange.moderate && openingBid <= bidRange.aggressive && " (In moderate-aggressive range)"}
              </div>
            )}
          </div>
        </div>

        {/* Opening Bid Comparison */}
        {openingBid && !exceedsMaxBid && (
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg dark:bg-slate-800">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              <span className="text-sm text-slate-600 dark:text-slate-400">
                Opening Bid
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">
                {formatCurrency(openingBid)}
              </span>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </div>
          </div>
        )}

        {/* ROI Projection */}
        {roiProjection && (
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200 dark:bg-green-900/20 dark:border-green-800">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-green-900 dark:text-green-100">
                Projected ROI
              </span>
            </div>
            <span className="text-lg font-bold text-green-900 dark:text-green-100">
              {formatPercent(roiProjection / 100)}
            </span>
          </div>
        )}

        {/* Risk Warnings */}
        {sortedWarnings.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-3 text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" />
              Risk Warnings ({sortedWarnings.length})
            </h4>
            <div className="space-y-2">
              {sortedWarnings.map((warning, index) => (
                <RiskWarningItem key={index} warning={warning} />
              ))}
            </div>
          </div>
        )}

        {/* Calculation Basis */}
        <div>
          <h4 className="text-sm font-semibold mb-3 text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Info className="h-4 w-4" />
            Calculation Details
          </h4>
          <div className="bg-slate-50 rounded-lg p-4 dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
            <CalculationRow
              label="After Repair Value (ARV)"
              value={calculationBasis.arv}
              tooltip="Estimated value after renovations"
            />
            <CalculationRow
              label="Renovation Costs"
              value={calculationBasis.rehabCost}
              tooltip="Estimated costs for repairs and improvements"
            />
            <CalculationRow
              label="Closing Costs"
              value={calculationBasis.closingCosts}
              tooltip="Costs to acquire the property"
            />
            <CalculationRow
              label="Holding Costs"
              value={calculationBasis.holdingCosts}
              tooltip="Taxes, insurance, utilities during renovation"
            />
            <CalculationRow
              label="Target ROI"
              value={formatPercent(calculationBasis.targetROI / 100)}
              tooltip="Your desired return on investment"
            />
            <CalculationRow
              label="Total Investment"
              value={calculationBasis.totalInvestment}
              tooltip="Max bid + all costs"
            />
            {calculationBasis.comparablesCount && (
              <CalculationRow
                label="Comparable Properties"
                value={`${calculationBasis.comparablesCount} properties`}
                tooltip="Number of similar properties used for ARV"
              />
            )}
            <div className="pt-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  ARV Method
                </span>
                <Badge variant="outline" className="text-xs">
                  {calculationBasis.arvMethod.replace(/_/g, " ").toUpperCase()}
                </Badge>
              </div>
            </div>
            <div className="pt-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  ARV Confidence
                </span>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs",
                    calculationBasis.arvConfidence === "high" &&
                      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
                    calculationBasis.arvConfidence === "medium" &&
                      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
                    calculationBasis.arvConfidence === "low" &&
                      "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                  )}
                >
                  {calculationBasis.arvConfidence.toUpperCase()}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Recommendation Reasoning */}
        <div>
          <h4 className="text-sm font-semibold mb-3 text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Info className="h-4 w-4" />
            How We Calculated This
          </h4>
          <div className="bg-gradient-to-br from-blue-50 to-slate-50 dark:from-blue-900/20 dark:to-slate-800 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <div className="space-y-3">
              {/* ARV-based reasoning */}
              <div className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                <ChevronRight className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <span>
                  Started with an <strong>After Repair Value (ARV)</strong> of{" "}
                  <strong>{formatCurrency(calculationBasis.arv)}</strong> using{" "}
                  {calculationBasis.arvMethod === "arv_based" && "comparable sales analysis"}
                  {calculationBasis.arvMethod === "market_value_based" && "current market value"}
                  {calculationBasis.arvMethod === "assessed_value_based" && "tax assessed value"}
                  {calculationBasis.arvMethod === "hybrid" && "hybrid approach combining multiple methods"}
                  {calculationBasis.comparablesCount && calculationBasis.comparablesCount > 0 && (
                    <> based on {calculationBasis.comparablesCount} comparable properties</>
                  )}
                  .
                </span>
              </div>

              {/* Cost deductions reasoning */}
              <div className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                <ChevronRight className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <span>
                  Subtracted total costs of{" "}
                  <strong>
                    {formatCurrency(
                      calculationBasis.rehabCost +
                      calculationBasis.closingCosts +
                      calculationBasis.holdingCosts
                    )}
                  </strong>{" "}
                  (renovation: {formatCurrency(calculationBasis.rehabCost)}, closing:{" "}
                  {formatCurrency(calculationBasis.closingCosts)}, holding:{" "}
                  {formatCurrency(calculationBasis.holdingCosts)})
                </span>
              </div>

              {/* Target ROI reasoning */}
              <div className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                <ChevronRight className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <span>
                  Applied a <strong>{calculationBasis.targetROI}% target ROI</strong> to ensure
                  profitable returns on your investment
                </span>
              </div>

              {/* Three-tier strategy reasoning */}
              <div className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                <ChevronRight className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <span>
                  Created <strong>three bid strategies</strong>: Conservative (highest profit margin),
                  Moderate (balanced risk/reward), and Aggressive (maximum competitive bid)
                </span>
              </div>

              {/* ARV confidence adjustment */}
              <div className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                <ChevronRight className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <span>
                  Adjusted confidence based on{" "}
                  <strong className={cn(
                    calculationBasis.arvConfidence === "high" && "text-green-600 dark:text-green-400",
                    calculationBasis.arvConfidence === "medium" && "text-yellow-600 dark:text-yellow-400",
                    calculationBasis.arvConfidence === "low" && "text-red-600 dark:text-red-400"
                  )}>
                    {calculationBasis.arvConfidence} ARV confidence
                  </strong>
                  {dataQualityScore && (
                    <> and {Math.round(dataQualityScore * 100)}% data quality score</>
                  )}
                </span>
              </div>

              {/* Risk warnings consideration */}
              {riskWarnings.length > 0 && (
                <div className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <ChevronRight className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <span>
                    Identified <strong>{riskWarnings.length} risk factor{riskWarnings.length !== 1 ? "s" : ""}</strong>{" "}
                    that may affect your investment outcome
                  </span>
                </div>
              )}

              {/* Final recommendation note */}
              <div className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300 pt-2 border-t border-blue-200 dark:border-blue-700">
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Recommendation:</strong> Start with the{" "}
                  <strong className="text-blue-600 dark:text-blue-400">Moderate strategy</strong> for
                  balanced risk and competitive positioning. Adjust based on auction competition and
                  your risk tolerance.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-xs text-slate-500 dark:text-slate-400 text-center pt-2 border-t">
          Recommendations are based on current market data and should be
          verified with your own due diligence. Past performance does not
          guarantee future results.
        </div>
      </CardContent>
    </Card>
  );
}

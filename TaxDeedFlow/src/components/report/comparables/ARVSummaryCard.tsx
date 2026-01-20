"use client";

/**
 * ARV Summary Card Component
 *
 * Displays a comprehensive summary of the After Repair Value (ARV) calculation
 * including the final ARV, confidence range, quality metrics, and statistics.
 *
 * @component
 * @author Claude Code Agent
 * @date 2026-01-16
 */

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  Target,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Info,
  Percent,
  Home,
  DollarSign,
  Ruler,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import type {
  ARVCalculation,
  ComparableStatistics,
  AnalysisQuality,
} from "@/lib/analysis/comparables";

// ============================================
// Type Definitions
// ============================================

interface ARVSummaryCardProps {
  /** ARV calculation result */
  arvCalculation: ARVCalculation;
  /** Reconciled ARV data */
  reconciledARV?: {
    finalARV: number;
    method: string;
    reasoning: string;
  };
  /** Statistics data */
  statistics?: ComparableStatistics;
  /** Quality assessment */
  quality?: AnalysisQuality;
  /** Optional custom class name */
  className?: string;
  /** Whether to show detailed breakdown */
  showDetails?: boolean;
  /** Whether to show warnings */
  showWarnings?: boolean;
}

interface StatBoxProps {
  label: string;
  value: string;
  subValue?: string;
  icon?: React.ReactNode;
  className?: string;
}

// ============================================
// Helper Functions
// ============================================

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function getQualityColor(rating: string): string {
  switch (rating) {
    case "excellent":
      return "text-green-600 bg-green-100";
    case "good":
      return "text-emerald-600 bg-emerald-100";
    case "fair":
      return "text-yellow-600 bg-yellow-100";
    case "poor":
      return "text-red-600 bg-red-100";
    default:
      return "text-slate-600 bg-slate-100";
  }
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 75) return "bg-green-500";
  if (confidence >= 55) return "bg-emerald-500";
  if (confidence >= 40) return "bg-yellow-500";
  return "bg-red-500";
}

// ============================================
// Sub-Components
// ============================================

/**
 * Statistics box for displaying a single metric
 */
function StatBox({ label, value, subValue, icon, className }: StatBoxProps) {
  return (
    <div
      className={cn(
        "bg-slate-50 rounded-lg p-4 hover:bg-slate-100 transition-colors",
        className
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">
          {label}
        </span>
        {icon && <span className="text-slate-400">{icon}</span>}
      </div>
      <p className="text-lg font-bold text-slate-900">{value}</p>
      {subValue && <p className="text-xs text-slate-500 mt-0.5">{subValue}</p>}
    </div>
  );
}

/**
 * Confidence gauge visualization
 */
function ConfidenceGauge({ confidence }: { confidence: number }) {
  const rotation = (confidence / 100) * 180 - 90; // -90 to 90 degrees

  return (
    <div className="relative w-32 h-16 overflow-hidden">
      {/* Background arc */}
      <div className="absolute inset-0 rounded-t-full border-4 border-slate-200" />

      {/* Colored segments */}
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 rounded-t-full border-4 border-transparent"
          style={{
            borderTopColor: confidence >= 25 ? "#ef4444" : "transparent",
            borderLeftColor: confidence >= 25 ? "#ef4444" : "transparent",
            transform: "rotate(-45deg)",
          }}
        />
        <div
          className="absolute inset-0 rounded-t-full border-4 border-transparent"
          style={{
            borderTopColor: confidence >= 50 ? "#eab308" : "transparent",
            borderRightColor: confidence >= 50 ? "#eab308" : "transparent",
            transform: "rotate(0deg)",
          }}
        />
        <div
          className="absolute inset-0 rounded-t-full border-4 border-transparent"
          style={{
            borderBottomColor: confidence >= 75 ? "#22c55e" : "transparent",
            borderRightColor: confidence >= 75 ? "#22c55e" : "transparent",
            transform: "rotate(45deg)",
          }}
        />
      </div>

      {/* Needle */}
      <div
        className="absolute bottom-0 left-1/2 w-1 h-12 bg-slate-700 rounded-t origin-bottom transition-transform duration-500"
        style={{ transform: `translateX(-50%) rotate(${rotation}deg)` }}
      />

      {/* Center dot */}
      <div className="absolute bottom-0 left-1/2 w-3 h-3 bg-slate-700 rounded-full transform -translate-x-1/2 translate-y-1/2" />
    </div>
  );
}

/**
 * Price range visualization
 */
function PriceRangeBar({
  low,
  mid,
  high,
  min,
  max,
}: {
  low: number;
  mid: number;
  high: number;
  min: number;
  max: number;
}) {
  const range = max - min || 1;
  const lowPercent = ((low - min) / range) * 100;
  const highPercent = ((high - min) / range) * 100;
  const midPercent = ((mid - min) / range) * 100;

  return (
    <div className="relative h-8">
      {/* Background */}
      <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 bg-slate-200 rounded-full" />

      {/* Confidence range */}
      <div
        className="absolute top-1/2 h-2 -translate-y-1/2 bg-blue-200 rounded-full"
        style={{
          left: `${lowPercent}%`,
          right: `${100 - highPercent}%`,
        }}
      />

      {/* Min marker */}
      <div
        className="absolute top-0 h-full flex flex-col items-center"
        style={{ left: "0%" }}
      >
        <div className="w-0.5 h-2 bg-slate-400" />
        <span className="text-xs text-slate-500 mt-1">
          {formatCurrency(min)}
        </span>
      </div>

      {/* Mid (ARV) marker */}
      <div
        className="absolute top-0 h-full flex flex-col items-center transform -translate-x-1/2"
        style={{ left: `${midPercent}%` }}
      >
        <div className="w-3 h-3 rounded-full bg-blue-600 border-2 border-white shadow" />
        <span className="text-xs font-semibold text-blue-600 mt-1">ARV</span>
      </div>

      {/* Max marker */}
      <div
        className="absolute top-0 h-full flex flex-col items-center"
        style={{ right: "0%" }}
      >
        <div className="w-0.5 h-2 bg-slate-400" />
        <span className="text-xs text-slate-500 mt-1">
          {formatCurrency(max)}
        </span>
      </div>
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function ARVSummaryCard({
  arvCalculation,
  reconciledARV,
  statistics,
  quality,
  className,
  showDetails = true,
  showWarnings = true,
}: ARVSummaryCardProps) {
  const finalARV = reconciledARV?.finalARV || arvCalculation.arv;
  const qualityRating = quality?.rating || "fair";

  // Calculate spread from min to max
  const spread = arvCalculation.maxPrice - arvCalculation.minPrice;
  const spreadPercent =
    arvCalculation.arv > 0 ? (spread / arvCalculation.arv) * 100 : 0;

  return (
    <div className={cn("bg-white rounded-xl border border-slate-200", className)}>
      {/* Header with main ARV */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn("p-2 rounded-lg", getQualityColor(qualityRating))}
            >
              <Target className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                After Repair Value (ARV)
              </h3>
              <p className="text-sm text-slate-500">
                {reconciledARV?.method || arvCalculation.calculationMethod} calculation
              </p>
            </div>
          </div>

          {/* Quality badge */}
          <div
            className={cn(
              "px-3 py-1 rounded-full text-sm font-medium capitalize",
              getQualityColor(qualityRating)
            )}
          >
            {qualityRating} Quality
          </div>
        </div>

        {/* Main ARV display */}
        <div className="mt-6 text-center">
          <p className="text-4xl font-bold text-slate-900">
            {formatCurrency(finalARV)}
          </p>
          <p className="text-sm text-slate-500 mt-1">
            {arvCalculation.confidence}% confidence
          </p>
        </div>

        {/* Confidence range */}
        <div className="mt-6 px-4">
          <div className="flex justify-between text-sm text-slate-500 mb-2">
            <span>Confidence Range</span>
            <span>
              {formatCurrency(arvCalculation.confidenceRange.low)} -{" "}
              {formatCurrency(arvCalculation.confidenceRange.high)}
            </span>
          </div>
          <PriceRangeBar
            low={arvCalculation.confidenceRange.low}
            mid={arvCalculation.confidenceRange.mid}
            high={arvCalculation.confidenceRange.high}
            min={arvCalculation.minPrice}
            max={arvCalculation.maxPrice}
          />
        </div>
      </div>

      {/* Key Statistics Grid */}
      <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatBox
          label="Comparables Used"
          value={`${arvCalculation.comparablesUsed}`}
          subValue={`of ${arvCalculation.totalComparables} analyzed`}
          icon={<Home className="h-4 w-4" />}
        />
        <StatBox
          label="Median Price"
          value={formatCurrency(arvCalculation.medianPrice)}
          icon={<BarChart3 className="h-4 w-4" />}
        />
        <StatBox
          label="Price/SqFt"
          value={`$${arvCalculation.avgPricePerSqft}`}
          subValue="average"
          icon={<Ruler className="h-4 w-4" />}
        />
        <StatBox
          label="Confidence"
          value={`${arvCalculation.confidence}%`}
          subValue={qualityRating}
          icon={<Percent className="h-4 w-4" />}
        />
      </div>

      {/* Detailed Statistics */}
      {showDetails && statistics && (
        <div className="px-6 pb-6">
          <div className="border border-slate-200 rounded-lg divide-y divide-slate-200">
            {/* Price Statistics */}
            <div className="p-4">
              <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Price Statistics
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Min Adjusted</span>
                  <p className="font-medium text-slate-900">
                    {formatCurrency(statistics.salePrice.min)}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Max Adjusted</span>
                  <p className="font-medium text-slate-900">
                    {formatCurrency(statistics.salePrice.max)}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Average</span>
                  <p className="font-medium text-slate-900">
                    {formatCurrency(statistics.salePrice.avg)}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Median</span>
                  <p className="font-medium text-slate-900">
                    {formatCurrency(statistics.salePrice.median)}
                  </p>
                </div>
              </div>
            </div>

            {/* Comparable Quality */}
            <div className="p-4">
              <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Comparable Quality
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Avg Similarity</span>
                  <p className="font-medium text-slate-900">
                    {statistics.avgSimilarityScore.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Avg Distance</span>
                  <p className="font-medium text-slate-900">
                    {statistics.avgDistanceMiles.toFixed(2)} mi
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Avg Sale Age</span>
                  <p className="font-medium text-slate-900">
                    {statistics.avgSaleAgeDays} days
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Price Variation</span>
                  <p
                    className={cn(
                      "font-medium",
                      arvCalculation.coefficientOfVariation > 0.2
                        ? "text-red-600"
                        : arvCalculation.coefficientOfVariation > 0.15
                          ? "text-yellow-600"
                          : "text-green-600"
                    )}
                  >
                    {(arvCalculation.coefficientOfVariation * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>

            {/* Data Quality (if available) */}
            {quality && (
              <div className="p-4">
                <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Data Quality Assessment
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">Data Completeness</span>
                    <p className="font-medium text-slate-900">
                      {quality.dataCompleteness}%
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">Factors Available</span>
                    <p className="font-medium text-slate-900">
                      {quality.factorsAvailable}/{quality.totalFactors}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">Comparable Count</span>
                    <p
                      className={cn(
                        "font-medium capitalize",
                        quality.breakdown.comparableCount === "sufficient"
                          ? "text-green-600"
                          : quality.breakdown.comparableCount === "marginal"
                            ? "text-yellow-600"
                            : "text-red-600"
                      )}
                    >
                      {quality.breakdown.comparableCount}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">Similarity Quality</span>
                    <p
                      className={cn(
                        "font-medium capitalize",
                        quality.breakdown.similarityQuality === "high"
                          ? "text-green-600"
                          : quality.breakdown.similarityQuality === "medium"
                            ? "text-yellow-600"
                            : "text-red-600"
                      )}
                    >
                      {quality.breakdown.similarityQuality}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reconciliation Reasoning */}
      {reconciledARV && reconciledARV.reasoning && (
        <div className="px-6 pb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-800">
                  ARV Reconciliation
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  {reconciledARV.reasoning}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Warnings */}
      {showWarnings && arvCalculation.warnings.length > 0 && (
        <div className="px-6 pb-6">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h5 className="text-sm font-medium text-amber-800 flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4" />
              Warnings ({arvCalculation.warnings.length})
            </h5>
            <ul className="space-y-1">
              {arvCalculation.warnings.map((warning, index) => (
                <li key={index} className="text-sm text-amber-700">
                  {warning}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Footer with timestamp */}
      <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
        <div className="flex items-center justify-between">
          <span>
            Calculated:{" "}
            {new Date(arvCalculation.calculatedAt).toLocaleString()}
          </span>
          <span>Method: {arvCalculation.calculationMethod}</span>
        </div>
      </div>
    </div>
  );
}

export default ARVSummaryCard;

"use client";

import * as React from "react";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  AlertTriangle,
  CheckCircle,
  Info,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  RiskAssessment,
  OverallRiskLevel,
  RiskCategoryScore,
} from "@/types/risk-analysis";

/**
 * Props for the RiskOverviewCard component
 */
export interface RiskOverviewCardProps {
  /** Complete risk assessment data */
  assessment: RiskAssessment;
  /** Optional custom title */
  title?: string;
  /** Whether to show the detailed breakdown */
  showDetails?: boolean;
  /** Whether the card is collapsed by default */
  defaultCollapsed?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Risk level configuration with colors and icons
 */
const RISK_LEVEL_CONFIG: Record<
  OverallRiskLevel,
  {
    label: string;
    color: string;
    bgColor: string;
    borderColor: string;
    textColor: string;
    icon: React.ReactNode;
    description: string;
  }
> = {
  low: {
    label: "Low Risk",
    color: "green",
    bgColor: "bg-green-50 dark:bg-green-900/20",
    borderColor: "border-green-200 dark:border-green-800",
    textColor: "text-green-700 dark:text-green-300",
    icon: <ShieldCheck className="h-8 w-8 text-green-500" />,
    description: "This property has minimal risk factors. Recommended for investment.",
  },
  moderate: {
    label: "Moderate Risk",
    color: "yellow",
    bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
    borderColor: "border-yellow-200 dark:border-yellow-800",
    textColor: "text-yellow-700 dark:text-yellow-300",
    icon: <Shield className="h-8 w-8 text-yellow-500" />,
    description: "This property has some risk factors to consider. Proceed with caution.",
  },
  high: {
    label: "High Risk",
    color: "orange",
    bgColor: "bg-orange-50 dark:bg-orange-900/20",
    borderColor: "border-orange-200 dark:border-orange-800",
    textColor: "text-orange-700 dark:text-orange-300",
    icon: <ShieldAlert className="h-8 w-8 text-orange-500" />,
    description: "This property has significant risk factors. Additional due diligence recommended.",
  },
  severe: {
    label: "Severe Risk",
    color: "red",
    bgColor: "bg-red-50 dark:bg-red-900/20",
    borderColor: "border-red-200 dark:border-red-800",
    textColor: "text-red-700 dark:text-red-300",
    icon: <ShieldX className="h-8 w-8 text-red-500" />,
    description: "This property has critical risk factors. Exercise extreme caution.",
  },
};

/**
 * Get score color based on risk score (0-100, higher = more risk)
 */
function getScoreColor(score: number): string {
  if (score <= 25) return "text-green-600 dark:text-green-400";
  if (score <= 50) return "text-yellow-600 dark:text-yellow-400";
  if (score <= 75) return "text-orange-600 dark:text-orange-400";
  return "text-red-600 dark:text-red-400";
}

/**
 * Get confidence color
 */
function getConfidenceColor(confidence: number): string {
  if (confidence >= 80) return "text-green-600 dark:text-green-400";
  if (confidence >= 60) return "text-yellow-600 dark:text-yellow-400";
  return "text-orange-600 dark:text-orange-400";
}

/**
 * Risk gauge component showing the overall risk level
 */
function RiskGauge({ score, level }: { score: number; level: OverallRiskLevel }) {
  const config = RISK_LEVEL_CONFIG[level];
  const normalizedScore = Math.min(Math.max(score, 0), 100);
  const rotation = (normalizedScore / 100) * 180 - 90; // -90 to 90 degrees

  return (
    <div className="relative w-40 h-24">
      {/* Gauge background */}
      <svg className="w-full h-full" viewBox="0 0 160 80">
        {/* Background arc */}
        <path
          d="M 10 70 A 70 70 0 0 1 150 70"
          fill="none"
          stroke="currentColor"
          strokeWidth="12"
          className="text-slate-200 dark:text-slate-700"
        />
        {/* Colored segments */}
        <path
          d="M 10 70 A 70 70 0 0 1 45 18"
          fill="none"
          stroke="#22c55e"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d="M 45 18 A 70 70 0 0 1 80 10"
          fill="none"
          stroke="#eab308"
          strokeWidth="12"
        />
        <path
          d="M 80 10 A 70 70 0 0 1 115 18"
          fill="none"
          stroke="#f97316"
          strokeWidth="12"
        />
        <path
          d="M 115 18 A 70 70 0 0 1 150 70"
          fill="none"
          stroke="#ef4444"
          strokeWidth="12"
          strokeLinecap="round"
        />
      </svg>

      {/* Needle */}
      <div
        className="absolute bottom-2 left-1/2 w-1 h-14 bg-slate-800 dark:bg-slate-200 origin-bottom rounded-full transition-transform duration-500"
        style={{ transform: `translateX(-50%) rotate(${rotation}deg)` }}
      />

      {/* Center dot */}
      <div className="absolute bottom-1 left-1/2 w-4 h-4 bg-slate-800 dark:bg-slate-200 rounded-full -translate-x-1/2" />

      {/* Score label */}
      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-center">
        <span className={cn("text-2xl font-bold", getScoreColor(score))}>
          {score}
        </span>
        <span className="text-sm text-slate-500 dark:text-slate-400">/100</span>
      </div>
    </div>
  );
}

/**
 * RiskOverviewCard - Displays overall risk assessment with gauge and summary
 *
 * Features:
 * - Visual risk gauge with needle indicator
 * - Risk level badge with icon
 * - Score and confidence display
 * - Top risk factors and positive factors
 * - Critical warnings section
 * - Collapsible details
 *
 * @example
 * ```tsx
 * <RiskOverviewCard
 *   assessment={riskAssessment}
 *   showDetails={true}
 * />
 * ```
 */
export function RiskOverviewCard({
  assessment,
  title = "Risk Assessment Overview",
  showDetails = true,
  defaultCollapsed = false,
  className,
}: RiskOverviewCardProps) {
  const [isExpanded, setIsExpanded] = React.useState(!defaultCollapsed);
  const config = RISK_LEVEL_CONFIG[assessment.overallRisk];

  // Count risks by severity
  const riskCounts = assessment.categoryScores.reduce(
    (acc, score) => {
      if (score.rawScore >= 75) acc.severe++;
      else if (score.rawScore >= 50) acc.high++;
      else if (score.rawScore >= 25) acc.moderate++;
      else acc.low++;
      return acc;
    },
    { low: 0, moderate: 0, high: 0, severe: 0 }
  );

  return (
    <div
      className={cn(
        "rounded-lg border shadow-sm overflow-hidden",
        config.bgColor,
        config.borderColor,
        className
      )}
      role="region"
      aria-label={title}
    >
      {/* Header */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {config.icon}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {title}
              </h3>
              <p className={cn("text-sm font-medium", config.textColor)}>
                {config.label}
              </p>
            </div>
          </div>

          {/* Confidence indicator */}
          <div className="text-right">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Confidence
            </span>
            <p className={cn("text-sm font-semibold", getConfidenceColor(assessment.confidenceLevel))}>
              {assessment.confidenceLevel}%
            </p>
          </div>
        </div>

        {/* Risk Gauge and Summary */}
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          {/* Gauge */}
          <div className="flex flex-col items-center">
            <RiskGauge score={assessment.riskScore} level={assessment.overallRisk} />
            <p className="mt-6 text-xs text-slate-500 dark:text-slate-400 text-center max-w-[180px]">
              Higher score = Higher risk
            </p>
          </div>

          {/* Summary */}
          <div className="flex-1">
            <p className="text-sm text-slate-700 dark:text-slate-300 mb-4">
              {config.description}
            </p>

            {/* Risk counts */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              <div className="text-center p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <p className="text-lg font-bold text-green-700 dark:text-green-300">
                  {riskCounts.low}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">Low</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                <p className="text-lg font-bold text-yellow-700 dark:text-yellow-300">
                  {riskCounts.moderate}
                </p>
                <p className="text-xs text-yellow-600 dark:text-yellow-400">Moderate</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <p className="text-lg font-bold text-orange-700 dark:text-orange-300">
                  {riskCounts.high}
                </p>
                <p className="text-xs text-orange-600 dark:text-orange-400">High</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                <p className="text-lg font-bold text-red-700 dark:text-red-300">
                  {riskCounts.severe}
                </p>
                <p className="text-xs text-red-600 dark:text-red-400">Severe</p>
              </div>
            </div>

            {/* Insurance estimate */}
            {assessment.insuranceEstimates.totalAnnualCost > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <Info className="h-4 w-4 text-blue-500" />
                <span className="text-slate-700 dark:text-slate-300">
                  Estimated annual insurance:{" "}
                  <span className="font-semibold">
                    ${assessment.insuranceEstimates.totalAnnualCost.toLocaleString()}
                  </span>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Critical Warnings */}
      {assessment.warnings.length > 0 && (
        <div className="px-6 pb-4">
          <div className="p-4 rounded-lg bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <h4 className="font-medium text-red-800 dark:text-red-200">
                Critical Warnings
              </h4>
            </div>
            <ul className="space-y-1">
              {assessment.warnings.map((warning, idx) => (
                <li
                  key={idx}
                  className="text-sm text-red-700 dark:text-red-300 flex items-start gap-2"
                >
                  <span aria-hidden="true">-</span>
                  {warning}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Expandable Details */}
      {showDetails && (
        <>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full px-6 py-3 flex items-center justify-between border-t border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
            aria-expanded={isExpanded}
          >
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {isExpanded ? "Hide Details" : "Show Details"}
            </span>
            <svg
              className={cn(
                "h-5 w-5 text-slate-500 transition-transform",
                isExpanded && "rotate-180"
              )}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {isExpanded && (
            <div className="px-6 pb-6 border-t border-slate-200 dark:border-slate-700 space-y-4">
              {/* Top Risk Factors */}
              {assessment.topRiskFactors.length > 0 && (
                <div className="pt-4">
                  <h4 className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    <TrendingUp className="h-4 w-4 text-red-500" />
                    Top Risk Factors
                  </h4>
                  <ul className="space-y-1 pl-6">
                    {assessment.topRiskFactors.map((factor, idx) => (
                      <li
                        key={idx}
                        className="text-sm text-slate-600 dark:text-slate-400 list-disc"
                      >
                        {factor}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Positive Factors */}
              {assessment.positiveFactors.length > 0 && (
                <div>
                  <h4 className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    <TrendingDown className="h-4 w-4 text-green-500" />
                    Positive Factors
                  </h4>
                  <ul className="space-y-1 pl-6">
                    {assessment.positiveFactors.map((factor, idx) => (
                      <li
                        key={idx}
                        className="text-sm text-slate-600 dark:text-slate-400 list-disc"
                      >
                        {factor}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Category Scores */}
              <div>
                <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Risk Category Scores
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {assessment.categoryScores.map((score) => (
                    <div
                      key={score.category}
                      className="p-2 rounded-lg bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700"
                    >
                      <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                        {score.category}
                      </p>
                      <p className={cn("text-lg font-bold", getScoreColor(score.rawScore))}>
                        {score.rawScore}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        Weight: {(score.weight * 100).toFixed(0)}%
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Assessment timestamp */}
              <p className="text-xs text-slate-500 dark:text-slate-400 text-right" suppressHydrationWarning>
                Assessed: {new Date(assessment.assessedAt).toLocaleString()}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default RiskOverviewCard;

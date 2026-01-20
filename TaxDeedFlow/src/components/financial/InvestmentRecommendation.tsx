"use client";

/**
 * Investment Recommendation Component
 *
 * Displays the investment recommendation banner with verdict,
 * max bid, confidence level, and exit strategy. Includes data
 * quality indicator and key factors.
 *
 * @component
 * @author Claude Code Agent
 * @date 2026-01-16
 */

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Target,
  Clock,
  Info,
  ShieldCheck,
  ShieldAlert,
  ChevronRight,
} from "lucide-react";
import type {
  InvestmentRecommendation as RecommendationType,
  DataQualityAssessment,
  RecommendationVerdict,
} from "@/lib/analysis/financial/types";
import { formatCurrency, formatPercent } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

// ============================================
// Type Definitions
// ============================================

interface InvestmentRecommendationProps {
  /** Investment recommendation data */
  recommendation?: RecommendationType;
  /** Data quality assessment */
  dataQuality?: DataQualityAssessment;
  /** Optional additional class names */
  className?: string;
}

// ============================================
// Verdict Configuration
// ============================================

const verdictConfig: Record<
  RecommendationVerdict,
  {
    gradient: string;
    icon: React.ElementType;
    label: string;
    description: string;
    borderColor: string;
  }
> = {
  strong_buy: {
    gradient: "from-green-600 to-green-500",
    icon: CheckCircle,
    label: "Strong Buy",
    description: "Excellent opportunity with high confidence",
    borderColor: "border-green-500",
  },
  buy: {
    gradient: "from-green-500 to-emerald-500",
    icon: CheckCircle,
    label: "Buy",
    description: "Good opportunity meeting investment criteria",
    borderColor: "border-green-400",
  },
  hold: {
    gradient: "from-yellow-500 to-amber-500",
    icon: AlertTriangle,
    label: "Hold",
    description: "Potential opportunity requiring more analysis",
    borderColor: "border-yellow-500",
  },
  pass: {
    gradient: "from-orange-500 to-orange-400",
    icon: AlertTriangle,
    label: "Pass",
    description: "Does not meet minimum investment criteria",
    borderColor: "border-orange-500",
  },
  avoid: {
    gradient: "from-red-600 to-red-500",
    icon: XCircle,
    label: "Avoid",
    description: "High risk or negative return expected",
    borderColor: "border-red-500",
  },
};

// ============================================
// Helper Functions
// ============================================

function getConfidenceColor(confidence: number): string {
  if (confidence >= 80) return "bg-green-500";
  if (confidence >= 60) return "bg-yellow-500";
  return "bg-red-500";
}

function getDataQualityLabel(score: number): string {
  if (score >= 80) return "High Quality";
  if (score >= 60) return "Moderate Quality";
  if (score >= 40) return "Limited Data";
  return "Poor Quality";
}

// ============================================
// Main Component
// ============================================

export function InvestmentRecommendation({
  recommendation,
  dataQuality,
  className,
}: InvestmentRecommendationProps) {
  // Get verdict configuration
  const verdict = recommendation?.verdict || "hold";
  const config = verdictConfig[verdict];
  const VerdictIcon = config.icon;

  // Extract values
  const maxBid = recommendation?.maxBid || 0;
  const confidence = recommendation?.confidence || 0;
  const exitStrategy = recommendation?.exitStrategy || "flip";
  const keyFactors = recommendation?.keyFactors || [];
  const risks = recommendation?.risks || [];
  const opportunities = recommendation?.opportunities || [];

  // Data quality score
  const qualityScore = dataQuality?.overallScore || 0;
  const qualityLabel = getDataQualityLabel(qualityScore);
  const assumptions = dataQuality?.assumptions || [];
  const missingData = dataQuality?.missingData || [];

  return (
    <Card className={cn("overflow-hidden", className)}>
      {/* Verdict Banner */}
      <div
        className={cn(
          "bg-gradient-to-r text-white p-6",
          config.gradient
        )}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Verdict */}
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <VerdictIcon className="h-8 w-8" />
            </div>
            <div>
              <div className="text-sm opacity-90">Investment Recommendation</div>
              <div className="text-3xl font-bold">{config.label}</div>
              <div className="text-sm opacity-90">{config.description}</div>
            </div>
          </div>

          {/* Max Bid */}
          <div className="bg-white/20 rounded-xl p-4 text-center md:text-right">
            <div className="text-sm opacity-90">Maximum Bid</div>
            <div className="text-3xl font-bold">{formatCurrency(maxBid)}</div>
            <div className="flex items-center justify-center md:justify-end gap-2 mt-1">
              <Badge variant="secondary" className="bg-white/20 text-white border-0">
                {exitStrategy === "flip" ? "Flip Strategy" :
                 exitStrategy === "rental" ? "Rental Strategy" :
                 exitStrategy === "wholesale" ? "Wholesale" : exitStrategy}
              </Badge>
            </div>
          </div>
        </div>

        {/* Confidence Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="opacity-90">Confidence Level</span>
            <span className="font-semibold">{confidence}%</span>
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-500"
              style={{ width: `${confidence}%` }}
            />
          </div>
        </div>
      </div>

      <CardContent className="p-6 space-y-6">
        {/* Key Factors */}
        {keyFactors.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
              <Target className="h-4 w-4" />
              Key Factors
            </h4>
            <div className="grid gap-2">
              {keyFactors.slice(0, 4).map((factor, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400"
                >
                  <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
                  <span>{factor}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Opportunities */}
        {opportunities.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Opportunities
            </h4>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
              <ul className="space-y-2">
                {opportunities.slice(0, 3).map((opportunity: string, index: number) => (
                  <li
                    key={index}
                    className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2"
                  >
                    <span className="text-slate-400">-</span>
                    {opportunity}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Risk Factors */}
        {risks.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-orange-500" />
              Risk Factors
            </h4>
            <div className="grid gap-2">
              {risks.slice(0, 3).map((risk, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 text-sm text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 p-2 rounded-lg"
                >
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>{risk}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Data Quality Indicator */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Data Quality
              </span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-slate-400" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs text-sm">
                      Higher data quality means more reliable estimates. Low quality
                      indicates assumptions or missing data that may affect accuracy.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  qualityScore >= 80
                    ? "success"
                    : qualityScore >= 60
                      ? "warning"
                      : "destructive"
                }
              >
                {qualityLabel}
              </Badge>
              <span className="text-sm font-semibold">{qualityScore}%</span>
            </div>
          </div>

          <Progress
            value={qualityScore}
            className="h-2"
            indicatorClassName={getConfidenceColor(qualityScore)}
          />

          {/* Assumptions */}
          {assumptions.length > 0 && (
            <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium">Assumptions: </span>
              {assumptions.slice(0, 2).join("; ")}
              {assumptions.length > 2 && ` (+${assumptions.length - 2} more)`}
            </div>
          )}

          {/* Missing Data Warning */}
          {missingData.length > 0 && (
            <div className="mt-2 flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-3 w-3 flex-shrink-0 mt-0.5" />
              <span>
                Missing data: {missingData.slice(0, 3).join(", ")}
                {missingData.length > 3 && ` (+${missingData.length - 3} more)`}
              </span>
            </div>
          )}
        </div>

        {/* Quick Stats Footer */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {formatCurrency(maxBid)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Max Bid
            </div>
          </div>
          <div className="text-center border-x border-slate-200 dark:border-slate-700">
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {confidence}%
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Confidence
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold capitalize text-slate-900 dark:text-slate-100">
              {exitStrategy}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Strategy
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default InvestmentRecommendation;

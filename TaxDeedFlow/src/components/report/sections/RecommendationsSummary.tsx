"use client";

import * as React from "react";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  ArrowRight,
  Target,
  Clock,
  DollarSign,
  Shield,
  Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ReportSection, ReportSubsection } from "../shared/ReportSection";
import { GradeBadge } from "../shared/GradeDisplay";
import { RiskIndicator } from "../shared/RiskIndicator";
import { MetricDisplay, MetricGrid } from "../shared/MetricDisplay";
import { ScreenReaderOnly } from "../shared/AccessibilityHelpers";
import type { Grade, RiskLevel } from "@/types/report";
import { formatValue, gradeToRating } from "@/types/report";

/**
 * Recommendation item
 */
export interface RecommendationItem {
  /** Recommendation text */
  text: string;
  /** Priority level */
  priority: "high" | "medium" | "low";
  /** Category */
  category?: string;
  /** Estimated cost to implement */
  estimatedCost?: number;
  /** Timeline */
  timeline?: string;
}

/**
 * Pros and cons item
 */
export interface ProConItem {
  /** Item text */
  text: string;
  /** Impact level */
  impact?: "high" | "medium" | "low";
}

/**
 * Key metric for summary
 */
export interface SummaryMetric {
  /** Label */
  label: string;
  /** Value */
  value: string | number;
  /** Format */
  format?: "currency" | "percentage" | "number" | "text";
  /** Highlight color */
  highlight?: "positive" | "negative" | "neutral";
}

/**
 * Props for the RecommendationsSummary component
 */
export interface RecommendationsSummaryProps {
  /** Overall recommendation */
  overallRecommendation: "strong_buy" | "buy" | "hold" | "caution" | "avoid";
  /** Overall grade */
  grade: Grade;
  /** Overall risk level */
  riskLevel: RiskLevel;
  /** Confidence level */
  confidence: "low" | "medium" | "high";
  /** Executive summary text */
  executiveSummary: string;
  /** Pros list */
  pros?: ProConItem[];
  /** Cons list */
  cons?: ProConItem[];
  /** Action items / recommendations */
  actionItems?: RecommendationItem[];
  /** Key metrics summary */
  keyMetrics?: SummaryMetric[];
  /** Suggested next steps */
  nextSteps?: string[];
  /** Disclaimer text */
  disclaimerText?: string;
  /** Whether section is initially collapsed */
  defaultCollapsed?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Recommendation configuration
 */
const RECOMMENDATION_CONFIG: Record<
  string,
  { label: string; icon: React.ReactNode; color: string; bgColor: string; description: string }
> = {
  strong_buy: {
    label: "Strong Buy",
    icon: <ThumbsUp className="h-6 w-6" />,
    color: "text-green-700 dark:text-green-300",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    description: "Excellent opportunity with strong fundamentals",
  },
  buy: {
    label: "Buy",
    icon: <CheckCircle className="h-6 w-6" />,
    color: "text-blue-700 dark:text-blue-300",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    description: "Good opportunity worth pursuing",
  },
  hold: {
    label: "Hold / Research",
    icon: <AlertCircle className="h-6 w-6" />,
    color: "text-yellow-700 dark:text-yellow-300",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
    description: "More research needed before deciding",
  },
  caution: {
    label: "Caution",
    icon: <AlertCircle className="h-6 w-6" />,
    color: "text-orange-700 dark:text-orange-300",
    bgColor: "bg-orange-100 dark:bg-orange-900/30",
    description: "Significant concerns - proceed carefully",
  },
  avoid: {
    label: "Avoid",
    icon: <ThumbsDown className="h-6 w-6" />,
    color: "text-red-700 dark:text-red-300",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    description: "Not recommended - too many risks",
  },
};

/**
 * Priority badge component
 */
function PriorityBadge({ priority }: { priority: RecommendationItem["priority"] }) {
  const config: Record<string, { label: string; className: string }> = {
    high: {
      label: "High",
      className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    },
    medium: {
      label: "Medium",
      className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    },
    low: {
      label: "Low",
      className: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
    },
  };

  const { label, className } = config[priority] || config.medium;

  return (
    <span className={cn("px-2 py-0.5 text-xs rounded-full font-medium", className)}>
      {label}
    </span>
  );
}

/**
 * RecommendationsSummary - Section 11: Final recommendations and action items
 *
 * Features:
 * - Overall recommendation (Strong Buy to Avoid)
 * - Executive summary
 * - Pros and cons list
 * - Prioritized action items
 * - Key metrics summary
 * - Next steps
 *
 * @example
 * ```tsx
 * <RecommendationsSummary
 *   overallRecommendation="buy"
 *   grade="B+"
 *   riskLevel="medium"
 *   confidence="high"
 *   executiveSummary="This property presents a solid investment opportunity..."
 *   pros={[{ text: "Strong ROI potential", impact: "high" }]}
 *   cons={[{ text: "Minor title issues", impact: "low" }]}
 *   actionItems={[{ text: "Complete title search", priority: "high" }]}
 * />
 * ```
 */
export function RecommendationsSummary({
  overallRecommendation,
  grade,
  riskLevel,
  confidence,
  executiveSummary,
  pros = [],
  cons = [],
  actionItems = [],
  keyMetrics = [],
  nextSteps = [],
  disclaimerText,
  defaultCollapsed = false,
  className,
}: RecommendationsSummaryProps) {
  const recommendationConfig = RECOMMENDATION_CONFIG[overallRecommendation];
  const rating = gradeToRating(grade);

  return (
    <ReportSection
      id="recommendations"
      title="Recommendations & Summary"
      icon={<Target className="h-5 w-5" />}
      defaultCollapsed={defaultCollapsed}
      className={className}
    >
      {/* Overall Recommendation Banner */}
      <div
        className={cn(
          "p-6 rounded-lg mb-6",
          recommendationConfig.bgColor,
          "border-2",
          overallRecommendation === "strong_buy"
            ? "border-green-300 dark:border-green-700"
            : overallRecommendation === "buy"
            ? "border-blue-300 dark:border-blue-700"
            : overallRecommendation === "hold"
            ? "border-yellow-300 dark:border-yellow-700"
            : overallRecommendation === "caution"
            ? "border-orange-300 dark:border-orange-700"
            : "border-red-300 dark:border-red-700"
        )}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={cn("p-3 rounded-lg", recommendationConfig.bgColor, recommendationConfig.color)}>
              {recommendationConfig.icon}
            </div>
            <div>
              <h3 className={cn("text-2xl font-bold", recommendationConfig.color)}>
                {recommendationConfig.label}
              </h3>
              <p className={cn("text-sm", recommendationConfig.color.replace("700", "600").replace("300", "400"))}>
                {recommendationConfig.description}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <GradeBadge grade={grade} />
            <RiskIndicator level={riskLevel} size="sm" showLabel />
            <span
              className={cn(
                "px-2 py-1 text-xs rounded-full font-medium",
                confidence === "high"
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : confidence === "medium"
                  ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                  : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              )}
            >
              {confidence.charAt(0).toUpperCase() + confidence.slice(1)} Confidence
            </span>
          </div>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="mb-6">
        <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-primary" />
          Executive Summary
        </h4>
        <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
          {executiveSummary}
        </p>
      </div>

      {/* Key Metrics */}
      {keyMetrics.length > 0 && (
        <div className="mb-6 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
          <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-3">
            Key Metrics at a Glance
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {keyMetrics.map((metric, idx) => (
              <div key={idx} className="text-center">
                <span className="text-xs text-slate-500 dark:text-slate-400 block">
                  {metric.label}
                </span>
                <span
                  className={cn(
                    "text-lg font-bold",
                    metric.highlight === "positive"
                      ? "text-green-600 dark:text-green-400"
                      : metric.highlight === "negative"
                      ? "text-red-600 dark:text-red-400"
                      : "text-slate-900 dark:text-slate-100"
                  )}
                >
                  {metric.format === "currency"
                    ? formatValue(metric.value as number, "currency")
                    : metric.format === "percentage"
                    ? `${metric.value}%`
                    : metric.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pros and Cons */}
      {(pros.length > 0 || cons.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Pros */}
          {pros.length > 0 && (
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <h4 className="font-medium text-green-800 dark:text-green-300 mb-3 flex items-center gap-2">
                <ThumbsUp className="h-4 w-4" />
                Pros
              </h4>
              <ul className="space-y-2">
                {pros.map((pro, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-sm text-green-700 dark:text-green-400"
                  >
                    <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>
                      {pro.text}
                      {pro.impact && (
                        <span
                          className={cn(
                            "ml-2 px-1.5 py-0.5 text-xs rounded",
                            pro.impact === "high"
                              ? "bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200"
                              : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                          )}
                        >
                          {pro.impact}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Cons */}
          {cons.length > 0 && (
            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <h4 className="font-medium text-red-800 dark:text-red-300 mb-3 flex items-center gap-2">
                <ThumbsDown className="h-4 w-4" />
                Cons
              </h4>
              <ul className="space-y-2">
                {cons.map((con, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-sm text-red-700 dark:text-red-400"
                  >
                    <XCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>
                      {con.text}
                      {con.impact && (
                        <span
                          className={cn(
                            "ml-2 px-1.5 py-0.5 text-xs rounded",
                            con.impact === "high"
                              ? "bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200"
                              : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                          )}
                        >
                          {con.impact}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Action Items */}
      {actionItems.length > 0 && (
        <ReportSubsection
          title="Recommended Actions"
          icon={<CheckCircle className="h-4 w-4" />}
        >
          <div className="space-y-3">
            {actionItems.map((item, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50"
              >
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      {item.text}
                    </span>
                    <PriorityBadge priority={item.priority} />
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {item.category && <span>{item.category}</span>}
                    {item.estimatedCost !== undefined && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        {formatValue(item.estimatedCost, "currency")}
                      </span>
                    )}
                    {item.timeline && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {item.timeline}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ReportSubsection>
      )}

      {/* Next Steps */}
      {nextSteps.length > 0 && (
        <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
          <h4 className="font-medium text-primary mb-3 flex items-center gap-2">
            <ArrowRight className="h-4 w-4" />
            Immediate Next Steps
          </h4>
          <ol className="space-y-2 list-decimal list-inside">
            {nextSteps.map((step, idx) => (
              <li key={idx} className="text-sm text-slate-700 dark:text-slate-300">
                {step}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Disclaimer */}
      {disclaimerText && (
        <div className="mt-6 p-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-slate-500 dark:text-slate-400">
          <Shield className="h-4 w-4 inline mr-1" />
          {disclaimerText}
        </div>
      )}

      {/* Screen Reader Summary */}
      <ScreenReaderOnly>
        <div>
          <h4>Recommendations Summary</h4>
          <p>Overall Recommendation: {recommendationConfig.label}</p>
          <p>Grade: {grade}</p>
          <p>Risk Level: {riskLevel}</p>
          <p>Confidence: {confidence}</p>
          <p>Executive Summary: {executiveSummary}</p>
        </div>
      </ScreenReaderOnly>
    </ReportSection>
  );
}

export default RecommendationsSummary;

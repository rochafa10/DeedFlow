"use client";

import * as React from "react";
import { Target, TrendingUp, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReportSection, ReportSubsection } from "../shared/ReportSection";
import { GradeDisplay, CategoryGrade } from "../shared/GradeDisplay";
import { MetricDisplay, MetricGrid } from "../shared/MetricDisplay";
import { ScoreGauge, ScoreBar } from "../charts/ScoreGauge";
import { ScoreBreakdownRadar, CategoryComparison } from "../charts/ScoreBreakdownRadar";
import { DataUnavailable } from "../shared/ErrorState";
import { ScreenReaderOnly } from "../shared/AccessibilityHelpers";
import { DataSourceBadge } from "@/components/ui/data-source-badge";
import type { Grade } from "@/types/report";
import { formatValue, gradeToRating } from "@/types/report";

/**
 * Category score data
 */
export interface CategoryScore {
  /** Category name */
  name: string;
  /** Category key for identification */
  key: "location" | "risk" | "financial" | "market" | "profit";
  /** Score (0-25 points) */
  score: number;
  /** Maximum possible score */
  maxScore: number;
  /** Letter grade for this category */
  grade: Grade;
  /** Key factors contributing to this score */
  factors: string[];
  /** Breakdown of sub-scores */
  breakdown?: {
    label: string;
    score: number;
    maxScore: number;
  }[];
}

/**
 * Props for the InvestmentScore component
 */
export interface InvestmentScoreProps {
  /** Total investment score (0-125) */
  totalScore: number;
  /** Maximum possible score (typically 125) */
  maxScore?: number;
  /** Overall letter grade */
  grade: Grade;
  /** Category scores */
  categories: CategoryScore[];
  /** Investment rating description */
  ratingDescription?: string;
  /** Key strengths */
  strengths?: string[];
  /** Key weaknesses */
  weaknesses?: string[];
  /** Whether section is initially collapsed */
  defaultCollapsed?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Data source type for badge display */
  dataSourceType?: "live" | "sample" | "partial" | "error";
}

/**
 * Default category definitions with icons and colors
 */
const CATEGORY_CONFIG: Record<
  string,
  { icon: React.ReactNode; color: string; description: string }
> = {
  location: {
    icon: "📍",
    color: "#3b82f6", // blue-500
    description: "Neighborhood quality, accessibility, and growth potential",
  },
  risk: {
    icon: "⚠️",
    color: "#f97316", // orange-500
    description: "Title issues, liens, environmental concerns, and property condition",
  },
  financial: {
    icon: "💰",
    color: "#10b981", // emerald-500
    description: "Acquisition costs, taxes owed, and financing considerations",
  },
  market: {
    icon: "📊",
    color: "#8b5cf6", // violet-500
    description: "Comparable sales, market trends, and days on market",
  },
  profit: {
    icon: "📈",
    color: "#ec4899", // pink-500
    description: "ROI potential, cash flow projections, and exit strategies",
  },
};

/**
 * InvestmentScore - Section 2: 125-point investment scoring breakdown
 *
 * Features:
 * - Overall score gauge (0-125)
 * - Letter grade display (A+ through F)
 * - Radar chart showing 5 category breakdown
 * - Detailed category scores with progress bars
 * - Strengths and weaknesses summary
 * - Accessible data tables for screen readers
 *
 * @example
 * ```tsx
 * <InvestmentScore
 *   totalScore={98}
 *   grade="B+"
 *   categories={[
 *     { name: "Location", key: "location", score: 20, maxScore: 25, grade: "A-", factors: ["Good schools", "Low crime"] },
 *     { name: "Risk", key: "risk", score: 18, maxScore: 25, grade: "B", factors: ["Minor liens found"] },
 *     // ... other categories
 *   ]}
 *   strengths={["Strong location", "High ROI potential"]}
 *   weaknesses={["Some title issues to resolve"]}
 * />
 * ```
 */
export function InvestmentScore({
  totalScore,
  maxScore = 125,
  grade,
  categories,
  ratingDescription,
  strengths = [],
  weaknesses = [],
  defaultCollapsed = false,
  className,
  dataSourceType,
}: InvestmentScoreProps) {
  // Calculate percentage
  const percentage = Math.round((totalScore / maxScore) * 100);

  // Get investment rating
  const rating = gradeToRating(grade);

  // Validate we have category data
  if (!categories || categories.length === 0) {
    return (
      <ReportSection
        id="investment-score"
        title="Investment Score"
        icon={<Target className="h-5 w-5" />}
        defaultCollapsed={defaultCollapsed}
        className={className}
      >
        <DataUnavailable
          title="Score Data Unavailable"
          description="Investment score could not be calculated. This may be due to missing property data."
        />
      </ReportSection>
    );
  }

  // Prepare radar chart data
  const radarData = categories.map((cat) => ({
    category: cat.name,
    score: cat.score,
    fullMark: cat.maxScore,
  }));

  return (
    <ReportSection
      id="investment-score"
      title="Investment Score"
      icon={<Target className="h-5 w-5" />}
      defaultCollapsed={defaultCollapsed}
      className={className}
      headerRight={
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {totalScore}
            </span>
            <span className="text-slate-500 dark:text-slate-400">/ {maxScore}</span>
          </div>
          {dataSourceType && <DataSourceBadge type={dataSourceType} />}
        </div>
      }
    >
      {/* Score Overview Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Score Gauge */}
        <div className="flex flex-col items-center">
          <ScoreGauge
            score={totalScore}
            maxScore={maxScore}
            grade={grade}
            showGrade
            showPercentage
            size="lg"
          />
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 text-center">
            Overall Investment Score
          </p>
        </div>

        {/* Grade Display */}
        <div className="flex flex-col items-center justify-center">
          <GradeDisplay
            grade={grade}
            score={totalScore}
            percentage={percentage}
            size="lg"
            showPercentage
            showRating
          />
          {ratingDescription && (
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 text-center max-w-xs">
              {ratingDescription}
            </p>
          )}
        </div>

        {/* Radar Chart */}
        <div className="flex flex-col items-center">
          <ScoreBreakdownRadar
            data={radarData}
            height={200}
            showTooltip
          />
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 text-center">
            Category Breakdown
          </p>
        </div>
      </div>

      {/* Category Details */}
      <ReportSubsection
        title="Category Breakdown"
        icon={<TrendingUp className="h-4 w-4" />}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {categories.map((category) => {
            const config = CATEGORY_CONFIG[category.key] || {
              icon: "📌",
              color: "#6b7280",
              description: "",
            };

            return (
              <div
                key={category.key}
                className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg" role="img" aria-hidden="true">
                    {config.icon}
                  </span>
                  <CategoryGrade grade={category.grade} />
                </div>

                <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-1">
                  {category.name}
                </h4>

                <ScoreBar
                  score={category.score}
                  maxScore={category.maxScore}
                  color={config.color}
                  showLabel
                  height={8}
                />

                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  {config.description}
                </p>

                {/* Key factors */}
                {category.factors && category.factors.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {category.factors.slice(0, 2).map((factor, idx) => (
                      <li
                        key={idx}
                        className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-1"
                      >
                        <span className="text-slate-400">•</span>
                        {factor}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </ReportSubsection>

      {/* Strengths and Weaknesses */}
      {(strengths.length > 0 || weaknesses.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* Strengths */}
          {strengths.length > 0 && (
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <h4 className="font-medium text-green-800 dark:text-green-300 mb-3 flex items-center gap-2">
                <span className="text-green-600">✓</span>
                Key Strengths
              </h4>
              <ul className="space-y-2">
                {strengths.map((strength, idx) => (
                  <li
                    key={idx}
                    className="text-sm text-green-700 dark:text-green-400 flex items-start gap-2"
                  >
                    <span className="text-green-500 mt-0.5">•</span>
                    {strength}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Weaknesses */}
          {weaknesses.length > 0 && (
            <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <h4 className="font-medium text-amber-800 dark:text-amber-300 mb-3 flex items-center gap-2">
                <span className="text-amber-600">!</span>
                Areas of Concern
              </h4>
              <ul className="space-y-2">
                {weaknesses.map((weakness, idx) => (
                  <li
                    key={idx}
                    className="text-sm text-amber-700 dark:text-amber-400 flex items-start gap-2"
                  >
                    <span className="text-amber-500 mt-0.5">•</span>
                    {weakness}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Scoring Methodology Note */}
      <div className="mt-6 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-slate-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-slate-600 dark:text-slate-400">
            <p className="font-medium text-slate-700 dark:text-slate-300 mb-1">
              Scoring Methodology
            </p>
            <p>
              This 125-point investment score is calculated across 5 categories,
              each worth up to 25 points. Scores are based on property data,
              market conditions, risk factors, and profit potential. Properties
              scoring 90+ are considered excellent opportunities, while those
              below 60 may require additional due diligence.
            </p>
          </div>
        </div>
      </div>

      {/* Screen Reader Summary */}
      <ScreenReaderOnly>
        <div>
          <h4>Investment Score Summary</h4>
          <p>
            Total Score: {totalScore} out of {maxScore} ({percentage}%)
          </p>
          <p>Grade: {grade}</p>
          <p>Rating: {rating}</p>
          <table>
            <caption>Category Breakdown</caption>
            <thead>
              <tr>
                <th>Category</th>
                <th>Score</th>
                <th>Grade</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.key}>
                  <td>{cat.name}</td>
                  <td>
                    {cat.score} / {cat.maxScore}
                  </td>
                  <td>{cat.grade}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ScreenReaderOnly>
    </ReportSection>
  );
}

export default InvestmentScore;

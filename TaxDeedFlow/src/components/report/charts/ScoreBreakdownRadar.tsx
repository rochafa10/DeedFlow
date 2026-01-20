"use client";

import * as React from "react";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { cn } from "@/lib/utils";
import { AccessibleChartWrapper, ChartNoData } from "./AccessibleChartWrapper";
import type { RadarChartDataPoint } from "@/types/report";

/**
 * Props for the ScoreBreakdownRadar component
 */
export interface ScoreBreakdownRadarProps {
  /** Category score data (primary format) */
  categories?: Array<{
    name: string;
    score: number;
    maxScore: number;
  }>;
  /** Category score data (alternative format with 'category' key) */
  data?: Array<{
    category: string;
    score: number;
    fullMark?: number;
    maxScore?: number;
  }>;
  /** Chart size (alias: height) */
  size?: number;
  /** Chart height (alias for size) */
  height?: number;
  /** Whether to show animation */
  animated?: boolean;
  /** Whether to show values on axes */
  showValues?: boolean;
  /** Whether to show tooltip (always true if not specified) */
  showTooltip?: boolean;
  /** Custom colors */
  colors?: {
    fill: string;
    stroke: string;
    grid: string;
  };
  /** Additional CSS classes */
  className?: string;
}

/**
 * Default chart colors
 */
const defaultColors = {
  fill: "rgba(59, 130, 246, 0.3)", // blue-500 with opacity
  stroke: "#3b82f6", // blue-500
  grid: "#e2e8f0", // slate-200
};

/**
 * Custom tooltip component
 */
function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    payload: {
      name: string;
      score: number;
      maxScore: number;
      percentage: number;
    };
  }>;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0].payload;

  return (
    <div className="bg-white dark:bg-slate-800 shadow-lg rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2">
      <p className="font-medium text-slate-900 dark:text-slate-100">
        {data.name}
      </p>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        <span className="font-semibold text-primary">
          {data.score.toFixed(1)}
        </span>
        /{data.maxScore} points ({data.percentage.toFixed(0)}%)
      </p>
    </div>
  );
}

/**
 * ScoreBreakdownRadar - Radar chart showing scores across 5 categories
 *
 * Features:
 * - Displays 5 investment scoring categories on radar axes
 * - Interactive tooltips with score details
 * - Fully responsive with container sizing
 * - Accessible data table for screen readers
 * - Dark mode support
 *
 * @example
 * ```tsx
 * <ScoreBreakdownRadar
 *   categories={[
 *     { name: "Location", score: 22, maxScore: 25 },
 *     { name: "Risk", score: 18, maxScore: 25 },
 *     { name: "Financial", score: 20, maxScore: 25 },
 *     { name: "Market", score: 15, maxScore: 25 },
 *     { name: "Profit", score: 21, maxScore: 25 },
 *   ]}
 *   size={300}
 * />
 * ```
 */
export function ScoreBreakdownRadar({
  categories,
  data,
  size,
  height,
  animated = true,
  showValues = true,
  showTooltip = true,
  colors = defaultColors,
  className,
}: ScoreBreakdownRadarProps) {
  // Determine chart size from size or height prop
  const chartSize = size ?? height ?? 300;

  // Normalize data from either categories or data prop
  const normalizedCategories = categories ?? data?.map((d) => ({
    name: d.category,
    score: d.score,
    maxScore: d.fullMark ?? d.maxScore ?? 25,
  }));

  // Validate data
  if (!normalizedCategories || normalizedCategories.length === 0) {
    return <ChartNoData message="No category data available" height={chartSize} />;
  }

  // Transform data for Recharts
  const chartData: RadarChartDataPoint[] = normalizedCategories.map((cat) => ({
    category: cat.name,
    categoryId: cat.name.toLowerCase().replace(/\s+/g, "_"),
    score: cat.score,
    maxScore: cat.maxScore,
    percentage: (cat.score / cat.maxScore) * 100,
  }));

  // Generate accessible data
  const accessibleData = chartData.map((d) => ({
    label: d.category,
    value: d.score,
    formattedValue: `${d.score.toFixed(1)}/${d.maxScore} (${d.percentage.toFixed(0)}%)`,
  }));

  return (
    <AccessibleChartWrapper
      id="score-breakdown-radar"
      title="Investment Score Breakdown"
      description="Radar chart showing investment scores across 5 categories: Location, Risk, Financial, Market, and Profit. Each category is scored out of 25 points."
      data={accessibleData}
      valueUnit="points"
      showVisualTitle={false}
      className={className}
    >
      <div style={{ width: "100%", height: chartSize }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart
            data={chartData}
            margin={{ top: 20, right: 30, bottom: 20, left: 30 }}
          >
            <PolarGrid stroke={colors.grid} className="dark:stroke-slate-600" />

            <PolarAngleAxis
              dataKey="category"
              tick={{
                fill: "currentColor",
                fontSize: 12,
                fontWeight: 500,
              }}
              className="text-slate-700 dark:text-slate-300"
            />

            <PolarRadiusAxis
              angle={90}
              domain={[0, 25]}
              tick={
                showValues
                  ? {
                      fill: "currentColor",
                      fontSize: 10,
                    }
                  : false
              }
              tickCount={6}
              className="text-slate-500 dark:text-slate-400"
            />

            <Radar
              name="Score"
              dataKey="score"
              stroke={colors.stroke}
              fill={colors.fill}
              fillOpacity={0.6}
              strokeWidth={2}
              dot={{
                r: 4,
                fill: colors.stroke,
                strokeWidth: 2,
                stroke: "#fff",
              }}
              activeDot={{
                r: 6,
                fill: colors.stroke,
                strokeWidth: 2,
                stroke: "#fff",
              }}
              isAnimationActive={animated}
              animationDuration={1000}
              animationEasing="ease-out"
            />

            {showTooltip && <Tooltip content={<CustomTooltip />} />}
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </AccessibleChartWrapper>
  );
}

/**
 * Compact radar chart variant
 */
export interface CompactRadarProps {
  /** Category data */
  categories: Array<{
    name: string;
    score: number;
    maxScore: number;
  }>;
  /** Size in pixels */
  size?: number;
  /** Additional CSS classes */
  className?: string;
}

export function CompactRadar({
  categories,
  size = 150,
  className,
}: CompactRadarProps) {
  if (!categories || categories.length === 0) {
    return null;
  }

  const chartData = categories.map((cat) => ({
    category: cat.name,
    score: cat.score,
    maxScore: cat.maxScore,
  }));

  return (
    <div
      className={cn("flex items-center justify-center", className)}
      role="img"
      aria-label="Score breakdown radar chart"
    >
      <ResponsiveContainer width={size} height={size}>
        <RadarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
          <PolarGrid stroke="#e2e8f0" className="dark:stroke-slate-600" />
          <Radar
            dataKey="score"
            stroke="#3b82f6"
            fill="rgba(59, 130, 246, 0.3)"
            fillOpacity={0.6}
            strokeWidth={1.5}
            isAnimationActive={false}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Category score comparison component
 * Shows scores as a horizontal bar comparison
 */
export interface CategoryComparisonProps {
  /** Category data */
  categories: Array<{
    name: string;
    score: number;
    maxScore: number;
  }>;
  /** Additional CSS classes */
  className?: string;
}

export function CategoryComparison({
  categories,
  className,
}: CategoryComparisonProps) {
  if (!categories || categories.length === 0) {
    return null;
  }

  return (
    <div
      className={cn("space-y-3", className)}
      role="list"
      aria-label="Category score breakdown"
    >
      {categories.map((cat) => {
        const percentage = (cat.score / cat.maxScore) * 100;

        // Determine color based on percentage
        let barColor: string;
        if (percentage >= 80) {
          barColor = "bg-green-500";
        } else if (percentage >= 60) {
          barColor = "bg-blue-500";
        } else if (percentage >= 40) {
          barColor = "bg-yellow-500";
        } else if (percentage >= 20) {
          barColor = "bg-orange-500";
        } else {
          barColor = "bg-red-500";
        }

        return (
          <div key={cat.name} role="listitem">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {cat.name}
              </span>
              <span className="text-sm text-slate-600 dark:text-slate-400">
                <span className="font-semibold">{cat.score.toFixed(1)}</span>/
                {cat.maxScore}
              </span>
            </div>

            <div
              className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden"
              role="progressbar"
              aria-valuenow={cat.score}
              aria-valuemin={0}
              aria-valuemax={cat.maxScore}
              aria-label={`${cat.name}: ${cat.score} out of ${cat.maxScore}`}
            >
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  barColor
                )}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default ScoreBreakdownRadar;

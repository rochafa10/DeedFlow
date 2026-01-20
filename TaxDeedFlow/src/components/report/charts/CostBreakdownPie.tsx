"use client";

import * as React from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { cn } from "@/lib/utils";
import { AccessibleChartWrapper, ChartNoData, ChartLegend } from "./AccessibleChartWrapper";
import { formatValue } from "@/types/report";

/**
 * Cost breakdown data point
 */
export interface CostBreakdownDataPoint {
  /** Category label */
  category: string;
  /** Amount */
  amount: number;
  /** Color for this segment */
  color: string;
}

/**
 * Props for the CostBreakdownPie component
 */
export interface CostBreakdownPieProps {
  /** Cost breakdown data */
  data: CostBreakdownDataPoint[];
  /** Chart height */
  height?: number;
  /** Whether to show legend */
  showLegend?: boolean;
  /** Whether to show labels on segments */
  showLabels?: boolean;
  /** Whether to show animation */
  animated?: boolean;
  /** Inner radius for donut style (0 for solid pie) */
  innerRadius?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Default color palette for cost categories
 */
export const COST_COLORS = {
  acquisition: "#3b82f6", // blue-500
  rehab: "#f97316", // orange-500
  holding: "#8b5cf6", // violet-500
  selling: "#10b981", // emerald-500
  other: "#6b7280", // gray-500
};

/**
 * Custom tooltip component
 */
function CustomTooltip({
  active,
  payload,
  totalAmount,
}: {
  active?: boolean;
  payload?: Array<{
    payload: CostBreakdownDataPoint;
  }>;
  totalAmount: number;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0].payload;
  const percentage = ((data.amount / totalAmount) * 100).toFixed(1);

  return (
    <div className="bg-white dark:bg-slate-800 shadow-lg rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2">
      <p className="font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
        <span
          className="w-3 h-3 rounded-sm"
          style={{ backgroundColor: data.color }}
        />
        {data.category}
      </p>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        <span className="font-semibold">{formatValue(data.amount, "currency")}</span>
        <span className="ml-1">({percentage}%)</span>
      </p>
    </div>
  );
}

/**
 * Custom label renderer for pie segments
 */
function renderCustomLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
  name,
}: {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
  name: string;
}) {
  // Only show label if segment is large enough
  if (percent < 0.05) return null;

  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      className="text-xs font-medium"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

/**
 * CostBreakdownPie - Pie/donut chart for cost distribution
 *
 * Features:
 * - Displays cost breakdown as a pie or donut chart
 * - Interactive tooltips with amounts and percentages
 * - Optional labels on segments
 * - Customizable colors
 * - Accessible data table for screen readers
 * - Dark mode support
 *
 * @example
 * ```tsx
 * <CostBreakdownPie
 *   data={[
 *     { category: "Acquisition", amount: 50000, color: COST_COLORS.acquisition },
 *     { category: "Rehab", amount: 30000, color: COST_COLORS.rehab },
 *     { category: "Holding", amount: 10000, color: COST_COLORS.holding },
 *     { category: "Selling", amount: 15000, color: COST_COLORS.selling },
 *   ]}
 *   showLegend
 *   innerRadius={60}
 * />
 * ```
 */
export function CostBreakdownPie({
  data,
  height = 300,
  showLegend = true,
  showLabels = true,
  animated = true,
  innerRadius = 60,
  className,
}: CostBreakdownPieProps) {
  // Validate data
  if (!data || data.length === 0) {
    return <ChartNoData message="No cost data available" height={height} />;
  }

  // Calculate totals
  const totalAmount = data.reduce((sum, item) => sum + item.amount, 0);

  // Generate accessible data with percentages
  const accessibleData = data.map((item) => ({
    label: item.category,
    value: item.amount,
    formattedValue: `${formatValue(item.amount, "currency")} (${((item.amount / totalAmount) * 100).toFixed(1)}%)`,
  }));

  // Legend items
  const legendItems = data.map((item) => ({
    label: item.category,
    color: item.color,
    value: formatValue(item.amount, "currency"),
  }));

  return (
    <AccessibleChartWrapper
      id="cost-breakdown-pie"
      title="Cost Breakdown"
      description={`Pie chart showing cost distribution. Total costs: ${formatValue(totalAmount, "currency")}`}
      data={accessibleData}
      valueUnit="USD"
      showVisualTitle={false}
      className={className}
    >
      <div style={{ width: "100%", height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="amount"
              nameKey="category"
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={Math.min(height / 2 - 40, 100)}
              paddingAngle={2}
              isAnimationActive={animated}
              animationDuration={800}
              animationEasing="ease-out"
              label={showLabels ? renderCustomLabel : false}
              labelLine={false}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  stroke="white"
                  strokeWidth={2}
                  className="dark:stroke-slate-800"
                />
              ))}
            </Pie>

            <Tooltip
              content={
                <CustomTooltip totalAmount={totalAmount} />
              }
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Total in center for donut charts */}
      {innerRadius > 0 && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
          style={{ top: 0, height }}
          aria-hidden="true"
        >
          <span className="text-sm text-slate-500 dark:text-slate-400">
            Total
          </span>
          <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {formatValue(totalAmount, "currency")}
          </span>
        </div>
      )}

      {/* Legend */}
      {showLegend && (
        <div className="mt-4">
          <ChartLegend items={legendItems} direction="horizontal" />
        </div>
      )}
    </AccessibleChartWrapper>
  );
}

/**
 * Cost breakdown list alternative to pie chart
 */
export interface CostBreakdownListProps {
  /** Cost data */
  data: CostBreakdownDataPoint[];
  /** Whether to show percentages */
  showPercentages?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export function CostBreakdownList({
  data,
  showPercentages = true,
  className,
}: CostBreakdownListProps) {
  if (!data || data.length === 0) {
    return null;
  }

  const totalAmount = data.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className={cn("space-y-3", className)} role="list" aria-label="Cost breakdown">
      {data.map((item) => {
        const percentage = (item.amount / totalAmount) * 100;

        return (
          <div key={item.category} role="listitem">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                  aria-hidden="true"
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {item.category}
                </span>
              </div>
              <span className="text-sm text-slate-900 dark:text-slate-100 font-semibold">
                {formatValue(item.amount, "currency")}
              </span>
            </div>

            {showPercentages && (
              <div
                className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden ml-5"
                role="progressbar"
                aria-valuenow={percentage}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
            )}
          </div>
        );
      })}

      {/* Total row */}
      <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Total
          </span>
          <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {formatValue(totalAmount, "currency")}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Stacked bar chart alternative
 */
export interface CostStackedBarProps {
  /** Cost data */
  data: CostBreakdownDataPoint[];
  /** Bar height */
  height?: number;
  /** Additional CSS classes */
  className?: string;
}

export function CostStackedBar({
  data,
  height = 24,
  className,
}: CostStackedBarProps) {
  if (!data || data.length === 0) {
    return null;
  }

  const totalAmount = data.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className={className}>
      <div
        className="w-full rounded-full overflow-hidden flex"
        style={{ height }}
        role="img"
        aria-label={`Total costs: ${formatValue(totalAmount, "currency")}`}
      >
        {data.map((item, index) => {
          const percentage = (item.amount / totalAmount) * 100;
          if (percentage < 0.5) return null; // Skip tiny segments

          return (
            <div
              key={item.category}
              className={cn(
                "h-full transition-all duration-500",
                index === 0 && "rounded-l-full",
                index === data.length - 1 && "rounded-r-full"
              )}
              style={{
                width: `${percentage}%`,
                backgroundColor: item.color,
              }}
              title={`${item.category}: ${formatValue(item.amount, "currency")} (${percentage.toFixed(1)}%)`}
            />
          );
        })}
      </div>

      {/* Legend below */}
      <div className="flex flex-wrap gap-4 mt-3 justify-center">
        {data.map((item) => (
          <div key={item.category} className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: item.color }}
              aria-hidden="true"
            />
            <span className="text-xs text-slate-600 dark:text-slate-400">
              {item.category}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CostBreakdownPie;

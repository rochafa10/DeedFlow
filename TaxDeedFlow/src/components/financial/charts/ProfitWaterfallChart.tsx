"use client";

/**
 * Profit Waterfall Chart Component
 *
 * Displays a true waterfall chart showing the flow from ARV to net profit,
 * visualizing how costs reduce the final return with floating bars.
 *
 * @component
 * @author Claude Code Agent
 * @date 2026-01-16
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  LabelList,
} from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrency, formatCurrencyCompact } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { TooltipProps, TooltipPayloadItem } from "@/types/charts";

// ============================================
// Type Definitions
// ============================================

interface CostData {
  acquisition: number;
  rehab: number;
  holding: number;
  selling: number;
  totalInvestment?: number;
}

interface ProfitWaterfallChartProps {
  /** Cost breakdown data */
  costs: CostData;
  /** After Repair Value */
  arv: number;
  /** Net profit amount */
  netProfit: number;
  /** Optional additional class names */
  className?: string;
}

interface WaterfallDataItem {
  name: string;
  // For stacked bar approach
  invisible: number;  // Invisible spacer (where visible bar starts)
  visible: number;    // Visible bar height
  fill: string;
  isTotal?: boolean;
  isPositive?: boolean;
  originalValue: number;
  displayValue: number; // For label
}

// ============================================
// Colors
// ============================================

const COLORS = {
  positive: "#22C55E",     // Green
  negative: "#EF4444",     // Red
  acquisition: "#3B82F6",  // Blue
  rehab: "#F97316",        // Orange
  holding: "#8B5CF6",      // Purple
  selling: "#10B981",      // Emerald
  profit: "#22C55E",       // Green
  loss: "#EF4444",         // Red
  arv: "#6366F1",          // Indigo
};

// ============================================
// Custom Tooltip
// ============================================

const CustomTooltip = ({ active, payload }: TooltipProps<WaterfallDataItem>) => {
  if (active && payload && payload.length) {
    // Find the visible bar data (not the invisible spacer)
    const visibleData = payload.find((p: TooltipPayloadItem<WaterfallDataItem>) => p.dataKey === "visible");
    if (!visibleData) return null;

    const data = visibleData.payload;
    const isSubtraction = !data.isTotal && !data.isPositive;

    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-3">
        <div className="font-medium text-slate-900 dark:text-slate-100 mb-1">
          {data.name}
        </div>
        <div
          className={cn(
            "text-lg font-bold",
            data.isTotal
              ? data.originalValue >= 0
                ? "text-green-600"
                : "text-red-600"
              : isSubtraction
                ? "text-red-600"
                : "text-green-600"
          )}
        >
          {isSubtraction ? "-" : ""}
          {formatCurrency(Math.abs(data.originalValue))}
        </div>
      </div>
    );
  }
  return null;
};

// ============================================
// Main Component
// ============================================

export function ProfitWaterfallChart({
  costs,
  arv,
  netProfit,
  className,
}: ProfitWaterfallChartProps) {
  // Build waterfall data with proper positioning
  // For stacked bars:
  // - invisible = the "spacer" height from 0 to where visible bar starts
  // - visible = the actual bar height

  let runningTotal = arv;

  const chartData: WaterfallDataItem[] = [
    // ARV - starts at 0, full height (no invisible portion)
    {
      name: "ARV",
      invisible: 0,
      visible: arv,
      fill: COLORS.arv,
      isTotal: true,
      isPositive: true,
      originalValue: arv,
      displayValue: arv,
    },
  ];

  // Add costs - each one "floats" at the running total level
  const costItems = [
    { name: "Acquisition", amount: costs.acquisition, color: COLORS.acquisition },
    { name: "Rehab", amount: costs.rehab, color: COLORS.rehab },
    { name: "Holding", amount: costs.holding, color: COLORS.holding },
    { name: "Selling", amount: costs.selling, color: COLORS.selling },
  ];

  for (const cost of costItems) {
    // Skip zero-value costs
    if (cost.amount === 0) {
      runningTotal = runningTotal - cost.amount;
      continue;
    }

    // Calculate where this bar should be positioned
    const newRunningTotal = runningTotal - cost.amount;

    chartData.push({
      name: cost.name,
      invisible: newRunningTotal,  // Spacer from 0 to bottom of bar
      visible: cost.amount,        // The actual bar height
      fill: cost.color,
      isTotal: false,
      isPositive: false,
      originalValue: -cost.amount,
      displayValue: cost.amount,
    });

    runningTotal = newRunningTotal;
  }

  // Net Profit - starts at 0, goes up to netProfit
  chartData.push({
    name: "Net Profit",
    invisible: 0,
    visible: Math.abs(netProfit),
    fill: netProfit >= 0 ? COLORS.profit : COLORS.loss,
    isTotal: true,
    isPositive: netProfit >= 0,
    originalValue: netProfit,
    displayValue: Math.abs(netProfit),
  });

  // Calculate max value for Y axis
  const maxValue = Math.max(arv, Math.abs(netProfit));

  // If no data, show placeholder
  if (arv === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Profit Waterfall
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-slate-400">
            No financial data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {netProfit >= 0 ? (
              <TrendingUp className="h-5 w-5 text-green-500" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-500" />
            )}
            Profit Waterfall
          </div>
          <span
            className={cn(
              "text-lg font-bold",
              netProfit >= 0 ? "text-green-600" : "text-red-600"
            )}
          >
            {formatCurrency(netProfit)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 30, right: 30, left: 20, bottom: 5 }}
            >
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[0, maxValue * 1.15]}
                tickFormatter={(value) => formatCurrencyCompact(value)}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />

              {/* Invisible spacer bar - positions where each visible bar starts */}
              <Bar
                dataKey="invisible"
                stackId="waterfall"
                fill="transparent"
                fillOpacity={0}
                strokeWidth={0}
              />

              {/* Visible bar - the actual colored portion */}
              <Bar
                dataKey="visible"
                stackId="waterfall"
                radius={[4, 4, 0, 0]}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.fill}
                    fillOpacity={entry.isTotal ? 1 : 0.9}
                  />
                ))}
                <LabelList
                  dataKey="displayValue"
                  position="top"
                  formatter={(value: number) => formatCurrencyCompact(value)}
                  fill="#64748b"
                  fontSize={11}
                />
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Summary Row */}
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-sm text-slate-500 dark:text-slate-400">
              After Repair Value
            </div>
            <div className="text-lg font-semibold text-indigo-600">
              {formatCurrency(arv)}
            </div>
          </div>
          <div className="text-center border-x border-slate-200 dark:border-slate-700">
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Total Costs
            </div>
            <div className="text-lg font-semibold text-red-600">
              -{formatCurrency(
                costs.acquisition + costs.rehab + costs.holding + costs.selling
              )}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Net Profit
            </div>
            <div
              className={cn(
                "text-lg font-semibold",
                netProfit >= 0 ? "text-green-600" : "text-red-600"
              )}
            >
              {formatCurrency(netProfit)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default ProfitWaterfallChart;

"use client";

/**
 * Cost Pie Chart Component
 *
 * Displays cost distribution as an interactive pie chart using Recharts.
 * Shows acquisition, rehab, holding, and selling costs with custom colors.
 *
 * @component
 * @author Claude Code Agent
 * @date 2026-01-16
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PieChart,
  Pie,
  Cell,
  Sector,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { PieChartIcon } from "lucide-react";
import { formatCurrency, formatPercent } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { ActiveShapeProps, TooltipProps } from "@/types/charts";

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

interface CostPieChartProps {
  /** Cost data to display */
  costs: CostData;
  /** Whether to show legend */
  showLegend?: boolean;
  /** Optional additional class names */
  className?: string;
}

interface ChartDataItem {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

// ============================================
// Cost Category Colors (from spec)
// ============================================

const COST_COLORS = {
  Acquisition: "#3B82F6", // Blue
  Rehab: "#F97316",       // Orange
  Holding: "#8B5CF6",     // Purple
  Selling: "#22C55E",     // Green
};

// ============================================
// Custom Active Shape for Pie
// ============================================

const renderActiveShape = (props: ActiveShapeProps<ChartDataItem>) => {
  const {
    cx,
    cy,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
    payload,
    value,
    percent,
  } = props;

  return (
    <g>
      {/* Center text */}
      <text
        x={cx}
        y={cy - 10}
        textAnchor="middle"
        fill="currentColor"
        className="text-slate-900 dark:text-slate-100"
        fontSize={14}
        fontWeight={600}
      >
        {payload.name}
      </text>
      <text
        x={cx}
        y={cy + 10}
        textAnchor="middle"
        fill="currentColor"
        className="text-slate-600 dark:text-slate-400"
        fontSize={18}
        fontWeight={700}
      >
        {formatCurrency(value)}
      </text>
      <text
        x={cx}
        y={cy + 30}
        textAnchor="middle"
        fill="currentColor"
        className="text-slate-500 dark:text-slate-500"
        fontSize={12}
      >
        {formatPercent(percent * 100)}
      </text>

      {/* Active sector */}
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius - 4}
        outerRadius={innerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
    </g>
  );
};

// ============================================
// Custom Tooltip
// ============================================

const CustomTooltip = ({ active, payload }: TooltipProps<ChartDataItem>) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-3">
        <div className="flex items-center gap-2 mb-1">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: data.color }}
          />
          <span className="font-medium text-slate-900 dark:text-slate-100">
            {data.name}
          </span>
        </div>
        <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
          {formatCurrency(data.value)}
        </div>
        <div className="text-sm text-slate-500 dark:text-slate-400">
          {formatPercent(data.percentage)} of total
        </div>
      </div>
    );
  }
  return null;
};

// ============================================
// Custom Legend
// ============================================

const CustomLegend = ({ data }: { data: ChartDataItem[] }) => {
  return (
    <div className="flex flex-wrap justify-center gap-4 mt-4">
      {data.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-sm text-slate-600 dark:text-slate-400">
            {item.name}
          </span>
          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
            {formatPercent(item.percentage)}
          </span>
        </div>
      ))}
    </div>
  );
};

// ============================================
// Main Component
// ============================================

export function CostPieChart({
  costs,
  showLegend = false,
  className,
}: CostPieChartProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  // Calculate total
  const total =
    costs.totalInvestment ||
    costs.acquisition + costs.rehab + costs.holding + costs.selling;

  // Prepare chart data
  const chartData: ChartDataItem[] = [
    {
      name: "Acquisition",
      value: costs.acquisition,
      color: COST_COLORS.Acquisition,
      percentage: total > 0 ? (costs.acquisition / total) * 100 : 0,
    },
    {
      name: "Rehab",
      value: costs.rehab,
      color: COST_COLORS.Rehab,
      percentage: total > 0 ? (costs.rehab / total) * 100 : 0,
    },
    {
      name: "Holding",
      value: costs.holding,
      color: COST_COLORS.Holding,
      percentage: total > 0 ? (costs.holding / total) * 100 : 0,
    },
    {
      name: "Selling",
      value: costs.selling,
      color: COST_COLORS.Selling,
      percentage: total > 0 ? (costs.selling / total) * 100 : 0,
    },
  ].filter((item) => item.value > 0);

  const onPieEnter = (_: ChartDataItem, index: number) => {
    setActiveIndex(index);
  };

  // If no data, show placeholder
  if (chartData.length === 0 || total === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5" />
            Cost Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-slate-400">
            No cost data available
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
            <PieChartIcon className="h-5 w-5" />
            Cost Distribution
          </div>
          <span className="text-lg font-normal text-slate-500 dark:text-slate-400">
            Total: {formatCurrency(total)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                activeIndex={activeIndex}
                // @ts-expect-error - Recharts activeShape type is overly strict
                activeShape={renderActiveShape}
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                dataKey="value"
                onMouseEnter={onPieEnter}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {showLegend && <CustomLegend data={chartData} />}

        {/* Mini Stats Row */}
        <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t">
          {chartData.map((item, index) => (
            <div
              key={index}
              className="text-center p-2 rounded-lg"
              style={{ backgroundColor: `${item.color}10` }}
            >
              <div
                className="text-xs font-medium"
                style={{ color: item.color }}
              >
                {item.name}
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {formatPercent(item.percentage)}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default CostPieChart;

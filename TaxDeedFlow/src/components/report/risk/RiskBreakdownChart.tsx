"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  Legend,
} from "recharts";
import {
  Droplets,
  Mountain,
  Flame,
  Wind,
  CircleDot,
  Biohazard,
  Radiation,
  TrendingDown,
  Sun,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { RiskCategoryScore, RiskWeights } from "@/types/risk-analysis";
import { AccessibleChartWrapper, SimpleChartWrapper } from "../charts/AccessibleChartWrapper";

/**
 * Props for the RiskBreakdownChart component
 */
export interface RiskBreakdownChartProps {
  /** Risk category scores to display */
  categoryScores: RiskCategoryScore[];
  /** Weights used for the assessment */
  weights: RiskWeights;
  /** Chart type to display */
  chartType?: "radar" | "bar" | "both";
  /** Whether to show the legend */
  showLegend?: boolean;
  /** Height of the chart in pixels */
  height?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Category configuration with colors and icons
 */
const CATEGORY_CONFIG: Record<
  keyof RiskWeights,
  {
    label: string;
    icon: React.ReactNode;
    color: string;
    description: string;
  }
> = {
  flood: {
    label: "Flood",
    icon: <Droplets className="h-4 w-4" />,
    color: "#3b82f6", // blue-500
    description: "FEMA flood zone and historical flooding risk",
  },
  earthquake: {
    label: "Earthquake",
    icon: <Mountain className="h-4 w-4" />,
    color: "#8b5cf6", // violet-500
    description: "Seismic hazard and fault proximity",
  },
  wildfire: {
    label: "Wildfire",
    icon: <Flame className="h-4 w-4" />,
    color: "#f97316", // orange-500
    description: "Wildfire hazard potential and WUI status",
  },
  hurricane: {
    label: "Hurricane",
    icon: <Wind className="h-4 w-4" />,
    color: "#06b6d4", // cyan-500
    description: "Wind zone and storm surge exposure",
  },
  sinkhole: {
    label: "Sinkhole",
    icon: <CircleDot className="h-4 w-4" />,
    color: "#a855f7", // purple-500
    description: "Karst geology and historical sinkholes",
  },
  environmental: {
    label: "Environmental",
    icon: <Biohazard className="h-4 w-4" />,
    color: "#22c55e", // green-500
    description: "Nearby contamination sites and EPA concerns",
  },
  radon: {
    label: "Radon",
    icon: <Radiation className="h-4 w-4" />,
    color: "#eab308", // yellow-500
    description: "EPA radon zone and testing recommendations",
  },
  slope: {
    label: "Slope",
    icon: <TrendingDown className="h-4 w-4" />,
    color: "#78716c", // stone-500
    description: "Terrain stability and landslide susceptibility",
  },
  drought: {
    label: "Drought",
    icon: <Sun className="h-4 w-4" />,
    color: "#f59e0b", // amber-500
    description: "Drought conditions and water availability",
  },
};

/**
 * Get color based on risk score (0-100, higher = more risk)
 */
function getScoreColor(score: number): string {
  if (score <= 25) return "#22c55e"; // green
  if (score <= 50) return "#eab308"; // yellow
  if (score <= 75) return "#f97316"; // orange
  return "#ef4444"; // red
}

/**
 * Custom tooltip for the charts
 */
function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    payload: {
      category: string;
      score: number;
      weight: number;
      dataAvailability: string;
    };
  }>;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0].payload;
  const config = CATEGORY_CONFIG[data.category as keyof RiskWeights];

  return (
    <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-slate-600 dark:text-slate-400">{config?.icon}</span>
        <span className="font-medium text-slate-900 dark:text-slate-100">
          {config?.label || data.category}
        </span>
      </div>
      <div className="space-y-1 text-sm">
        <p className="text-slate-700 dark:text-slate-300">
          Risk Score: <span className="font-semibold" style={{ color: getScoreColor(data.score) }}>{data.score}</span>/100
        </p>
        <p className="text-slate-500 dark:text-slate-400">
          Weight: {(data.weight * 100).toFixed(0)}%
        </p>
        <p className="text-slate-500 dark:text-slate-400 text-xs">
          Data: {data.dataAvailability}
        </p>
      </div>
      {config?.description && (
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 border-t border-slate-200 dark:border-slate-700 pt-2">
          {config.description}
        </p>
      )}
    </div>
  );
}

/**
 * RiskBreakdownChart - Visualizes risk category scores
 *
 * Features:
 * - Radar chart for overall risk profile visualization
 * - Bar chart for easy comparison of categories
 * - Color-coded risk levels
 * - Weight indicators
 * - Accessible with screen reader support
 *
 * @example
 * ```tsx
 * <RiskBreakdownChart
 *   categoryScores={assessment.categoryScores}
 *   weights={assessment.weightsUsed}
 *   chartType="both"
 * />
 * ```
 */
export function RiskBreakdownChart({
  categoryScores,
  weights,
  chartType = "both",
  showLegend = true,
  height = 300,
  className,
}: RiskBreakdownChartProps) {
  // Transform data for charts
  const chartData = categoryScores.map((score) => ({
    category: score.category,
    score: score.rawScore,
    weight: score.weight,
    weightedScore: score.weightedScore,
    riskLevel: score.riskLevel,
    dataAvailability: score.dataAvailability,
    label: CATEGORY_CONFIG[score.category]?.label || score.category,
    fullMark: 100,
  }));

  // Generate accessibility description
  const accessibilityDescription = `Risk breakdown chart showing ${categoryScores.length} risk categories. ${
    chartData.sort((a, b) => b.score - a.score).slice(0, 3)
      .map((d) => `${d.label}: ${d.score}%`)
      .join(", ")
  } are the highest risk categories.`;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Radar Chart */}
      {(chartType === "radar" || chartType === "both") && (
        <div>
          <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Risk Profile Radar
          </h4>
          <SimpleChartWrapper label={accessibilityDescription}>
            <div style={{ height }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="80%">
                  <PolarGrid stroke="#94a3b8" strokeDasharray="3 3" />
                  <PolarAngleAxis
                    dataKey="label"
                    tick={{ fill: "#64748b", fontSize: 11 }}
                  />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 100]}
                    tick={{ fill: "#94a3b8", fontSize: 10 }}
                    tickCount={5}
                  />
                  <Radar
                    name="Risk Score"
                    dataKey="score"
                    stroke="#ef4444"
                    fill="#ef4444"
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  {showLegend && (
                    <Legend
                      wrapperStyle={{ paddingTop: 20 }}
                      formatter={(value) => (
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {value} (0 = minimal risk, 100 = severe risk)
                        </span>
                      )}
                    />
                  )}
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </SimpleChartWrapper>
        </div>
      )}

      {/* Bar Chart */}
      {(chartType === "bar" || chartType === "both") && (
        <div>
          <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Risk Category Comparison
          </h4>
          <SimpleChartWrapper label={accessibilityDescription}>
            <div style={{ height }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData.sort((a, b) => b.score - a.score)}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                >
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    tickLine={{ stroke: "#94a3b8" }}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={75}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="score"
                    name="Risk Score"
                    radius={[0, 4, 4, 0]}
                    maxBarSize={30}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getScoreColor(entry.score)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SimpleChartWrapper>
        </div>
      )}

      {/* Category Details Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className="text-left py-2 px-3 text-slate-600 dark:text-slate-400 font-medium">
                Category
              </th>
              <th className="text-center py-2 px-3 text-slate-600 dark:text-slate-400 font-medium">
                Score
              </th>
              <th className="text-center py-2 px-3 text-slate-600 dark:text-slate-400 font-medium">
                Weight
              </th>
              <th className="text-center py-2 px-3 text-slate-600 dark:text-slate-400 font-medium">
                Weighted
              </th>
              <th className="text-center py-2 px-3 text-slate-600 dark:text-slate-400 font-medium">
                Data
              </th>
            </tr>
          </thead>
          <tbody>
            {chartData.map((row) => {
              const config = CATEGORY_CONFIG[row.category as keyof RiskWeights];
              return (
                <tr
                  key={row.category}
                  className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="p-1 rounded"
                        style={{ backgroundColor: config?.color + "20", color: config?.color }}
                      >
                        {config?.icon}
                      </span>
                      <span className="text-slate-700 dark:text-slate-300">
                        {row.label}
                      </span>
                    </div>
                  </td>
                  <td className="text-center py-2 px-3">
                    <span
                      className="font-semibold"
                      style={{ color: getScoreColor(row.score) }}
                    >
                      {row.score}
                    </span>
                  </td>
                  <td className="text-center py-2 px-3 text-slate-600 dark:text-slate-400">
                    {(row.weight * 100).toFixed(0)}%
                  </td>
                  <td className="text-center py-2 px-3 text-slate-600 dark:text-slate-400">
                    {row.weightedScore.toFixed(1)}
                  </td>
                  <td className="text-center py-2 px-3">
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded text-xs",
                        row.dataAvailability === "full" &&
                          "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                        row.dataAvailability === "partial" &&
                          "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
                        row.dataAvailability === "none" &&
                          "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                      )}
                    >
                      {row.dataAvailability}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Risk Level Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
        <span className="text-slate-500 dark:text-slate-400">Risk Levels:</span>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-green-500" />
          <span className="text-slate-600 dark:text-slate-400">Low (0-25)</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-yellow-500" />
          <span className="text-slate-600 dark:text-slate-400">Moderate (26-50)</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-orange-500" />
          <span className="text-slate-600 dark:text-slate-400">High (51-75)</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-red-500" />
          <span className="text-slate-600 dark:text-slate-400">Severe (76-100)</span>
        </div>
      </div>
    </div>
  );
}

export default RiskBreakdownChart;

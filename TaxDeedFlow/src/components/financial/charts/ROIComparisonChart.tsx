"use client";

/**
 * ROI Comparison Chart Component
 *
 * Displays ROI vs Annualized ROI comparison with benchmark indicators.
 * Includes horizontal bar visualization and comparison to investment targets.
 *
 * @component
 * @author Claude Code Agent
 * @date 2026-01-16
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import { BarChart3, Target, TrendingUp } from "lucide-react";
import { formatPercent } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

// ============================================
// Type Definitions
// ============================================

interface ROIComparisonChartProps {
  /** Return on Investment percentage */
  roi: number;
  /** Annualized ROI percentage */
  annualizedRoi: number;
  /** Optional minimum acceptable ROI target */
  roiTarget?: number;
  /** Optional additional class names */
  className?: string;
}

// ============================================
// Benchmarks
// ============================================

const BENCHMARKS = {
  stockMarket: 10,  // S&P 500 average annual return
  realEstate: 8,    // Average real estate appreciation
  minFlip: 20,      // Minimum acceptable flip ROI
  goodFlip: 30,     // Good flip ROI
  excellentFlip: 50, // Excellent flip ROI
};

// ============================================
// Helper Functions
// ============================================

function getROIRating(roi: number): {
  label: string;
  variant: "excellent" | "good" | "fair" | "poor";
  color: string;
} {
  if (roi >= BENCHMARKS.excellentFlip) {
    return { label: "Excellent", variant: "excellent", color: "#22C55E" };
  }
  if (roi >= BENCHMARKS.goodFlip) {
    return { label: "Good", variant: "good", color: "#3B82F6" };
  }
  if (roi >= BENCHMARKS.minFlip) {
    return { label: "Acceptable", variant: "fair", color: "#F59E0B" };
  }
  return { label: "Below Target", variant: "poor", color: "#EF4444" };
}

// ============================================
// Custom Tooltip
// ============================================

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-3">
        <div className="font-medium text-slate-900 dark:text-slate-100 mb-1">
          {data.name}
        </div>
        <div
          className="text-lg font-bold"
          style={{ color: data.fill }}
        >
          {formatPercent(data.value)}
        </div>
        {data.description && (
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {data.description}
          </div>
        )}
      </div>
    );
  }
  return null;
};

// ============================================
// Main Component
// ============================================

export function ROIComparisonChart({
  roi,
  annualizedRoi,
  roiTarget = BENCHMARKS.minFlip,
  className,
}: ROIComparisonChartProps) {
  // Get ratings
  const roiRating = getROIRating(roi);
  const annualizedRating = getROIRating(annualizedRoi);

  // Prepare chart data
  const chartData = [
    {
      name: "ROI",
      value: roi,
      fill: roiRating.color,
      description: "Total return on investment",
    },
    {
      name: "Annualized ROI",
      value: annualizedRoi,
      fill: annualizedRating.color,
      description: "ROI adjusted to annual rate",
    },
    {
      name: "Target",
      value: roiTarget,
      fill: "#94A3B8",
      description: `Minimum ${roiTarget}% target`,
    },
  ];

  // Comparison data for the horizontal bars
  const comparisonData = [
    {
      name: "S&P 500 Avg",
      value: BENCHMARKS.stockMarket,
      fill: "#94A3B8",
    },
    {
      name: "Min Flip Target",
      value: BENCHMARKS.minFlip,
      fill: "#F59E0B",
    },
    {
      name: "This Deal (ROI)",
      value: roi,
      fill: roiRating.color,
    },
    {
      name: "This Deal (Ann.)",
      value: annualizedRoi,
      fill: annualizedRating.color,
    },
  ];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            ROI Analysis
          </div>
          <Badge variant={roiRating.variant}>{roiRating.label}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main ROI Display */}
        <div className="grid grid-cols-2 gap-4">
          <div
            className={cn(
              "p-4 rounded-lg text-center",
              roi >= roiTarget
                ? "bg-green-50 dark:bg-green-900/20"
                : "bg-red-50 dark:bg-red-900/20"
            )}
          >
            <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">
              Return on Investment
            </div>
            <div
              className="text-3xl font-bold"
              style={{ color: roiRating.color }}
            >
              {formatPercent(roi)}
            </div>
            <div className="flex items-center justify-center gap-1 mt-1">
              {roi >= roiTarget ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <Target className="h-4 w-4 text-red-500" />
              )}
              <span className="text-xs text-slate-500">
                {roi >= roiTarget ? "Above" : "Below"} {roiTarget}% target
              </span>
            </div>
          </div>

          <div
            className={cn(
              "p-4 rounded-lg text-center",
              annualizedRoi >= roiTarget
                ? "bg-green-50 dark:bg-green-900/20"
                : "bg-red-50 dark:bg-red-900/20"
            )}
          >
            <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">
              Annualized ROI
            </div>
            <div
              className="text-3xl font-bold"
              style={{ color: annualizedRating.color }}
            >
              {formatPercent(annualizedRoi)}
            </div>
            <div className="flex items-center justify-center gap-1 mt-1">
              {annualizedRoi >= roiTarget ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <Target className="h-4 w-4 text-red-500" />
              )}
              <span className="text-xs text-slate-500">
                {annualizedRoi >= roiTarget ? "Above" : "Below"} {roiTarget}% target
              </span>
            </div>
          </div>
        </div>

        {/* Comparison Chart */}
        <div>
          <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
            Comparison to Benchmarks
          </h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={comparisonData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
              >
                <XAxis
                  type="number"
                  tickFormatter={(value) => `${value}%`}
                  domain={[0, Math.max(roi, annualizedRoi, 60)]}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine
                  x={roiTarget}
                  stroke="#F59E0B"
                  strokeDasharray="3 3"
                  label={{
                    value: "Target",
                    position: "top",
                    fill: "#F59E0B",
                    fontSize: 10,
                  }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {comparisonData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Rating Scale */}
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
            ROI Rating Scale
          </h4>
          <div className="flex items-center gap-1">
            <div className="flex-1 h-2 bg-red-500 rounded-l" />
            <div className="flex-1 h-2 bg-yellow-500" />
            <div className="flex-1 h-2 bg-blue-500" />
            <div className="flex-1 h-2 bg-green-500 rounded-r" />
          </div>
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>0%</span>
            <span>{BENCHMARKS.minFlip}%</span>
            <span>{BENCHMARKS.goodFlip}%</span>
            <span>{BENCHMARKS.excellentFlip}%+</span>
          </div>
          <div className="flex justify-between text-xs mt-1">
            <span className="text-red-500">Poor</span>
            <span className="text-yellow-500">Acceptable</span>
            <span className="text-blue-500">Good</span>
            <span className="text-green-500">Excellent</span>
          </div>

          {/* Current Position Indicator */}
          <div className="relative mt-2">
            <div
              className="absolute top-0 w-0.5 h-4 bg-slate-900 dark:bg-slate-100"
              style={{
                left: `${Math.min((roi / (BENCHMARKS.excellentFlip * 1.2)) * 100, 100)}%`,
              }}
            />
            <div
              className="absolute -top-1 text-xs font-medium text-slate-900 dark:text-slate-100"
              style={{
                left: `${Math.min((roi / (BENCHMARKS.excellentFlip * 1.2)) * 100, 100)}%`,
                transform: "translateX(-50%)",
              }}
            >
              Your ROI
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default ROIComparisonChart;

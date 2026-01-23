"use client";

/**
 * County Trends Chart Component
 *
 * Displays seasonal patterns and trends across multiple counties,
 * showing auction volumes and average prices by month/quarter.
 *
 * @component
 * @author Claude Code Agent
 * @date 2026-01-22
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { TrendingUp, MapPin, Calendar, BarChart3, Info } from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

// ============================================
// Type Definitions
// ============================================

interface CountyMonthlyData {
  /** County ID */
  countyId: string;
  /** County name */
  countyName: string;
  /** Month (1-12) */
  month: number;
  /** Year */
  year: number;
  /** Number of auctions in this period */
  auctionCount: number;
  /** Average sale price for this period */
  avgSalePrice: number | null;
  /** Total sale volume */
  totalVolume: number | null;
  /** Average bid ratio */
  avgBidRatio: number | null;
}

interface CountyTrendsChartProps {
  /** Array of monthly data for all counties */
  data: CountyMonthlyData[];
  /** Metric to display on Y-axis */
  metric?: "auctionCount" | "avgSalePrice" | "totalVolume" | "avgBidRatio";
  /** Show average reference line */
  showAverageLine?: boolean;
  /** Group by quarter instead of month */
  groupByQuarter?: boolean;
  /** Limit to specific counties (by ID) */
  countyFilter?: string[];
  /** Optional additional class names */
  className?: string;
}

interface ChartDataPoint {
  period: string; // "Jan 2025" or "Q1 2025"
  timestamp: number; // for sorting
  [countyName: string]: number | string; // dynamic county data
}

interface CountyColor {
  stroke: string;
  name: string;
}

// ============================================
// Colors
// ============================================

const COUNTY_COLORS = [
  "#3B82F6", // blue
  "#F59E0B", // amber
  "#10B981", // emerald
  "#EF4444", // red
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#06B6D4", // cyan
  "#F97316", // orange
];

const COLORS = {
  average: "#64748B", // slate
  grid: "#E5E7EB", // light gray
  gridDark: "#374151", // dark gray
};

// ============================================
// Helper Functions
// ============================================

/**
 * Get month name abbreviation
 */
function getMonthName(month: number): string {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return months[month - 1] || "Unknown";
}

/**
 * Get quarter from month
 */
function getQuarter(month: number): number {
  return Math.ceil(month / 3);
}

/**
 * Format period label
 */
function formatPeriod(
  month: number,
  year: number,
  groupByQuarter: boolean
): string {
  if (groupByQuarter) {
    const quarter = getQuarter(month);
    return `Q${quarter} ${year}`;
  }
  return `${getMonthName(month)} ${year}`;
}

/**
 * Get metric label
 */
function getMetricLabel(
  metric: "auctionCount" | "avgSalePrice" | "totalVolume" | "avgBidRatio"
): string {
  switch (metric) {
    case "auctionCount":
      return "Auction Count";
    case "avgSalePrice":
      return "Average Sale Price";
    case "totalVolume":
      return "Total Volume";
    case "avgBidRatio":
      return "Average Bid Ratio";
  }
}

/**
 * Format metric value
 */
function formatMetricValue(
  value: number | null,
  metric: "auctionCount" | "avgSalePrice" | "totalVolume" | "avgBidRatio"
): string {
  if (value === null) return "N/A";

  switch (metric) {
    case "auctionCount":
      return formatNumber(value);
    case "avgSalePrice":
    case "totalVolume":
      return formatCurrency(value);
    case "avgBidRatio":
      return `${value.toFixed(2)}x`;
  }
}

/**
 * Transform county monthly data to chart format
 */
function transformToChartData(
  data: CountyMonthlyData[],
  metric: "auctionCount" | "avgSalePrice" | "totalVolume" | "avgBidRatio",
  groupByQuarter: boolean,
  countyFilter?: string[]
): ChartDataPoint[] {
  // Filter counties if specified
  const filteredData = countyFilter
    ? data.filter((d) => countyFilter.includes(d.countyId))
    : data;

  // Group by period and county
  const periodMap = new Map<string, ChartDataPoint>();

  filteredData.forEach((item) => {
    const period = formatPeriod(item.month, item.year, groupByQuarter);
    const timestamp = new Date(item.year, item.month - 1, 1).getTime();

    if (!periodMap.has(period)) {
      periodMap.set(period, {
        period,
        timestamp,
      });
    }

    const point = periodMap.get(period)!;

    // If grouping by quarter, aggregate the data
    if (groupByQuarter) {
      const currentValue = (point[item.countyName] as number) || 0;
      const newValue =
        metric === "auctionCount"
          ? item.auctionCount
          : metric === "avgSalePrice"
            ? item.avgSalePrice || 0
            : metric === "totalVolume"
              ? item.totalVolume || 0
              : item.avgBidRatio || 0;

      if (metric === "auctionCount" || metric === "totalVolume") {
        // Sum for counts and volume
        point[item.countyName] = currentValue + newValue;
      } else {
        // Average for prices and ratios (simplified - should ideally weight by count)
        point[item.countyName] = (currentValue + newValue) / 2;
      }
    } else {
      point[item.countyName] =
        metric === "auctionCount"
          ? item.auctionCount
          : metric === "avgSalePrice"
            ? item.avgSalePrice || 0
            : metric === "totalVolume"
              ? item.totalVolume || 0
              : item.avgBidRatio || 0;
    }
  });

  return Array.from(periodMap.values()).sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Get unique counties from data
 */
function getUniqueCounties(data: CountyMonthlyData[]): CountyColor[] {
  const uniqueCounties = new Map<string, string>();
  data.forEach((item) => {
    uniqueCounties.set(item.countyName, item.countyId);
  });

  return Array.from(uniqueCounties.entries()).map(([name], index) => ({
    stroke: COUNTY_COLORS[index % COUNTY_COLORS.length],
    name,
  }));
}

/**
 * Calculate overall average
 */
function calculateOverallAverage(
  chartData: ChartDataPoint[],
  counties: CountyColor[]
): number {
  const allValues: number[] = [];

  chartData.forEach((point) => {
    counties.forEach((county) => {
      const value = point[county.name];
      if (typeof value === "number" && value > 0) {
        allValues.push(value);
      }
    });
  });

  if (allValues.length === 0) return 0;

  return allValues.reduce((sum, val) => sum + val, 0) / allValues.length;
}

/**
 * Identify peak season
 */
function identifyPeakSeason(
  data: CountyMonthlyData[],
  metric: "auctionCount" | "avgSalePrice" | "totalVolume" | "avgBidRatio"
): { season: string; value: number } {
  // Group by quarter across all years and counties
  const quarterTotals = new Map<number, number[]>();

  data.forEach((item) => {
    const quarter = getQuarter(item.month);
    const value =
      metric === "auctionCount"
        ? item.auctionCount
        : metric === "avgSalePrice"
          ? item.avgSalePrice || 0
          : metric === "totalVolume"
            ? item.totalVolume || 0
            : item.avgBidRatio || 0;

    if (!quarterTotals.has(quarter)) {
      quarterTotals.set(quarter, []);
    }
    quarterTotals.get(quarter)!.push(value);
  });

  // Calculate average for each quarter
  const quarterAverages = Array.from(quarterTotals.entries()).map(
    ([quarter, values]) => ({
      quarter,
      avg: values.reduce((sum, val) => sum + val, 0) / values.length,
    })
  );

  // Find peak quarter
  const peak = quarterAverages.reduce((max, curr) =>
    curr.avg > max.avg ? curr : max
  );

  const seasonNames = ["Q1 (Winter)", "Q2 (Spring)", "Q3 (Summer)", "Q4 (Fall)"];
  return {
    season: seasonNames[peak.quarter - 1],
    value: peak.avg,
  };
}

// ============================================
// Custom Tooltip
// ============================================

const CustomTooltip = ({
  active,
  payload,
  metric,
}: any & {
  metric: "auctionCount" | "avgSalePrice" | "totalVolume" | "avgBidRatio";
}) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;

    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-4 max-w-xs">
        <div className="flex items-start gap-2 mb-2">
          <Calendar className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-medium text-slate-900 dark:text-slate-100">
              {data.period}
            </div>
          </div>
        </div>

        <div className="space-y-1.5 text-sm border-t border-slate-200 dark:border-slate-700 pt-2 mt-2">
          {payload.map((entry: any, index: number) => {
            if (entry.dataKey === "period" || entry.dataKey === "timestamp")
              return null;

            return (
              <div key={index} className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: entry.stroke }}
                  />
                  <span className="text-slate-500">{entry.dataKey}:</span>
                </div>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {formatMetricValue(entry.value, metric)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
};

// ============================================
// Main Component
// ============================================

export function CountyTrendsChart({
  data,
  metric = "auctionCount",
  showAverageLine = true,
  groupByQuarter = false,
  countyFilter,
  className,
}: CountyTrendsChartProps) {
  // Transform data
  const chartData = transformToChartData(data, metric, groupByQuarter, countyFilter);
  const counties = getUniqueCounties(
    countyFilter
      ? data.filter((d) => countyFilter.includes(d.countyId))
      : data
  );

  // Calculate metrics
  const overallAverage = calculateOverallAverage(chartData, counties);
  const peakSeason = identifyPeakSeason(data, metric);
  const totalPeriods = chartData.length;
  const totalCounties = counties.length;

  // Empty state
  if (chartData.length === 0 || counties.length === 0) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-slate-400" />
            County Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Info className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
            <p className="text-slate-500 dark:text-slate-400">
              No trend data available
            </p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
              County seasonal patterns will appear here once data is available
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              County Trends - {getMetricLabel(metric)}
            </CardTitle>
            <p className="text-sm text-slate-500 mt-1">
              Seasonal patterns across {totalCounties} count
              {totalCounties !== 1 ? "ies" : "y"} over {totalPeriods} period
              {totalPeriods !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <Badge variant="secondary">
                Peak: {peakSeason.season}
              </Badge>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500">Overall Average</div>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {formatMetricValue(overallAverage, metric)}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={COLORS.grid}
              className="dark:stroke-slate-700"
            />
            <XAxis
              dataKey="period"
              stroke="#6B7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              stroke="#6B7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => formatMetricValue(value, metric)}
            />
            <Tooltip content={<CustomTooltip metric={metric} />} />
            <Legend
              wrapperStyle={{
                paddingTop: "20px",
              }}
              iconType="line"
            />

            {showAverageLine && overallAverage > 0 && (
              <ReferenceLine
                y={overallAverage}
                stroke={COLORS.average}
                strokeDasharray="5 5"
                label={{
                  value: "Average",
                  position: "right",
                  fill: COLORS.average,
                  fontSize: 12,
                }}
              />
            )}

            {counties.map((county, index) => (
              <Line
                key={county.name}
                type="monotone"
                dataKey={county.name}
                stroke={county.stroke}
                strokeWidth={2}
                dot={{ r: 3, fill: county.stroke }}
                activeDot={{ r: 5 }}
                name={county.name}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>

        {/* Summary Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
          <div>
            <div className="text-xs text-slate-500">Counties</div>
            <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {formatNumber(totalCounties)}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Time Periods</div>
            <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {formatNumber(totalPeriods)}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Peak Season</div>
            <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {peakSeason.season.split(" ")[0]}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Overall Average</div>
            <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {formatMetricValue(overallAverage, metric)}
            </div>
          </div>
        </div>

        {/* County Legend */}
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <div className="text-xs text-slate-500 mb-2">Counties in Chart:</div>
          <div className="flex flex-wrap gap-2">
            {counties.map((county) => (
              <div
                key={county.name}
                className="flex items-center gap-2 px-3 py-1 bg-slate-50 dark:bg-slate-800 rounded-full"
              >
                <MapPin
                  className="h-3 w-3"
                  style={{ color: county.stroke }}
                />
                <span className="text-xs text-slate-700 dark:text-slate-300">
                  {county.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

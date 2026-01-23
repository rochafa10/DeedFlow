"use client";

/**
 * Auction History Chart Component
 *
 * Displays historical auction sale data as a time series chart showing
 * final sale prices, opening bids, and trends over time for a county.
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
import { TrendingUp, TrendingDown, Calendar, DollarSign, Info } from "lucide-react";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

// ============================================
// Type Definitions
// ============================================

interface AuctionHistoryRecord {
  /** Unique auction result ID */
  id: string;
  /** Property parcel ID */
  parcelId: string;
  /** Property address */
  address: string;
  /** Sale date (ISO string) */
  saleDate: string;
  /** Type of sale (e.g., 'online', 'in-person') */
  saleType: string;
  /** Opening bid amount */
  openingBid: number | null;
  /** Final sale price */
  finalSalePrice: number | null;
  /** Bid ratio (final price / opening bid) */
  bidRatio: number | null;
  /** Property type (e.g., 'residential', 'commercial') */
  propertyType: string | null;
  /** Number of bids received */
  numberOfBids: number | null;
}

interface AuctionHistoryChartProps {
  /** Array of historical auction records */
  history: AuctionHistoryRecord[];
  /** Optional county name for display */
  countyName?: string;
  /** Show opening bid line */
  showOpeningBid?: boolean;
  /** Show average price reference line */
  showAverageLine?: boolean;
  /** Optional additional class names */
  className?: string;
}

interface ChartDataPoint {
  date: string; // formatted date for display
  timestamp: number; // unix timestamp for sorting
  finalPrice: number | null;
  openingBid: number | null;
  address: string;
  numberOfBids: number | null;
  bidRatio: number | null;
  propertyType: string | null;
}

// ============================================
// Colors
// ============================================

const COLORS = {
  finalPrice: "#3B82F6", // blue
  openingBid: "#F59E0B", // amber
  average: "#10B981", // emerald
  grid: "#E5E7EB", // light gray
  gridDark: "#374151", // dark gray
};

// ============================================
// Custom Tooltip
// ============================================

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;

    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-4 max-w-xs">
        <div className="flex items-start gap-2 mb-2">
          <Calendar className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-medium text-slate-900 dark:text-slate-100">
              {data.date}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {data.address}
            </div>
          </div>
        </div>

        <div className="space-y-1 text-sm border-t border-slate-200 dark:border-slate-700 pt-2 mt-2">
          {data.finalPrice !== null && (
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Final Price:</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                {formatCurrency(data.finalPrice)}
              </span>
            </div>
          )}
          {data.openingBid !== null && (
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Opening Bid:</span>
              <span className="font-semibold text-amber-600 dark:text-amber-400">
                {formatCurrency(data.openingBid)}
              </span>
            </div>
          )}
          {data.bidRatio !== null && (
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Bid Ratio:</span>
              <Badge
                variant={
                  data.bidRatio >= 1.5
                    ? "success"
                    : data.bidRatio >= 1.0
                      ? "warning"
                      : "secondary"
                }
                className="text-xs"
              >
                {data.bidRatio.toFixed(2)}x
              </Badge>
            </div>
          )}
          {data.numberOfBids !== null && (
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Total Bids:</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {data.numberOfBids}
              </span>
            </div>
          )}
          {data.propertyType && (
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Type:</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100 capitalize">
                {data.propertyType}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

// ============================================
// Helper Functions
// ============================================

/**
 * Transform auction history records to chart data points
 */
function transformToChartData(
  history: AuctionHistoryRecord[]
): ChartDataPoint[] {
  return history
    .filter((record) => record.saleDate && record.finalSalePrice !== null)
    .map((record) => {
      const date = new Date(record.saleDate);
      return {
        date: formatDate(record.saleDate, "short"),
        timestamp: date.getTime(),
        finalPrice: record.finalSalePrice,
        openingBid: record.openingBid,
        address: record.address || "Unknown",
        numberOfBids: record.numberOfBids,
        bidRatio: record.bidRatio,
        propertyType: record.propertyType,
      };
    })
    .sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Calculate average sale price
 */
function calculateAveragePrice(data: ChartDataPoint[]): number {
  const prices = data
    .map((d) => d.finalPrice)
    .filter((p): p is number => p !== null);

  if (prices.length === 0) return 0;

  return prices.reduce((sum, price) => sum + price, 0) / prices.length;
}

/**
 * Calculate price trend (positive or negative)
 */
function calculateTrend(data: ChartDataPoint[]): {
  direction: "up" | "down" | "flat";
  percentage: number;
} {
  if (data.length < 2) {
    return { direction: "flat", percentage: 0 };
  }

  // Compare first half average to second half average
  const midpoint = Math.floor(data.length / 2);
  const firstHalf = data.slice(0, midpoint);
  const secondHalf = data.slice(midpoint);

  const avgFirst = calculateAveragePrice(firstHalf);
  const avgSecond = calculateAveragePrice(secondHalf);

  if (avgFirst === 0) {
    return { direction: "flat", percentage: 0 };
  }

  const percentChange = ((avgSecond - avgFirst) / avgFirst) * 100;

  if (Math.abs(percentChange) < 5) {
    return { direction: "flat", percentage: percentChange };
  }

  return {
    direction: percentChange > 0 ? "up" : "down",
    percentage: percentChange,
  };
}

// ============================================
// Main Component
// ============================================

export function AuctionHistoryChart({
  history,
  countyName,
  showOpeningBid = true,
  showAverageLine = true,
  className,
}: AuctionHistoryChartProps) {
  // Transform data
  const chartData = transformToChartData(history);

  // Calculate metrics
  const averagePrice = calculateAveragePrice(chartData);
  const trend = calculateTrend(chartData);
  const totalAuctions = chartData.length;

  // Calculate min/max for Y-axis domain
  const allPrices = chartData.flatMap((d) =>
    [d.finalPrice, showOpeningBid ? d.openingBid : null].filter(
      (p): p is number => p !== null
    )
  );
  const minPrice = allPrices.length > 0 ? Math.min(...allPrices) : 0;
  const maxPrice = allPrices.length > 0 ? Math.max(...allPrices) : 100000;

  // Add some padding to Y-axis
  const yAxisMin = Math.floor(minPrice * 0.9);
  const yAxisMax = Math.ceil(maxPrice * 1.1);

  // Empty state
  if (chartData.length === 0) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-slate-400" />
            Auction History
            {countyName && (
              <span className="text-sm font-normal text-slate-500">
                - {countyName}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Info className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
            <p className="text-slate-500 dark:text-slate-400">
              No auction history data available
            </p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
              Historical sale data will appear here once available
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
              <DollarSign className="h-5 w-5" />
              Auction History
              {countyName && (
                <span className="text-sm font-normal text-slate-500">
                  - {countyName}
                </span>
              )}
            </CardTitle>
            <p className="text-sm text-slate-500 mt-1">
              Historical sale prices over time ({totalAuctions} auction
              {totalAuctions !== 1 ? "s" : ""})
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              {trend.direction === "up" && (
                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
              )}
              {trend.direction === "down" && (
                <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
              )}
              <Badge
                variant={
                  trend.direction === "up"
                    ? "success"
                    : trend.direction === "down"
                      ? "destructive"
                      : "secondary"
                }
              >
                {trend.direction === "up" ? "+" : ""}
                {trend.percentage.toFixed(1)}%
              </Badge>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500">Avg Sale Price</div>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {formatCurrency(averagePrice)}
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
              dataKey="date"
              stroke="#6B7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#6B7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => formatCurrency(value)}
              domain={[yAxisMin, yAxisMax]}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{
                paddingTop: "20px",
              }}
              iconType="line"
            />

            {showAverageLine && (
              <ReferenceLine
                y={averagePrice}
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

            <Line
              type="monotone"
              dataKey="finalPrice"
              stroke={COLORS.finalPrice}
              strokeWidth={2}
              dot={{ r: 4, fill: COLORS.finalPrice }}
              activeDot={{ r: 6 }}
              name="Final Sale Price"
              connectNulls
            />

            {showOpeningBid && (
              <Line
                type="monotone"
                dataKey="openingBid"
                stroke={COLORS.openingBid}
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 3, fill: COLORS.openingBid }}
                activeDot={{ r: 5 }}
                name="Opening Bid"
                connectNulls
              />
            )}
          </LineChart>
        </ResponsiveContainer>

        {/* Summary Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
          <div>
            <div className="text-xs text-slate-500">Total Auctions</div>
            <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {formatNumber(totalAuctions)}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Average Price</div>
            <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {formatCurrency(averagePrice)}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Price Range</div>
            <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {formatCurrency(minPrice)} - {formatCurrency(maxPrice)}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Trend</div>
            <div className="flex items-center gap-1">
              {trend.direction === "up" && (
                <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
              )}
              {trend.direction === "down" && (
                <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
              )}
              <span
                className={cn(
                  "text-lg font-semibold",
                  trend.direction === "up" && "text-green-600 dark:text-green-400",
                  trend.direction === "down" && "text-red-600 dark:text-red-400",
                  trend.direction === "flat" && "text-slate-600 dark:text-slate-400"
                )}
              >
                {trend.direction === "up" ? "+" : ""}
                {trend.percentage.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

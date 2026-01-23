"use client";

/**
 * Bid Ratio Chart Component
 *
 * Displays the relationship between opening bid and final sale price,
 * showing how much properties typically sell above or below opening bid.
 * Helps investors understand realistic price expectations.
 *
 * @component
 * @author Claude Code Agent
 * @date 2026-01-22
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Info,
  Percent,
  AlertCircle,
} from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/utils/format";
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

interface BidRatioChartProps {
  /** Array of historical auction records */
  history: AuctionHistoryRecord[];
  /** Optional county name for display */
  countyName?: string;
  /** Show reference line at 1.0x (opening bid = final price) */
  showParityLine?: boolean;
  /** Optional additional class names */
  className?: string;
}

interface ChartDataPoint {
  x: number; // opening bid
  y: number; // final sale price
  z: number; // bubble size (based on bid ratio or number of bids)
  ratio: number; // bid ratio
  address: string;
  propertyType: string | null;
  numberOfBids: number | null;
  saleDate: string;
}

// ============================================
// Colors
// ============================================

const COLORS = {
  below: "#EF4444", // red (sold below opening bid)
  atParity: "#F59E0B", // amber (sold at opening bid)
  above: "#22C55E", // green (sold above opening bid)
  parityLine: "#6B7280", // gray
  grid: "#E5E7EB",
};

// ============================================
// Helper Functions
// ============================================

/**
 * Get color based on bid ratio
 */
function getRatioColor(ratio: number): string {
  if (ratio < 0.95) return COLORS.below;
  if (ratio <= 1.05) return COLORS.atParity;
  return COLORS.above;
}

/**
 * Get ratio category
 */
function getRatioCategory(ratio: number): string {
  if (ratio < 0.95) return "Below Opening";
  if (ratio <= 1.05) return "At Opening";
  return "Above Opening";
}

/**
 * Transform auction history to chart data
 */
function transformToChartData(
  history: AuctionHistoryRecord[]
): ChartDataPoint[] {
  return history
    .filter(
      (record) =>
        record.openingBid !== null &&
        record.finalSalePrice !== null &&
        record.openingBid > 0 &&
        record.finalSalePrice > 0
    )
    .map((record) => ({
      x: record.openingBid!,
      y: record.finalSalePrice!,
      z: record.numberOfBids || 5, // bubble size
      ratio: record.bidRatio || record.finalSalePrice! / record.openingBid!,
      address: record.address || "Unknown",
      propertyType: record.propertyType,
      numberOfBids: record.numberOfBids,
      saleDate: record.saleDate
        ? new Date(record.saleDate).toLocaleDateString()
        : "N/A",
    }));
}

/**
 * Calculate statistics
 */
function calculateStats(data: ChartDataPoint[]) {
  if (data.length === 0) {
    return {
      avgRatio: 0,
      medianRatio: 0,
      aboveCount: 0,
      belowCount: 0,
      atParityCount: 0,
      minRatio: 0,
      maxRatio: 0,
    };
  }

  const ratios = data.map((d) => d.ratio).sort((a, b) => a - b);
  const avgRatio = ratios.reduce((sum, r) => sum + r, 0) / ratios.length;
  const medianRatio = ratios[Math.floor(ratios.length / 2)];

  const aboveCount = data.filter((d) => d.ratio > 1.05).length;
  const belowCount = data.filter((d) => d.ratio < 0.95).length;
  const atParityCount = data.length - aboveCount - belowCount;

  return {
    avgRatio,
    medianRatio,
    aboveCount,
    belowCount,
    atParityCount,
    minRatio: Math.min(...ratios),
    maxRatio: Math.max(...ratios),
  };
}

// ============================================
// Custom Tooltip
// ============================================

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;

    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-4 max-w-xs">
        <div className="flex items-start gap-2 mb-2">
          <DollarSign className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-medium text-slate-900 dark:text-slate-100">
              {data.address}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">{data.saleDate}</div>
          </div>
        </div>

        <div className="space-y-1 text-sm border-t border-slate-200 dark:border-slate-700 pt-2 mt-2">
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Opening Bid:</span>
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {formatCurrency(data.x)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Final Price:</span>
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {formatCurrency(data.y)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Bid Ratio:</span>
            <Badge
              variant={
                data.ratio > 1.05
                  ? "success"
                  : data.ratio < 0.95
                    ? "destructive"
                    : "warning"
              }
              className="text-xs"
            >
              {data.ratio.toFixed(2)}x
            </Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Premium:</span>
            <span
              className={cn(
                "font-semibold",
                data.ratio > 1.0
                  ? "text-green-600 dark:text-green-400"
                  : data.ratio < 1.0
                    ? "text-red-600 dark:text-red-400"
                    : "text-amber-600 dark:text-amber-400"
              )}
            >
              {data.ratio > 1.0 ? "+" : ""}
              {((data.ratio - 1) * 100).toFixed(1)}%
            </span>
          </div>
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
// Main Component
// ============================================

export function BidRatioChart({
  history,
  countyName,
  showParityLine = true,
  className,
}: BidRatioChartProps) {
  // Transform data
  const chartData = transformToChartData(history);

  // Calculate statistics
  const stats = calculateStats(chartData);

  // Calculate axis domains
  const allBids = chartData.map((d) => d.x);
  const allPrices = chartData.map((d) => d.y);

  const minValue = Math.min(...allBids, ...allPrices);
  const maxValue = Math.max(...allBids, ...allPrices);

  // Add padding to domain
  const domainMin = Math.floor(minValue * 0.9);
  const domainMax = Math.ceil(maxValue * 1.1);

  // Empty state
  if (chartData.length === 0) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5 text-slate-400" />
            Bid Ratio Analysis
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
              No bid ratio data available
            </p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
              Data will appear once auctions with opening bids and final prices
              are recorded
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
              <Percent className="h-5 w-5" />
              Bid Ratio Analysis
              {countyName && (
                <span className="text-sm font-normal text-slate-500">
                  - {countyName}
                </span>
              )}
            </CardTitle>
            <p className="text-sm text-slate-500 mt-1">
              Opening bid vs final sale price ({chartData.length} auction
              {chartData.length !== 1 ? "s" : ""})
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge
              variant={
                stats.avgRatio > 1.05
                  ? "success"
                  : stats.avgRatio < 0.95
                    ? "destructive"
                    : "warning"
              }
            >
              Avg {stats.avgRatio.toFixed(2)}x
            </Badge>
            <div className="text-right">
              <div className="text-xs text-slate-500">Median Ratio</div>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {stats.medianRatio.toFixed(2)}x
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Info banner */}
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900 dark:text-blue-100">
            <span className="font-semibold">Reading the chart:</span> Each dot
            represents an auction. The diagonal line shows parity (opening bid =
            final price). Dots above the line sold for more than opening bid,
            dots below sold for less.
          </div>
        </div>

        <ResponsiveContainer width="100%" height={400}>
          <ScatterChart
            margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={COLORS.grid}
              className="dark:stroke-slate-700"
            />
            <XAxis
              type="number"
              dataKey="x"
              name="Opening Bid"
              stroke="#6B7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => formatCurrency(value)}
              domain={[domainMin, domainMax]}
              label={{
                value: "Opening Bid",
                position: "insideBottom",
                offset: -5,
                style: { fontSize: 12, fill: "#6B7280" },
              }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="Final Price"
              stroke="#6B7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => formatCurrency(value)}
              domain={[domainMin, domainMax]}
              label={{
                value: "Final Sale Price",
                angle: -90,
                position: "insideLeft",
                style: { fontSize: 12, fill: "#6B7280" },
              }}
            />
            <ZAxis type="number" dataKey="z" range={[50, 400]} />
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: "3 3" }} />
            <Legend
              wrapperStyle={{ paddingTop: "20px" }}
              iconType="circle"
              payload={[
                {
                  value: "Below Opening",
                  type: "circle",
                  color: COLORS.below,
                },
                {
                  value: "At Opening",
                  type: "circle",
                  color: COLORS.atParity,
                },
                {
                  value: "Above Opening",
                  type: "circle",
                  color: COLORS.above,
                },
              ]}
            />

            {/* Parity line (y = x) */}
            {showParityLine && (
              <ReferenceLine
                segment={[
                  { x: domainMin, y: domainMin },
                  { x: domainMax, y: domainMax },
                ]}
                stroke={COLORS.parityLine}
                strokeDasharray="5 5"
                strokeWidth={2}
                label={{
                  value: "Parity (1.0x)",
                  position: "top",
                  fill: COLORS.parityLine,
                  fontSize: 11,
                }}
              />
            )}

            {/* Scatter plot with colored dots */}
            <Scatter
              name="Auctions"
              data={chartData}
              fill="#3B82F6"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getRatioColor(entry.ratio)} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>

        {/* Summary Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
          <div>
            <div className="text-xs text-slate-500 flex items-center gap-1">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: COLORS.above }}
              />
              Above Opening
            </div>
            <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {stats.aboveCount}
              <span className="text-sm font-normal text-slate-500 ml-1">
                ({((stats.aboveCount / chartData.length) * 100).toFixed(0)}%)
              </span>
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 flex items-center gap-1">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: COLORS.atParity }}
              />
              At Opening
            </div>
            <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {stats.atParityCount}
              <span className="text-sm font-normal text-slate-500 ml-1">
                ({((stats.atParityCount / chartData.length) * 100).toFixed(0)}
                %)
              </span>
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 flex items-center gap-1">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: COLORS.below }}
              />
              Below Opening
            </div>
            <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {stats.belowCount}
              <span className="text-sm font-normal text-slate-500 ml-1">
                ({((stats.belowCount / chartData.length) * 100).toFixed(0)}%)
              </span>
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Ratio Range</div>
            <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {stats.minRatio.toFixed(2)}x - {stats.maxRatio.toFixed(2)}x
            </div>
          </div>
        </div>

        {/* Insight card */}
        {stats.avgRatio !== 0 && (
          <div
            className={cn(
              "mt-4 p-3 rounded-lg border flex items-start gap-2",
              stats.avgRatio > 1.1
                ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
                : stats.avgRatio < 0.9
                  ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
                  : "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"
            )}
          >
            {stats.avgRatio > 1.1 ? (
              <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            ) : stats.avgRatio < 0.9 ? (
              <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            ) : (
              <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            )}
            <div className="text-sm">
              <span className="font-semibold">
                {stats.avgRatio > 1.1
                  ? "Competitive Market:"
                  : stats.avgRatio < 0.9
                    ? "Buyer's Market:"
                    : "Balanced Market:"}
              </span>{" "}
              <span
                className={cn(
                  stats.avgRatio > 1.1
                    ? "text-green-900 dark:text-green-100"
                    : stats.avgRatio < 0.9
                      ? "text-red-900 dark:text-red-100"
                      : "text-amber-900 dark:text-amber-100"
                )}
              >
                Properties sell for {stats.avgRatio.toFixed(2)}x opening bid on
                average.
                {stats.avgRatio > 1.1 &&
                  " Expect bidding wars and prices above minimum."}
                {stats.avgRatio < 0.9 &&
                  " Properties often sell below opening bid."}
                {stats.avgRatio >= 0.9 &&
                  stats.avgRatio <= 1.1 &&
                  " Properties typically sell close to opening bid."}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

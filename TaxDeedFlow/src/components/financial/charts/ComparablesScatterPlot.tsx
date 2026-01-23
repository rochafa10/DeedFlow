"use client";

/**
 * Comparables Scatter Plot Component
 *
 * Displays comparable sales data as a scatter plot with price per sqft
 * vs total price, highlighting the subject property position.
 *
 * @component
 * @author Claude Code Agent
 * @date 2026-01-16
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
} from "recharts";
import { Home, MapPin, Calendar, Info } from "lucide-react";
import type { ComparableSale } from "@/lib/analysis/financial/types";
import type { TooltipProps } from "@/types/charts";
import { formatCurrency, formatNumber } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

// ============================================
// Type Definitions
// ============================================

interface ComparablesScatterPlotProps {
  /** List of comparable sales */
  comparables: ComparableSale[];
  /** Subject property square footage */
  subjectSqft?: number;
  /** Subject property price */
  subjectPrice?: number;
  /** Optional additional class names */
  className?: string;
}

interface ChartDataPoint {
  x: number; // sqft
  y: number; // price
  z: number; // bubble size (based on recency or similarity)
  address: string;
  saleDate: string;
  pricePerSqft: number;
  distance?: number;
  similarity?: number;
  isSubject?: boolean;
}

// ============================================
// Colors
// ============================================

const COLORS = {
  comparables: "#3B82F6",
  subject: "#F97316",
  excellent: "#22C55E",
  good: "#3B82F6",
  fair: "#F59E0B",
  poor: "#EF4444",
};

// ============================================
// Custom Tooltip
// ============================================

const CustomTooltip = ({ active, payload }: TooltipProps<ChartDataPoint>) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;

    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-4 max-w-xs">
        <div className="flex items-start gap-2 mb-2">
          <Home className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-medium text-slate-900 dark:text-slate-100">
              {data.isSubject ? "Subject Property" : data.address}
            </div>
            {!data.isSubject && data.distance && (
              <div className="text-xs text-slate-500 flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {data.distance.toFixed(1)} miles away
              </div>
            )}
          </div>
        </div>

        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Sale Price:</span>
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {formatCurrency(data.y)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Size:</span>
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {formatNumber(data.x)} sqft
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">$/sqft:</span>
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {formatCurrency(data.pricePerSqft)}
            </span>
          </div>
          {!data.isSubject && data.saleDate && (
            <div className="flex justify-between">
              <span className="text-slate-500">Sold:</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {data.saleDate}
              </span>
            </div>
          )}
          {!data.isSubject && data.similarity !== undefined && (
            <div className="flex justify-between">
              <span className="text-slate-500">Similarity:</span>
              <Badge
                variant={
                  data.similarity >= 80
                    ? "success"
                    : data.similarity >= 60
                      ? "warning"
                      : "secondary"
                }
                className="text-xs"
              >
                {data.similarity}%
              </Badge>
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

export function ComparablesScatterPlot({
  comparables,
  subjectSqft,
  subjectPrice,
  className,
}: ComparablesScatterPlotProps) {
  // Transform comparables to chart data
  const chartData: ChartDataPoint[] = comparables
    .filter((comp) => comp.sqft && comp.salePrice)
    .map((comp) => ({
      x: comp.sqft || 0,
      y: comp.salePrice || 0,
      z: comp.similarityScore || 50,
      address: comp.address || "Unknown",
      saleDate: comp.saleDate
        ? new Date(comp.saleDate).toLocaleDateString()
        : "N/A",
      pricePerSqft: comp.pricePerSqft || 0,
      distance: comp.distanceMiles,
      similarity: comp.similarityScore,
      isSubject: false,
    }));

  // Add subject property if provided
  if (subjectSqft && subjectPrice) {
    chartData.push({
      x: subjectSqft,
      y: subjectPrice,
      z: 100, // Make it stand out
      address: "Subject Property",
      saleDate: "N/A",
      pricePerSqft: subjectPrice / subjectSqft,
      isSubject: true,
    });
  }

  // Calculate statistics
  const prices = chartData.filter((d) => !d.isSubject).map((d) => d.y);
  const avgPrice = prices.length
    ? prices.reduce((a, b) => a + b, 0) / prices.length
    : 0;
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;

  const pricePsf = chartData.filter((d) => !d.isSubject).map((d) => d.pricePerSqft);
  const avgPsf = pricePsf.length
    ? pricePsf.reduce((a, b) => a + b, 0) / pricePsf.length
    : 0;

  // If no comparables, show placeholder
  if (chartData.filter((d) => !d.isSubject).length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Comparable Sales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <Home className="h-12 w-12 mb-4 opacity-50" />
            <p>No comparable sales data available</p>
            <p className="text-sm mt-1">
              Comparables help estimate After Repair Value
            </p>
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
            <Home className="h-5 w-5" />
            Comparable Sales Analysis
          </div>
          <Badge variant="secondary">{comparables.length} comps</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Scatter Chart */}
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart
              margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
            >
              <XAxis
                type="number"
                dataKey="x"
                name="sqft"
                unit=" sqft"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => formatNumber(value)}
                label={{
                  value: "Square Footage",
                  position: "bottom",
                  offset: 0,
                  style: { fontSize: 12, fill: "#94a3b8" },
                }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="price"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) =>
                  value >= 1000000
                    ? `$${(value / 1000000).toFixed(1)}M`
                    : `$${(value / 1000).toFixed(0)}K`
                }
                label={{
                  value: "Sale Price",
                  angle: -90,
                  position: "insideLeft",
                  style: { fontSize: 12, fill: "#94a3b8" },
                }}
              />
              <ZAxis
                type="number"
                dataKey="z"
                range={[50, 400]}
                name="similarity"
              />
              <Tooltip content={<CustomTooltip />} />

              {/* Reference lines for averages */}
              <ReferenceLine
                y={avgPrice}
                stroke="#94a3b8"
                strokeDasharray="3 3"
                label={{
                  value: `Avg: ${formatCurrency(avgPrice)}`,
                  position: "right",
                  fill: "#94a3b8",
                  fontSize: 10,
                }}
              />

              {/* Comparables */}
              <Scatter name="Comparables" data={chartData} fill={COLORS.comparables}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.isSubject ? COLORS.subject : COLORS.comparables}
                    stroke={entry.isSubject ? COLORS.subject : "transparent"}
                    strokeWidth={entry.isSubject ? 3 : 0}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: COLORS.comparables }}
            />
            <span className="text-slate-600 dark:text-slate-400">
              Comparable Sales
            </span>
          </div>
          {subjectPrice && (
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full border-2"
                style={{
                  backgroundColor: COLORS.subject,
                  borderColor: COLORS.subject,
                }}
              />
              <span className="text-slate-600 dark:text-slate-400">
                Subject Property
              </span>
            </div>
          )}
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Avg. Price
            </div>
            <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {formatCurrency(avgPrice)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Price Range
            </div>
            <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {formatCurrency(minPrice)} - {formatCurrency(maxPrice)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Avg. $/sqft
            </div>
            <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {formatCurrency(avgPsf)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Comps Used
            </div>
            <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {comparables.length}
            </div>
          </div>
        </div>

        {/* Comparable List */}
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
            <Info className="h-4 w-4" />
            Top Comparables
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {comparables
              .sort((a, b) => (b.similarityScore || 0) - (a.similarityScore || 0))
              .slice(0, 5)
              .map((comp, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900 dark:text-slate-100 truncate">
                      {comp.address || "Unknown Address"}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                      {comp.sqft && (
                        <span>{formatNumber(comp.sqft)} sqft</span>
                      )}
                      {comp.distanceMiles && (
                        <>
                          <span>-</span>
                          <span>{comp.distanceMiles.toFixed(1)} mi</span>
                        </>
                      )}
                      {comp.saleDate && (
                        <>
                          <span>-</span>
                          <span>
                            {new Date(comp.saleDate).toLocaleDateString()}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      {formatCurrency(comp.salePrice || 0)}
                    </div>
                    {comp.similarityScore && (
                      <Badge
                        variant={
                          comp.similarityScore >= 80
                            ? "success"
                            : comp.similarityScore >= 60
                              ? "warning"
                              : "secondary"
                        }
                        className="text-xs"
                      >
                        {comp.similarityScore}% match
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default ComparablesScatterPlot;

"use client"

/**
 * Lazy-loaded Chart Components
 *
 * This file provides dynamically imported versions of financial chart components
 * to reduce initial bundle size. Charts are loaded on-demand when needed.
 *
 * @component
 * @author Claude Code Agent
 * @date 2026-01-22
 */

import dynamic from "next/dynamic"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// ============================================
// Loading States
// ============================================

const ChartLoadingState = ({ title }: { title: string }) => (
  <Card>
    <CardHeader>
      <CardTitle>{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="h-72 bg-slate-50 dark:bg-slate-900 rounded-lg flex items-center justify-center">
        <div className="text-slate-500 dark:text-slate-400 text-sm animate-pulse">
          Loading chart...
        </div>
      </div>
    </CardContent>
  </Card>
)

// ============================================
// Lazy-loaded Chart Components
// ============================================

/**
 * Lazy-loaded Profit Waterfall Chart
 * Shows ARV to net profit flow with cost breakdown
 */
export const LazyProfitWaterfallChart = dynamic(
  () => import("./ProfitWaterfallChart").then((mod) => mod.ProfitWaterfallChart),
  {
    ssr: false,
    loading: () => <ChartLoadingState title="Profit Waterfall" />,
  }
)

/**
 * Lazy-loaded Cost Pie Chart
 * Displays cost breakdown by category
 */
export const LazyCostPieChart = dynamic(
  () => import("./CostPieChart").then((mod) => mod.CostPieChart),
  {
    ssr: false,
    loading: () => <ChartLoadingState title="Cost Breakdown" />,
  }
)

/**
 * Lazy-loaded ROI Comparison Chart
 * Compares different ROI metrics visually
 */
export const LazyROIComparisonChart = dynamic(
  () => import("./ROIComparisonChart").then((mod) => mod.ROIComparisonChart),
  {
    ssr: false,
    loading: () => <ChartLoadingState title="ROI Comparison" />,
  }
)

/**
 * Lazy-loaded Comparables Scatter Plot
 * Shows property comparables on a scatter plot
 */
export const LazyComparablesScatterPlot = dynamic(
  () => import("./ComparablesScatterPlot").then((mod) => mod.ComparablesScatterPlot),
  {
    ssr: false,
    loading: () => <ChartLoadingState title="Comparables Analysis" />,
  }
)

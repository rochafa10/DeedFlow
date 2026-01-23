"use client"

/**
 * Lazy-loaded Chart Components
 *
 * This file provides dynamically imported versions of report chart components
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
 * Lazy-loaded Cost Breakdown Pie Chart
 * Displays cost distribution as a pie or donut chart
 */
export const LazyCostBreakdownPie = dynamic(
  () => import("./CostBreakdownPie").then((mod) => mod.CostBreakdownPie),
  {
    ssr: false,
    loading: () => <ChartLoadingState title="Cost Breakdown" />,
  }
)

/**
 * Lazy-loaded Cost Breakdown List
 * Alternative list view for cost distribution
 */
export const LazyCostBreakdownList = dynamic(
  () => import("./CostBreakdownPie").then((mod) => mod.CostBreakdownList),
  {
    ssr: false,
    loading: () => <div className="animate-pulse">Loading...</div>,
  }
)

/**
 * Lazy-loaded Cost Stacked Bar
 * Compact stacked bar visualization for costs
 */
export const LazyCostStackedBar = dynamic(
  () => import("./CostBreakdownPie").then((mod) => mod.CostStackedBar),
  {
    ssr: false,
    loading: () => <div className="animate-pulse">Loading...</div>,
  }
)

/**
 * Lazy-loaded Score Breakdown Radar Chart
 * Shows investment scores across 5 categories
 */
export const LazyScoreBreakdownRadar = dynamic(
  () => import("./ScoreBreakdownRadar").then((mod) => mod.ScoreBreakdownRadar),
  {
    ssr: false,
    loading: () => <ChartLoadingState title="Score Breakdown" />,
  }
)

/**
 * Lazy-loaded Compact Radar
 * Smaller version of radar chart for compact displays
 */
export const LazyCompactRadar = dynamic(
  () => import("./ScoreBreakdownRadar").then((mod) => mod.CompactRadar),
  {
    ssr: false,
    loading: () => <div className="animate-pulse">Loading...</div>,
  }
)

/**
 * Lazy-loaded Category Comparison
 * Horizontal bar comparison of category scores
 */
export const LazyCategoryComparison = dynamic(
  () => import("./ScoreBreakdownRadar").then((mod) => mod.CategoryComparison),
  {
    ssr: false,
    loading: () => <div className="animate-pulse">Loading...</div>,
  }
)

/**
 * Lazy-loaded Score Gauge
 * Circular gauge displaying overall investment score
 */
export const LazyScoreGauge = dynamic(
  () => import("./ScoreGauge").then((mod) => mod.ScoreGauge),
  {
    ssr: false,
    loading: () => <ChartLoadingState title="Investment Score" />,
  }
)

/**
 * Lazy-loaded Mini Gauge
 * Compact circular gauge for small displays
 */
export const LazyMiniGauge = dynamic(
  () => import("./ScoreGauge").then((mod) => mod.MiniGauge),
  {
    ssr: false,
    loading: () => <div className="animate-pulse">Loading...</div>,
  }
)

/**
 * Lazy-loaded Score Bar
 * Linear progress bar alternative to circular gauge
 */
export const LazyScoreBar = dynamic(
  () => import("./ScoreGauge").then((mod) => mod.ScoreBar),
  {
    ssr: false,
    loading: () => <div className="animate-pulse">Loading...</div>,
  }
)

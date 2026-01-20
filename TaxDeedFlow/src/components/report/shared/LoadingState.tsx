"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { LiveRegion } from "./AccessibilityHelpers";

/**
 * Props for the LoadingState component
 */
export interface LoadingStateProps {
  /** Loading message to display */
  message?: string;
  /** Whether to show the spinner */
  showSpinner?: boolean;
  /** Size of the loading indicator */
  size?: "sm" | "md" | "lg";
  /** Additional CSS classes */
  className?: string;
}

/**
 * Size configurations
 */
const sizeConfig = {
  sm: {
    spinner: "h-4 w-4",
    text: "text-sm",
    container: "py-4",
  },
  md: {
    spinner: "h-6 w-6",
    text: "text-base",
    container: "py-8",
  },
  lg: {
    spinner: "h-8 w-8",
    text: "text-lg",
    container: "py-12",
  },
};

/**
 * LoadingState - Generic loading indicator component
 *
 * Features:
 * - Accessible loading announcement
 * - Multiple size variants
 * - Optional spinner and message
 * - Dark mode support
 */
export function LoadingState({
  message = "Loading...",
  showSpinner = true,
  size = "md",
  className,
}: LoadingStateProps) {
  const config = sizeConfig[size];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center",
        config.container,
        className
      )}
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      {showSpinner && (
        <Loader2
          className={cn(
            config.spinner,
            "animate-spin text-primary mb-2"
          )}
          aria-hidden="true"
        />
      )}
      <p
        className={cn(
          config.text,
          "text-slate-600 dark:text-slate-400"
        )}
      >
        {message}
      </p>
      <LiveRegion politeness="polite">{message}</LiveRegion>
    </div>
  );
}

/**
 * Report section loading skeleton
 */
export interface ReportSectionSkeletonProps {
  /** Whether to show header */
  showHeader?: boolean;
  /** Number of content rows */
  rows?: number;
  /** Additional CSS classes */
  className?: string;
}

export function ReportSectionSkeleton({
  showHeader = true,
  rows = 3,
  className,
}: ReportSectionSkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800",
        className
      )}
      role="status"
      aria-busy="true"
      aria-label="Loading section"
    >
      {showHeader && (
        <div className="px-4 py-3 sm:px-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-6 w-48" />
          </div>
        </div>
      )}
      <div className="p-4 sm:p-6 space-y-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Grade display loading skeleton
 */
export function GradeSkeleton({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "h-10 w-10",
    md: "h-14 w-14",
    lg: "h-20 w-20",
  };

  return (
    <div className="flex flex-col items-center" role="status" aria-busy="true">
      <Skeleton className={cn("rounded-full", sizeClasses[size])} />
      <Skeleton className="h-4 w-16 mt-2" />
    </div>
  );
}

/**
 * Metric grid loading skeleton
 */
export function MetricGridSkeleton({
  columns = 3,
  rows = 1,
}: {
  columns?: number;
  rows?: number;
}) {
  const gridClasses: Record<number, string> = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <div
      className={cn("grid gap-4", gridClasses[columns] || gridClasses[3])}
      role="status"
      aria-busy="true"
      aria-label="Loading metrics"
    >
      {Array.from({ length: columns * rows }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3"
        >
          <Skeleton className="h-3 w-20 mb-2" />
          <Skeleton className="h-8 w-28" />
        </div>
      ))}
    </div>
  );
}

/**
 * Chart loading skeleton
 */
export function ChartSkeleton({
  type = "bar",
  className,
}: {
  type?: "bar" | "pie" | "radar" | "gauge";
  className?: string;
}) {
  if (type === "pie" || type === "gauge") {
    return (
      <div
        className={cn("flex items-center justify-center p-8", className)}
        role="status"
        aria-busy="true"
        aria-label="Loading chart"
      >
        <Skeleton className="h-48 w-48 rounded-full" />
      </div>
    );
  }

  if (type === "radar") {
    return (
      <div
        className={cn("flex items-center justify-center p-8", className)}
        role="status"
        aria-busy="true"
        aria-label="Loading chart"
      >
        <div className="relative h-48 w-48">
          <Skeleton className="absolute inset-0 rounded-full opacity-30" />
          <Skeleton className="absolute inset-4 rounded-full opacity-40" />
          <Skeleton className="absolute inset-8 rounded-full opacity-50" />
          <Skeleton className="absolute inset-12 rounded-full opacity-60" />
        </div>
      </div>
    );
  }

  // Bar chart skeleton
  return (
    <div
      className={cn("p-4", className)}
      role="status"
      aria-busy="true"
      aria-label="Loading chart"
    >
      <div className="flex items-end justify-around h-48 gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton
            key={i}
            className="w-12"
            style={{ height: `${Math.random() * 60 + 40}%` }}
          />
        ))}
      </div>
      <div className="flex justify-around mt-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-12" />
        ))}
      </div>
    </div>
  );
}

/**
 * Table loading skeleton
 */
export function TableSkeleton({
  columns = 5,
  rows = 5,
  className,
}: {
  columns?: number;
  rows?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden",
        className
      )}
      role="status"
      aria-busy="true"
      aria-label="Loading table"
    >
      {/* Header */}
      <div className="bg-slate-50 dark:bg-slate-800 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        <div className="flex gap-4">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-4"
              style={{ width: `${100 / columns}%` }}
            />
          ))}
        </div>
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0"
        >
          <div className="flex gap-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton
                key={colIndex}
                className="h-4"
                style={{ width: `${100 / columns}%` }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Full report loading skeleton
 */
export function ReportLoadingSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("space-y-6", className)}
      role="status"
      aria-busy="true"
      aria-label="Loading report"
    >
      {/* Announce loading state */}
      <LiveRegion politeness="polite">Loading property analysis report</LiveRegion>

      {/* Header skeleton */}
      <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <GradeSkeleton size="lg" />
        </div>
      </div>

      {/* Score section skeleton */}
      <ReportSectionSkeleton showHeader rows={2} />

      {/* Metrics skeleton */}
      <MetricGridSkeleton columns={4} />

      {/* Chart section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 p-4">
          <Skeleton className="h-6 w-32 mb-4" />
          <ChartSkeleton type="radar" />
        </div>
        <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 p-4">
          <Skeleton className="h-6 w-32 mb-4" />
          <ChartSkeleton type="pie" />
        </div>
      </div>

      {/* Additional sections */}
      <ReportSectionSkeleton rows={4} />
      <ReportSectionSkeleton rows={3} />
    </div>
  );
}

/**
 * Inline loading indicator
 */
export function InlineLoading({
  text = "Loading",
}: {
  text?: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      <span>{text}</span>
    </span>
  );
}

/**
 * Progress loading indicator with percentage
 */
export interface LoadingProgressProps {
  /** Current progress (0-100) */
  progress: number;
  /** Label for the progress */
  label?: string;
  /** Additional CSS classes */
  className?: string;
}

export function LoadingProgress({
  progress,
  label = "Loading",
  className,
}: LoadingProgressProps) {
  const clampedProgress = Math.max(0, Math.min(100, progress));

  return (
    <div
      className={cn("w-full", className)}
      role="progressbar"
      aria-valuenow={clampedProgress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${label}: ${clampedProgress}%`}
    >
      <div className="flex justify-between mb-1">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </span>
        <span className="text-sm text-slate-600 dark:text-slate-400">
          {clampedProgress}%
        </span>
      </div>
      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
        <div
          className="bg-primary h-full rounded-full transition-all duration-300 ease-out"
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
}

export default LoadingState;

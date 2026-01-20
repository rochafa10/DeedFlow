"use client";

import { CheckCircle, Info, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type DataSourceType = "live" | "sample" | "partial" | "error" | "calculated";

interface DataSourceBadgeProps {
  type: DataSourceType;
  label?: string;
  className?: string;
  showIcon?: boolean;
}

const defaultLabels: Record<DataSourceType, string> = {
  live: "Live Data",
  sample: "Sample Data",
  partial: "Partial Data",
  error: "Data Unavailable",
  calculated: "Calculated",
};

const badgeStyles: Record<DataSourceType, string> = {
  live: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300",
  sample: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
  partial: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
  error: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
  calculated: "bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300",
};

const BadgeIcon: Record<DataSourceType, typeof CheckCircle> = {
  live: CheckCircle,
  sample: Info,
  partial: AlertCircle,
  error: AlertCircle,
  calculated: CheckCircle,
};

/**
 * DataSourceBadge - Displays whether data is live from APIs or sample/mock data
 *
 * Usage:
 * <DataSourceBadge type="live" /> - Green badge for real API data
 * <DataSourceBadge type="sample" /> - Amber badge for mock/sample data
 * <DataSourceBadge type="partial" /> - Blue badge for mixed real/sample data
 * <DataSourceBadge type="error" /> - Red badge when data fetch failed
 * <DataSourceBadge type="calculated" /> - Cyan badge for data calculated from real inputs
 */
export function DataSourceBadge({
  type,
  label,
  className,
  showIcon = true
}: DataSourceBadgeProps) {
  const Icon = BadgeIcon[type];
  const displayLabel = label || defaultLabels[type];

  return (
    <span
      className={cn(
        "flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium",
        badgeStyles[type],
        className
      )}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      {displayLabel}
    </span>
  );
}

/**
 * Helper hook to determine data source type based on conditions
 */
export function getDataSourceType(options: {
  isLoading?: boolean;
  hasError?: boolean;
  hasRealData?: boolean;
  hasPartialData?: boolean;
}): DataSourceType {
  const { isLoading, hasError, hasRealData, hasPartialData } = options;

  if (hasError) return "error";
  if (isLoading) return "sample"; // Show sample during loading
  if (hasRealData) return "live";
  if (hasPartialData) return "partial";
  return "sample";
}

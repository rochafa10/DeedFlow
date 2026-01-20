"use client";

import * as React from "react";
import {
  ArrowUp,
  ArrowDown,
  Minus,
  HelpCircle,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  ComponentSize,
  ValueFormat,
  TrendDirection,
} from "@/types/report";
import { formatValue, getTrendIndicator } from "@/types/report";

/**
 * Props for the MetricDisplay component
 */
export interface MetricDisplayProps {
  /** Label describing the metric */
  label: string;
  /** Value to display */
  value: string | number | Date | null | undefined;
  /** Format type for the value */
  format?: ValueFormat;
  /** Secondary value to display below the main value */
  secondaryValue?: string;
  /** Trend direction indicator */
  trend?: TrendDirection;
  /** Help text explaining the metric (shown in tooltip) */
  helpText?: string;
  /** Size variant */
  size?: ComponentSize;
  /** Whether to highlight this metric (alias for highlighted) */
  highlight?: boolean;
  /** Whether to highlight this metric */
  highlighted?: boolean;
  /** Optional icon to display */
  icon?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Label for screen readers if different from visual label */
  ariaLabel?: string;
}

/**
 * Size configurations for the metric display
 */
const sizeConfig: Record<
  ComponentSize,
  {
    label: string;
    value: string;
    icon: string;
    trend: string;
    padding: string;
  }
> = {
  sm: {
    label: "text-xs",
    value: "text-lg font-semibold",
    icon: "h-3 w-3",
    trend: "text-xs",
    padding: "p-2",
  },
  md: {
    label: "text-sm",
    value: "text-2xl font-bold",
    icon: "h-4 w-4",
    trend: "text-sm",
    padding: "p-3",
  },
  lg: {
    label: "text-base",
    value: "text-3xl font-bold",
    icon: "h-5 w-5",
    trend: "text-base",
    padding: "p-4",
  },
};

/**
 * MetricDisplay - A component for displaying key metrics with labels
 *
 * Features:
 * - Automatic value formatting (currency, percentage, number, date)
 * - Optional trend indicator (up/down/neutral)
 * - Help text tooltip
 * - Multiple size variants
 * - Full accessibility support
 * - Dark mode support
 *
 * @example
 * ```tsx
 * <MetricDisplay
 *   label="Total Investment"
 *   value={150000}
 *   format="currency"
 *   trend="up"
 *   helpText="Total amount including all costs"
 *   size="lg"
 * />
 * ```
 */
export function MetricDisplay({
  label,
  value,
  format = "text",
  secondaryValue,
  trend,
  helpText,
  size = "md",
  highlight,
  highlighted = false,
  icon,
  className,
  ariaLabel,
}: MetricDisplayProps) {
  const config = sizeConfig[size];
  const formattedValue = formatValue(value, format);
  const trendInfo = trend ? getTrendIndicator(trend) : null;
  // Support both highlight and highlighted props
  const isHighlighted = highlight || highlighted;

  const TrendIcon =
    trendInfo?.icon === "arrow-up"
      ? ArrowUp
      : trendInfo?.icon === "arrow-down"
      ? ArrowDown
      : Minus;

  return (
    <div
      className={cn(
        "rounded-lg",
        config.padding,
        // Background
        isHighlighted
          ? "bg-primary/10 dark:bg-primary/20"
          : "bg-slate-50 dark:bg-slate-800/50",
        className
      )}
      role="group"
      aria-label={ariaLabel || `${label}: ${formattedValue}`}
    >
      {/* Label row with help icon */}
      <div className="flex items-center gap-1.5 mb-1">
        {icon && (
          <span className="text-slate-500 dark:text-slate-400" aria-hidden="true">
            {icon}
          </span>
        )}
        <span
          className={cn(
            config.label,
            "text-slate-600 dark:text-slate-400"
          )}
        >
          {label}
        </span>

        {helpText && (
          <button
            type="button"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded-full"
            title={helpText}
            aria-label={`Help: ${helpText}`}
          >
            <HelpCircle className={config.icon} />
          </button>
        )}
      </div>

      {/* Value row with trend */}
      <div className="flex items-baseline gap-2">
        <span
          className={cn(
            config.value,
            "text-slate-900 dark:text-slate-100"
          )}
        >
          {formattedValue}
        </span>

        {trendInfo && (
          <span
            className={cn(
              "flex items-center gap-0.5",
              config.trend,
              trendInfo.color
            )}
            aria-label={`Trend: ${trend}`}
          >
            <TrendIcon className={config.icon} aria-hidden="true" />
          </span>
        )}
      </div>

      {/* Secondary value */}
      {secondaryValue && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {secondaryValue}
        </p>
      )}
    </div>
  );
}

/**
 * Inline metric for use in tables or compact displays
 */
export interface InlineMetricProps {
  /** Label */
  label: string;
  /** Value */
  value: string | number | Date | null | undefined;
  /** Format */
  format?: ValueFormat;
  /** Additional classes */
  className?: string;
}

export function InlineMetric({
  label,
  value,
  format = "text",
  className,
}: InlineMetricProps) {
  const formattedValue = formatValue(value, format);

  return (
    <div className={cn("flex items-center justify-between", className)}>
      <span className="text-sm text-slate-600 dark:text-slate-400">
        {label}
      </span>
      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
        {formattedValue}
      </span>
    </div>
  );
}

/**
 * Metric grid for displaying multiple metrics in a responsive layout
 */
export interface MetricGridProps {
  /** Array of metrics to display */
  metrics?: Array<Omit<MetricDisplayProps, "size">>;
  /** Children (alternative to metrics array) */
  children?: React.ReactNode;
  /** Number of columns (responsive) */
  columns?: 2 | 3 | 4;
  /** Size for all metrics */
  size?: ComponentSize;
  /** Additional classes */
  className?: string;
}

export function MetricGrid({
  metrics,
  children,
  columns = 3,
  size = "md",
  className,
}: MetricGridProps) {
  const gridClasses: Record<2 | 3 | 4, string> = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <div
      className={cn(
        "grid gap-4",
        gridClasses[columns],
        className
      )}
      role="list"
      aria-label="Key metrics"
    >
      {/* Support either children or metrics array */}
      {children ? children : metrics?.map((metric, index) => (
        <MetricDisplay
          key={metric.label || index}
          {...metric}
          size={size}
        />
      ))}
    </div>
  );
}

/**
 * Comparison metric showing two values side by side
 */
export interface ComparisonMetricProps {
  /** Label */
  label: string;
  /** Current/actual value */
  currentValue: number;
  /** Comparison/expected value */
  comparisonValue: number;
  /** Format for values */
  format?: ValueFormat;
  /** Custom comparison label */
  comparisonLabel?: string;
  /** Additional classes */
  className?: string;
}

export function ComparisonMetric({
  label,
  currentValue,
  comparisonValue,
  format = "currency",
  comparisonLabel = "vs",
  className,
}: ComparisonMetricProps) {
  const difference = currentValue - comparisonValue;
  const percentDiff =
    comparisonValue !== 0 ? (difference / comparisonValue) * 100 : 0;

  const isPositive = difference > 0;
  const isNegative = difference < 0;

  return (
    <div
      className={cn(
        "rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3",
        className
      )}
      role="group"
      aria-label={`${label} comparison`}
    >
      <span className="block text-sm text-slate-600 dark:text-slate-400 mb-1">
        {label}
      </span>

      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
          {formatValue(currentValue, format)}
        </span>

        <span className="text-sm text-slate-500 dark:text-slate-400">
          {comparisonLabel}
        </span>

        <span className="text-sm text-slate-600 dark:text-slate-300">
          {formatValue(comparisonValue, format)}
        </span>

        {/* Difference indicator */}
        <span
          className={cn(
            "inline-flex items-center gap-0.5 text-sm font-medium",
            isPositive && "text-green-600 dark:text-green-400",
            isNegative && "text-red-600 dark:text-red-400",
            !isPositive && !isNegative && "text-slate-500"
          )}
        >
          {isPositive && <ArrowUp className="h-3 w-3" />}
          {isNegative && <ArrowDown className="h-3 w-3" />}
          {!isPositive && !isNegative && <Minus className="h-3 w-3" />}
          {Math.abs(percentDiff).toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

/**
 * Key-value pair list for displaying multiple data points
 */
export interface MetricListProps {
  /** List of key-value pairs */
  items: Array<{
    label: string;
    value: string | number | Date | null | undefined;
    format?: ValueFormat;
    highlight?: boolean;
  }>;
  /** Whether to show dividers between items */
  divided?: boolean;
  /** Additional classes */
  className?: string;
}

export function MetricList({
  items,
  divided = true,
  className,
}: MetricListProps) {
  return (
    <dl
      className={cn(
        "space-y-0",
        divided && "divide-y divide-slate-200 dark:divide-slate-700",
        className
      )}
    >
      {items.map((item, index) => (
        <div
          key={item.label || index}
          className={cn(
            "flex items-center justify-between py-2",
            item.highlight && "bg-primary/5 px-2 -mx-2 rounded"
          )}
        >
          <dt className="text-sm text-slate-600 dark:text-slate-400">
            {item.label}
          </dt>
          <dd
            className={cn(
              "text-sm font-medium text-slate-900 dark:text-slate-100",
              item.highlight && "text-primary"
            )}
          >
            {formatValue(item.value, item.format || "text")}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Highlighted stat with icon
 */
export interface StatWithIconProps {
  /** Icon component */
  icon: React.ReactNode;
  /** Label */
  label: string;
  /** Value */
  value: string | number | Date | null | undefined;
  /** Format */
  format?: ValueFormat;
  /** Icon background color */
  iconBgClass?: string;
  /** Additional classes */
  className?: string;
}

export function StatWithIcon({
  icon,
  label,
  value,
  format = "text",
  iconBgClass = "bg-primary/10 text-primary",
  className,
}: StatWithIconProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 p-4 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700",
        className
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center h-12 w-12 rounded-lg",
          iconBgClass
        )}
        aria-hidden="true"
      >
        {icon}
      </div>

      <div>
        <p className="text-sm text-slate-600 dark:text-slate-400">{label}</p>
        <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
          {formatValue(value, format)}
        </p>
      </div>
    </div>
  );
}

/**
 * Metric card with flexible content layout
 */
export interface MetricCardProps {
  /** Card title */
  title?: string;
  /** Children content */
  children: React.ReactNode;
  /** Optional icon */
  icon?: React.ReactNode;
  /** Whether to highlight the card */
  highlighted?: boolean;
  /** Additional classes */
  className?: string;
}

export function MetricCard({
  title,
  children,
  icon,
  highlighted = false,
  className,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg p-4",
        highlighted
          ? "bg-primary/10 dark:bg-primary/20 border border-primary/30"
          : "bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700",
        className
      )}
    >
      {(title || icon) && (
        <div className="flex items-center gap-2 mb-2">
          {icon && (
            <span className="text-slate-500 dark:text-slate-400" aria-hidden="true">
              {icon}
            </span>
          )}
          {title && (
            <h4 className="font-medium text-slate-900 dark:text-slate-100">
              {title}
            </h4>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

export default MetricDisplay;

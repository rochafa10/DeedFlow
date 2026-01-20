"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ScreenReaderOnly } from "../shared/AccessibilityHelpers";

/**
 * Data point for the accessible data table
 */
export interface ChartDataPoint {
  /** Label for this data point */
  label: string;
  /** Value (can be number or string) */
  value: string | number;
  /** Optional formatted value for display */
  formattedValue?: string;
  /** Optional additional info */
  additionalInfo?: string;
}

/**
 * Props for the AccessibleChartWrapper component
 */
export interface AccessibleChartWrapperProps {
  /** Unique identifier for the chart */
  id: string;
  /** Title of the chart */
  title: string;
  /** Description of what the chart shows */
  description: string;
  /** Chart data for screen reader table */
  data: ChartDataPoint[];
  /** The visual chart component */
  children: React.ReactNode;
  /** Optional summary text for screen readers */
  summary?: string;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show visual title (default true) */
  showVisualTitle?: boolean;
  /** Optional unit for values (e.g., "points", "%", "$") */
  valueUnit?: string;
}

/**
 * AccessibleChartWrapper - Makes charts accessible to screen readers
 *
 * This component wraps visual charts and provides:
 * - A screen-reader accessible data table as an alternative
 * - Proper ARIA labels and descriptions
 * - Figure/figcaption semantic structure
 *
 * Screen readers will announce the chart title and description,
 * then can navigate through the data table for exact values.
 *
 * @example
 * ```tsx
 * <AccessibleChartWrapper
 *   id="score-breakdown"
 *   title="Score Breakdown by Category"
 *   description="Radar chart showing investment scores across 5 categories"
 *   data={[
 *     { label: "Location", value: 22, formattedValue: "22/25" },
 *     { label: "Risk", value: 18, formattedValue: "18/25" },
 *     // ...
 *   ]}
 * >
 *   <ScoreBreakdownRadar data={...} />
 * </AccessibleChartWrapper>
 * ```
 */
export function AccessibleChartWrapper({
  id,
  title,
  description,
  data,
  children,
  summary,
  className,
  showVisualTitle = true,
  valueUnit,
}: AccessibleChartWrapperProps) {
  const titleId = `${id}-title`;
  const descId = `${id}-desc`;
  const tableId = `${id}-table`;

  // Generate summary if not provided
  const generatedSummary = summary || generateSummary(data, title, valueUnit);

  return (
    <figure
      role="figure"
      aria-labelledby={titleId}
      aria-describedby={descId}
      className={cn("relative", className)}
    >
      {/* Visual title (optional) */}
      {showVisualTitle && (
        <figcaption
          id={titleId}
          className="text-base font-medium text-slate-800 dark:text-slate-200 mb-3"
        >
          {title}
        </figcaption>
      )}

      {/* Screen reader only title (if visual title hidden) */}
      {!showVisualTitle && (
        <ScreenReaderOnly>
          <figcaption id={titleId}>{title}</figcaption>
        </ScreenReaderOnly>
      )}

      {/* Screen reader description and summary */}
      <ScreenReaderOnly>
        <p id={descId}>
          {description}
          {generatedSummary && ` ${generatedSummary}`}
        </p>
      </ScreenReaderOnly>

      {/* Visual chart */}
      <div aria-hidden="true" className="chart-visual">
        {children}
      </div>

      {/* Screen reader data table */}
      <ScreenReaderOnly>
        <table id={tableId} aria-label={`${title} data`}>
          <caption className="sr-only">{title} - Data Table</caption>
          <thead>
            <tr>
              <th scope="col">Category</th>
              <th scope="col">Value{valueUnit ? ` (${valueUnit})` : ""}</th>
              {data.some((d) => d.additionalInfo) && (
                <th scope="col">Additional Info</th>
              )}
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr key={`${item.label}-${index}`}>
                <th scope="row">{item.label}</th>
                <td>{item.formattedValue || item.value}</td>
                {data.some((d) => d.additionalInfo) && (
                  <td>{item.additionalInfo || "-"}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </ScreenReaderOnly>
    </figure>
  );
}

/**
 * Generate a summary of the chart data
 */
function generateSummary(
  data: ChartDataPoint[],
  title: string,
  unit?: string
): string {
  if (data.length === 0) return "No data available.";

  const values = data
    .map((d) => (typeof d.value === "number" ? d.value : parseFloat(String(d.value))))
    .filter((v) => !isNaN(v));

  if (values.length === 0) return `Chart contains ${data.length} data points.`;

  const max = Math.max(...values);
  const min = Math.min(...values);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;

  const maxItem = data.find(
    (d) => d.value === max || parseFloat(String(d.value)) === max
  );
  const minItem = data.find(
    (d) => d.value === min || parseFloat(String(d.value)) === min
  );

  const unitStr = unit ? ` ${unit}` : "";

  return `Highest: ${maxItem?.label} at ${max}${unitStr}. Lowest: ${minItem?.label} at ${min}${unitStr}. Average: ${avg.toFixed(1)}${unitStr}.`;
}

/**
 * Simplified wrapper for charts that just need basic accessibility
 */
export interface SimpleChartWrapperProps {
  /** Chart title for screen readers */
  label: string;
  /** The chart component */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

export function SimpleChartWrapper({
  label,
  children,
  className,
}: SimpleChartWrapperProps) {
  return (
    <div role="img" aria-label={label} className={className}>
      <div aria-hidden="true">{children}</div>
    </div>
  );
}

/**
 * Chart legend component with accessibility support
 */
export interface ChartLegendProps {
  /** Legend items */
  items: Array<{
    label: string;
    color: string;
    value?: string | number;
  }>;
  /** Layout direction */
  direction?: "horizontal" | "vertical";
  /** Additional CSS classes */
  className?: string;
}

export function ChartLegend({
  items,
  direction = "horizontal",
  className,
}: ChartLegendProps) {
  return (
    <div
      role="list"
      aria-label="Chart legend"
      className={cn(
        "flex gap-4",
        direction === "vertical" && "flex-col gap-2",
        direction === "horizontal" && "flex-wrap justify-center",
        className
      )}
    >
      {items.map((item, index) => (
        <div
          key={`${item.label}-${index}`}
          role="listitem"
          className="flex items-center gap-2"
        >
          <span
            className="w-3 h-3 rounded-sm flex-shrink-0"
            style={{ backgroundColor: item.color }}
            aria-hidden="true"
          />
          <span className="text-sm text-slate-600 dark:text-slate-400">
            {item.label}
            {item.value !== undefined && (
              <span className="font-medium ml-1">({item.value})</span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * No data placeholder for charts
 */
export interface ChartNoDataProps {
  /** Message to display */
  message?: string;
  /** Height of the placeholder */
  height?: number;
  /** Additional CSS classes */
  className?: string;
}

export function ChartNoData({
  message = "No data available",
  height = 200,
  className,
}: ChartNoDataProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center",
        "bg-slate-50 dark:bg-slate-800/50",
        "border border-dashed border-slate-300 dark:border-slate-600",
        "rounded-lg",
        className
      )}
      style={{ height }}
      role="status"
    >
      <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>
    </div>
  );
}

export default AccessibleChartWrapper;

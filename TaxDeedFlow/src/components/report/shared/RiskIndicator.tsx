"use client";

import * as React from "react";
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  XCircle,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { RiskLevel, ComponentSize } from "@/types/report";
import { getRiskLevelColorClasses } from "@/types/report";

/**
 * Props for the RiskIndicator component
 */
export interface RiskIndicatorProps {
  /** Risk level to display */
  level: RiskLevel;
  /** Optional label to display alongside the indicator */
  label?: string;
  /** Whether to show the label (defaults to true if label is provided) */
  showLabel?: boolean;
  /** Whether to show the icon */
  showIcon?: boolean;
  /** Display size variant */
  size?: ComponentSize;
  /** Whether to use shield icons instead of alert icons */
  useShieldIcon?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Size configurations for the risk indicator
 */
const sizeConfig: Record<
  ComponentSize,
  {
    container: string;
    icon: string;
    text: string;
    padding: string;
  }
> = {
  sm: {
    container: "text-xs",
    icon: "h-3 w-3",
    text: "text-xs",
    padding: "px-2 py-0.5",
  },
  md: {
    container: "text-sm",
    icon: "h-4 w-4",
    text: "text-sm",
    padding: "px-2.5 py-1",
  },
  lg: {
    container: "text-base",
    icon: "h-5 w-5",
    text: "text-base",
    padding: "px-3 py-1.5",
  },
};

/**
 * Get the appropriate icon component for a risk level
 */
function getRiskIcon(
  level: RiskLevel,
  useShield: boolean,
  className: string
): React.ReactNode {
  if (useShield) {
    switch (level) {
      case "low":
        return <ShieldCheck className={className} />;
      case "medium":
        return <Shield className={className} />;
      case "high":
        return <ShieldAlert className={className} />;
      case "critical":
        return <ShieldX className={className} />;
    }
  }

  switch (level) {
    case "low":
      return <CheckCircle className={className} />;
    case "medium":
      return <AlertCircle className={className} />;
    case "high":
      return <AlertTriangle className={className} />;
    case "critical":
      return <XCircle className={className} />;
  }
}

/**
 * Get display label for risk level
 */
function getRiskLabel(level: RiskLevel): string {
  const labels: Record<RiskLevel, string> = {
    low: "Low Risk",
    medium: "Medium Risk",
    high: "High Risk",
    critical: "Critical Risk",
  };
  return labels[level];
}

/**
 * RiskIndicator - A badge component for displaying risk levels
 *
 * Features:
 * - Color-coded based on risk level (low=green, medium=yellow, high=orange, critical=red)
 * - Multiple size variants (sm, md, lg)
 * - Optional icon display (alert or shield style)
 * - Full accessibility support
 * - Dark mode support
 *
 * @example
 * ```tsx
 * <RiskIndicator level="high" showIcon />
 * <RiskIndicator level="low" label="Flood Risk" size="lg" />
 * <RiskIndicator level="critical" useShieldIcon />
 * ```
 */
export function RiskIndicator({
  level,
  label,
  showLabel,
  showIcon = true,
  size = "md",
  useShieldIcon = false,
  className,
}: RiskIndicatorProps) {
  const colorClasses = getRiskLevelColorClasses(level);
  const config = sizeConfig[size];
  const displayLabel = label || getRiskLabel(level);

  // Determine if we should show the label
  // showLabel prop takes precedence, otherwise show if label is provided or by default
  const shouldShowLabel = showLabel !== undefined ? showLabel : true;

  // Accessibility description
  const ariaLabel = `${displayLabel}: ${level} risk level`;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md font-medium",
        colorClasses.bg,
        colorClasses.text,
        config.padding,
        config.container,
        className
      )}
      role="status"
      aria-label={ariaLabel}
    >
      {showIcon && (
        <span aria-hidden="true" className={colorClasses.icon}>
          {getRiskIcon(level, useShieldIcon, config.icon)}
        </span>
      )}
      {shouldShowLabel && <span className={config.text}>{displayLabel}</span>}
    </span>
  );
}

/**
 * Compact risk dot indicator
 */
export interface RiskDotProps {
  /** Risk level */
  level: RiskLevel;
  /** Whether to show a label */
  showLabel?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export function RiskDot({ level, showLabel = false, className }: RiskDotProps) {
  const colorClasses = getRiskLevelColorClasses(level);
  const label = getRiskLabel(level);

  // Dot color classes
  const dotColorMap: Record<RiskLevel, string> = {
    low: "bg-green-500",
    medium: "bg-yellow-500",
    high: "bg-orange-500",
    critical: "bg-red-500",
  };

  return (
    <span
      className={cn("inline-flex items-center gap-1.5", className)}
      role="status"
      aria-label={label}
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          dotColorMap[level],
          // Pulse animation for critical
          level === "critical" && "animate-pulse"
        )}
        aria-hidden="true"
      />
      {showLabel && (
        <span className={cn("text-sm capitalize", colorClasses.text)}>
          {level}
        </span>
      )}
    </span>
  );
}

/**
 * Risk meter showing a scale visualization
 */
export interface RiskMeterProps {
  /** Risk score (0-100, higher = more risk) */
  score?: number;
  /** Risk level (alternative to score) */
  level?: RiskLevel;
  /** Display size */
  size?: ComponentSize | "lg";
  /** Display label */
  label?: string;
  /** Whether to show the numeric score */
  showScore?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export function RiskMeter({
  score: scoreProp,
  level: levelProp,
  size = "md",
  label,
  showScore = true,
  className,
}: RiskMeterProps) {
  // Determine score from level if score not provided
  let score: number;
  if (scoreProp !== undefined) {
    score = scoreProp;
  } else if (levelProp) {
    // Convert level to approximate score
    const levelScoreMap: Record<RiskLevel, number> = {
      low: 20,
      medium: 45,
      high: 70,
      critical: 90,
    };
    score = levelScoreMap[levelProp];
  } else {
    score = 0;
  }

  // Determine risk level from score
  let level: RiskLevel;
  if (score <= 25) {
    level = "low";
  } else if (score <= 50) {
    level = "medium";
  } else if (score <= 75) {
    level = "high";
  } else {
    level = "critical";
  }

  // Override level if explicitly provided
  if (levelProp) {
    level = levelProp;
  }

  const colorClasses = getRiskLevelColorClasses(level);

  // Bar color based on position
  const getBarColor = (position: number): string => {
    if (position <= 25) return "bg-green-500";
    if (position <= 50) return "bg-yellow-500";
    if (position <= 75) return "bg-orange-500";
    return "bg-red-500";
  };

  return (
    <div
      className={cn("w-full", className)}
      role="meter"
      aria-valuenow={score}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ? `${label}: ${score}%` : `Risk score: ${score}%`}
    >
      {/* Header with label and score */}
      {(label || showScore) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && (
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {label}
            </span>
          )}
          {showScore && (
            <span className={cn("text-sm font-semibold", colorClasses.text)}>
              {score}/100
            </span>
          )}
        </div>
      )}

      {/* Risk meter bar */}
      <div className="relative h-3 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
        {/* Gradient background showing scale */}
        <div
          className="absolute inset-0 flex"
          style={{ opacity: 0.3 }}
          aria-hidden="true"
        >
          <div className="flex-1 bg-green-500" />
          <div className="flex-1 bg-yellow-500" />
          <div className="flex-1 bg-orange-500" />
          <div className="flex-1 bg-red-500" />
        </div>

        {/* Active fill */}
        <div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full transition-all duration-500",
            getBarColor(score)
          )}
          style={{ width: `${Math.min(score, 100)}%` }}
        />

        {/* Marker position */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-1 h-4 bg-slate-900 dark:bg-white rounded-full shadow transition-all duration-500"
          style={{ left: `calc(${Math.min(score, 100)}% - 2px)` }}
          aria-hidden="true"
        />
      </div>

      {/* Scale labels */}
      <div
        className="flex justify-between mt-1 text-xs text-slate-500 dark:text-slate-400"
        aria-hidden="true"
      >
        <span>Low</span>
        <span>Medium</span>
        <span>High</span>
        <span>Critical</span>
      </div>
    </div>
  );
}

/**
 * Risk summary card for displaying overall risk
 */
export interface RiskSummaryProps {
  /** Overall risk level */
  level: RiskLevel;
  /** Risk score (0-100) */
  score?: number;
  /** Summary title */
  title?: string;
  /** Summary description */
  description?: string;
  /** Risk counts by level */
  riskCounts?: Record<RiskLevel, number>;
  /** List of key risk factors */
  factors?: string[];
  /** Additional CSS classes */
  className?: string;
}

export function RiskSummary({
  level,
  score,
  title,
  description,
  riskCounts,
  factors,
  className,
}: RiskSummaryProps) {
  const colorClasses = getRiskLevelColorClasses(level);

  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        colorClasses.bg,
        "border-current",
        className
      )}
      style={{ borderColor: "inherit" }}
      role="group"
      aria-label="Risk Summary"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {getRiskIcon(level, true, cn("h-6 w-6", colorClasses.icon))}
          <span className={cn("text-lg font-semibold", colorClasses.text)}>
            {title || getRiskLabel(level)}
          </span>
        </div>
        {score !== undefined && (
          <span
            className={cn(
              "text-2xl font-bold",
              colorClasses.text
            )}
          >
            {score}
          </span>
        )}
      </div>

      {description && (
        <p className={cn("text-sm mb-3", colorClasses.text)}>
          {description}
        </p>
      )}

      {riskCounts && (
        <div className="flex gap-3 mb-3 flex-wrap">
          {Object.entries(riskCounts).map(([riskLevel, count]) => (
            count > 0 && (
              <div key={riskLevel} className="flex items-center gap-1.5">
                <RiskDot level={riskLevel as RiskLevel} />
                <span className="text-sm text-slate-600 dark:text-slate-400 capitalize">
                  {count} {riskLevel}
                </span>
              </div>
            )
          ))}
        </div>
      )}

      {factors && factors.length > 0 && (
        <ul className="space-y-1" aria-label="Risk factors">
          {factors.map((factor, index) => (
            <li
              key={index}
              className={cn(
                "text-sm flex items-start gap-2",
                colorClasses.text
              )}
            >
              <span aria-hidden="true">-</span>
              {factor}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default RiskIndicator;

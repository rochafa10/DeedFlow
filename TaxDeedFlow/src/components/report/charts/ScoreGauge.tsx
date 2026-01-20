"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { Grade, ComponentSize } from "@/types/report";
import { getGradeColor } from "@/types/report";

/**
 * Props for the ScoreGauge component
 */
export interface ScoreGaugeProps {
  /** Current score (0-125) */
  score: number;
  /** Maximum score (default 125) */
  maxScore?: number;
  /** Letter grade to display */
  grade: Grade;
  /** Display size variant */
  size?: ComponentSize;
  /** Whether to animate the gauge on mount */
  showAnimation?: boolean;
  /** Custom aria label */
  ariaLabel?: string;
  /** Additional CSS classes */
  className?: string;
  /** Show the grade in the center */
  showGrade?: boolean;
  /** Show the score value */
  showScore?: boolean;
  /** Show the percentage */
  showPercentage?: boolean;
}

/**
 * Size configurations
 */
const sizeConfig: Record<
  ComponentSize,
  {
    width: number;
    height: number;
    strokeWidth: number;
    gradeSize: string;
    scoreSize: string;
    labelSize: string;
    innerRadius: number;
  }
> = {
  sm: {
    width: 120,
    height: 120,
    strokeWidth: 8,
    gradeSize: "text-2xl",
    scoreSize: "text-sm",
    labelSize: "text-xs",
    innerRadius: 48,
  },
  md: {
    width: 180,
    height: 180,
    strokeWidth: 12,
    gradeSize: "text-4xl",
    scoreSize: "text-lg",
    labelSize: "text-sm",
    innerRadius: 72,
  },
  lg: {
    width: 240,
    height: 240,
    strokeWidth: 16,
    gradeSize: "text-5xl",
    scoreSize: "text-xl",
    labelSize: "text-base",
    innerRadius: 96,
  },
};

/**
 * Get color based on percentage
 */
function getScoreColor(percentage: number): string {
  if (percentage >= 80) return "#22c55e"; // green-500
  if (percentage >= 60) return "#3b82f6"; // blue-500
  if (percentage >= 40) return "#eab308"; // yellow-500
  if (percentage >= 20) return "#f97316"; // orange-500
  return "#ef4444"; // red-500
}

/**
 * Get background color (dimmed version)
 */
function getBackgroundColor(isDark: boolean): string {
  return isDark ? "#334155" : "#e2e8f0"; // slate-700 / slate-200
}

/**
 * ScoreGauge - Circular gauge component for displaying scores
 *
 * Features:
 * - SVG-based circular progress gauge
 * - Color-coded based on score (green to red)
 * - Animated fill on mount
 * - Multiple size variants
 * - Full accessibility support
 * - Dark mode support
 *
 * @example
 * ```tsx
 * <ScoreGauge
 *   score={100}
 *   maxScore={125}
 *   grade="A-"
 *   size="lg"
 *   showAnimation
 *   showScore
 *   showPercentage
 * />
 * ```
 */
export function ScoreGauge({
  score,
  maxScore = 125,
  grade,
  size = "md",
  showAnimation = true,
  ariaLabel,
  className,
  showScore = true,
  showPercentage = true,
}: ScoreGaugeProps) {
  const [animatedPercentage, setAnimatedPercentage] = React.useState(
    showAnimation ? 0 : (score / maxScore) * 100
  );

  const config = sizeConfig[size];
  const percentage = (score / maxScore) * 100;
  const color = getScoreColor(percentage);

  // Calculate SVG dimensions
  const center = config.width / 2;
  const radius = center - config.strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;

  // Calculate stroke offset for progress (270 degree arc)
  const arcFraction = 0.75; // 270 degrees = 75% of circle
  const arcLength = circumference * arcFraction;
  const progressOffset =
    arcLength - (animatedPercentage / 100) * arcLength;

  // Rotation to start from bottom left
  const startAngle = 135; // Start at 135 degrees (bottom left)

  // Animate on mount
  React.useEffect(() => {
    if (!showAnimation) {
      setAnimatedPercentage(percentage);
      return;
    }

    const timer = setTimeout(() => {
      setAnimatedPercentage(percentage);
    }, 100);

    return () => clearTimeout(timer);
  }, [percentage, showAnimation]);

  // Generate aria label
  const defaultAriaLabel = `Investment score: ${score} out of ${maxScore} points, ${percentage.toFixed(1)} percent, grade ${grade}`;

  return (
    <div
      className={cn("relative inline-flex flex-col items-center", className)}
      role="img"
      aria-label={ariaLabel || defaultAriaLabel}
    >
      <svg
        width={config.width}
        height={config.height}
        viewBox={`0 0 ${config.width} ${config.height}`}
        className="transform"
      >
        {/* Background arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={config.strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${arcLength} ${circumference}`}
          transform={`rotate(${startAngle} ${center} ${center})`}
          className="text-slate-200 dark:text-slate-700"
        />

        {/* Progress arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={config.strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeDashoffset={progressOffset}
          transform={`rotate(${startAngle} ${center} ${center})`}
          className={cn(
            showAnimation && "transition-all duration-1000 ease-out"
          )}
        />

        {/* Grade markers (tick marks at 20%, 40%, 60%, 80%) */}
        {[20, 40, 60, 80].map((mark) => {
          const angle = startAngle + (270 * mark) / 100;
          const radians = (angle * Math.PI) / 180;
          // Round to 4 decimal places to prevent hydration mismatch from floating-point precision
          const round = (n: number) => Math.round(n * 10000) / 10000;
          const x1 = round(center + (radius - config.strokeWidth) * Math.cos(radians));
          const y1 = round(center + (radius - config.strokeWidth) * Math.sin(radians));
          const x2 = round(center + (radius + 2) * Math.cos(radians));
          const y2 = round(center + (radius + 2) * Math.sin(radians));

          return (
            <line
              key={mark}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="currentColor"
              strokeWidth={2}
              className="text-slate-300 dark:text-slate-600"
              aria-hidden="true"
            />
          );
        })}
      </svg>

      {/* Center content */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{
          top: config.strokeWidth,
          bottom: config.strokeWidth,
          left: config.strokeWidth,
          right: config.strokeWidth,
        }}
        aria-hidden="true"
      >
        {/* Grade */}
        <span
          className={cn(config.gradeSize, "font-bold leading-none")}
          style={{ color }}
        >
          {grade}
        </span>

        {/* Score */}
        {showScore && (
          <span
            className={cn(
              config.scoreSize,
              "text-slate-700 dark:text-slate-300 mt-1"
            )}
          >
            {score}/{maxScore}
          </span>
        )}

        {/* Percentage */}
        {showPercentage && (
          <span
            className={cn(
              config.labelSize,
              "text-slate-500 dark:text-slate-400"
            )}
          >
            {percentage.toFixed(0)}%
          </span>
        )}
      </div>

      {/* Scale labels */}
      <div
        className="flex justify-between w-full mt-2 px-2"
        style={{ maxWidth: config.width }}
        aria-hidden="true"
      >
        <span className="text-xs text-slate-400 dark:text-slate-500">0</span>
        <span className="text-xs text-slate-400 dark:text-slate-500">
          {maxScore}
        </span>
      </div>
    </div>
  );
}

/**
 * Mini score gauge for compact displays
 */
export interface MiniGaugeProps {
  /** Score (0-100 percentage) */
  percentage: number;
  /** Size in pixels */
  size?: number;
  /** Stroke width */
  strokeWidth?: number;
  /** Color (auto if not provided) */
  color?: string;
  /** Additional CSS classes */
  className?: string;
}

export function MiniGauge({
  percentage,
  size = 32,
  strokeWidth = 3,
  color,
  className,
}: MiniGaugeProps) {
  const normalizedPercentage = Math.max(0, Math.min(100, percentage));
  const displayColor = color || getScoreColor(normalizedPercentage);

  const center = size / 2;
  const radius = center - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (normalizedPercentage / 100) * circumference;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn("transform -rotate-90", className)}
      role="img"
      aria-label={`${normalizedPercentage.toFixed(0)}%`}
    >
      {/* Background circle */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-slate-200 dark:text-slate-700"
      />

      {/* Progress circle */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={displayColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="transition-all duration-500 ease-out"
      />
    </svg>
  );
}

/**
 * Linear score bar alternative to circular gauge
 */
export interface ScoreBarProps {
  /** Score value */
  score: number;
  /** Maximum score */
  maxScore: number;
  /** Grade (optional) */
  grade?: Grade;
  /** Custom color for the bar */
  color?: string;
  /** Show labels */
  showLabels?: boolean;
  /** Show label (alias for showLabels) */
  showLabel?: boolean;
  /** Bar height in pixels */
  height?: number;
  /** Bar width in pixels or string */
  width?: number | string;
  /** Additional CSS classes */
  className?: string;
}

export function ScoreBar({
  score,
  maxScore,
  grade,
  showLabels = true,
  className,
}: ScoreBarProps) {
  const percentage = (score / maxScore) * 100;
  const color = getScoreColor(percentage);

  return (
    <div
      className={cn("w-full", className)}
      role="progressbar"
      aria-valuenow={score}
      aria-valuemin={0}
      aria-valuemax={maxScore}
      aria-label={`Score: ${score} out of ${maxScore}, grade ${grade}`}
    >
      {showLabels && (
        <div className="flex justify-between items-baseline mb-1">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Score
          </span>
          <span className="text-lg font-bold" style={{ color }}>
            {grade}
          </span>
        </div>
      )}

      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${percentage}%`,
            backgroundColor: color,
          }}
        />
      </div>

      {showLabels && (
        <div className="flex justify-between mt-1">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {score}/{maxScore}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {percentage.toFixed(0)}%
          </span>
        </div>
      )}
    </div>
  );
}

export default ScoreGauge;

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { Grade, ComponentSize } from "@/types/report";
import { getGradeColorClasses, gradeToRating } from "@/types/report";

/**
 * Props for the GradeDisplay component
 */
export interface GradeDisplayProps {
  /** Letter grade to display (A+ through F) */
  grade: Grade;
  /** Raw score (0-125) */
  score: number;
  /** Percentage (0-100) */
  percentage: number;
  /** Display size variant */
  size?: ComponentSize;
  /** Whether to show a tooltip with details */
  showTooltip?: boolean;
  /** Whether to show the percentage below the grade */
  showPercentage?: boolean;
  /** Whether to show the investment rating label */
  showRating?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Size configurations for the grade display
 */
const sizeConfig: Record<
  ComponentSize,
  {
    container: string;
    grade: string;
    score: string;
    label: string;
  }
> = {
  sm: {
    container: "h-10 w-10 min-w-[2.5rem]",
    grade: "text-lg font-bold",
    score: "text-xs",
    label: "text-xs",
  },
  md: {
    container: "h-14 w-14 min-w-[3.5rem]",
    grade: "text-2xl font-bold",
    score: "text-sm",
    label: "text-sm",
  },
  lg: {
    container: "h-20 w-20 min-w-[5rem]",
    grade: "text-4xl font-bold",
    score: "text-base",
    label: "text-base",
  },
};

/**
 * GradeDisplay - A badge component for displaying letter grades
 *
 * Features:
 * - Color-coded based on grade (A=green, B=blue, C=yellow, D=orange, F=red)
 * - Multiple size variants (sm, md, lg)
 * - Optional percentage and rating display
 * - Full accessibility support
 * - Dark mode support
 *
 * @example
 * ```tsx
 * <GradeDisplay
 *   grade="A+"
 *   score={110}
 *   percentage={88}
 *   size="lg"
 *   showPercentage
 *   showRating
 * />
 * ```
 */
export function GradeDisplay({
  grade,
  score,
  percentage,
  size = "md",
  showTooltip = false,
  showPercentage = false,
  showRating = false,
  className,
}: GradeDisplayProps) {
  const colorClasses = getGradeColorClasses(grade);
  const rating = gradeToRating(grade);
  const config = sizeConfig[size];

  // Format the grade for screen readers
  const gradeDescription = `Grade ${grade}, ${score} out of 125 points, ${percentage.toFixed(1)} percent`;

  // Tooltip content
  const tooltipContent = showTooltip
    ? `${grade} (${score}/125 points - ${percentage.toFixed(1)}%)\n${rating} Investment`
    : undefined;

  return (
    <div
      className={cn("inline-flex flex-col items-center", className)}
      title={tooltipContent}
    >
      {/* Grade Badge */}
      <div
        className={cn(
          // Base styles
          "flex items-center justify-center rounded-full",
          // Color based on grade
          colorClasses.bg,
          colorClasses.text,
          // Border
          "border-2",
          colorClasses.border,
          // Size
          config.container,
          // Transition for hover effects
          "transition-transform hover:scale-105"
        )}
        role="img"
        aria-label={gradeDescription}
      >
        <span className={config.grade}>{grade}</span>
      </div>

      {/* Score and Percentage (optional) */}
      {showPercentage && (
        <div
          className={cn(
            "mt-1 text-center",
            config.score,
            "text-slate-600 dark:text-slate-400"
          )}
          aria-hidden="true"
        >
          <span className="font-medium">{score}</span>
          <span className="text-slate-400 dark:text-slate-500">/125</span>
          <span className="ml-1 text-slate-500 dark:text-slate-500">
            ({percentage.toFixed(0)}%)
          </span>
        </div>
      )}

      {/* Investment Rating (optional) */}
      {showRating && (
        <div
          className={cn(
            "mt-1",
            config.label,
            "font-medium",
            colorClasses.text
          )}
        >
          {rating}
        </div>
      )}

      {/* Screen reader text */}
      <span className="sr-only">{gradeDescription}</span>
    </div>
  );
}

/**
 * Compact inline grade badge for use in tables or lists
 */
export interface GradeBadgeProps {
  /** Letter grade */
  grade: Grade;
  /** Additional CSS classes */
  className?: string;
}

export function GradeBadge({ grade, className }: GradeBadgeProps) {
  const colorClasses = getGradeColorClasses(grade);

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center",
        "px-2 py-0.5 rounded-md text-sm font-semibold",
        colorClasses.bg,
        colorClasses.text,
        className
      )}
      role="img"
      aria-label={`Grade ${grade}`}
    >
      {grade}
    </span>
  );
}

/**
 * Category grade indicator for showing category-level scores
 */
export interface CategoryGradeProps {
  /** Category name */
  name?: string;
  /** Score for this category (0-25) */
  score?: number;
  /** Maximum score (usually 25) */
  maxScore?: number;
  /** Letter grade (alternative to score-based display) */
  grade?: Grade;
  /** Additional CSS classes */
  className?: string;
}

export function CategoryGrade({
  name,
  score,
  maxScore = 25,
  grade,
  className,
}: CategoryGradeProps) {
  // If grade is provided, use GradeBadge instead
  if (grade) {
    return <GradeBadge grade={grade} className={className} />;
  }

  // If no score provided, return null
  if (score === undefined) {
    return null;
  }

  // Calculate percentage from score
  const percentage = (score / maxScore) * 100;

  // Determine color based on percentage
  let colorClasses: { bg: string; text: string; bar: string };
  if (percentage >= 80) {
    colorClasses = {
      bg: "bg-green-100 dark:bg-green-900/30",
      text: "text-green-800 dark:text-green-200",
      bar: "bg-green-500",
    };
  } else if (percentage >= 60) {
    colorClasses = {
      bg: "bg-blue-100 dark:bg-blue-900/30",
      text: "text-blue-800 dark:text-blue-200",
      bar: "bg-blue-500",
    };
  } else if (percentage >= 40) {
    colorClasses = {
      bg: "bg-yellow-100 dark:bg-yellow-900/30",
      text: "text-yellow-800 dark:text-yellow-200",
      bar: "bg-yellow-500",
    };
  } else if (percentage >= 20) {
    colorClasses = {
      bg: "bg-orange-100 dark:bg-orange-900/30",
      text: "text-orange-800 dark:text-orange-200",
      bar: "bg-orange-500",
    };
  } else {
    colorClasses = {
      bg: "bg-red-100 dark:bg-red-900/30",
      text: "text-red-800 dark:text-red-200",
      bar: "bg-red-500",
    };
  }

  return (
    <div
      className={cn("rounded-lg p-3", colorClasses.bg, className)}
      role="group"
      aria-label={`${name}: ${score} out of ${maxScore} points`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className={cn("text-sm font-medium", colorClasses.text)}>
          {name}
        </span>
        <span className={cn("text-sm font-bold", colorClasses.text)}>
          {score.toFixed(1)}/{maxScore}
        </span>
      </div>

      {/* Progress bar */}
      <div
        className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={maxScore}
        aria-label={`${name} score`}
      >
        <div
          className={cn("h-full rounded-full transition-all duration-500", colorClasses.bar)}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}

export default GradeDisplay;

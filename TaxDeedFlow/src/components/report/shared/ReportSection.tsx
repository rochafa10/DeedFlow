"use client";

import * as React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Props for the ReportSection component
 */
export interface ReportSectionProps {
  /** Unique identifier for the section (used for ARIA and navigation) */
  id: string;
  /** Section title displayed in the header */
  title: string;
  /** Content to render within the section */
  children: React.ReactNode;
  /** Whether the section can be collapsed/expanded */
  collapsible?: boolean;
  /** Initial expanded state (only applies if collapsible) */
  defaultExpanded?: boolean;
  /** Initial collapsed state (alias for !defaultExpanded for convenience) */
  defaultCollapsed?: boolean;
  /** Optional icon to display before the title */
  icon?: React.ReactNode;
  /** Optional badge to display after the title (e.g., grade, status) */
  badge?: React.ReactNode;
  /** Optional content to render on the right side of the header */
  headerRight?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Whether to apply page-break-before for printing */
  pageBreakBefore?: boolean;
  /** Section description for accessibility */
  description?: string;
}

/**
 * ReportSection - A wrapper component for report sections with consistent styling
 *
 * Features:
 * - Consistent header styling with optional icon and badge
 * - Collapsible/expandable functionality with animation
 * - Full ARIA support for accessibility
 * - Print-friendly with optional page breaks
 * - Dark mode support
 *
 * @example
 * ```tsx
 * <ReportSection
 *   id="investment-score"
 *   title="Investment Score"
 *   icon={<Target className="h-5 w-5" />}
 *   badge={<GradeDisplay grade="A+" score={110} percentage={88} />}
 *   collapsible
 * >
 *   <ScoreContent />
 * </ReportSection>
 * ```
 */
export function ReportSection({
  id,
  title,
  children,
  collapsible = false,
  defaultExpanded = true,
  defaultCollapsed,
  icon,
  badge,
  headerRight,
  className,
  pageBreakBefore = false,
  description,
}: ReportSectionProps) {
  // Support both defaultExpanded and defaultCollapsed (defaultCollapsed takes precedence)
  const initialExpanded = defaultCollapsed !== undefined ? !defaultCollapsed : defaultExpanded;
  const [isExpanded, setIsExpanded] = React.useState(initialExpanded);
  const contentId = `${id}-content`;
  const headingId = `${id}-heading`;

  // Handle keyboard navigation for collapsible sections
  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent) => {
      if (!collapsible) return;

      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        setIsExpanded((prev) => !prev);
      }
    },
    [collapsible]
  );

  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cn(
        // Base styles
        "rounded-lg border border-slate-200 bg-white shadow-sm",
        // Dark mode
        "dark:border-slate-700 dark:bg-slate-800",
        // Print styles
        pageBreakBefore && "print:break-before-page",
        "print:shadow-none print:border-slate-300",
        className
      )}
    >
      {/* Section Header */}
      <div
        id={headingId}
        className={cn(
          // Base styles
          "flex items-center justify-between px-4 py-3 sm:px-6",
          // Border bottom when expanded or not collapsible
          (isExpanded || !collapsible) && "border-b border-slate-200 dark:border-slate-700",
          // Clickable styles when collapsible
          collapsible && "cursor-pointer select-none hover:bg-slate-50 dark:hover:bg-slate-700/50",
          // Rounded top corners
          "rounded-t-lg"
        )}
        role={collapsible ? "button" : undefined}
        tabIndex={collapsible ? 0 : undefined}
        aria-expanded={collapsible ? isExpanded : undefined}
        aria-controls={collapsible ? contentId : undefined}
        onClick={collapsible ? () => setIsExpanded((prev) => !prev) : undefined}
        onKeyDown={handleKeyDown}
      >
        {/* Left side: Icon, Title, Badge */}
        <div className="flex items-center gap-3">
          {/* Collapse/Expand indicator */}
          {collapsible && (
            <span
              className="flex-shrink-0 text-slate-400 dark:text-slate-500"
              aria-hidden="true"
            >
              {isExpanded ? (
                <ChevronDown className="h-5 w-5" />
              ) : (
                <ChevronRight className="h-5 w-5" />
              )}
            </span>
          )}

          {/* Optional icon */}
          {icon && (
            <span
              className="flex-shrink-0 text-slate-600 dark:text-slate-400"
              aria-hidden="true"
            >
              {icon}
            </span>
          )}

          {/* Title */}
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {title}
          </h2>

          {/* Optional badge */}
          {badge && <div className="ml-2">{badge}</div>}
        </div>

        {/* Right side content (headerRight) */}
        {headerRight && (
          <div className="flex items-center gap-2">
            {headerRight}
          </div>
        )}

        {/* Screen reader description */}
        {description && (
          <span className="sr-only">{description}</span>
        )}
      </div>

      {/* Section Content */}
      <div
        id={contentId}
        role="region"
        aria-labelledby={headingId}
        className={cn(
          // Transition for smooth collapse/expand
          "transition-all duration-200 ease-in-out",
          // Hide when collapsed
          collapsible && !isExpanded && "hidden",
          // Print always visible
          "print:block"
        )}
      >
        <div className="p-4 sm:p-6">{children}</div>
      </div>
    </section>
  );
}

/**
 * Subsection component for nested content within a ReportSection
 */
export interface ReportSubsectionProps {
  /** Subsection title */
  title: string;
  /** Optional icon to display before title */
  icon?: React.ReactNode;
  /** Content */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

export function ReportSubsection({
  title,
  icon,
  children,
  className,
}: ReportSubsectionProps) {
  return (
    <div className={cn("mt-6 first:mt-0", className)}>
      <h3 className="text-base font-medium text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
        {icon && (
          <span className="flex-shrink-0 text-slate-500 dark:text-slate-400" aria-hidden="true">
            {icon}
          </span>
        )}
        {title}
      </h3>
      {children}
    </div>
  );
}

export default ReportSection;

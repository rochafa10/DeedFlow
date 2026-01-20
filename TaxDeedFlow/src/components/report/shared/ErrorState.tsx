"use client";

import * as React from "react";
import {
  AlertCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Bug,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LiveRegion } from "./AccessibilityHelpers";

/**
 * Error severity levels
 */
export type ErrorSeverity = "info" | "warning" | "error" | "critical";

/**
 * Props for the ErrorState component
 */
export interface ErrorStateProps {
  /** Error title */
  title?: string;
  /** Error message */
  message: string;
  /** Error severity */
  severity?: ErrorSeverity;
  /** Detailed error information (for debugging) */
  details?: string;
  /** Error code or identifier */
  code?: string;
  /** Action to retry the failed operation */
  onRetry?: () => void;
  /** Retry button text */
  retryText?: string;
  /** Whether retry is in progress */
  retrying?: boolean;
  /** Support/help link */
  helpLink?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Severity configurations
 */
const severityConfig: Record<
  ErrorSeverity,
  {
    icon: typeof AlertCircle;
    bgClass: string;
    borderClass: string;
    iconClass: string;
    textClass: string;
    titleClass: string;
    defaultTitle: string;
  }
> = {
  info: {
    icon: HelpCircle,
    bgClass: "bg-blue-50 dark:bg-blue-900/20",
    borderClass: "border-blue-200 dark:border-blue-800",
    iconClass: "text-blue-500 dark:text-blue-400",
    textClass: "text-blue-700 dark:text-blue-300",
    titleClass: "text-blue-800 dark:text-blue-200",
    defaultTitle: "Information",
  },
  warning: {
    icon: AlertTriangle,
    bgClass: "bg-yellow-50 dark:bg-yellow-900/20",
    borderClass: "border-yellow-200 dark:border-yellow-800",
    iconClass: "text-yellow-500 dark:text-yellow-400",
    textClass: "text-yellow-700 dark:text-yellow-300",
    titleClass: "text-yellow-800 dark:text-yellow-200",
    defaultTitle: "Warning",
  },
  error: {
    icon: AlertCircle,
    bgClass: "bg-red-50 dark:bg-red-900/20",
    borderClass: "border-red-200 dark:border-red-800",
    iconClass: "text-red-500 dark:text-red-400",
    textClass: "text-red-700 dark:text-red-300",
    titleClass: "text-red-800 dark:text-red-200",
    defaultTitle: "Error",
  },
  critical: {
    icon: XCircle,
    bgClass: "bg-red-100 dark:bg-red-900/30",
    borderClass: "border-red-300 dark:border-red-700",
    iconClass: "text-red-600 dark:text-red-400",
    textClass: "text-red-800 dark:text-red-200",
    titleClass: "text-red-900 dark:text-red-100",
    defaultTitle: "Critical Error",
  },
};

/**
 * ErrorState - Component for displaying error messages with actions
 *
 * Features:
 * - Multiple severity levels (info, warning, error, critical)
 * - Optional retry functionality
 * - Expandable technical details
 * - Accessible error announcements
 * - Dark mode support
 *
 * @example
 * ```tsx
 * <ErrorState
 *   title="Failed to load report"
 *   message="We couldn't load the property analysis report."
 *   severity="error"
 *   onRetry={() => refetch()}
 *   details={error.stack}
 *   code="REPORT_LOAD_ERROR"
 * />
 * ```
 */
export function ErrorState({
  title,
  message,
  severity = "error",
  details,
  code,
  onRetry,
  retryText = "Try Again",
  retrying = false,
  helpLink,
  className,
}: ErrorStateProps) {
  const [showDetails, setShowDetails] = React.useState(false);
  const config = severityConfig[severity];
  const Icon = config.icon;
  const displayTitle = title || config.defaultTitle;

  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        config.bgClass,
        config.borderClass,
        className
      )}
      role="alert"
      aria-live="assertive"
    >
      {/* Announce error to screen readers */}
      <LiveRegion politeness="assertive">
        {displayTitle}: {message}
      </LiveRegion>

      <div className="flex gap-3">
        {/* Icon */}
        <div className="flex-shrink-0">
          <Icon className={cn("h-5 w-5", config.iconClass)} aria-hidden="true" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title and Code */}
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={cn("text-sm font-semibold", config.titleClass)}>
              {displayTitle}
            </h3>
            {code && (
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                [{code}]
              </span>
            )}
          </div>

          {/* Message */}
          <p className={cn("mt-1 text-sm", config.textClass)}>{message}</p>

          {/* Actions */}
          <div className="mt-3 flex flex-wrap gap-2">
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                disabled={retrying}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md",
                  "border border-current",
                  "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  config.textClass,
                  "hover:bg-white/50 dark:hover:bg-slate-800/50"
                )}
              >
                <RefreshCw
                  className={cn("h-4 w-4", retrying && "animate-spin")}
                  aria-hidden="true"
                />
                {retrying ? "Retrying..." : retryText}
              </button>
            )}

            {details && (
              <button
                type="button"
                onClick={() => setShowDetails(!showDetails)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md",
                  "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary",
                  config.textClass,
                  "hover:bg-white/50 dark:hover:bg-slate-800/50"
                )}
                aria-expanded={showDetails}
                aria-controls="error-details"
              >
                <Bug className="h-4 w-4" aria-hidden="true" />
                Details
                {showDetails ? (
                  <ChevronUp className="h-3 w-3" aria-hidden="true" />
                ) : (
                  <ChevronDown className="h-3 w-3" aria-hidden="true" />
                )}
              </button>
            )}

            {helpLink && (
              <a
                href={helpLink}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md",
                  "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary",
                  config.textClass,
                  "hover:bg-white/50 dark:hover:bg-slate-800/50"
                )}
              >
                <HelpCircle className="h-4 w-4" aria-hidden="true" />
                Get Help
              </a>
            )}
          </div>

          {/* Technical Details */}
          {details && showDetails && (
            <div
              id="error-details"
              className="mt-3 p-3 rounded-md bg-slate-900 dark:bg-slate-950 overflow-auto max-h-48"
            >
              <pre className="text-xs text-slate-300 whitespace-pre-wrap break-words font-mono">
                {details}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Inline error message for form fields or smaller contexts
 */
export interface InlineErrorProps {
  /** Error message */
  message: string;
  /** ID for aria-describedby linking */
  id?: string;
  /** Additional CSS classes */
  className?: string;
}

export function InlineError({ message, id, className }: InlineErrorProps) {
  return (
    <p
      id={id}
      className={cn(
        "text-sm text-red-600 dark:text-red-400 flex items-center gap-1 mt-1",
        className
      )}
      role="alert"
    >
      <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
      {message}
    </p>
  );
}

/**
 * Empty state component for when no data is available
 */
export interface EmptyStateProps {
  /** Icon to display */
  icon?: React.ReactNode;
  /** Title */
  title: string;
  /** Description */
  description?: string;
  /** Action button */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Additional CSS classes */
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center",
        className
      )}
    >
      {icon && (
        <div className="mb-4 text-slate-400 dark:text-slate-500" aria-hidden="true">
          {icon}
        </div>
      )}

      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
        {title}
      </h3>

      {description && (
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-sm">
          {description}
        </p>
      )}

      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

/**
 * Data unavailable component for missing report sections
 */
export interface DataUnavailableProps {
  /** What data is unavailable */
  dataType?: string;
  /** Title (alias for dataType) */
  title?: string;
  /** Reason why data is unavailable */
  reason?: string;
  /** Description (alias for reason) */
  description?: string;
  /** List of specific missing fields */
  missingFields?: string[];
  /** Whether data can be fetched */
  canFetch?: boolean;
  /** Action to fetch data */
  onFetch?: () => void;
  /** Action label text */
  actionLabel?: string;
  /** Additional CSS classes */
  className?: string;
}

export function DataUnavailable({
  dataType,
  title,
  reason,
  description,
  missingFields,
  canFetch = false,
  onFetch,
  actionLabel,
  className,
}: DataUnavailableProps) {
  // Support both prop names
  const displayTitle = title || dataType || "Data";
  const displayReason = description || reason;

  return (
    <div
      className={cn(
        "flex items-center justify-between p-4 rounded-lg",
        "bg-slate-50 dark:bg-slate-800/50",
        "border border-dashed border-slate-300 dark:border-slate-600",
        className
      )}
      role="status"
    >
      <div className="flex items-center gap-3">
        <AlertCircle className="h-5 w-5 text-slate-400 flex-shrink-0" aria-hidden="true" />
        <div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {displayTitle} unavailable
          </p>
          {displayReason && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {displayReason}
            </p>
          )}
          {missingFields && missingFields.length > 0 && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Missing: {missingFields.join(", ")}
            </p>
          )}
        </div>
      </div>

      {canFetch && onFetch && (
        <button
          type="button"
          onClick={onFetch}
          className="text-sm font-medium text-primary hover:text-primary/80 focus:outline-none focus:underline"
        >
          {actionLabel || "Fetch Now"}
        </button>
      )}
    </div>
  );
}

/**
 * Error boundary fallback component
 */
export interface ErrorBoundaryFallbackProps {
  /** The error that was caught */
  error: Error;
  /** Reset function to retry rendering */
  resetErrorBoundary?: () => void;
}

export function ErrorBoundaryFallback({
  error,
  resetErrorBoundary,
}: ErrorBoundaryFallbackProps) {
  return (
    <div className="min-h-[200px] flex items-center justify-center p-8">
      <ErrorState
        title="Something went wrong"
        message="An unexpected error occurred while rendering this section."
        severity="error"
        details={error.message}
        onRetry={resetErrorBoundary}
        retryText="Try Again"
      />
    </div>
  );
}

/**
 * Partial data warning component
 */
export interface PartialDataWarningProps {
  /** Fields that have data */
  availableFields?: string[];
  /** Fields that are missing */
  missingFields: string[];
  /** Impact description */
  impact?: string;
  /** Additional CSS classes */
  className?: string;
}

export function PartialDataWarning({
  availableFields = [],
  missingFields,
  impact,
  className,
}: PartialDataWarningProps) {
  if (missingFields.length === 0) return null;

  const totalFields = availableFields.length + missingFields.length;
  const completeness = totalFields > 0
    ? Math.round((availableFields.length / totalFields) * 100)
    : 0;

  return (
    <div
      className={cn(
        "rounded-lg border border-yellow-200 dark:border-yellow-800",
        "bg-yellow-50 dark:bg-yellow-900/20 p-3",
        className
      )}
      role="status"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle
          className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0"
          aria-hidden="true"
        />
        <div className="text-sm">
          <p className="font-medium text-yellow-800 dark:text-yellow-200">
            {availableFields.length > 0
              ? `Partial data available (${completeness}% complete)`
              : "Some data is missing"}
          </p>
          <p className="text-yellow-700 dark:text-yellow-300 mt-1">
            Missing: {missingFields.join(", ")}
          </p>
          {impact && (
            <p className="text-yellow-600 dark:text-yellow-400 mt-1 text-xs">
              Impact: {impact}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default ErrorState;

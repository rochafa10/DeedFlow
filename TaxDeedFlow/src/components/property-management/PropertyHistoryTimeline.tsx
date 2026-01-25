"use client";

/**
 * PropertyHistoryTimeline Component
 *
 * Displays a vertical timeline of property activity log entries.
 * Shows actions, details, timestamps, and users in a chronological format.
 *
 * Features:
 * - Vertical timeline with connecting line
 * - Timeline dots on left side
 * - Sorted by timestamp (newest first)
 * - Optional relative time display
 * - Empty state for no history
 *
 * @component
 * @module components/property-management
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-24
 */

import { useMemo } from "react";
import { Clock, History, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  PropertyHistoryTimelineProps,
  ActivityLogEntry,
} from "@/types/property-management";

// ============================================
// Helper Functions
// ============================================

/**
 * Format timestamp to relative time string.
 * @param timestamp - ISO 8601 timestamp string
 * @returns Human-readable relative time
 */
function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Just now";
  if (diffMins === 1) return "1 minute ago";
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours === 1) return "1 hour ago";
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 7) return `${diffDays} days ago`;

  // For older dates, show the actual date
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  }).format(date);
}

/**
 * Format timestamp to absolute date and time string.
 * @param timestamp - ISO 8601 timestamp string
 * @returns Formatted date and time string
 */
function formatAbsoluteTime(timestamp: string): string {
  const date = new Date(timestamp);
  const dateStr = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${dateStr} at ${timeStr}`;
}

// ============================================
// Sub-Components
// ============================================

/**
 * Single timeline entry component.
 */
interface TimelineEntryProps {
  entry: ActivityLogEntry;
  showRelativeTime: boolean;
  isLast: boolean;
}

function TimelineEntry({
  entry,
  showRelativeTime,
  isLast,
}: TimelineEntryProps) {
  const timeDisplay = showRelativeTime
    ? formatRelativeTime(entry.timestamp)
    : formatAbsoluteTime(entry.timestamp);

  return (
    <div className="relative pl-10">
      {/* Timeline dot */}
      <div className="absolute left-2.5 w-3 h-3 bg-primary rounded-full border-2 border-white shadow-sm" />

      {/* Entry card */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Action title */}
            <div className="font-medium text-slate-900">{entry.action}</div>

            {/* Details */}
            {entry.details && (
              <p className="text-sm text-slate-600 mt-1 break-words">
                {entry.details}
              </p>
            )}
          </div>
        </div>

        {/* Metadata footer */}
        <div className="flex items-center flex-wrap gap-4 mt-3 text-xs text-slate-500">
          {/* Timestamp */}
          <span
            className="flex items-center gap-1"
            title={formatAbsoluteTime(entry.timestamp)}
          >
            <Clock className="h-3 w-3 flex-shrink-0" />
            <span>{timeDisplay}</span>
          </span>

          {/* User */}
          {entry.user && (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3 flex-shrink-0" />
              <span className="truncate max-w-[150px]">{entry.user}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Empty state component when no history exists.
 */
function EmptyState() {
  return (
    <div className="text-center py-12 text-slate-500">
      <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
      <p className="font-medium">No activity history available yet.</p>
      <p className="text-sm mt-2">Pipeline activity will be tracked here.</p>
    </div>
  );
}

// ============================================
// Main Component
// ============================================

/**
 * PropertyHistoryTimeline displays a vertical timeline of property activities.
 *
 * @example
 * ```tsx
 * <PropertyHistoryTimeline
 *   propertyId="123"
 *   initialEntries={activityLog}
 *   showRelativeTime={true}
 *   maxEntries={50}
 * />
 * ```
 */
export function PropertyHistoryTimeline({
  propertyId,
  initialEntries = [],
  maxEntries,
  showRelativeTime = true,
  className,
}: PropertyHistoryTimelineProps) {
  // Sort entries by timestamp (newest first) and apply limit
  const sortedEntries = useMemo(() => {
    const sorted = [...initialEntries].sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    if (maxEntries && maxEntries > 0) {
      return sorted.slice(0, maxEntries);
    }

    return sorted;
  }, [initialEntries, maxEntries]);

  // Handle empty state
  if (sortedEntries.length === 0) {
    return (
      <div className={cn("", className)}>
        <EmptyState />
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <h3 className="text-lg font-semibold text-slate-900">
        Activity Log
        <span className="ml-2 text-sm font-normal text-slate-500">
          ({sortedEntries.length}{" "}
          {sortedEntries.length === 1 ? "activity" : "activities"})
        </span>
      </h3>

      {/* Timeline container */}
      <div className="relative">
        {/* Vertical timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />

        {/* Activity entries */}
        <div className="space-y-4">
          {sortedEntries.map((entry, index) => (
            <TimelineEntry
              key={entry.id}
              entry={entry}
              showRelativeTime={showRelativeTime}
              isLast={index === sortedEntries.length - 1}
            />
          ))}
        </div>
      </div>

      {/* Truncation notice */}
      {maxEntries &&
        initialEntries.length > maxEntries && (
          <p className="text-xs text-slate-400 text-center pt-2">
            Showing {maxEntries} of {initialEntries.length} activities
          </p>
        )}
    </div>
  );
}

// Default export for convenience
export default PropertyHistoryTimeline;

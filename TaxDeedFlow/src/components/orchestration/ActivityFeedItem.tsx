"use client";

/**
 * Activity Feed Item Component
 *
 * Displays individual agent activity feed entries showing agent name,
 * action, timestamp, status badge, and county/property information.
 *
 * @component
 * @author Claude Code Agent
 * @date 2026-01-24
 */

import { Badge } from "@/components/ui/badge";
import {
  Bot,
  FileText,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  PauseCircle,
  AlertCircle,
  Cpu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActivityFeedItem as ActivityFeedItemType } from "@/hooks/useActivityFeed";

// ============================================
// Type Definitions
// ============================================

interface ActivityFeedItemProps {
  /** Activity feed item data */
  item: ActivityFeedItemType;
  /** Optional additional class names */
  className?: string;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Format timestamp to relative time
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
 * Get icon for activity type
 */
function getActivityIcon(item: ActivityFeedItemType) {
  if (item.type === "session") {
    return Cpu;
  }

  // For assignments, use icons based on task type
  switch (item.taskType) {
    case "regrid_scraping":
      return MapPin;
    case "visual_validation":
    case "property_condition":
      return FileText;
    case "pdf_parsing":
    case "county_research":
      return FileText;
    default:
      return Bot;
  }
}

/**
 * Get badge variant for status
 */
function getStatusBadgeVariant(
  status: ActivityFeedItemType["status"]
): "success" | "warning" | "destructive" | "info" | "secondary" {
  switch (status) {
    case "completed":
      return "success";
    case "active":
      return "info";
    case "failed":
      return "destructive";
    case "paused":
      return "warning";
    case "pending":
    default:
      return "secondary";
  }
}

/**
 * Get status icon
 */
function getStatusIcon(status: ActivityFeedItemType["status"]) {
  switch (status) {
    case "completed":
      return CheckCircle2;
    case "active":
      return Loader2;
    case "failed":
      return XCircle;
    case "paused":
      return PauseCircle;
    case "pending":
    default:
      return AlertCircle;
  }
}

/**
 * Format status label
 */
function formatStatusLabel(status: ActivityFeedItemType["status"]): string {
  switch (status) {
    case "active":
      return "In Progress";
    case "completed":
      return "Completed";
    case "failed":
      return "Failed";
    case "paused":
      return "Paused";
    case "pending":
      return "Pending";
    default:
      return status;
  }
}

// ============================================
// Main Component
// ============================================

/**
 * Activity Feed Item Component
 *
 * Displays a single activity feed entry with icon, status, timestamp,
 * and details about the agent activity.
 */
export function ActivityFeedItem({ item, className }: ActivityFeedItemProps) {
  const Icon = getActivityIcon(item);
  const StatusIcon = getStatusIcon(item.status);
  const badgeVariant = getStatusBadgeVariant(item.status);
  const isActive = item.status === "active";

  return (
    <div
      className={cn(
        "flex gap-3 p-3 rounded-lg border",
        "bg-white dark:bg-slate-950",
        "hover:bg-slate-50 dark:hover:bg-slate-900/50",
        "transition-colors",
        className
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center",
          item.type === "session"
            ? "bg-purple-100 dark:bg-purple-900/30"
            : "bg-blue-100 dark:bg-blue-900/30"
        )}
      >
        <Icon
          className={cn(
            "h-5 w-5",
            item.type === "session"
              ? "text-purple-600 dark:text-purple-400"
              : "text-blue-600 dark:text-blue-400"
          )}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header: Agent name and timestamp */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex-1 min-w-0">
            {item.agentName && (
              <div className="font-medium text-sm text-slate-900 dark:text-slate-100">
                {item.agentName}
              </div>
            )}
            <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {item.action}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge variant={badgeVariant} className="text-xs">
              <StatusIcon
                className={cn(
                  "h-3 w-3 mr-1",
                  isActive && "animate-spin"
                )}
              />
              {formatStatusLabel(item.status)}
            </Badge>
          </div>
        </div>

        {/* Details */}
        <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">
          {item.details}
        </div>

        {/* Footer: County and timestamp */}
        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-500">
          {item.county && item.state && (
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span>
                {item.county}, {item.state}
              </span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{formatRelativeTime(item.timestamp)}</span>
          </div>
          {item.priority !== undefined && (
            <div className="flex items-center gap-1">
              <span className="font-medium">P{item.priority}</span>
            </div>
          )}
        </div>

        {/* Progress bar for active tasks */}
        {isActive && item.progress !== undefined && item.progress > 0 && (
          <div className="mt-2">
            <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5">
              <div
                className="bg-blue-600 dark:bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${item.progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

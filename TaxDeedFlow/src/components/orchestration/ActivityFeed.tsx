"use client";

/**
 * Activity Feed Component
 *
 * Displays a real-time feed of orchestration sessions and agent assignments.
 * Shows chronological activity with loading and empty states.
 *
 * @component
 * @author Claude Code Agent
 * @date 2026-01-24
 */

import { useState, useEffect, useCallback } from "react";
import { useActivityFeed } from "@/hooks/useActivityFeed";
import { ActivityFeedItem } from "@/components/orchestration/ActivityFeedItem";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Activity, RefreshCw, AlertCircle, Loader2, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================
// Type Definitions
// ============================================

interface ActivityFeedProps {
  /** Optional additional class names */
  className?: string;
  /** Maximum number of items to display */
  maxItems?: number;
}

// ============================================
// Main Component
// ============================================

/**
 * Activity Feed Component
 *
 * Displays a chronological feed of agent activities including orchestration
 * sessions and individual agent assignments. Supports real-time updates via
 * Supabase subscriptions.
 */
export function ActivityFeed({ className, maxItems }: ActivityFeedProps) {
  const { activities, isLoading, error, refetch, filters, setFilters } = useActivityFeed();

  // Local state for search input with debouncing
  const [searchInputValue, setSearchInputValue] = useState(filters.searchQuery);

  // Debounced search: update filter after 300ms of no typing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setFilters({
        ...filters,
        searchQuery: searchInputValue,
      });
    }, 300);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInputValue]);

  // Sync local input value with filter state (for external filter changes)
  useEffect(() => {
    if (filters.searchQuery !== searchInputValue) {
      setSearchInputValue(filters.searchQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.searchQuery]);

  // Clear search input
  const clearSearch = useCallback(() => {
    setSearchInputValue("");
  }, []);

  // Limit displayed items if maxItems is specified
  const displayedActivities = maxItems
    ? activities.slice(0, maxItems)
    : activities;

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            <CardTitle>Agent Activity Feed</CardTitle>
          </div>
          <button
            onClick={refetch}
            disabled={isLoading}
            className={cn(
              "p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800",
              "transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            )}
            aria-label="Refresh activity feed"
          >
            <RefreshCw
              className={cn(
                "h-4 w-4 text-slate-600 dark:text-slate-400",
                isLoading && "animate-spin"
              )}
            />
          </button>
        </div>
        <CardDescription>
          Real-time updates from orchestration sessions and agent assignments
        </CardDescription>

        {/* Search Input */}
        <div className="mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search by agent, county, or activity..."
              value={searchInputValue}
              onChange={(e) => setSearchInputValue(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchInputValue && (
              <button
                onClick={clearSearch}
                className={cn(
                  "absolute right-3 top-1/2 -translate-y-1/2",
                  "p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800",
                  "transition-colors"
                )}
                aria-label="Clear search"
              >
                <X className="h-3 w-3 text-slate-500" />
              </button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Loading State */}
        {isLoading && activities.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin mb-3" />
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Loading activity feed...
            </p>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 mb-3">
              <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">
              Failed to load activity feed
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
              {error.message}
            </p>
            <button
              onClick={refetch}
              className="px-4 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && activities.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 mb-3">
              <Activity className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">
              No activity yet
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Agent activities will appear here when orchestration sessions start
            </p>
          </div>
        )}

        {/* Activity List */}
        {!isLoading && !error && displayedActivities.length > 0 && (
          <div className="space-y-2">
            {displayedActivities.map((activity) => (
              <ActivityFeedItem key={activity.id} item={activity} />
            ))}

            {/* Show indicator if there are more items */}
            {maxItems && activities.length > maxItems && (
              <div className="pt-2 text-center">
                <p className="text-xs text-slate-500 dark:text-slate-500">
                  Showing {maxItems} of {activities.length} activities
                </p>
              </div>
            )}
          </div>
        )}

        {/* Loading indicator for refresh */}
        {isLoading && activities.length > 0 && (
          <div className="mt-4 flex items-center justify-center">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-500">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Refreshing...</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

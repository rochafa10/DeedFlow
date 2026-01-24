"use client";

/**
 * Activity Feed Filters Component
 *
 * Provides filter controls for the activity feed including agent type,
 * county, and status filters. Designed to work with the useActivityFeed hook.
 *
 * @component
 * @author Claude Code Agent
 * @date 2026-01-24
 */

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ============================================
// Type Definitions
// ============================================

export interface ActivityFeedFiltersState {
  agentType: string;
  county: string;
  status: string;
  searchQuery: string;
}

interface ActivityFeedFiltersProps {
  /** Filter state */
  filters: ActivityFeedFiltersState;
  /** Callback when filters change */
  onFiltersChange: (filters: ActivityFeedFiltersState) => void;
  /** Optional list of counties to filter by */
  counties?: Array<{ id: string; name: string; state: string }>;
  /** Optional additional class names */
  className?: string;
}

// ============================================
// Constants
// ============================================

/** Available agent types for filtering */
const AGENT_TYPES = [
  { value: "all", label: "All Agents" },
  { value: "REGRID_SCRAPER", label: "Regrid Scraper" },
  { value: "VISUAL_VALIDATOR", label: "Visual Validator" },
  { value: "PDF_PARSER", label: "PDF Parser" },
  { value: "RESEARCH_AGENT", label: "Research Agent" },
  { value: "TITLE_RESEARCHER", label: "Title Researcher" },
  { value: "PROPERTY_CONDITION", label: "Property Condition" },
  { value: "ENVIRONMENTAL_RESEARCHER", label: "Environmental Researcher" },
  { value: "BID_STRATEGY", label: "Bid Strategy" },
  { value: "AUCTION_MONITOR", label: "Auction Monitor" },
];

/** Available status filters */
const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
  { value: "pending", label: "Pending" },
  { value: "paused", label: "Paused" },
];

// ============================================
// Main Component
// ============================================

/**
 * Activity Feed Filters Component
 *
 * Provides filtering controls for the activity feed with agent type,
 * county, status, and text search filters.
 */
export function ActivityFeedFilters({
  filters,
  onFiltersChange,
  counties = [],
  className,
}: ActivityFeedFiltersProps) {
  // Check if any filters are active (not default)
  const hasActiveFilters =
    filters.agentType !== "all" ||
    filters.county !== "all" ||
    filters.status !== "all" ||
    filters.searchQuery !== "";

  // Handle filter updates
  const updateFilter = (key: keyof ActivityFeedFiltersState, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  // Clear all filters
  const clearFilters = () => {
    onFiltersChange({
      agentType: "all",
      county: "all",
      status: "all",
      searchQuery: "",
    });
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with clear button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">
            Filters
          </h3>
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-8 text-xs"
          >
            <X className="h-3 w-3 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      {/* Search input */}
      <div className="space-y-2">
        <Label htmlFor="search" className="text-xs text-slate-600 dark:text-slate-400">
          Search
        </Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            id="search"
            type="text"
            placeholder="Search by agent, county, or details..."
            value={filters.searchQuery}
            onChange={(e) => updateFilter("searchQuery", e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Filter dropdowns */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Agent Type Filter */}
        <div className="space-y-2">
          <Label htmlFor="agent-type" className="text-xs text-slate-600 dark:text-slate-400">
            Agent Type
          </Label>
          <Select
            value={filters.agentType}
            onValueChange={(value) => updateFilter("agentType", value)}
          >
            <SelectTrigger id="agent-type" className="w-full">
              <SelectValue placeholder="Select agent type" />
            </SelectTrigger>
            <SelectContent>
              {AGENT_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* County Filter */}
        <div className="space-y-2">
          <Label htmlFor="county" className="text-xs text-slate-600 dark:text-slate-400">
            County
          </Label>
          <Select
            value={filters.county}
            onValueChange={(value) => updateFilter("county", value)}
          >
            <SelectTrigger id="county" className="w-full">
              <SelectValue placeholder="Select county" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Counties</SelectItem>
              {counties.length > 0 ? (
                counties.map((county) => (
                  <SelectItem key={county.id} value={county.id}>
                    {county.name}, {county.state}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no-counties" disabled>
                  No counties available
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Status Filter */}
        <div className="space-y-2">
          <Label htmlFor="status" className="text-xs text-slate-600 dark:text-slate-400">
            Status
          </Label>
          <Select
            value={filters.status}
            onValueChange={(value) => updateFilter("status", value)}
          >
            <SelectTrigger id="status" className="w-full">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

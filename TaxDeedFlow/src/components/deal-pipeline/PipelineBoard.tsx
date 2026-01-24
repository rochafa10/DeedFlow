"use client";

/**
 * Pipeline Board Component
 *
 * Main Kanban-style board container displaying deal pipeline stages with
 * drag-and-drop support. Shows all stages horizontally with deal counts
 * and metrics. Provides filtering and search capabilities.
 *
 * @component
 * @author Claude Code Agent
 * @date 2026-01-23
 */

import { useState, useMemo } from "react";
import { PipelineStageColumn } from "./PipelineStageColumn";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Filter,
  Search,
  Plus,
  TrendingUp,
  DollarSign,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  PipelineStageWithMetrics,
  DealWithMetrics,
  DealFilters,
  DealPriority,
  DealStatus,
} from "@/types/deal-pipeline";

// ============================================
// Type Definitions
// ============================================

interface PipelineBoardProps {
  /** Pipeline stages with metrics */
  stages: PipelineStageWithMetrics[];
  /** All deals across stages */
  deals: DealWithMetrics[];
  /** Loading state */
  isLoading?: boolean;
  /** Error state */
  error?: Error | null;
  /** Callback when deal is moved between stages */
  onMoveDeal?: (dealId: string, toStageId: string) => void;
  /** Callback when deal is clicked */
  onDealClick?: (deal: DealWithMetrics) => void;
  /** Callback when create deal is requested */
  onCreateDeal?: (stageId: string) => void;
  /** Callback when create stage is requested */
  onCreateStage?: () => void;
  /** Optional additional class names */
  className?: string;
}

// ============================================
// Main Component
// ============================================

export function PipelineBoard({
  stages,
  deals,
  isLoading = false,
  error = null,
  onMoveDeal,
  onDealClick,
  onCreateDeal,
  onCreateStage,
  className,
}: PipelineBoardProps) {
  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<DealPriority | "all">("all");
  const [statusFilter, setStatusFilter] = useState<DealStatus | "all">("all");
  const [showFilters, setShowFilters] = useState(false);

  // Filter deals based on search and filters
  const filteredDeals = useMemo(() => {
    let filtered = [...deals];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (deal) =>
          deal.title.toLowerCase().includes(query) ||
          deal.description?.toLowerCase().includes(query) ||
          deal.tags?.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Priority filter
    if (priorityFilter !== "all") {
      filtered = filtered.filter((deal) => deal.priority === priorityFilter);
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((deal) => deal.status === statusFilter);
    }

    return filtered;
  }, [deals, searchQuery, priorityFilter, statusFilter]);

  // Group deals by stage
  const dealsByStage = useMemo(() => {
    const grouped: Record<string, DealWithMetrics[]> = {};
    stages.forEach((stage) => {
      grouped[stage.id] = [];
    });
    filteredDeals.forEach((deal) => {
      if (grouped[deal.current_stage_id]) {
        grouped[deal.current_stage_id].push(deal);
      }
    });
    return grouped;
  }, [stages, filteredDeals]);

  // Calculate totals
  const totalDeals = deals.length;
  const totalValue = deals.reduce((sum, deal) => sum + (deal.estimated_value || 0), 0);
  const totalProfit = deals.reduce((sum, deal) => sum + (deal.estimated_profit || 0), 0);
  const overdueCount = deals.filter((deal) => deal.is_overdue).length;

  // Sort stages by sort_order
  const sortedStages = useMemo(() => {
    return [...stages].sort((a, b) => a.sort_order - b.sort_order);
  }, [stages]);

  // Error state
  if (error) {
    return (
      <div className={cn("flex items-center justify-center p-8", className)}>
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Failed to Load Pipeline</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {error.message || "An error occurred while loading the pipeline"}
          </p>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        {/* Header skeleton */}
        <div className="flex items-center justify-between gap-4">
          <div className="h-10 w-64 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          <div className="flex gap-2">
            <div className="h-10 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
            <div className="h-10 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          </div>
        </div>
        {/* Board skeleton */}
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex-shrink-0 w-80 space-y-3"
            >
              <div className="h-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
              <div className="h-40 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
              <div className="h-40 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with stats and actions */}
      <div className="space-y-4">
        {/* Top row: Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
              <TrendingUp className="h-4 w-4" />
              Total Deals
            </div>
            <div className="text-2xl font-bold">{totalDeals}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
              <DollarSign className="h-4 w-4" />
              Total Value
            </div>
            <div className="text-2xl font-bold">
              ${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
              <TrendingUp className="h-4 w-4" />
              Est. Profit
            </div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              ${totalProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
              <AlertCircle className="h-4 w-4" />
              Overdue
            </div>
            <div className={cn(
              "text-2xl font-bold",
              overdueCount > 0 ? "text-red-600 dark:text-red-400" : "text-slate-900 dark:text-slate-100"
            )}>
              {overdueCount}
            </div>
          </div>
        </div>

        {/* Second row: Search and filters */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search deals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filter toggle */}
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(showFilters && "bg-slate-100 dark:bg-slate-700")}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>

          {/* Create stage button */}
          {onCreateStage && (
            <Button onClick={onCreateStage}>
              <Plus className="h-4 w-4 mr-2" />
              New Stage
            </Button>
          )}
        </div>

        {/* Filter options */}
        {showFilters && (
          <div className="flex gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
            {/* Priority filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Priority</label>
              <div className="flex gap-2">
                {(["all", "urgent", "high", "medium", "low"] as const).map((priority) => (
                  <Badge
                    key={priority}
                    variant={priorityFilter === priority ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setPriorityFilter(priority)}
                  >
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Status filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <div className="flex gap-2">
                {(["all", "active", "won", "lost", "abandoned"] as const).map((status) => (
                  <Badge
                    key={status}
                    variant={statusFilter === status ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setStatusFilter(status)}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Pipeline board - horizontal scroll */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {sortedStages.map((stage) => (
            <PipelineStageColumn
              key={stage.id}
              stage={stage}
              deals={dealsByStage[stage.id] || []}
              onMoveDeal={onMoveDeal}
              onDealClick={onDealClick}
              onCreateDeal={onCreateDeal}
            />
          ))}

          {/* Empty state when no stages */}
          {sortedStages.length === 0 && (
            <div className="flex items-center justify-center w-full min-h-[400px] border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg">
              <div className="text-center p-8">
                <TrendingUp className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Pipeline Stages</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                  Create your first pipeline stage to start tracking deals
                </p>
                {onCreateStage && (
                  <Button onClick={onCreateStage}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Stage
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PipelineBoard;

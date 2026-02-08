"use client";

/**
 * Pipeline Board Component
 *
 * Clean, focused Kanban-style board container displaying deal pipeline stages
 * with drag-and-drop support. Renders stages horizontally with scroll shadow
 * indicators. Filtering and stats are handled at the page level.
 *
 * @component
 * @author Claude Code Agent
 * @date 2026-01-23
 */

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { PipelineStageColumn } from "./PipelineStageColumn";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, AlertCircle, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type {
  PipelineStageWithMetrics,
  DealWithMetrics,
} from "@/types/deal-pipeline";

// ============================================
// Type Definitions
// ============================================

interface PipelineBoardProps {
  /** Pipeline stages with metrics */
  stages: PipelineStageWithMetrics[];
  /** All deals across stages (pre-filtered by parent) */
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
  // Scroll shadow state
  const [showLeftShadow, setShowLeftShadow] = useState(false);
  const [showRightShadow, setShowRightShadow] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Pending move confirmation state (for terminal stages)
  const [pendingMove, setPendingMove] = useState<{
    dealId: string;
    dealTitle: string;
    toStageId: string;
    toStageName: string;
  } | null>(null);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setShowLeftShadow(el.scrollLeft > 0);
    setShowRightShadow(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  // Attach ResizeObserver (stable, does not depend on stages)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => handleScroll());
    observer.observe(el);
    return () => observer.disconnect();
  }, [handleScroll]);

  // Recalculate shadows when stages change
  useEffect(() => {
    handleScroll();
  }, [stages, handleScroll]);

  // Group deals by stage
  const dealsByStage = useMemo(() => {
    const grouped: Record<string, DealWithMetrics[]> = {};
    stages.forEach((stage) => {
      grouped[stage.id] = [];
    });
    deals.forEach((deal) => {
      if (grouped[deal.current_stage_id]) {
        grouped[deal.current_stage_id].push(deal);
      }
    });
    return grouped;
  }, [stages, deals]);

  // Sort stages by sort_order
  const sortedStages = useMemo(() => {
    return [...stages].sort((a, b) => {
      if (a.sort_order === b.sort_order) {
        return a.name.localeCompare(b.name);
      }
      return a.sort_order - b.sort_order;
    });
  }, [stages]);

  // Move handler that intercepts drops to the last (terminal) stage
  const handleMoveDeal = useCallback(
    (dealId: string, toStageId: string) => {
      const lastStage = sortedStages[sortedStages.length - 1];
      if (lastStage && toStageId === lastStage.id) {
        // Find the deal title for the confirmation dialog
        const deal = deals.find((d) => d.id === dealId);
        const dealTitle = deal?.title || "this deal";
        setPendingMove({
          dealId,
          dealTitle,
          toStageId,
          toStageName: lastStage.name,
        });
      } else {
        // Non-terminal stage: move immediately
        onMoveDeal?.(dealId, toStageId);
        toast.success("Deal moved successfully");
      }
    },
    [sortedStages, deals, onMoveDeal]
  );

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

  // Loading state with 5 column skeleton
  if (isLoading) {
    return (
      <div className={cn("flex gap-4 overflow-hidden pb-4", className)}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex-shrink-0 w-80 rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-900/50"
          >
            {/* Header skeleton */}
            <div className="bg-white dark:bg-slate-800 rounded-t-xl p-4 border-b border-slate-200/60 dark:border-slate-700/60 space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-2.5 w-2.5 rounded-full" />
                <Skeleton className="h-4 w-24" />
                <div className="flex-1" />
                <Skeleton className="h-5 w-8 rounded-full" />
              </div>
              <Skeleton className="h-3 w-20" />
            </div>
            {/* Card skeletons */}
            <div className="p-2 space-y-2">
              {[1, 2, 3].map((j) => (
                <div
                  key={j}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 space-y-2"
                >
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Empty state when no stages exist
  if (sortedStages.length === 0) {
    return (
      <div className={cn("flex items-center justify-center w-full min-h-[400px] border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl", className)}>
        <div className="text-center p-8">
          <Package className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Pipeline Stages</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 max-w-sm">
            Create your first pipeline stage to start organizing and tracking your deals through each step of the process.
          </p>
          {onCreateStage && (
            <Button onClick={onCreateStage}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Stage
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={cn("relative", className)}>
        {/* Left scroll shadow */}
        <div
          className={cn(
            "absolute left-0 top-0 bottom-0 w-8 z-10 pointer-events-none transition-opacity duration-200",
            "bg-gradient-to-r from-white dark:from-slate-950 to-transparent",
            showLeftShadow ? "opacity-100" : "opacity-0"
          )}
        />

        {/* Right scroll shadow */}
        <div
          className={cn(
            "absolute right-0 top-0 bottom-0 w-8 z-10 pointer-events-none transition-opacity duration-200",
            "bg-gradient-to-l from-white dark:from-slate-950 to-transparent",
            showRightShadow ? "opacity-100" : "opacity-0"
          )}
        />

        {/* Scrollable board container */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="overflow-x-auto pb-4"
        >
          <div className="flex gap-4 min-w-max">
            {/* Stage columns */}
            {sortedStages.map((stage) => (
              <PipelineStageColumn
                key={stage.id}
                stage={stage}
                deals={dealsByStage[stage.id] || []}
                onMoveDeal={onMoveDeal ? handleMoveDeal : undefined}
                onDealClick={onDealClick}
                onCreateDeal={onCreateDeal}
              />
            ))}

            {/* Add Stage placeholder */}
            {onCreateStage && (
              <button
                onClick={onCreateStage}
                className={cn(
                  "flex-shrink-0 w-80 min-h-[400px] flex flex-col items-center justify-center",
                  "rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700",
                  "text-slate-400 dark:text-slate-500",
                  "hover:border-slate-300 dark:hover:border-slate-600",
                  "hover:text-slate-500 dark:hover:text-slate-400",
                  "hover:bg-slate-50/50 dark:hover:bg-slate-800/30",
                  "transition-colors cursor-pointer"
                )}
              >
                <Plus className="h-8 w-8 mb-2" />
                <span className="text-sm font-medium">Add Stage</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Move confirmation dialog for terminal stages */}
      <AlertDialog open={!!pendingMove} onOpenChange={(open) => !open && setPendingMove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move deal to {pendingMove?.toStageName}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move &quot;{pendingMove?.dealTitle}&quot; to the {pendingMove?.toStageName} stage. This action represents a terminal pipeline state.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (pendingMove) {
                onMoveDeal?.(pendingMove.dealId, pendingMove.toStageId);
                toast.success("Deal moved successfully");
                setPendingMove(null);
              }
            }}>
              Confirm Move
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default PipelineBoard;

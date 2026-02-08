"use client";

/**
 * Pipeline Stage Column Component
 *
 * Displays a single pipeline stage column in the Kanban board with deal cards.
 * Features a refined header with colored dot, deal count badge, and total value.
 * Supports drag-and-drop for moving deals between stages.
 *
 * @component
 * @author Claude Code Agent
 * @date 2026-01-23
 */

import { useState } from "react";
import { PropertyCard } from "./PropertyCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  PipelineStageWithMetrics,
  DealWithMetrics,
} from "@/types/deal-pipeline";

// ============================================
// Type Definitions
// ============================================

interface PipelineStageColumnProps {
  /** Pipeline stage with metrics */
  stage: PipelineStageWithMetrics;
  /** Deals in this stage */
  deals: DealWithMetrics[];
  /** Callback when deal is moved to this stage */
  onMoveDeal?: (dealId: string, toStageId: string) => void;
  /** Callback when deal is clicked */
  onDealClick?: (deal: DealWithMetrics) => void;
  /** Callback when create deal is requested for this stage */
  onCreateDeal?: (stageId: string) => void;
  /** Optional additional class names */
  className?: string;
}

// ============================================
// Main Component
// ============================================

export function PipelineStageColumn({
  stage,
  deals,
  onMoveDeal,
  onDealClick,
  onCreateDeal,
  className,
}: PipelineStageColumnProps) {
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Calculate total value for this stage
  const totalValue = deals.reduce((sum, deal) => sum + (deal.estimated_value || 0), 0);

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);

    try {
      const dealId = e.dataTransfer.getData("dealId");
      if (dealId && onMoveDeal) {
        onMoveDeal(dealId, stage.id);
      }
    } catch (error) {
      console.error("Error handling drop:", error);
    }
  };

  return (
    <div
      className={cn(
        "flex-shrink-0 w-80 flex flex-col rounded-xl",
        "bg-slate-50/80 dark:bg-slate-900/50",
        "border border-slate-200/60 dark:border-slate-700/60",
        isDraggingOver && "bg-blue-50/50 dark:bg-blue-900/10",
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Stage header */}
      <div className="bg-white dark:bg-slate-800 rounded-t-xl p-4 border-b border-slate-200/60 dark:border-slate-700/60">
        {/* Top row: dot + name + count badge */}
        <div className="flex items-center gap-2">
          {/* Color dot */}
          <div
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: stage.color || "#94a3b8" }}
          />
          <h3 className="font-semibold text-sm truncate">{stage.name}</h3>
          <div className="flex-1" />
          <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5 min-w-[1.5rem] justify-center">
            {deals.length}
          </Badge>
        </div>

        {/* Description */}
        {stage.description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 truncate">
            {stage.description}
          </p>
        )}

        {/* Total value */}
        {totalValue > 0 && (
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            ${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} total
          </p>
        )}

        {/* Add deal button */}
        {onCreateDeal && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2.5 h-7 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            onClick={() => onCreateDeal(stage.id)}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Deal
          </Button>
        )}
      </div>

      {/* Deal cards container */}
      <div
        className={cn(
          "flex-1 p-2 space-y-2 min-h-[200px] transition-colors rounded-b-xl"
        )}
      >
        {deals.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <Inbox className="h-6 w-6 text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Drop deals here
            </p>
          </div>
        ) : (
          // Deal cards
          deals.map((deal) => (
            <PropertyCard
              key={deal.id}
              deal={deal}
              onClick={onDealClick}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default PipelineStageColumn;

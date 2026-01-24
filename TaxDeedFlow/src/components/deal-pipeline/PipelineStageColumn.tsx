"use client";

/**
 * Pipeline Stage Column Component
 *
 * Displays a single pipeline stage column in Kanban board with deal cards.
 * Shows stage name, deal count, total value, and add deal button.
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
import { Plus, DollarSign, TrendingUp, AlertTriangle } from "lucide-react";
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

  // Calculate totals for this stage
  const totalValue = deals.reduce((sum, deal) => sum + (deal.estimated_value || 0), 0);
  const totalProfit = deals.reduce((sum, deal) => sum + (deal.estimated_profit || 0), 0);
  const urgentCount = deals.filter((deal) => deal.priority === "urgent").length;
  const overdueCount = deals.filter((deal) => deal.is_overdue).length;

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
        "flex-shrink-0 w-80 flex flex-col",
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Stage header */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 mb-3">
        {/* Stage name and count */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {/* Color indicator */}
            {stage.color && (
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: stage.color }}
              />
            )}
            <h3 className="font-semibold text-lg">{stage.name}</h3>
          </div>
          <Badge variant="secondary">
            {deals.length}
          </Badge>
        </div>

        {/* Stage description */}
        {stage.description && (
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
            {stage.description}
          </p>
        )}

        {/* Metrics */}
        <div className="space-y-2 text-sm">
          {/* Total value */}
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <DollarSign className="h-3.5 w-3.5" />
              Value
            </span>
            <span className="font-medium">
              ${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>

          {/* Total profit */}
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" />
              Profit
            </span>
            <span className="font-medium text-green-600 dark:text-green-400">
              ${totalProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>

          {/* Urgent/overdue indicators */}
          {(urgentCount > 0 || overdueCount > 0) && (
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                Urgent
              </span>
              <span className="font-medium text-red-600 dark:text-red-400">
                {urgentCount + overdueCount}
              </span>
            </div>
          )}
        </div>

        {/* Add deal button */}
        {onCreateDeal && (
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-3"
            onClick={() => onCreateDeal(stage.id)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Deal
          </Button>
        )}
      </div>

      {/* Deal cards container */}
      <div
        className={cn(
          "flex-1 space-y-3 min-h-[200px] p-2 rounded-lg transition-colors",
          isDraggingOver && "bg-blue-50 dark:bg-blue-900/20 border-2 border-dashed border-blue-500"
        )}
      >
        {deals.length === 0 ? (
          // Empty state
          <div className="flex items-center justify-center h-full text-center p-4">
            <div>
              <div className="text-slate-400 dark:text-slate-500 mb-2">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No deals in this stage
              </p>
              {onCreateDeal && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => onCreateDeal(stage.id)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Deal
                </Button>
              )}
            </div>
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

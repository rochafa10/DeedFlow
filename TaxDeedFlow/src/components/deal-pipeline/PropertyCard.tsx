"use client";

/**
 * Property Card Component (Deal Card)
 *
 * Compact, information-dense deal card for the pipeline view.
 * Shows priority border, financials, date pills, tags, and assignee.
 * Supports drag-and-drop for moving between stages.
 *
 * @component
 * @author Claude Code Agent
 * @date 2026-02-07
 */

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  Calendar,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DealWithMetrics } from "@/types/deal-pipeline";

// ============================================
// Type Definitions
// ============================================

interface PropertyCardProps {
  /** Deal data with metrics */
  deal: DealWithMetrics;
  /** Callback when card is clicked */
  onClick?: (deal: DealWithMetrics) => void;
  /** Optional additional class names */
  className?: string;
}

// Priority left-border colors
const priorityBorderColors = {
  urgent: "border-l-red-500",
  high: "border-l-orange-500",
  medium: "border-l-blue-500",
  low: "border-l-slate-300",
};

// Priority badge colors
const priorityColors = {
  low: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
  medium: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  urgent: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

// ============================================
// Main Component
// ============================================

export function PropertyCard({
  deal,
  onClick,
  className,
}: PropertyCardProps) {
  const [isDragging, setIsDragging] = useState(false);

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("dealId", deal.id);
    e.dataTransfer.effectAllowed = "move";
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    const today = new Date();
    const daysUntil = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntil < 0) {
      return {
        text: `${Math.abs(daysUntil)}d overdue`,
        isOverdue: true,
        isUrgent: false,
      };
    } else if (daysUntil === 0) {
      return {
        text: "Today",
        isOverdue: false,
        isUrgent: true,
      };
    } else if (daysUntil === 1) {
      return {
        text: "Tomorrow",
        isOverdue: false,
        isUrgent: true,
      };
    } else if (daysUntil <= 7) {
      return {
        text: `${daysUntil}d`,
        isOverdue: false,
        isUrgent: true,
      };
    } else {
      return {
        text: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        isOverdue: false,
        isUrgent: false,
      };
    }
  };

  // Determine urgency color for a date pill
  const getUrgencyColor = (dateInfo: { isOverdue?: boolean; isUrgent?: boolean } | null) => {
    if (!dateInfo) return "text-slate-500 dark:text-slate-400";
    if (dateInfo.isOverdue) return "text-red-600 dark:text-red-400";
    if (dateInfo.isUrgent) return "text-orange-600 dark:text-orange-400";
    return "text-slate-500 dark:text-slate-400";
  };

  const auctionDate = formatDate(deal.auction_date);
  const registrationDate = formatDate(deal.registration_deadline);

  // Determine border color: overdue overrides priority
  const borderColor = deal.is_overdue
    ? "border-l-red-500"
    : priorityBorderColors[deal.priority] ?? "border-l-slate-300";

  return (
    <Card
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={() => onClick?.(deal)}
      className={cn(
        "cursor-move border-l-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200",
        borderColor,
        isDragging && "opacity-50",
        deal.is_overdue && "bg-red-50/50 dark:bg-red-950/20",
        className
      )}
    >
      <CardContent className="p-3">
        {/* Header: Title + Priority badge */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h4 className="font-semibold text-sm leading-tight flex-1 line-clamp-2">
            {deal.title}
          </h4>
          {deal.priority && (
            <Badge
              variant="secondary"
              className={cn(
                "text-[10px] px-1.5 py-0 h-5 shrink-0",
                priorityColors[deal.priority]
              )}
            >
              {deal.priority}
            </Badge>
          )}
        </div>

        {/* Financial row: target bid -> estimated value */}
        {(deal.target_bid_amount || deal.estimated_value) && (
          <div className="flex items-center gap-1.5 text-sm mb-2">
            {deal.target_bid_amount ? (
              <>
                <span className="text-slate-600 dark:text-slate-400">
                  ${deal.target_bid_amount.toLocaleString()}
                </span>
                {deal.estimated_value && (
                  <>
                    <ArrowRight className="h-3 w-3 text-slate-400" />
                    <span className="font-medium text-green-600 dark:text-green-400">
                      ${deal.estimated_value.toLocaleString()}
                    </span>
                  </>
                )}
              </>
            ) : deal.estimated_value ? (
              <span className="font-medium text-green-600 dark:text-green-400">
                ${deal.estimated_value.toLocaleString()}
              </span>
            ) : null}
          </div>
        )}

        {/* Date pills row */}
        {(auctionDate || registrationDate) && (
          <div className="flex items-center gap-3 text-xs mb-2">
            {auctionDate && (
              <span className={cn("flex items-center gap-1", getUrgencyColor(auctionDate))}>
                <Calendar className="h-3 w-3" />
                {auctionDate.text}
              </span>
            )}
            {registrationDate && (
              <span className={cn("flex items-center gap-1", getUrgencyColor(registrationDate))}>
                <Clock className="h-3 w-3" />
                Reg: {registrationDate.text}
              </span>
            )}
          </div>
        )}

        {/* Tags (max 2) */}
        {deal.tags && deal.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {deal.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded"
              >
                {tag}
              </span>
            ))}
            {deal.tags.length > 2 && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded">
                +{deal.tags.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Footer: User avatar + days in stage */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-700">
          {/* Assigned user initial circle */}
          {deal.assigned_to && deal.assigned_to.length > 0 ? (
            <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-[10px] font-medium text-blue-700 dark:text-blue-300">
              {deal.assigned_to.charAt(0).toUpperCase()}
            </div>
          ) : (
            <span className="text-slate-400 dark:text-slate-500">Unassigned</span>
          )}

          {/* Days in stage */}
          <span className="text-slate-400 dark:text-slate-500">
            {deal.days_in_stage}d in stage
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export default PropertyCard;

"use client";

/**
 * Property Card Component (Deal Card)
 *
 * Displays a single deal card within a pipeline stage. Shows deal title,
 * financial metrics, priority, status, assigned user, and important dates.
 * Supports drag-and-drop for moving between stages.
 *
 * @component
 * @author Claude Code Agent
 * @date 2026-01-23
 */

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  TrendingUp,
  Calendar,
  AlertTriangle,
  User,
  Tag,
  Home,
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

// Priority colors
const priorityColors = {
  low: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
  medium: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  urgent: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

// Status colors
const statusColors = {
  active: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  won: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  lost: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  abandoned: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
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
    const today = new Date();
    const daysUntil = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntil < 0) {
      return {
        text: `${Math.abs(daysUntil)}d overdue`,
        isOverdue: true,
      };
    } else if (daysUntil === 0) {
      return {
        text: "Today",
        isUrgent: true,
      };
    } else if (daysUntil === 1) {
      return {
        text: "Tomorrow",
        isUrgent: true,
      };
    } else if (daysUntil <= 7) {
      return {
        text: `${daysUntil}d`,
        isUrgent: true,
      };
    } else {
      return {
        text: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        isUrgent: false,
      };
    }
  };

  const auctionDate = formatDate(deal.auction_date);
  const registrationDate = formatDate(deal.registration_deadline);

  return (
    <Card
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={() => onClick?.(deal)}
      className={cn(
        "cursor-move hover:shadow-md transition-all",
        isDragging && "opacity-50",
        deal.is_overdue && "border-red-500 dark:border-red-400",
        className
      )}
    >
      <CardContent className="p-4">
        {/* Header: Title and badges */}
        <div className="mb-3">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h4 className="font-semibold text-sm leading-tight flex-1 line-clamp-2">
              {deal.title}
            </h4>
            {deal.priority && (
              <Badge
                variant="secondary"
                className={cn("text-xs", priorityColors[deal.priority])}
              >
                {deal.priority}
              </Badge>
            )}
          </div>

          {/* Status badge */}
          {deal.status !== "active" && (
            <Badge
              variant="outline"
              className={cn("text-xs", statusColors[deal.status])}
            >
              {deal.status}
            </Badge>
          )}
        </div>

        {/* Property info (if linked) */}
        {deal.property_id && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-3">
            <Home className="h-3.5 w-3.5" />
            <span className="truncate">Property linked</span>
          </div>
        )}

        {/* Financial metrics */}
        <div className="space-y-2 mb-3">
          {/* Target bid */}
          {deal.target_bid_amount && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5" />
                Target
              </span>
              <span className="font-medium">
                ${deal.target_bid_amount.toLocaleString()}
              </span>
            </div>
          )}

          {/* Estimated value */}
          {deal.estimated_value && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5" />
                Value
              </span>
              <span className="font-medium">
                ${deal.estimated_value.toLocaleString()}
              </span>
            </div>
          )}

          {/* Estimated profit */}
          {deal.estimated_profit && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5" />
                Profit
              </span>
              <span className="font-medium text-green-600 dark:text-green-400">
                ${deal.estimated_profit.toLocaleString()}
              </span>
            </div>
          )}

          {/* ROI percentage */}
          {deal.roi_percentage && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5" />
                ROI
              </span>
              <span className="font-medium text-green-600 dark:text-green-400">
                {deal.roi_percentage.toFixed(1)}%
              </span>
            </div>
          )}
        </div>

        {/* Important dates */}
        {(auctionDate || registrationDate) && (
          <div className="space-y-1.5 mb-3 pt-3 border-t border-slate-200 dark:border-slate-700">
            {/* Auction date */}
            {auctionDate && (
              <div className={cn(
                "flex items-center gap-1.5 text-xs",
                auctionDate.isOverdue && "text-red-600 dark:text-red-400",
                auctionDate.isUrgent && "text-orange-600 dark:text-orange-400",
                !auctionDate.isOverdue && !auctionDate.isUrgent && "text-slate-500 dark:text-slate-400"
              )}>
                <Calendar className="h-3.5 w-3.5" />
                <span>Auction: {auctionDate.text}</span>
                {auctionDate.isOverdue && <AlertTriangle className="h-3.5 w-3.5" />}
              </div>
            )}

            {/* Registration deadline */}
            {registrationDate && (
              <div className={cn(
                "flex items-center gap-1.5 text-xs",
                registrationDate.isOverdue && "text-red-600 dark:text-red-400",
                registrationDate.isUrgent && "text-orange-600 dark:text-orange-400",
                !registrationDate.isOverdue && !registrationDate.isUrgent && "text-slate-500 dark:text-slate-400"
              )}>
                <Calendar className="h-3.5 w-3.5" />
                <span>Reg: {registrationDate.text}</span>
                {registrationDate.isOverdue && <AlertTriangle className="h-3.5 w-3.5" />}
              </div>
            )}
          </div>
        )}

        {/* Tags */}
        {deal.tags && deal.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {deal.tags.slice(0, 3).map((tag, index) => (
              <Badge
                key={index}
                variant="outline"
                className="text-xs"
              >
                <Tag className="h-3 w-3 mr-1" />
                {tag}
              </Badge>
            ))}
            {deal.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{deal.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Footer: Assigned user and days in stage */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-3 border-t border-slate-200 dark:border-slate-700">
          {/* Assigned user */}
          {deal.assigned_to ? (
            <div className="flex items-center gap-1">
              <User className="h-3.5 w-3.5" />
              <span className="truncate max-w-[120px]">
                {deal.assigned_to}
              </span>
            </div>
          ) : (
            <span className="text-slate-400 dark:text-slate-500">Unassigned</span>
          )}

          {/* Days in stage */}
          <span className="text-slate-400 dark:text-slate-500">
            {deal.days_in_stage}d in stage
          </span>
        </div>

        {/* Overdue indicator */}
        {deal.is_overdue && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 font-medium">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Overdue</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default PropertyCard;

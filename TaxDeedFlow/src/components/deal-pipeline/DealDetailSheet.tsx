"use client";

/**
 * Deal Detail Sheet Component
 *
 * Slide-over panel that displays full deal details when a card is clicked.
 * Contains an Overview tab (status, financials, dates, tags, description)
 * and an Activity tab (timeline + note entry).
 *
 * @component
 * @author Claude Code Agent
 * @date 2026-02-07
 */

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  DealWithMetrics,
  PipelineStageWithMetrics,
} from "@/types/deal-pipeline";

// ============================================
// Type Definitions
// ============================================

interface DealDetailSheetProps {
  /** The deal to display, or null if no deal is selected */
  deal: DealWithMetrics | null;
  /** Whether the sheet is open */
  open: boolean;
  /** Callback when the sheet open state changes */
  onOpenChange: (open: boolean) => void;
  /** Available pipeline stages (for context / future stage-move actions) */
  stages: PipelineStageWithMetrics[];
}

// Priority badge colors (matches PropertyCard for consistency, including dark mode)
const priorityColors: Record<string, string> = {
  low: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
  medium: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  urgent: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

// ============================================
// Helper Functions
// ============================================

/** Format a number as USD currency, or return a dash if missing */
function fmt(n?: number): string {
  return n != null ? `$${n.toLocaleString()}` : "\u2014";
}

/** Format a date string as "Mon DD, YYYY", or return a dash if missing / invalid */
function fmtDate(d?: string): string {
  if (!d) return "\u2014";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "\u2014";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Calculate a countdown descriptor for a given date string */
function daysUntil(
  d?: string
): { text: string; urgent: boolean } | null {
  if (!d) return null;
  const date = new Date(d);
  if (isNaN(date.getTime())) return null;
  const days = Math.ceil((date.getTime() - Date.now()) / 86400000);
  if (days < 0)
    return { text: `${Math.abs(days)}d overdue`, urgent: true };
  if (days === 0) return { text: "Today", urgent: true };
  if (days <= 7) return { text: `${days}d`, urgent: true };
  return { text: `${days}d`, urgent: false };
}

// ============================================
// Helper Components
// ============================================

/** Renders a labelled field value, optionally prefixed with a color dot */
function InfoField({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
        {label}
      </p>
      <div className="flex items-center gap-2">
        {color && (
          <div
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: color }}
          />
        )}
        <p className="text-sm font-medium text-slate-900 dark:text-white">
          {value}
        </p>
      </div>
    </div>
  );
}

/** Renders a date row with an optional countdown badge */
function DateRow({
  label,
  date,
  countdown,
}: {
  label: string;
  date?: string;
  countdown?: { text: string; urgent: boolean } | null;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-600 dark:text-slate-400">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-medium">{fmtDate(date)}</span>
        {countdown && (
          <span
            className={cn(
              "text-xs px-1.5 py-0.5 rounded",
              countdown.urgent
                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
            )}
          >
            {countdown.text}
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function DealDetailSheet({
  deal,
  open,
  onOpenChange,
  stages: _stages,
}: DealDetailSheetProps) {
  // When no deal is selected, render nothing (Sheet is still controlled by `open`)
  if (!deal) return null;

  // Mock activities for demo purposes until real activity data is wired up
  const mockActivities = [
    {
      id: "1",
      type: "created" as const,
      description: "Deal created",
      time: deal.created_at,
      user: "System",
    },
    {
      id: "2",
      type: "stage_change" as const,
      description: `Moved to ${deal.current_stage_name}`,
      time: deal.updated_at,
      user: "System",
    },
    {
      id: "3",
      type: "note" as const,
      description: "Initial assessment completed",
      time: new Date(Date.now() - 86400000).toISOString(),
      user: "Demo User",
    },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        {/* ── Header ────────────────────────────── */}
        <SheetHeader className="pb-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-lg leading-tight">
                {deal.title}
              </SheetTitle>
              <SheetDescription className="mt-1">
                {deal.current_stage_name} stage
              </SheetDescription>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge
                className={cn(
                  "text-xs",
                  priorityColors[deal.priority]
                )}
              >
                {deal.priority}
              </Badge>
              {deal.is_overdue && (
                <Badge variant="destructive" className="text-xs">
                  Overdue
                </Badge>
              )}
            </div>
          </div>
        </SheetHeader>

        {/* ── Tabs ──────────────────────────────── */}
        <Tabs defaultValue="overview" className="mt-6">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          {/* ── Overview Tab ────────────────────── */}
          <TabsContent value="overview" className="mt-4 space-y-6">
            {/* Status grid */}
            <div className="grid grid-cols-2 gap-4">
              <InfoField
                label="Stage"
                value={deal.current_stage_name}
                color={deal.current_stage_color}
              />
              <InfoField
                label="Priority"
                value={
                  deal.priority.charAt(0).toUpperCase() +
                  deal.priority.slice(1)
                }
              />
              <InfoField
                label="Status"
                value={
                  deal.status.charAt(0).toUpperCase() +
                  deal.status.slice(1)
                }
              />
              <InfoField
                label="Days in Stage"
                value={`${deal.days_in_stage} days`}
              />
            </div>

            {/* Financial details */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
                Financial Details
              </h3>
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">
                    Target Bid
                  </span>
                  <span className="font-medium">
                    {fmt(deal.target_bid_amount)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">
                    Max Bid
                  </span>
                  <span className="font-medium">
                    {fmt(deal.max_bid_amount)}
                  </span>
                </div>
                <div className="flex justify-between text-sm border-t border-slate-200 dark:border-slate-700 pt-3">
                  <span className="text-slate-600 dark:text-slate-400">
                    Estimated Value
                  </span>
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    {fmt(deal.estimated_value)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">
                    Estimated Profit
                  </span>
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    {fmt(deal.estimated_profit)}
                  </span>
                </div>
                {deal.roi_percentage != null && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">
                      ROI
                    </span>
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      {deal.roi_percentage.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Important dates */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
                Important Dates
              </h3>
              <div className="space-y-3">
                <DateRow
                  label="Auction Date"
                  date={deal.auction_date}
                  countdown={daysUntil(deal.auction_date)}
                />
                <DateRow
                  label="Registration Deadline"
                  date={deal.registration_deadline}
                  countdown={daysUntil(deal.registration_deadline)}
                />
                <DateRow label="Created" date={deal.created_at} />
              </div>
            </div>

            {/* Tags */}
            {deal.tags && deal.tags.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
                  Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {deal.tags.map((tag, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {deal.description && (
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
                  Description
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-line">
                  {deal.description}
                </p>
              </div>
            )}
          </TabsContent>

          {/* ── Activity Tab ────────────────────── */}
          <TabsContent value="activity" className="mt-4">
            <div className="space-y-4">
              {mockActivities.map((activity) => (
                <div key={activity.id} className="flex gap-3">
                  <div className="flex-shrink-0 mt-1.5">
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full",
                        activity.type === "created"
                          ? "bg-green-500"
                          : activity.type === "stage_change"
                            ? "bg-blue-500"
                            : "bg-slate-400"
                      )}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-900 dark:text-white">
                      {activity.description}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {activity.user}
                      </span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        {fmtDate(activity.time)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add note placeholder */}
            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
              <textarea
                placeholder="Add a note..."
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm min-h-[60px] resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white placeholder:text-slate-400"
              />
              <Button size="sm" className="mt-2">
                <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                Add Note
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

export default DealDetailSheet;

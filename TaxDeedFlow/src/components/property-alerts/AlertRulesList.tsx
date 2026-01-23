"use client"

/**
 * Alert Rules List Component
 *
 * Displays a list of property alert rules with quick actions for enabling/disabling,
 * editing, and deleting rules. Shows comprehensive criteria summary for each rule.
 *
 * @component
 * @author Claude Code Agent
 * @date 2026-01-23
 */

import { useState } from "react"
import {
  Bell,
  Power,
  PowerOff,
  Edit,
  Trash2,
  Gauge,
  MapPin,
  Home,
  DollarSign,
  Filter,
  Calendar,
  TrendingUp,
  Loader2,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils/format"
import { cn } from "@/lib/utils"
import type { AlertRule } from "@/lib/property-alerts/types"

// ============================================
// Type Definitions
// ============================================

interface AlertRulesListProps {
  /** Array of alert rules to display */
  rules: AlertRule[]
  /** Callback when rule enabled status is toggled */
  onToggle?: (ruleId: string, currentEnabled: boolean) => Promise<void>
  /** Callback when rule edit is requested */
  onEdit?: (ruleId: string) => void
  /** Callback when rule delete is requested */
  onDelete?: (ruleId: string) => Promise<void>
  /** Whether the list is in loading state */
  isLoading?: boolean
  /** Optional additional class names */
  className?: string
}

// ============================================
// Helper Functions
// ============================================

/**
 * Formats the notification frequency for display
 */
function formatNotificationFrequency(frequency: string): string {
  const map: Record<string, string> = {
    instant: "Instant",
    daily: "Daily",
    weekly: "Weekly",
  }
  return map[frequency] || frequency
}

/**
 * Formats the last notified timestamp
 */
function formatLastNotified(lastNotifiedAt: Date | null): string {
  if (!lastNotifiedAt) return "Never"

  const date = new Date(lastNotifiedAt)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

// ============================================
// Main Component
// ============================================

export function AlertRulesList({
  rules,
  onToggle,
  onEdit,
  onDelete,
  isLoading = false,
  className,
}: AlertRulesListProps) {
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleToggle = async (ruleId: string, currentEnabled: boolean) => {
    if (!onToggle) return
    setTogglingId(ruleId)
    try {
      await onToggle(ruleId, currentEnabled)
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async (ruleId: string, ruleName: string) => {
    if (!onDelete) return

    const confirmed = window.confirm(
      `Are you sure you want to delete "${ruleName}"? This action cannot be undone.`
    )

    if (!confirmed) return

    setDeletingId(ruleId)
    try {
      await onDelete(ruleId)
    } finally {
      setDeletingId(null)
    }
  }

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center py-12", className)}>
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    )
  }

  if (rules.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Bell className="h-12 w-12 text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">
            No Alert Rules Found
          </h3>
          <p className="text-slate-500 text-center">
            Create your first alert rule to start receiving notifications when
            properties match your criteria.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {rules.map((rule) => {
        const isToggling = togglingId === rule.id
        const isDeleting = deletingId === rule.id
        const isActionPending = isToggling || isDeleting

        return (
          <Card
            key={rule.id}
            className={cn(
              "transition-all",
              !rule.enabled && "opacity-60",
              isActionPending && "pointer-events-none opacity-50"
            )}
          >
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                {/* Icon and Status Indicator */}
                <div className="flex-shrink-0 mt-1">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-lg",
                      rule.enabled
                        ? "bg-primary/10 text-primary"
                        : "bg-slate-100 text-slate-400"
                    )}
                  >
                    <Bell className="h-5 w-5" />
                  </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900">
                          {rule.name}
                        </h3>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full",
                            rule.enabled
                              ? "bg-green-100 text-green-700"
                              : "bg-slate-100 text-slate-500"
                          )}
                        >
                          {rule.enabled ? (
                            <>
                              <Power className="h-3 w-3" />
                              Active
                            </>
                          ) : (
                            <>
                              <PowerOff className="h-3 w-3" />
                              Disabled
                            </>
                          )}
                        </span>
                      </div>

                      {/* Match Stats */}
                      <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-3.5 w-3.5" />
                          {rule.matchCount} {rule.matchCount === 1 ? "match" : "matches"}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          Last notified: {formatLastNotified(rule.lastNotifiedAt)}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      {onToggle && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggle(rule.id, rule.enabled)}
                          disabled={isActionPending}
                          className="gap-1.5"
                        >
                          {isToggling ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : rule.enabled ? (
                            <PowerOff className="h-4 w-4" />
                          ) : (
                            <Power className="h-4 w-4" />
                          )}
                          {rule.enabled ? "Disable" : "Enable"}
                        </Button>
                      )}
                      {onEdit && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onEdit(rule.id)}
                          disabled={isActionPending}
                          className="gap-1.5"
                        >
                          <Edit className="h-4 w-4" />
                          Edit
                        </Button>
                      )}
                      {onDelete && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(rule.id, rule.name)}
                          disabled={isActionPending}
                          className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          {isDeleting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Criteria Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100">
                    {/* Score Threshold */}
                    {rule.scoreThreshold !== null && (
                      <div className="flex items-center gap-2 text-sm">
                        <Gauge className="h-4 w-4 text-slate-400" />
                        <span className="text-slate-600">
                          Score ≥ <span className="font-medium text-slate-900">{rule.scoreThreshold}</span>
                        </span>
                      </div>
                    )}

                    {/* Counties */}
                    {rule.countyIds.length > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-slate-400" />
                        <span className="text-slate-600">
                          <span className="font-medium text-slate-900">{rule.countyIds.length}</span>{" "}
                          {rule.countyIds.length === 1 ? "county" : "counties"}
                        </span>
                      </div>
                    )}

                    {/* Property Types */}
                    {rule.propertyTypes.length > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <Home className="h-4 w-4 text-slate-400" />
                        <span className="text-slate-600">
                          {rule.propertyTypes.length === 1 ? (
                            <span className="font-medium text-slate-900">{rule.propertyTypes[0]}</span>
                          ) : (
                            <>
                              <span className="font-medium text-slate-900">{rule.propertyTypes.length}</span> types
                            </>
                          )}
                        </span>
                      </div>
                    )}

                    {/* Max Bid */}
                    {rule.maxBid !== null && (
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="h-4 w-4 text-slate-400" />
                        <span className="text-slate-600">
                          Max bid:{" "}
                          <span className="font-medium text-slate-900">
                            {formatCurrency(rule.maxBid)}
                          </span>
                        </span>
                      </div>
                    )}

                    {/* Acreage Range */}
                    {(rule.minAcres !== null || rule.maxAcres !== null) && (
                      <div className="flex items-center gap-2 text-sm">
                        <Filter className="h-4 w-4 text-slate-400" />
                        <span className="text-slate-600">
                          {rule.minAcres !== null && rule.maxAcres !== null ? (
                            <>
                              <span className="font-medium text-slate-900">
                                {rule.minAcres}-{rule.maxAcres}
                              </span>{" "}
                              acres
                            </>
                          ) : rule.minAcres !== null ? (
                            <>
                              ≥ <span className="font-medium text-slate-900">{rule.minAcres}</span> acres
                            </>
                          ) : (
                            <>
                              ≤ <span className="font-medium text-slate-900">{rule.maxAcres}</span> acres
                            </>
                          )}
                        </span>
                      </div>
                    )}

                    {/* Notification Frequency */}
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-600">
                        <span className="font-medium text-slate-900">
                          {formatNotificationFrequency(rule.notificationFrequency)}
                        </span>{" "}
                        notifications
                      </span>
                    </div>
                  </div>

                  {/* Empty Criteria Message */}
                  {rule.scoreThreshold === null &&
                    rule.countyIds.length === 0 &&
                    rule.propertyTypes.length === 0 &&
                    rule.maxBid === null &&
                    rule.minAcres === null &&
                    rule.maxAcres === null && (
                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <p className="text-sm text-slate-500 italic">
                          No filters set - will match all properties
                        </p>
                      </div>
                    )}
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

export default AlertRulesList

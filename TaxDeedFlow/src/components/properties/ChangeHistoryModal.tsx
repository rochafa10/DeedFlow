"use client"

/**
 * ChangeHistoryModal Component
 *
 * Modal dialog displaying the complete change history for a property.
 * Shows all modifications made to property fields including reverted changes.
 *
 * Features:
 * - Timeline view of all property modifications
 * - Before/after values for each change
 * - Timestamps and user attribution
 * - Status indicators (active/reverted)
 * - Grouped by field name for clarity
 * - Reason/notes for each modification
 *
 * @module components/properties/ChangeHistoryModal
 */

import * as React from "react"
import { History, ArrowRight, RotateCcw, CheckCircle2, Clock, User } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDate } from "@/lib/utils"

// ============================================
// Types
// ============================================

interface ChangeHistoryModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Callback when dialog open state changes */
  onClose: () => void
  /** ID of the property to show history for */
  propertyId: string
  /** Optional property address for display */
  propertyAddress?: string
}

/** Property override history record */
interface PropertyOverrideHistory {
  id: string
  fieldName: string
  originalValue: string
  overrideValue: string
  reason: string | null
  createdBy: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

/** Response from history API endpoint */
interface HistoryResponse {
  data: PropertyOverrideHistory[]
  count: number
  source: "database" | "mock"
  error?: string
}

// ============================================
// Helper Functions
// ============================================

/**
 * Format field name for display
 * Converts snake_case to Title Case
 */
function formatFieldName(fieldName: string): string {
  return fieldName
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

/**
 * Format timestamp as relative time (e.g., "2 hours ago")
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`
  return formatDate(dateString)
}

/**
 * Group history records by field name
 */
function groupByField(
  history: PropertyOverrideHistory[]
): Record<string, PropertyOverrideHistory[]> {
  return history.reduce((acc, record) => {
    if (!acc[record.fieldName]) {
      acc[record.fieldName] = []
    }
    acc[record.fieldName].push(record)
    return acc
  }, {} as Record<string, PropertyOverrideHistory[]>)
}

// ============================================
// Component
// ============================================

/**
 * ChangeHistoryModal - Display complete change history for a property
 *
 * @example
 * ```tsx
 * <ChangeHistoryModal
 *   isOpen={showHistory}
 *   onClose={() => setShowHistory(false)}
 *   propertyId="property-uuid-123"
 *   propertyAddress="123 Main St, Springfield"
 * />
 * ```
 */
export function ChangeHistoryModal({
  isOpen,
  onClose,
  propertyId,
  propertyAddress,
}: ChangeHistoryModalProps) {
  const [history, setHistory] = React.useState<PropertyOverrideHistory[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  /**
   * Fetch change history when modal opens
   */
  React.useEffect(() => {
    if (!isOpen || !propertyId) return

    const fetchHistory = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/properties/${propertyId}/overrides/history`)

        if (!response.ok) {
          throw new Error("Failed to fetch change history")
        }

        const result: HistoryResponse = await response.json()
        setHistory(result.data || [])
      } catch (err) {
        console.error("[ChangeHistoryModal] Failed to fetch history:", err)
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load change history. Please try again."
        )
      } finally {
        setIsLoading(false)
      }
    }

    fetchHistory()
  }, [isOpen, propertyId])

  /**
   * Reset state when modal closes
   */
  React.useEffect(() => {
    if (!isOpen) {
      const timeout = setTimeout(() => {
        setHistory([])
        setError(null)
      }, 200)
      return () => clearTimeout(timeout)
    }
  }, [isOpen])

  /**
   * Group history by field
   */
  const groupedHistory = React.useMemo(() => {
    return groupByField(history)
  }, [history])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="dark:bg-slate-900 max-w-2xl max-h-[80vh] flex flex-col"
        onClose={onClose}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 dark:text-slate-100">
            <History className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Change History
          </DialogTitle>
          <DialogDescription className="dark:text-slate-400">
            {propertyAddress
              ? `All modifications for ${propertyAddress}`
              : "All modifications made to this property"}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4 flex-1 overflow-y-auto">
          {/* Loading state */}
          {isLoading && (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ))}
            </div>
          )}

          {/* Error state */}
          {error && !isLoading && (
            <div className="flex items-start gap-2 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <RotateCcw className="h-5 w-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-300">
                  Error loading history
                </p>
                <p className="text-sm text-red-600 dark:text-red-400 mt-0.5">
                  {error}
                </p>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !error && history.length === 0 && (
            <div className="text-center py-12">
              <History className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                No changes yet
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                When you modify property fields, the history will appear here.
              </p>
            </div>
          )}

          {/* History timeline */}
          {!isLoading && !error && history.length > 0 && (
            <div className="space-y-6">
              {Object.entries(groupedHistory).map(([fieldName, records]) => (
                <div key={fieldName} className="space-y-3">
                  {/* Field header */}
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                      {formatFieldName(fieldName)}
                    </h3>
                    <Badge variant="secondary" className="text-xs">
                      {records.length} change{records.length !== 1 ? "s" : ""}
                    </Badge>
                  </div>

                  {/* Changes for this field */}
                  <div className="space-y-3 pl-4 border-l-2 border-slate-200 dark:border-slate-700">
                    {records.map((record) => (
                      <div
                        key={record.id}
                        className={cn(
                          "relative p-4 rounded-lg border transition-colors",
                          record.isActive
                            ? "bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800"
                            : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                        )}
                      >
                        {/* Timeline dot */}
                        <div
                          className={cn(
                            "absolute -left-[21px] top-6 h-3 w-3 rounded-full border-2 bg-white dark:bg-slate-900",
                            record.isActive
                              ? "border-blue-500 dark:border-blue-400"
                              : "border-slate-400 dark:border-slate-600"
                          )}
                        />

                        {/* Status badge */}
                        <div className="flex items-center justify-between mb-3">
                          <Badge
                            variant={record.isActive ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {record.isActive ? (
                              <>
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Active
                              </>
                            ) : (
                              <>
                                <RotateCcw className="h-3 w-3 mr-1" />
                                Reverted
                              </>
                            )}
                          </Badge>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            <Clock className="h-3 w-3" />
                            <span>{formatRelativeTime(record.createdAt)}</span>
                          </div>
                        </div>

                        {/* Value change */}
                        <div className="flex items-center gap-2 mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                              Original
                            </div>
                            <div className="font-mono text-sm text-slate-700 dark:text-slate-300 truncate">
                              {record.originalValue || "(empty)"}
                            </div>
                          </div>
                          <ArrowRight className="h-4 w-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                              Changed to
                            </div>
                            <div className="font-mono text-sm font-medium text-blue-700 dark:text-blue-300 truncate">
                              {record.overrideValue}
                            </div>
                          </div>
                        </div>

                        {/* Reason */}
                        {record.reason && (
                          <div className="mb-3 p-2 bg-white dark:bg-slate-900/50 rounded border border-slate-200 dark:border-slate-700">
                            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                              Reason
                            </div>
                            <div className="text-sm text-slate-700 dark:text-slate-300">
                              {record.reason}
                            </div>
                          </div>
                        )}

                        {/* User attribution */}
                        {record.createdBy && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            <User className="h-3 w-3" />
                            <span>Modified by user {record.createdBy.substring(0, 8)}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={onClose} variant="outline" className="dark:border-slate-700">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ChangeHistoryModal

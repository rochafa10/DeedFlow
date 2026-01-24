"use client"

import { useState } from "react"
import { Edit3, RotateCcw, AlertCircle, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { usePropertyOverrides, type FieldState } from "@/hooks/usePropertyOverrides"
import { cn } from "@/lib/utils"

interface FieldOverrideIndicatorProps {
  /** ID of the property */
  propertyId: string
  /** Name of the field to check for overrides */
  fieldName: string
  /** Optional CSS class name */
  className?: string
  /** Show revert button inline (default: true) */
  showRevertButton?: boolean
  /** Callback when field is successfully reverted */
  onReverted?: () => void
}

/**
 * Indicator badge showing when a field has been manually overridden
 *
 * Features:
 * - Shows badge when field is modified
 * - Displays original value in tooltip on hover
 * - Click badge or revert button to restore original value
 * - Loading state during revert operation
 *
 * @example
 * ```tsx
 * <FieldOverrideIndicator
 *   propertyId={propertyId}
 *   fieldName="total_due"
 *   onReverted={() => console.log("Reverted!")}
 * />
 * ```
 */
export function FieldOverrideIndicator({
  propertyId,
  fieldName,
  className,
  showRevertButton = true,
  onReverted,
}: FieldOverrideIndicatorProps) {
  const [isReverting, setIsReverting] = useState(false)
  const { getFieldState, revertField, isLoading } = usePropertyOverrides(propertyId)

  // Get the modification state for this field
  const fieldState: FieldState = getFieldState(fieldName)

  // Don't render anything if field is not modified
  if (!fieldState.isModified || isLoading) {
    return null
  }

  const handleRevert = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    try {
      setIsReverting(true)
      await revertField(fieldName)
      onReverted?.()
    } catch (error) {
      console.error("Failed to revert field:", error)
      // Error handling could be enhanced with toast notifications
    } finally {
      setIsReverting(false)
    }
  }

  const tooltipContent = (
    <div className="space-y-1">
      <div className="font-medium text-xs text-slate-500 dark:text-slate-400">
        Original Value:
      </div>
      <div className="font-semibold">
        {fieldState.originalValue || "Not set"}
      </div>
      {fieldState.reason && (
        <>
          <div className="font-medium text-xs text-slate-500 dark:text-slate-400 mt-2">
            Reason:
          </div>
          <div className="text-sm">{fieldState.reason}</div>
        </>
      )}
      <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
        Click to revert to original value
      </div>
    </div>
  )

  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleRevert}
              disabled={isReverting}
              className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Field has been modified. Click to view details and revert."
            >
              <Badge
                variant="info"
                className={cn(
                  "cursor-pointer hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors",
                  isReverting && "opacity-50"
                )}
              >
                {isReverting ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Edit3 className="h-3 w-3 mr-1" />
                )}
                <span>Modified</span>
              </Badge>
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            {tooltipContent}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {showRevertButton && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleRevert}
                disabled={isReverting}
                className={cn(
                  "inline-flex items-center justify-center h-6 w-6 rounded-md",
                  "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100",
                  "hover:bg-slate-100 dark:hover:bg-slate-800",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                  "transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                )}
                aria-label="Revert to original value"
              >
                {isReverting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <span>Revert to original value</span>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  )
}

/**
 * Simple inline indicator without revert button
 * Useful for read-only contexts or when revert is handled elsewhere
 */
export function FieldOverrideIndicatorSimple({
  propertyId,
  fieldName,
  className,
}: Omit<FieldOverrideIndicatorProps, "showRevertButton" | "onReverted">) {
  return (
    <FieldOverrideIndicator
      propertyId={propertyId}
      fieldName={fieldName}
      className={className}
      showRevertButton={false}
    />
  )
}

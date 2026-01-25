"use client"

/**
 * DataEnrichmentStatus Component
 *
 * A status panel showing the enrichment state of property data from
 * various sources (Regrid, screenshots, validation). Displays status
 * badges and optional action buttons for triggering data fetches.
 *
 * @module components/property-management/DataEnrichmentStatus
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-24
 */

import { useCallback } from "react"
import {
  CheckCircle,
  Clock,
  Database,
  Camera,
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  RefreshCw,
  AlertTriangle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DataEnrichmentStatusProps,
  ValidationStatus,
  VALIDATION_STATUS_CONFIG,
} from "@/types/property-management"

// ============================================
// Types
// ============================================

type EnrichmentSource = "regrid" | "screenshot" | "validation"

// ============================================
// Utility Functions
// ============================================

/**
 * Get the appropriate icon for validation status
 */
function getValidationIcon(status: ValidationStatus | null) {
  switch (status) {
    case "approved":
      return <ShieldCheck className="h-5 w-5 text-green-600" aria-hidden="true" />
    case "caution":
      return <ShieldAlert className="h-5 w-5 text-amber-600" aria-hidden="true" />
    case "rejected":
      return <ShieldX className="h-5 w-5 text-red-600" aria-hidden="true" />
    default:
      return <Shield className="h-5 w-5 text-slate-400" aria-hidden="true" />
  }
}

/**
 * Get styling classes based on validation status
 */
function getValidationStyles(status: ValidationStatus | null) {
  switch (status) {
    case "approved":
      return {
        container: "bg-green-50 border-green-200",
        text: "text-green-700",
        badge: "text-green-600",
      }
    case "caution":
      return {
        container: "bg-amber-50 border-amber-200",
        text: "text-amber-700",
        badge: "text-amber-600",
      }
    case "rejected":
      return {
        container: "bg-red-50 border-red-200",
        text: "text-red-700",
        badge: "text-red-600",
      }
    default:
      return {
        container: "bg-slate-50 border-slate-200",
        text: "text-slate-500",
        badge: "text-slate-500",
      }
  }
}

/**
 * Format validation status for display
 */
function formatValidationStatus(status: ValidationStatus | null): string {
  if (!status) return "Pending"
  return VALIDATION_STATUS_CONFIG[status]?.label || status.charAt(0).toUpperCase() + status.slice(1)
}

// ============================================
// Sub-components
// ============================================

interface StatusCardProps {
  title: string
  icon: React.ReactNode
  hasData: boolean
  isLoading: boolean
  statusText: string
  showButton: boolean
  buttonLabel: string
  buttonLoadingLabel: string
  buttonIcon: React.ReactNode
  onAction?: () => void
  containerStyles: {
    container: string
    text: string
    badge: string
  }
  error?: string
}

function StatusCard({
  title,
  icon,
  hasData,
  isLoading,
  statusText,
  showButton,
  buttonLabel,
  buttonLoadingLabel,
  buttonIcon,
  onAction,
  containerStyles,
  error,
}: StatusCardProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between p-3 rounded-lg border",
        containerStyles.container
      )}
      role="status"
      aria-label={`${title} status: ${statusText}`}
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className={cn("text-sm font-medium", containerStyles.text)}>
          {title}
        </span>
      </div>

      {showButton && onAction ? (
        <button
          onClick={onAction}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-busy={isLoading}
          aria-label={isLoading ? buttonLoadingLabel : buttonLabel}
        >
          {isLoading ? (
            <>
              <RefreshCw className="h-3 w-3 animate-spin" aria-hidden="true" />
              {buttonLoadingLabel}
            </>
          ) : (
            <>
              {buttonIcon}
              {buttonLabel}
            </>
          )}
        </button>
      ) : (
        <span className={cn("text-xs", containerStyles.badge)}>
          {error ? (
            <span className="text-red-600 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" aria-hidden="true" />
              Error
            </span>
          ) : (
            statusText
          )}
        </span>
      )}
    </div>
  )
}

// ============================================
// Main Component
// ============================================

/**
 * DataEnrichmentStatus displays the enrichment state of property data
 * from various sources with optional action buttons.
 */
export function DataEnrichmentStatus({
  status,
  onRefresh,
  allowRefresh = false,
  className,
}: DataEnrichmentStatusProps) {
  // Handle refresh action for a specific source
  const handleRefresh = useCallback(
    (source: EnrichmentSource) => {
      if (onRefresh) {
        onRefresh(source)
      }
    },
    [onRefresh]
  )

  // Determine styling for Regrid status
  const regridStyles = status.regrid.hasData
    ? {
        container: "bg-green-50 border-green-200",
        text: "text-green-700",
        badge: "text-green-600",
      }
    : {
        container: "bg-amber-50 border-amber-200",
        text: "text-amber-700",
        badge: "text-amber-600",
      }

  // Determine styling for Screenshot status
  const screenshotStyles = status.screenshot.hasData && status.screenshot.count > 0
    ? {
        container: "bg-green-50 border-green-200",
        text: "text-green-700",
        badge: "text-green-600",
      }
    : {
        container: "bg-amber-50 border-amber-200",
        text: "text-amber-700",
        badge: "text-amber-600",
      }

  // Get validation styling
  const validationStyles = getValidationStyles(status.validation.status)

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
        <Database className="h-4 w-4" aria-hidden="true" />
        Data Enrichment Status
      </h3>

      {/* Status Cards Grid */}
      <div
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        role="group"
        aria-label="Data enrichment status overview"
      >
        {/* Regrid Data Status */}
        <StatusCard
          title="Regrid Data"
          icon={
            status.regrid.hasData ? (
              <CheckCircle className="h-5 w-5 text-green-600" aria-hidden="true" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-amber-600" aria-hidden="true" />
            )
          }
          hasData={status.regrid.hasData}
          isLoading={status.regrid.isLoading}
          statusText={status.regrid.hasData ? "Complete" : "Pending"}
          showButton={!status.regrid.hasData && allowRefresh && !status.regrid.isLoading}
          buttonLabel="Fetch"
          buttonLoadingLabel="Fetching..."
          buttonIcon={<Database className="h-3 w-3" aria-hidden="true" />}
          onAction={() => handleRefresh("regrid")}
          containerStyles={regridStyles}
          error={status.regrid.error}
        />

        {/* Screenshot Status */}
        <StatusCard
          title="Screenshot"
          icon={
            status.screenshot.hasData && status.screenshot.count > 0 ? (
              <CheckCircle className="h-5 w-5 text-green-600" aria-hidden="true" />
            ) : (
              <Clock className="h-5 w-5 text-amber-600" aria-hidden="true" />
            )
          }
          hasData={status.screenshot.hasData}
          isLoading={status.screenshot.isLoading}
          statusText={
            status.screenshot.hasData && status.screenshot.count > 0
              ? `${status.screenshot.count} image${status.screenshot.count === 1 ? "" : "s"}`
              : "Pending"
          }
          showButton={
            (!status.screenshot.hasData || status.screenshot.count === 0) &&
            allowRefresh &&
            !status.screenshot.isLoading
          }
          buttonLabel="Capture"
          buttonLoadingLabel="Capturing..."
          buttonIcon={<Camera className="h-3 w-3" aria-hidden="true" />}
          onAction={() => handleRefresh("screenshot")}
          containerStyles={screenshotStyles}
          error={status.screenshot.error}
        />

        {/* Validation Status */}
        <div
          className={cn(
            "flex items-center justify-between p-3 rounded-lg border",
            validationStyles.container
          )}
          role="status"
          aria-label={`Validation status: ${formatValidationStatus(status.validation.status)}`}
        >
          <div className="flex items-center gap-2">
            {getValidationIcon(status.validation.status)}
            <span className={cn("text-sm font-medium", validationStyles.text)}>
              Validation
            </span>
          </div>

          {status.validation.status ? (
            <span
              className={cn(
                "inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full",
                VALIDATION_STATUS_CONFIG[status.validation.status]?.color ||
                  "bg-slate-100 text-slate-700"
              )}
            >
              {formatValidationStatus(status.validation.status)}
            </span>
          ) : (
            <span className={cn("text-xs", validationStyles.badge)}>
              {status.validation.error ? (
                <span className="text-red-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                  Error
                </span>
              ) : (
                "Pending"
              )}
            </span>
          )}
        </div>
      </div>

      {/* Last Updated Info (optional) */}
      {(status.regrid.lastUpdated || status.screenshot.lastUpdated || status.validation.lastUpdated) && (
        <div className="text-xs text-slate-500 mt-2">
          Last updated:{" "}
          {status.regrid.lastUpdated && (
            <span>
              Regrid {new Date(status.regrid.lastUpdated).toLocaleDateString()}
            </span>
          )}
          {status.screenshot.lastUpdated && (
            <span>
              {status.regrid.lastUpdated && " | "}
              Screenshots {new Date(status.screenshot.lastUpdated).toLocaleDateString()}
            </span>
          )}
          {status.validation.lastUpdated && (
            <span>
              {(status.regrid.lastUpdated || status.screenshot.lastUpdated) && " | "}
              Validation {new Date(status.validation.lastUpdated).toLocaleDateString()}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

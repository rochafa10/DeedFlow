"use client"

import {
  CheckCircle2,
  ExternalLink,
  MapPin,
  DollarSign,
  TrendingUp,
  Home,
  Gauge,
  Calendar,
  Eye,
} from "lucide-react"
import Image from "next/image"

export interface PropertyAlertCardProps {
  alert: {
    id: string
    alertRuleId: string
    propertyId: string
    matchScore: number
    matchReasons: {
      scoreMatch?: boolean
      countyMatch?: boolean
      propertyTypeMatch?: boolean
      priceWithinBudget?: boolean
      acresInRange?: boolean
      reasons?: string[]
    }
    read: boolean
    archived: boolean
    readAt: Date | null
    archivedAt: Date | null
    createdAt: Date
  }
  property?: {
    id: string
    address: string | null
    city: string | null
    state: string | null
    zip: string | null
    parcelNumber: string | null
    county: string | null
    totalDue: number | null
    propertyType: string | null
    acres: number | null
    investmentScore: number | null
    thumbnailUrl: string | null
  }
  onMarkAsRead?: (alertId: string) => void
  onViewProperty?: (propertyId: string) => void
  isMarkingAsRead?: boolean
}

export function PropertyAlertCard({
  alert,
  property,
  onMarkAsRead,
  onViewProperty,
  isMarkingAsRead = false,
}: PropertyAlertCardProps) {
  // Format currency
  const formatCurrency = (amount: number | null | undefined): string => {
    if (amount == null) return "N/A"
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Format match score badge color
  const getScoreBadgeColor = (score: number): string => {
    if (score >= 80) return "bg-green-100 text-green-700 border-green-200"
    if (score >= 60) return "bg-blue-100 text-blue-700 border-blue-200"
    if (score >= 40) return "bg-amber-100 text-amber-700 border-amber-200"
    return "bg-slate-100 text-slate-700 border-slate-200"
  }

  // Format property address
  const formatAddress = (): string => {
    if (!property) return "Address unavailable"
    const parts = [
      property.address,
      property.city,
      property.state,
      property.zip,
    ].filter(Boolean)
    return parts.length > 0 ? parts.join(", ") : "Address unavailable"
  }

  // Get match reason labels
  const getMatchReasonLabels = (): string[] => {
    const reasons: string[] = []

    if (alert.matchReasons.reasons && alert.matchReasons.reasons.length > 0) {
      return alert.matchReasons.reasons
    }

    // Fallback to boolean flags if reasons array is empty
    if (alert.matchReasons.scoreMatch) {
      reasons.push("High investment score")
    }
    if (alert.matchReasons.countyMatch) {
      reasons.push("Preferred county location")
    }
    if (alert.matchReasons.propertyTypeMatch) {
      reasons.push("Matches property type preference")
    }
    if (alert.matchReasons.priceWithinBudget) {
      reasons.push("Within your budget range")
    }
    if (alert.matchReasons.acresInRange) {
      reasons.push("Meets acreage requirements")
    }

    return reasons.length > 0 ? reasons : ["Matches your alert criteria"]
  }

  const matchReasons = getMatchReasonLabels()

  // Format date
  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  return (
    <div
      className={cn(
        "bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden",
        alert.read && "opacity-75"
      )}
    >
      <div className="flex flex-col sm:flex-row">
        {/* Property Thumbnail */}
        <div className="relative w-full sm:w-48 h-48 sm:h-auto flex-shrink-0 bg-slate-100">
          {property?.thumbnailUrl ? (
            <Image
              src={property.thumbnailUrl}
              alt={property.address || "Property"}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 192px"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-slate-400">
              <Home className="h-12 w-12" />
            </div>
          )}
          {/* Match Score Badge */}
          <div className="absolute top-3 right-3">
            <div
              className={cn(
                "flex items-center gap-1 px-3 py-1.5 rounded-full border font-semibold text-sm shadow-sm",
                getScoreBadgeColor(alert.matchScore)
              )}
            >
              <TrendingUp className="h-4 w-4" />
              {alert.matchScore}% Match
            </div>
          </div>
          {/* Read Badge */}
          {alert.read && (
            <div className="absolute bottom-3 right-3">
              <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                <CheckCircle2 className="h-3 w-3" />
                Read
              </div>
            </div>
          )}
        </div>

        {/* Property Details */}
        <div className="flex-1 p-5">
          {/* Header */}
          <div className="mb-3">
            <h3 className="text-lg font-semibold text-slate-900 mb-1">
              {formatAddress()}
            </h3>
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {property?.county || "Unknown County"}
              </div>
              {property?.parcelNumber && (
                <div>Parcel: {property.parcelNumber}</div>
              )}
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formatDate(alert.createdAt)}
              </div>
            </div>
          </div>

          {/* Property Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="flex items-center gap-1 text-xs text-slate-600 mb-1">
                <DollarSign className="h-3.5 w-3.5" />
                Total Due
              </div>
              <div className="text-base font-semibold text-slate-900">
                {formatCurrency(property?.totalDue)}
              </div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="flex items-center gap-1 text-xs text-slate-600 mb-1">
                <Home className="h-3.5 w-3.5" />
                Type
              </div>
              <div className="text-base font-semibold text-slate-900">
                {property?.propertyType || "N/A"}
              </div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="flex items-center gap-1 text-xs text-slate-600 mb-1">
                <Gauge className="h-3.5 w-3.5" />
                Score
              </div>
              <div className="text-base font-semibold text-slate-900">
                {property?.investmentScore != null
                  ? `${property.investmentScore}/100`
                  : "N/A"}
              </div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="flex items-center gap-1 text-xs text-slate-600 mb-1">
                <MapPin className="h-3.5 w-3.5" />
                Acres
              </div>
              <div className="text-base font-semibold text-slate-900">
                {property?.acres != null ? property.acres.toFixed(2) : "N/A"}
              </div>
            </div>
          </div>

          {/* Match Reasons */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              Why This Property Matches
            </h4>
            <ul className="space-y-1">
              {matchReasons.map((reason, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-sm text-slate-600"
                >
                  <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
            {!alert.read && onMarkAsRead && (
              <button
                onClick={() => onMarkAsRead(alert.id)}
                disabled={isMarkingAsRead}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isMarkingAsRead ? (
                  <>
                    <div className="h-4 w-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                    Marking...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Mark as Read
                  </>
                )}
              </button>
            )}
            {onViewProperty && (
              <button
                onClick={() => onViewProperty(alert.propertyId)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Eye className="h-4 w-4" />
                View Property Details
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Utility function for conditional classes
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ")
}

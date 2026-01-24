"use client"

import { useState, useEffect } from "react"
import { authGet } from "@/lib/api/authFetch"
import { RecentlyViewedProperty, RecentlyViewedResponse } from "@/types/search"
import { Clock, Loader2, AlertTriangle, X, ExternalLink, MapPin, DollarSign } from "lucide-react"
import { Card } from "@/components/ui/card"
import { formatDate } from "@/lib/utils"
import Link from "next/link"

interface RecentlyViewedPanelProps {
  /** Optional class name for styling */
  className?: string
  /** Maximum number of properties to display */
  limit?: number
}

/**
 * RecentlyViewedPanel Component
 *
 * Displays a compact list of recently viewed properties with:
 * - Property thumbnail/placeholder
 * - Basic property information (address, parcel ID, total due)
 * - Link to property detail page
 * - Timestamp of when property was viewed
 *
 * @component
 */
export function RecentlyViewedPanel({ className = "", limit = 10 }: RecentlyViewedPanelProps) {
  const [properties, setProperties] = useState<RecentlyViewedProperty[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch recently viewed properties on mount
  useEffect(() => {
    fetchRecentlyViewed()
  }, [])

  /**
   * Fetch recently viewed properties from API
   */
  const fetchRecentlyViewed = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await authGet(`/api/recently-viewed?limit=${limit}`)

      if (!response.ok) {
        throw new Error("Failed to fetch recently viewed properties")
      }

      const result: RecentlyViewedResponse = await response.json()
      // Transform date strings to Date objects
      const transformedProperties = result.properties.map((property) => ({
        ...property,
        saleDate: property.saleDate ? new Date(property.saleDate) : null,
        viewedAt: new Date(property.viewedAt),
      }))
      setProperties(transformedProperties)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load recently viewed properties")
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Format currency value
   */
  const formatCurrency = (value: number | null): string => {
    if (value === null) return "N/A"
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  /**
   * Get thumbnail placeholder image
   * In future, this could be replaced with actual property images
   */
  const getThumbnailUrl = (property: RecentlyViewedProperty): string => {
    // Placeholder - could be replaced with property.thumbnailUrl when available
    return `https://via.placeholder.com/80x60/e2e8f0/64748b?text=${encodeURIComponent(property.parcelId.substring(0, 4))}`
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Recently Viewed</h3>
        <Clock className="h-4 w-4 text-slate-400" />
      </div>

      {/* Error Message */}
      {error && (
        <Card className="p-3 mb-4 border-red-200 bg-red-50">
          <div className="flex items-start gap-2 text-red-800">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div className="text-sm">{error}</div>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && properties.length === 0 && !error && (
        <Card className="p-6 text-center">
          <Clock className="h-8 w-8 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm mb-2">No recently viewed properties</p>
          <p className="text-slate-400 text-xs">
            Properties you view will appear here for quick access
          </p>
        </Card>
      )}

      {/* Recently Viewed Properties List */}
      {!isLoading && properties.length > 0 && (
        <div className="space-y-2">
          {properties.map((property) => (
            <Link key={property.id} href={`/properties/${property.propertyId}`}>
              <Card className="p-3 hover:bg-slate-50 transition-colors cursor-pointer group">
                <div className="flex gap-3">
                  {/* Thumbnail */}
                  <div className="flex-shrink-0 w-20 h-15 bg-slate-200 rounded overflow-hidden">
                    <img
                      src={getThumbnailUrl(property)}
                      alt={`Property ${property.parcelId}`}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Property Information */}
                  <div className="flex-1 min-w-0">
                    {/* Parcel ID with external link icon */}
                    <div className="flex items-center gap-1 mb-1">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {property.parcelId}
                      </p>
                      <ExternalLink className="h-3 w-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </div>

                    {/* Address */}
                    {property.propertyAddress && (
                      <div className="flex items-start gap-1 mb-1">
                        <MapPin className="h-3 w-3 text-slate-400 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-slate-600 truncate">
                          {property.propertyAddress}
                          {property.city && `, ${property.city}`}
                        </p>
                      </div>
                    )}

                    {/* Total Due and County */}
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      {property.totalDue !== null && (
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          <span className="font-medium">
                            {formatCurrency(property.totalDue)}
                          </span>
                        </div>
                      )}
                      <span className="text-slate-400">•</span>
                      <span>{property.stateCode}</span>
                    </div>

                    {/* Viewed timestamp */}
                    <p className="text-xs text-slate-400 mt-1">
                      Viewed {formatDate(property.viewedAt.toISOString())}
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* View All Link (if there are properties) */}
      {!isLoading && properties.length > 0 && properties.length >= limit && (
        <Link href="/properties?view=recent">
          <div className="mt-3 text-center">
            <span className="text-sm text-blue-600 hover:text-blue-700 hover:underline">
              View all recently viewed →
            </span>
          </div>
        </Link>
      )}
    </div>
  )
}

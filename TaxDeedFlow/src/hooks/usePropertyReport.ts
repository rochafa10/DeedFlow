/**
 * Custom hook for fetching property report data
 *
 * Provides a simple interface for fetching property reports from the API
 * with loading and error states.
 *
 * @module hooks/usePropertyReport
 */

import { useState, useEffect, useCallback } from "react"

/**
 * Property details from the report API
 */
export interface PropertyDetails {
  parcelId: string
  address: string
  city: string | null
  county: string
  state: string
  ownerName: string | null
  propertyType: string | null
  lotSize: string | null
  yearBuilt: number | null
  bedrooms: number | null
  bathrooms: number | null
  squareFootage: number | null
  zoning: string | null
  landUse: string | null
  assessedValue: number | null
  marketValue: number | null
  coordinates?: {
    lat: number | null
    lng: number | null
  }
}

/**
 * Auction information from the report API
 */
export interface AuctionInfo {
  saleType: string | null
  saleDate: string | null
  totalDue: number | null
  minimumBid: number | null
  auctionStatus: string | null
  taxYear: number | null
}

/**
 * Property images from the report API
 */
export interface PropertyImages {
  regridScreenshot: string | null
}

/**
 * Report metadata from the API
 */
export interface ReportMetadata {
  propertyId: string
  countyId: string
  hasRegridData: boolean
  dataQualityScore: number | null
  lastUpdated: string | null
}

/**
 * Full property report response structure
 */
export interface PropertyReportData {
  propertyDetails: PropertyDetails
  auctionInfo: AuctionInfo
  images: PropertyImages
  metadata: ReportMetadata
}

/**
 * API Response wrapper
 */
export interface PropertyReportResponse {
  data: PropertyReportData
  source: string
  timestamp: string
}

/**
 * Hook state return type
 */
export interface UsePropertyReportReturn {
  /** The property report data, null if not loaded */
  report: PropertyReportData | null
  /** Whether the report is currently loading */
  isLoading: boolean
  /** Error message if fetch failed */
  error: string | null
  /** Timestamp of last successful fetch */
  lastFetched: Date | null
  /** Function to manually refresh the data */
  refresh: () => Promise<void>
}

/**
 * Custom hook for fetching property report data
 *
 * @param propertyId - The UUID of the property to fetch, or null to skip
 * @returns Object containing report data, loading state, error, and refresh function
 *
 * @example
 * ```tsx
 * const { report, isLoading, error, refresh } = usePropertyReport(propertyId)
 *
 * if (isLoading) return <Loading />
 * if (error) return <Error message={error} />
 * if (!report) return <NoData />
 *
 * return <PropertyDetails details={report.propertyDetails} />
 * ```
 */
export function usePropertyReport(propertyId: string | null): UsePropertyReportReturn {
  const [report, setReport] = useState<PropertyReportData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastFetched, setLastFetched] = useState<Date | null>(null)

  const fetchReport = useCallback(async () => {
    if (!propertyId) {
      setReport(null)
      setError(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/properties/${propertyId}/report`)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          errorData.message || `Failed to fetch property report (${response.status})`
        )
      }

      const data: PropertyReportResponse = await response.json()
      setReport(data.data)
      setLastFetched(new Date())
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error occurred"
      setError(message)
      setReport(null)
    } finally {
      setIsLoading(false)
    }
  }, [propertyId])

  // Fetch report when propertyId changes
  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  return {
    report,
    isLoading,
    error,
    lastFetched,
    refresh: fetchReport,
  }
}

/**
 * Property list item for selector
 */
export interface PropertyListItem {
  id: string
  parcelId: string
  address: string
  county: string
  state: string
  totalDue: number | null
  saleType: string | null
}

/**
 * Properties list response
 */
export interface PropertiesListResponse {
  data: PropertyListItem[]
  count: number
  source: string
}

/**
 * Hook return type for properties list
 */
export interface UsePropertiesWithRegridReturn {
  properties: PropertyListItem[]
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
}

/**
 * Custom hook for fetching list of properties with regrid data
 *
 * @returns Object containing properties list, loading state, error, and refresh function
 *
 * @example
 * ```tsx
 * const { properties, isLoading } = usePropertiesWithRegrid()
 *
 * return (
 *   <select>
 *     {properties.map(p => (
 *       <option key={p.id} value={p.id}>{p.address}</option>
 *     ))}
 *   </select>
 * )
 * ```
 */
export function usePropertiesWithRegrid(): UsePropertiesWithRegridReturn {
  const [properties, setProperties] = useState<PropertyListItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchProperties = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/properties/with-regrid")

      if (!response.ok) {
        throw new Error(`Failed to fetch properties (${response.status})`)
      }

      const data: PropertiesListResponse = await response.json()
      setProperties(data.data)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error occurred"
      setError(message)
      setProperties([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProperties()
  }, [fetchProperties])

  return {
    properties,
    isLoading,
    error,
    refresh: fetchProperties,
  }
}

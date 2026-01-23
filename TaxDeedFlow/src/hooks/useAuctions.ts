/**
 * Custom hook for fetching auction data
 *
 * Provides a simple interface for fetching upcoming auctions, alerts, and statistics
 * with loading and error states.
 *
 * @module hooks/useAuctions
 */

import { useState, useEffect, useCallback } from "react"

/**
 * Auction information from the auctions API
 */
export interface Auction {
  /** Unique auction identifier */
  id: string
  /** County name */
  county: string
  /** State code (e.g., "PA", "FL") */
  state: string
  /** County UUID reference */
  countyId: string | null
  /** Sale date in ISO format */
  date: string
  /** Type of sale (e.g., "Tax Deed", "Tax Lien") */
  type: string
  /** Platform name (e.g., "Bid4Assets", "RealAuction") */
  platform: string
  /** Physical location of auction */
  location: string
  /** Number of properties in this auction */
  propertyCount: number
  /** Registration deadline in ISO format */
  registrationDeadline: string | null
  /** Days until registration deadline */
  registrationDaysUntil: number | null
  /** Deposit amount required (formatted string) */
  depositRequired: string
  /** Current status of the auction */
  status: string
  /** Days until auction date */
  daysUntil: number
}

/**
 * Alert information from the auctions API
 */
export interface Alert {
  /** Unique alert identifier */
  id: string
  /** Alert severity type (e.g., "critical", "warning", "info") */
  type: string
  /** Alert title */
  title: string
  /** Alert message */
  message: string
  /** Alert creation date in ISO format */
  date: string
  /** Related auction ID */
  auctionId: string | null
  /** Days until the event being alerted about */
  daysUntilEvent: number | null
}

/**
 * Auction statistics
 */
export interface AuctionStats {
  /** Total number of upcoming auctions */
  totalUpcoming: number
  /** Number of auctions this month */
  thisMonth: number
}

/**
 * Complete auctions data structure
 */
export interface AuctionsData {
  /** List of upcoming auctions */
  auctions: Auction[]
  /** Active alerts */
  alerts: Alert[]
  /** Auction statistics */
  stats: AuctionStats
}

/**
 * API Response wrapper
 */
export interface AuctionsResponse {
  /** The auctions data payload */
  data: AuctionsData
  /** Data source identifier */
  source: string
}

/**
 * Hook state return type
 */
export interface UseAuctionsReturn {
  /** List of upcoming auctions, empty array if not loaded */
  auctions: Auction[]
  /** Active alerts, empty array if not loaded */
  alerts: Alert[]
  /** Auction statistics, null if not loaded */
  stats: AuctionStats | null
  /** Whether the data is currently loading */
  isLoading: boolean
  /** Error message if fetch failed */
  error: string | null
  /** Timestamp of last successful fetch */
  lastFetched: Date | null
  /** Function to manually refresh the data */
  refresh: () => Promise<void>
}

/**
 * Custom hook for fetching auction data
 *
 * @returns Object containing auctions, alerts, stats, loading state, error, and refresh function
 *
 * @example
 * ```tsx
 * const { auctions, alerts, stats, isLoading, error, refresh } = useAuctions()
 *
 * if (isLoading) return <Loading />
 * if (error) return <Error message={error} />
 * if (!auctions.length) return <NoAuctions />
 *
 * return <AuctionList auctions={auctions} alerts={alerts} />
 * ```
 */
export function useAuctions(): UseAuctionsReturn {
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [stats, setStats] = useState<AuctionStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastFetched, setLastFetched] = useState<Date | null>(null)

  const fetchAuctions = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/auctions")

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          errorData.message || `Failed to fetch auctions (${response.status})`
        )
      }

      const data: AuctionsResponse = await response.json()
      setAuctions(data.data.auctions)
      setAlerts(data.data.alerts)
      setStats(data.data.stats)
      setLastFetched(new Date())
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error occurred"
      setError(message)
      setAuctions([])
      setAlerts([])
      setStats(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Fetch auctions on mount
  useEffect(() => {
    fetchAuctions()
  }, [fetchAuctions])

  return {
    auctions,
    alerts,
    stats,
    isLoading,
    error,
    lastFetched,
    refresh: fetchAuctions,
  }
}

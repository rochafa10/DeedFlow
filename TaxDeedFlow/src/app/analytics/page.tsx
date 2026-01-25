"use client"

import { useState, useEffect } from "react"
import {
  TrendingUp,
  BarChart3,
  MapPin,
  Filter,
  Search,
  Loader2,
  AlertTriangle,
  Info,
  Download,
  Calendar,
  RefreshCw,
} from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { AuctionHistoryChart } from "@/components/analytics/AuctionHistoryChart"
import { BidRatioChart } from "@/components/analytics/BidRatioChart"
import { CountyTrendsChart } from "@/components/analytics/CountyTrendsChart"
import { PricePredictionCard } from "@/components/analytics/PricePredictionCard"
import { cn } from "@/lib/utils"
import type { ARVAnalysis } from "@/lib/analysis/financial/types"

// ============================================
// Type Definitions
// ============================================

interface County {
  id: string
  county_name: string
  state_code: string
  state_name: string
}

interface AuctionHistoryRecord {
  id: string
  parcelId: string
  address: string
  saleDate: string
  saleType: string
  openingBid: number | null
  finalSalePrice: number | null
  bidRatio: number | null
  numberOfBids: number | null
  propertyType: string | null
}

interface CountyAnalytics {
  countyId: string
  countyName: string
  totalAuctions: number
  avgSalePrice: number | null
  avgBidRatio: number | null
  totalVolume: number | null
}

interface CountyTrendData {
  countyId: string
  countyName: string
  month: number
  year: number
  auctionCount: number
  avgSalePrice: number | null
  totalVolume: number | null
  avgBidRatio: number | null
}

// ============================================
// Main Component
// ============================================

export default function AnalyticsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()

  // Filter state
  const [selectedCounty, setSelectedCounty] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [dateRange, setDateRange] = useState<"3m" | "6m" | "12m" | "all">("12m")

  // Data state
  const [counties, setCounties] = useState<County[]>([])
  const [auctionHistory, setAuctionHistory] = useState<AuctionHistoryRecord[]>([])
  const [countyAnalytics, setCountyAnalytics] = useState<CountyAnalytics | null>(null)
  const [countyTrends, setCountyTrends] = useState<CountyTrendData[]>([])
  const [samplePrediction, setSamplePrediction] = useState<ARVAnalysis | null>(null)

  // Loading states
  const [isLoadingCounties, setIsLoadingCounties] = useState(true)
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, authLoading, router])

  // Fetch counties on mount
  useEffect(() => {
    async function fetchCounties() {
      if (!isAuthenticated) return

      setIsLoadingCounties(true)
      setLoadError(null)

      try {
        const response = await fetch("/api/counties")

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `Failed to fetch counties: ${response.status}`)
        }

        const result = await response.json()
        const countiesData = result.data || []
        setCounties(countiesData)

        // Auto-select first county with data if available
        if (countiesData.length > 0 && !selectedCounty) {
          setSelectedCounty(countiesData[0].id)
        }
      } catch (error) {
        console.error("Failed to fetch counties:", error)
        setLoadError(error instanceof Error ? error.message : "Failed to load counties")
      } finally {
        setIsLoadingCounties(false)
      }
    }

    if (isAuthenticated) {
      fetchCounties()
    }
  }, [isAuthenticated])

  // Fetch analytics data when county changes
  useEffect(() => {
    async function fetchAnalytics() {
      if (!selectedCounty) return

      setIsLoadingAnalytics(true)
      setLoadError(null)

      try {
        // Calculate date range
        const now = new Date()
        let startDate: string | null = null

        if (dateRange !== "all") {
          const monthsBack = dateRange === "3m" ? 3 : dateRange === "6m" ? 6 : 12
          const start = new Date(now)
          start.setMonth(start.getMonth() - monthsBack)
          startDate = start.toISOString().split("T")[0]
        }

        // Fetch auction history
        const historyParams = new URLSearchParams({
          county_id: selectedCounty,
          limit: "100",
        })
        if (startDate) historyParams.append("start_date", startDate)

        const historyResponse = await fetch(`/api/analytics/auction-history?${historyParams}`)

        if (!historyResponse.ok) {
          throw new Error("Failed to fetch auction history")
        }

        const historyResult = await historyResponse.json()
        setAuctionHistory(historyResult.data?.history || [])
        setCountyAnalytics(historyResult.data?.analytics || null)

        // Fetch county trends
        const trendsParams = new URLSearchParams({
          county_id: selectedCounty,
          months_back: dateRange === "all" ? "24" : dateRange === "3m" ? "3" : dateRange === "6m" ? "6" : "12",
        })

        const trendsResponse = await fetch(`/api/analytics/county-trends?${trendsParams}`)

        if (trendsResponse.ok) {
          const trendsResult = await trendsResponse.json()
          setCountyTrends(trendsResult.data?.trends || [])
        }

        // Set sample prediction (mock data for now)
        setSamplePrediction({
          estimatedARV: 45000,
          lowEstimate: 38000,
          highEstimate: 52000,
          confidence: "medium",
          comparablesUsed: 12,
          pricePerSqft: 85,
        })
      } catch (error) {
        console.error("Failed to fetch analytics:", error)
        setLoadError(error instanceof Error ? error.message : "Failed to load analytics data")
      } finally {
        setIsLoadingAnalytics(false)
      }
    }

    if (selectedCounty) {
      fetchAnalytics()
    }
  }, [selectedCounty, dateRange])

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-slate-500">Loading...</div>
      </div>
    )
  }

  // Don't render content if not authenticated
  if (!isAuthenticated) {
    return null
  }

  // Filter counties based on search
  const filteredCounties = counties.filter((county) => {
    const matchesSearch =
      searchQuery === "" ||
      county.county_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      county.state_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      county.state_code.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  // Get selected county details
  const selectedCountyDetails = counties.find((c) => c.id === selectedCounty)

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                <BarChart3 className="h-8 w-8 text-blue-600" />
                Historical Auction Analytics
              </h1>
              <p className="mt-2 text-slate-600 dark:text-slate-400">
                Analyze historical auction data to understand price trends and set realistic bid limits
              </p>
            </div>
            <button
              onClick={() => {
                if (selectedCounty) {
                  setIsLoadingAnalytics(true)
                  // Trigger re-fetch by updating a dummy state
                  setDateRange(dateRange)
                  setTimeout(() => setIsLoadingAnalytics(false), 1000)
                }
              }}
              disabled={!selectedCounty || isLoadingAnalytics}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
                selectedCounty && !isLoadingAnalytics
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              )}
            >
              <RefreshCw className={cn("h-4 w-4", isLoadingAnalytics && "animate-spin")} />
              Refresh
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Filters</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* County Select */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                County
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <select
                  value={selectedCounty || ""}
                  onChange={(e) => setSelectedCounty(e.target.value)}
                  disabled={isLoadingCounties}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                >
                  <option value="">Select County</option>
                  {filteredCounties.map((county) => (
                    <option key={county.id} value={county.id}>
                      {county.county_name}, {county.state_code}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Date Range
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value as "3m" | "6m" | "12m" | "all")}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="3m">Last 3 Months</option>
                  <option value="6m">Last 6 Months</option>
                  <option value="12m">Last 12 Months</option>
                  <option value="all">All Time</option>
                </select>
              </div>
            </div>

            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Search Counties
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or state..."
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoadingAnalytics && (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-slate-500 dark:text-slate-400">Loading analytics...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {loadError && !isLoadingAnalytics && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 mb-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              <div>
                <h3 className="text-lg font-semibold text-red-900 dark:text-red-100">
                  Failed to load analytics
                </h3>
                <p className="text-red-700 dark:text-red-300">{loadError}</p>
              </div>
            </div>
          </div>
        )}

        {/* No County Selected */}
        {!selectedCounty && !isLoadingCounties && !loadError && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-8 text-center">
            <Info className="h-12 w-12 text-blue-600 dark:text-blue-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Select a County to View Analytics
            </h3>
            <p className="text-blue-700 dark:text-blue-300">
              Choose a county from the dropdown above to see historical auction data and trends
            </p>
          </div>
        )}

        {/* Analytics Dashboard */}
        {selectedCounty && !isLoadingAnalytics && !loadError && (
          <div className="space-y-6">
            {/* Summary Stats */}
            {countyAnalytics && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Total Auctions</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                        {countyAnalytics.totalAuctions.toLocaleString()}
                      </p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-blue-600" />
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Avg Sale Price</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                        ${countyAnalytics.avgSalePrice?.toLocaleString() || "N/A"}
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-600" />
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Avg Bid Ratio</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                        {countyAnalytics.avgBidRatio?.toFixed(2)}x
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-amber-600" />
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Total Volume</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                        ${((countyAnalytics.totalVolume || 0) / 1000000).toFixed(1)}M
                      </p>
                    </div>
                    <Download className="h-8 w-8 text-purple-600" />
                  </div>
                </div>
              </div>
            )}

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Auction History Chart */}
              <AuctionHistoryChart
                history={auctionHistory}
                countyName={selectedCountyDetails?.county_name || ""}
                showOpeningBid={true}
                showAverageLine={true}
              />

              {/* Bid Ratio Chart */}
              <BidRatioChart
                history={auctionHistory}
                countyName={selectedCountyDetails?.county_name || ""}
              />
            </div>

            {/* County Trends Chart - Full Width */}
            {countyTrends.length > 0 && (
              <CountyTrendsChart
                data={countyTrends}
                metric="avgSalePrice"
                groupByQuarter={false}
                countyFilter={selectedCounty ? [selectedCounty] : []}
                showAverageLine={true}
              />
            )}

            {/* Sample Price Prediction */}
            {samplePrediction && (
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Info className="h-5 w-5 text-blue-600" />
                  Sample Price Prediction
                </h3>
                <PricePredictionCard
                  arvAnalysis={samplePrediction}
                  currentPrice={35000}
                  historicalCount={samplePrediction.comparablesUsed}
                />
              </div>
            )}

            {/* No Data Message */}
            {auctionHistory.length === 0 && !isLoadingAnalytics && (
              <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-8 text-center">
                <BarChart3 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  No Historical Data Available
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  There is no auction history data for {selectedCountyDetails?.county_name},{" "}
                  {selectedCountyDetails?.state_code} in the selected date range.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

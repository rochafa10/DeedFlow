"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Search,
  Filter,
  MapPin,
  Calendar,
  Building2,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
  ChevronRight,
  Activity,
  Database,
  RefreshCw,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Header } from "@/components/layout/Header"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { useCountyDashboard, County } from "@/hooks/useCountyDashboard"
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton"

type CountyStatus = "active" | "pending" | "archived"

const STATUS_CONFIG: Record<
  CountyStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  active: {
    label: "Active",
    color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  pending: {
    label: "Pending Research",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    icon: <Clock className="h-3 w-3" />,
  },
  archived: {
    label: "Archived",
    color: "bg-slate-100 text-slate-700 dark:bg-slate-700/30 dark:text-slate-400",
    icon: <AlertTriangle className="h-3 w-3" />,
  },
}

export default function CountiesDashboardPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [stateFilter, setStateFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<CountyStatus | "all">("all")
  const [showFilters, setShowFilters] = useState(false)

  // Fetch dashboard data
  const {
    data: dashboardResponse,
    isLoading: dataLoading,
    error,
    refetch,
    dataUpdatedAt,
  } = useCountyDashboard()

  // MOVED BEFORE CONDITIONAL RETURNS - Fix for React Hooks violation
  // Wrap counties in useMemo to stabilize reference
  const counties = useMemo(() => dashboardResponse?.data ?? [], [dashboardResponse?.data])
  const dataSource = dashboardResponse?.source
  const total = dashboardResponse?.total ?? 0

  // Get unique states for filter dropdown
  const uniqueStates = useMemo(() => {
    return Array.from(new Set(counties.map((c) => c.state))).sort()
  }, [counties])

  // Filter counties based on search and filters
  const filteredCounties = useMemo(() => {
    return counties.filter((county) => {
      const matchesSearch =
        searchQuery === "" ||
        county.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        county.state.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesState = stateFilter === "all" || county.state === stateFilter

      const matchesStatus = statusFilter === "all" || county.status === statusFilter

      return matchesSearch && matchesState && matchesStatus
    })
  }, [counties, searchQuery, stateFilter, statusFilter])

  // Count active filters
  const activeFilterCount = [stateFilter !== "all", statusFilter !== "all"].filter(
    Boolean
  ).length

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    return {
      total: counties.length,
      active: counties.filter((c) => c.status === "active").length,
      withAuctions: counties.filter((c) => c.nextAuctionDate !== null).length,
      totalProperties: counties.reduce((sum, c) => sum + c.propertyCount, 0),
    }
  }, [counties])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, authLoading, router])

  // NOW CONDITIONAL RENDERING - All hooks above are called on every render
  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-slate-500 dark:text-slate-400">Loading...</div>
      </div>
    )
  }

  // Don't render content if not authenticated
  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Header />

      {/* Main Content */}
      <main
        id="main-content"
        tabIndex={-1}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 outline-none"
      >
        {/* Page Title with Data Source Indicator */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              County Dashboard
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Unified view of all tracked counties, auctions, and research progress
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            {/* Last updated indicator */}
            {dataUpdatedAt && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Activity className="h-3 w-3" aria-hidden="true" />
                <span>
                  Updated{" "}
                  {new Date(dataUpdatedAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>
                <span className="text-slate-400 hidden sm:inline">
                  • Auto-refreshes every 10s
                </span>
              </div>
            )}
            {/* Data source indicator */}
            <div
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium",
                dataSource === "database"
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
              )}
            >
              <Database className="h-3 w-3" aria-hidden="true" />
              {dataSource === "database" ? "Live Data" : "Demo Mode"}
            </div>
            {/* Refresh button - min 44px touch target */}
            <button
              onClick={() => refetch()}
              className="flex items-center justify-center gap-1.5 px-3 min-h-[44px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              disabled={dataLoading}
              aria-label="Refresh data"
            >
              <RefreshCw
                className={cn("h-4 w-4", dataLoading && "animate-spin")}
                aria-hidden="true"
              />
              Refresh
            </button>
          </div>
        </div>

        {/* Loading State with Skeletons */}
        {dataLoading && !dashboardResponse && (
          <>
            {/* Summary Stats Skeletons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>

            {/* County Cards Skeletons */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Error State */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <p className="text-red-700 dark:text-red-400">
                Failed to load county dashboard data. Using cached data if available.
              </p>
            </div>
          </div>
        )}

        {/* Content - Only show when data is loaded */}
        {dashboardResponse && (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* Total Counties */}
              <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Total Counties
                    </p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">
                      {summaryStats.total}
                    </p>
                  </div>
                </div>
              </div>

              {/* Active Counties */}
              <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Active Research
                    </p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">
                      {summaryStats.active}
                    </p>
                  </div>
                </div>
              </div>

              {/* Counties with Auctions */}
              <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Upcoming Auctions
                    </p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">
                      {summaryStats.withAuctions}
                    </p>
                  </div>
                </div>
              </div>

              {/* Total Properties */}
              <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                    <Building2 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Total Properties
                    </p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">
                      {summaryStats.totalProperties.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Search and Filters Bar */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 mb-6">
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Search Input */}
                <div className="flex-1 relative">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    type="text"
                    placeholder="Search counties by name or state..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
                    aria-label="Search counties"
                  />
                </div>

                {/* Filter Button */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={cn(
                    "flex items-center justify-center gap-2 px-4 py-2 rounded-lg border transition-colors min-h-[44px]",
                    showFilters
                      ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400"
                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                  )}
                  aria-expanded={showFilters}
                  aria-controls="filter-panel"
                >
                  <Filter className="h-4 w-4" aria-hidden="true" />
                  <span>Filters</span>
                  {activeFilterCount > 0 && (
                    <span className="px-1.5 py-0.5 bg-blue-600 dark:bg-blue-500 text-white text-xs rounded-full">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Expandable Filters */}
              {showFilters && (
                <div
                  id="filter-panel"
                  className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-4"
                >
                  {/* State Filter */}
                  <div>
                    <label
                      htmlFor="state-filter"
                      className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
                    >
                      State
                    </label>
                    <select
                      id="state-filter"
                      value={stateFilter}
                      onChange={(e) => setStateFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
                    >
                      <option value="all">All States</option>
                      {uniqueStates.map((state) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Status Filter */}
                  <div>
                    <label
                      htmlFor="status-filter"
                      className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
                    >
                      Status
                    </label>
                    <select
                      id="status-filter"
                      value={statusFilter}
                      onChange={(e) =>
                        setStatusFilter(e.target.value as CountyStatus | "all")
                      }
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
                    >
                      <option value="all">All Statuses</option>
                      <option value="active">Active</option>
                      <option value="pending">Pending Research</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Results Count */}
            <div className="mb-4 text-sm text-slate-600 dark:text-slate-400">
              Showing {filteredCounties.length} of {total} counties
              {(searchQuery || stateFilter !== "all" || statusFilter !== "all") && (
                <button
                  onClick={() => {
                    setSearchQuery("")
                    setStateFilter("all")
                    setStatusFilter("all")
                  }}
                  className="ml-2 text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>

            {/* County Cards Grid */}
            {filteredCounties.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-12 text-center">
                <MapPin className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  No counties found
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  {searchQuery || stateFilter !== "all" || statusFilter !== "all"
                    ? "Try adjusting your search or filters"
                    : "No counties have been added yet"}
                </p>
                {(searchQuery || stateFilter !== "all" || statusFilter !== "all") && (
                  <button
                    onClick={() => {
                      setSearchQuery("")
                      setStateFilter("all")
                      setStatusFilter("all")
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCounties.map((county) => (
                  <CountyCard key={county.id} county={county} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

// County Card Component
interface CountyCardProps {
  county: County
}

function CountyCard({ county }: CountyCardProps) {
  const router = useRouter()

  const handleCardClick = () => {
    router.push(`/counties/${county.id}`)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      handleCardClick()
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer group"
      aria-label={`View details for ${county.name}, ${county.state}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {county.name}
          </h3>
          <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400 mt-1">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{county.stateName || county.state}</span>
          </div>
        </div>
        <div
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
            STATUS_CONFIG[county.status].color
          )}
        >
          {STATUS_CONFIG[county.status].icon}
          {STATUS_CONFIG[county.status].label}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-1.5">
          <span>Research Progress</span>
          <span className="font-medium">{county.progress}%</span>
        </div>
        <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-300",
              county.progress === 100
                ? "bg-green-500 dark:bg-green-600"
                : county.progress >= 50
                ? "bg-blue-500 dark:bg-blue-600"
                : "bg-amber-500 dark:bg-amber-600"
            )}
            style={{ width: `${county.progress}%` }}
            role="progressbar"
            aria-valuenow={county.progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Research progress: ${county.progress}%`}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Property Count */}
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-xs mb-1">
            <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Properties</span>
          </div>
          <p className="text-lg font-semibold text-slate-900 dark:text-white">
            {county.propertyCount.toLocaleString()}
          </p>
        </div>

        {/* Next Auction */}
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-xs mb-1">
            <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Next Auction</span>
          </div>
          {county.nextAuctionDate && county.daysUntilAuction !== null ? (
            <div>
              <p className="text-lg font-semibold text-slate-900 dark:text-white">
                {county.daysUntilAuction === 0
                  ? "Today"
                  : county.daysUntilAuction === 1
                  ? "Tomorrow"
                  : `${county.daysUntilAuction}d`}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {new Date(county.nextAuctionDate).toLocaleDateString([], {
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">Not scheduled</p>
          )}
        </div>
      </div>

      {/* Last Researched */}
      {county.researchedAt && (
        <div className="text-xs text-slate-500 dark:text-slate-400 pt-3 border-t border-slate-200 dark:border-slate-700">
          Last researched:{" "}
          {new Date(county.researchedAt).toLocaleDateString([], {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </div>
      )}

      {/* View Details Arrow */}
      <div className="flex items-center justify-end mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
        <span className="text-sm text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 flex items-center gap-1">
          View Details
          <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
        </span>
      </div>
    </div>
  )
}

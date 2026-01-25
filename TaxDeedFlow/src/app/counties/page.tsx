"use client"

import { useState, useEffect } from "react"
import {
  Search,
  Filter,
  MapPin,
  Calendar,
  Building2,
  FileText,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
} from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { MobileDataTable } from "@/components/shared/MobileDataTable"

// County type from API
interface County {
  id: string
  name: string
  state: string
  stateName: string | null
  status: "active" | "pending" | "archived"
  propertyCount: number
  progress: number
  nextAuctionDate: string | null
  daysUntilAuction: number | null
  documentsCount: number
  researchedAt: string | null
}

type CountyStatus = "active" | "pending" | "archived"

const STATUS_CONFIG: Record<
  CountyStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  active: {
    label: "Active",
    color: "bg-green-100 text-green-700",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  pending: {
    label: "Pending Research",
    color: "bg-amber-100 text-amber-700",
    icon: <Clock className="h-3 w-3" />,
  },
  archived: {
    label: "Archived",
    color: "bg-slate-100 text-slate-700",
    icon: <AlertTriangle className="h-3 w-3" />,
  },
}

export default function CountiesPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [stateFilter, setStateFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<CountyStatus | "all">("all")
  const [showFilters, setShowFilters] = useState(false)

  // Data fetching state
  const [counties, setCounties] = useState<County[]>([])
  const [isLoadingCounties, setIsLoadingCounties] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Get unique states for filter dropdown
  const uniqueStates = Array.from(new Set(counties.map(c => c.state))).sort()

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, authLoading, router])

  // Fetch counties from API
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
        setCounties(result.data || [])
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

  // Show loading state while fetching counties
  if (isLoadingCounties) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-slate-500 dark:text-slate-400">Loading counties...</p>
          </div>
        </div>
      </div>
    )
  }

  // Show error state if loading failed
  if (loadError) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3 text-center">
            <AlertTriangle className="h-10 w-10 text-red-500" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Failed to load counties</h2>
            <p className="text-slate-500 dark:text-slate-400">{loadError}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Filter counties based on search and filters
  const filteredCounties = counties.filter((county) => {
    const matchesSearch =
      searchQuery === "" ||
      county.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      county.state.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesState =
      stateFilter === "all" || county.state === stateFilter

    const matchesStatus =
      statusFilter === "all" || county.status === statusFilter

    return matchesSearch && matchesState && matchesStatus
  })

  // Count active filters
  const activeFilterCount = [stateFilter !== "all", statusFilter !== "all"].filter(Boolean).length

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Counties</h1>
          <p className="text-slate-600 mt-1">
            Manage and track county research and auction data
          </p>
        </div>

        {/* Search and Filters Bar */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by county name or state..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* Filters Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors",
                showFilters
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              )}
            >
              <Filter className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="bg-white/20 text-xs px-1.5 py-0.5 rounded">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="flex flex-wrap gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    State
                  </label>
                  <select
                    value={stateFilter}
                    onChange={(e) => setStateFilter(e.target.value)}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="all">All States</option>
                    {uniqueStates.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as CountyStatus | "all")}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="pending">Pending Research</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
                {activeFilterCount > 0 && (
                  <div className="flex items-end">
                    <button
                      onClick={() => {
                        setStateFilter("all")
                        setStatusFilter("all")
                      }}
                      className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700 underline"
                    >
                      Clear all filters
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Results Summary */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Showing{" "}
            <span className="font-medium">{filteredCounties.length}</span> of{" "}
            <span className="font-medium">{counties.length}</span>{" "}
            counties
          </p>
        </div>

        {/* Counties Table */}
        <MobileDataTable
          cardView={
            <div className="space-y-3">
              {filteredCounties.length > 0 ? (
                filteredCounties.map((county) => (
                  <div
                    key={county.id}
                    className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3"
                  >
                    {/* Header: County Name + State */}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <MapPin className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                        <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100">
                          {county.name}
                        </h3>
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400 ml-7">
                        {county.state}
                      </div>
                    </div>

                    {/* Status */}
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Status</div>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                          STATUS_CONFIG[county.status as CountyStatus].color
                        )}
                      >
                        {STATUS_CONFIG[county.status as CountyStatus].icon}
                        {STATUS_CONFIG[county.status as CountyStatus].label}
                      </span>
                    </div>

                    {/* Properties + Documents */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Properties</div>
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {county.propertyCount.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Documents</div>
                        <div className="flex items-center gap-1.5">
                          <FileText className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {county.documentsCount}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mb-1.5">Progress</div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                county.progress >= 75
                                  ? "bg-green-500"
                                  : county.progress >= 50
                                  ? "bg-amber-500"
                                  : county.progress > 0
                                  ? "bg-blue-500"
                                  : "bg-slate-300 dark:bg-slate-600"
                              )}
                              style={{ width: `${county.progress}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100 min-w-[38px]">
                          {county.progress}%
                        </span>
                      </div>
                    </div>

                    {/* Next Auction */}
                    {county.nextAuctionDate && (
                      <div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Next Auction</div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                          <span className="text-sm text-slate-900 dark:text-slate-100">
                            {county.nextAuctionDate}
                          </span>
                          {county.daysUntilAuction !== null && (
                            <span
                              className={cn(
                                "text-xs font-medium",
                                county.daysUntilAuction <= 14
                                  ? "text-red-600 dark:text-red-400"
                                  : county.daysUntilAuction <= 30
                                  ? "text-amber-600 dark:text-amber-400"
                                  : "text-slate-500 dark:text-slate-400"
                              )}
                            >
                              ({county.daysUntilAuction} days)
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Last Researched */}
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Last Researched</div>
                      {county.researchedAt ? (
                        <div>
                          <div className="text-sm text-slate-900 dark:text-slate-100">
                            {new Date(county.researchedAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {Math.floor((Date.now() - new Date(county.researchedAt).getTime()) / (1000 * 60 * 60 * 24))} days ago
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400 dark:text-slate-500 italic">Not researched</span>
                      )}
                    </div>

                    {/* Action Button */}
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                      <button
                        onClick={() => router.push(`/counties/${county.id}`)}
                        className="w-full min-h-[44px] px-4 py-2 flex items-center justify-center gap-2 text-sm text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 rounded-lg font-medium transition-colors"
                      >
                        View Details
                        <ExternalLink className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-8">
                  <div className="text-center text-slate-500 dark:text-slate-400">
                    No counties found matching your criteria
                  </div>
                </div>
              )}
            </div>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    County
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    State
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Properties
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Progress
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Next Auction
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Last Researched
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredCounties.length > 0 ? (
                  filteredCounties.map((county) => (
                    <tr key={county.id} className="hover:bg-slate-50">
                      {/* County Name */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-slate-400" />
                          <span className="font-medium text-slate-900">
                            {county.name}
                          </span>
                        </div>
                      </td>
                      {/* State */}
                      <td className="px-4 py-4">
                        <span className="text-sm text-slate-700">
                          {county.state}
                        </span>
                      </td>
                      {/* Status */}
                      <td className="px-4 py-4">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                            STATUS_CONFIG[county.status as CountyStatus].color
                          )}
                        >
                          {STATUS_CONFIG[county.status as CountyStatus].icon}
                          {STATUS_CONFIG[county.status as CountyStatus].label}
                        </span>
                      </td>
                      {/* Property Count */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-slate-400" />
                          <span className="text-sm font-medium text-slate-900">
                            {county.propertyCount.toLocaleString()}
                          </span>
                        </div>
                      </td>
                      {/* Progress */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 min-w-[60px] max-w-[100px]">
                            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all",
                                  county.progress >= 75
                                    ? "bg-green-500"
                                    : county.progress >= 50
                                    ? "bg-amber-500"
                                    : county.progress > 0
                                    ? "bg-blue-500"
                                    : "bg-slate-300"
                                )}
                                style={{ width: `${county.progress}%` }}
                              />
                            </div>
                          </div>
                          <span className="text-xs text-slate-600 min-w-[32px]">
                            {county.progress}%
                          </span>
                        </div>
                      </td>
                      {/* Next Auction */}
                      <td className="px-4 py-4">
                        {county.nextAuctionDate ? (
                          <div>
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-slate-400" />
                              <span className="text-sm text-slate-700">
                                {county.nextAuctionDate}
                              </span>
                            </div>
                            {county.daysUntilAuction !== null && (
                              <span
                                className={cn(
                                  "text-xs",
                                  county.daysUntilAuction <= 14
                                    ? "text-red-600"
                                    : county.daysUntilAuction <= 30
                                    ? "text-amber-600"
                                    : "text-slate-500"
                                )}
                              >
                                {county.daysUntilAuction} days
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">-</span>
                        )}
                      </td>
                      {/* Last Researched */}
                      <td className="px-4 py-4">
                        {county.researchedAt ? (
                          <div>
                            <span className="text-sm text-slate-700">
                              {new Date(county.researchedAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                            <div className="text-xs text-slate-500">
                              {Math.floor((Date.now() - new Date(county.researchedAt).getTime()) / (1000 * 60 * 60 * 24))} days ago
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400 italic">Not researched</span>
                        )}
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-4">
                        <button
                          onClick={() => router.push(`/counties/${county.id}`)}
                          className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 font-medium"
                        >
                          View
                          <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      No counties found matching your criteria
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </MobileDataTable>
      </main>
    </div>
  )
}

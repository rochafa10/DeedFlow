"use client"

import { useState } from "react"
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
} from "lucide-react"
import { Header } from "@/components/layout/Header"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

// Mock county data for demo
const MOCK_COUNTIES = [
  {
    id: "1",
    name: "Westmoreland",
    state: "PA",
    status: "active",
    propertyCount: 172,
    progress: 85, // Pipeline progress percentage
    nextAuctionDate: "Jan 16, 2026",
    daysUntilAuction: 7,
    documentsCount: 8,
    researchedAt: "2026-01-05",
  },
  {
    id: "2",
    name: "Blair",
    state: "PA",
    status: "active",
    propertyCount: 252,
    progress: 62,
    nextAuctionDate: "Mar 11, 2026",
    daysUntilAuction: 62,
    documentsCount: 12,
    researchedAt: "2026-01-03",
  },
  {
    id: "3",
    name: "Somerset",
    state: "PA",
    status: "active",
    propertyCount: 2663,
    progress: 28,
    nextAuctionDate: "Sep 08, 2026",
    daysUntilAuction: 242,
    documentsCount: 15,
    researchedAt: "2026-01-02",
  },
  {
    id: "4",
    name: "Centre",
    state: "PA",
    status: "pending",
    propertyCount: 0,
    progress: 0,
    nextAuctionDate: null,
    daysUntilAuction: null,
    documentsCount: 0,
    researchedAt: null,
  },
  {
    id: "5",
    name: "Allegheny",
    state: "PA",
    status: "pending",
    propertyCount: 0,
    progress: 0,
    nextAuctionDate: null,
    daysUntilAuction: null,
    documentsCount: 0,
    researchedAt: null,
  },
  {
    id: "6",
    name: "Philadelphia",
    state: "PA",
    status: "active",
    propertyCount: 4521,
    progress: 45,
    nextAuctionDate: "Apr 15, 2026",
    daysUntilAuction: 97,
    documentsCount: 22,
    researchedAt: "2025-12-28",
  },
  {
    id: "7",
    name: "Cambria",
    state: "PA",
    status: "active",
    propertyCount: 845,
    progress: 72,
    nextAuctionDate: "May 20, 2026",
    daysUntilAuction: 132,
    documentsCount: 9,
    researchedAt: "2026-01-01",
  },
  {
    id: "8",
    name: "Bedford",
    state: "PA",
    status: "pending",
    propertyCount: 0,
    progress: 0,
    nextAuctionDate: null,
    daysUntilAuction: null,
    documentsCount: 0,
    researchedAt: null,
  },
]

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

  // Get unique states for filter dropdown
  const uniqueStates = Array.from(new Set(MOCK_COUNTIES.map(c => c.state))).sort()

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, authLoading, router])

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500">Loading...</div>
      </div>
    )
  }

  // Don't render content if not authenticated
  if (!isAuthenticated) {
    return null
  }

  // Filter counties based on search and filters
  const filteredCounties = MOCK_COUNTIES.filter((county) => {
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
    <div className="min-h-screen bg-slate-50">
      <Header />

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
          <p className="text-sm text-slate-600">
            Showing{" "}
            <span className="font-medium">{filteredCounties.length}</span> of{" "}
            <span className="font-medium">{MOCK_COUNTIES.length}</span>{" "}
            counties
          </p>
        </div>

        {/* Counties Table */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
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
                      colSpan={7}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      No counties found matching your criteria
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ")
}

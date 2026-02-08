"use client"

import { useState, useMemo, Suspense, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { usePipelineData } from "@/hooks/usePipelineData"
import { PipelineBoard } from "@/components/deal-pipeline/PipelineBoard"
import { CreateDealDialog } from "@/components/deal-pipeline/CreateDealDialog"
import { DealDetailSheet } from "@/components/deal-pipeline/DealDetailSheet"
import {
  Activity,
  Database,
  RefreshCw,
  Plus,
  Search,
  TrendingUp,
  DollarSign,
  AlertCircle,
  Loader2,
  SlidersHorizontal,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type {
  DealWithMetrics,
  PipelineStageWithMetrics,
} from "@/types/deal-pipeline"

// ============================================
// Pipeline Content (Main Component)
// ============================================

function PipelineContent() {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()

  // Pipeline data via React Query
  const {
    data: pipelineResponse,
    isLoading,
    error,
    refetch,
    dataUpdatedAt,
  } = usePipelineData()

  // UI state
  const [searchQuery, setSearchQuery] = useState("")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [stateFilter, setStateFilter] = useState<string>("all")
  const [countyFilter, setCountyFilter] = useState<string>("all")
  const [saleTypeFilter, setSaleTypeFilter] = useState<string>("all")
  const [dateRangeFilter, setDateRangeFilter] = useState<string>("all")
  const [showFilters, setShowFilters] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [selectedDeal, setSelectedDeal] = useState<DealWithMetrics | null>(null)
  const [detailSheetOpen, setDetailSheetOpen] = useState(false)

  // Local deal state for optimistic updates
  const [localDeals, setLocalDeals] = useState<DealWithMetrics[] | null>(null)

  // Auth redirect
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, authLoading, router])

  // Sync remote data into local state when it arrives
  useEffect(() => {
    if (pipelineResponse?.data?.deals) {
      setLocalDeals(pipelineResponse.data.deals)
    }
  }, [pipelineResponse?.data?.deals])

  // Date range options for auction date filtering
  const DATE_RANGES = [
    { value: "all", label: "All Dates" },
    { value: "7days", label: "Next 7 Days" },
    { value: "30days", label: "Next 30 Days" },
    { value: "90days", label: "Next 90 Days" },
    { value: "6months", label: "Next 6 Months" },
  ]

  // Sale type options
  const SALE_TYPES = [
    { value: "all", label: "All Types" },
    { value: "upset", label: "Upset" },
    { value: "judicial", label: "Judicial" },
    { value: "repository", label: "Repository" },
    { value: "tax_certificate", label: "Tax Certificate" },
    { value: "tax_deed", label: "Tax Deed" },
    { value: "sheriff_sale", label: "Sheriff Sale" },
  ]

  // Extract data
  const pipelineData = pipelineResponse?.data
  const dataSource = pipelineResponse?.source
  const stages: PipelineStageWithMetrics[] = pipelineData?.stages ?? []
  const allDeals: DealWithMetrics[] = localDeals ?? pipelineData?.deals ?? []
  const filterOptions = pipelineData?.filterOptions

  // Counties filtered by selected state
  const filteredCounties = useMemo(() => {
    const counties = filterOptions?.counties ?? []
    if (stateFilter === "all") return counties
    return counties.filter((c) => c.state === stateFilter)
  }, [filterOptions?.counties, stateFilter])

  // Active filter count
  const activeFilterCount = [
    searchQuery && searchQuery.trim(),
    priorityFilter !== "all",
    statusFilter !== "all",
    stateFilter !== "all",
    countyFilter !== "all",
    saleTypeFilter !== "all",
    dateRangeFilter !== "all",
  ].filter(Boolean).length

  // Filter deals
  const filteredDeals = useMemo(() => {
    let filtered = [...allDeals]

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.description?.toLowerCase().includes(q) ||
          d.tags?.some((t) => t.toLowerCase().includes(q))
      )
    }

    if (priorityFilter !== "all") {
      filtered = filtered.filter((d) => d.priority === priorityFilter)
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((d) => d.status === statusFilter)
    }

    if (stateFilter !== "all") {
      filtered = filtered.filter((d) => d.state_code === stateFilter)
    }

    if (countyFilter !== "all") {
      filtered = filtered.filter((d) => d.county_id === countyFilter)
    }

    if (saleTypeFilter !== "all") {
      filtered = filtered.filter((d) => d.sale_type === saleTypeFilter)
    }

    if (dateRangeFilter !== "all") {
      const now = new Date()
      const rangeDays: Record<string, number> = { "7days": 7, "30days": 30, "90days": 90, "6months": 180 }
      const days = rangeDays[dateRangeFilter]
      if (days) {
        const cutoff = new Date(now.getTime() + days * 86400000)
        filtered = filtered.filter((d) => {
          if (!d.auction_date) return false
          const aDate = new Date(d.auction_date)
          return aDate >= now && aDate <= cutoff
        })
      }
    }

    return filtered
  }, [allDeals, searchQuery, priorityFilter, statusFilter, stateFilter, countyFilter, saleTypeFilter, dateRangeFilter])

  // Computed stats from filtered deals
  const totalDeals = filteredDeals.filter((d) => d.status === "active").length
  const totalValue = filteredDeals.reduce(
    (s, d) => s + (d.estimated_value || 0),
    0
  )
  const totalProfit = filteredDeals.reduce(
    (s, d) => s + (d.estimated_profit || 0),
    0
  )
  const overdueCount = filteredDeals.filter((d) => d.is_overdue).length

  // Handlers
  const handleMoveDeal = (dealId: string, toStageId: string) => {
    const targetStage = stages.find((s) => s.id === toStageId)

    setLocalDeals((prev) => {
      if (!prev) return prev
      return prev.map((deal) =>
        deal.id === dealId
          ? {
              ...deal,
              current_stage_id: toStageId,
              current_stage_name: targetStage?.name ?? deal.current_stage_name,
              current_stage_color: targetStage?.color ?? deal.current_stage_color,
              days_in_stage: 0,
            }
          : deal
      )
    })
  }

  const handleDealClick = (deal: DealWithMetrics) => {
    setSelectedDeal(deal)
    setDetailSheetOpen(true)
  }

  // Auth loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  // Not authenticated - redirect in progress
  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <main
        id="main-content"
        tabIndex={-1}
        className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 outline-none"
      >
        {/* Header - matches Dashboard layout */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Deal Pipeline
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Track and manage deals from research to acquisition
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
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
              </div>
            )}
            {/* Data source indicator */}
            <div
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium",
                dataSource === "database"
                  ? "bg-green-100 text-green-700"
                  : "bg-amber-100 text-amber-700"
              )}
            >
              <Database className="h-3 w-3" aria-hidden="true" />
              {dataSource === "database" ? "Live Data" : "Demo Mode"}
            </div>
            {/* Refresh button */}
            <button
              onClick={() => refetch()}
              className="flex items-center justify-center gap-1.5 px-3 min-h-[44px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              disabled={isLoading}
            >
              <RefreshCw
                className={cn("h-4 w-4", isLoading && "animate-spin")}
                aria-hidden="true"
              />
              Refresh
            </button>
            {/* New Deal button */}
            <button
              onClick={() => setCreateDialogOpen(true)}
              className="flex items-center gap-1.5 px-4 min-h-[44px] rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              New Deal
            </button>
          </div>
        </div>

        {/* KPI Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Active Deals"
            value={totalDeals.toString()}
            icon={<TrendingUp className="h-5 w-5" aria-hidden="true" />}
          />
          <StatCard
            title="Total Value"
            value={`$${totalValue.toLocaleString()}`}
            icon={<DollarSign className="h-5 w-5" aria-hidden="true" />}
          />
          <StatCard
            title="Est. Profit"
            value={`$${totalProfit.toLocaleString()}`}
            icon={<TrendingUp className="h-5 w-5" aria-hidden="true" />}
            isPositive
          />
          <StatCard
            title="Overdue"
            value={overdueCount.toString()}
            icon={<AlertCircle className="h-5 w-5" aria-hidden="true" />}
            isAlert={overdueCount > 0}
          />
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search deals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
            <option value="abandoned">Abandoned</option>
          </select>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-colors",
              showFilters || activeFilterCount > 2
                ? "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300"
                : "bg-white border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
            )}
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
          {activeFilterCount > 0 && (
            <button
              onClick={() => {
                setSearchQuery("")
                setPriorityFilter("all")
                setStatusFilter("all")
                setStateFilter("all")
                setCountyFilter("all")
                setSaleTypeFilter("all")
                setDateRangeFilter("all")
              }}
              className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Expanded Filter Panel */}
        {showFilters && (
          <div className="mb-6 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* State */}
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">State</label>
                <select
                  value={stateFilter}
                  onChange={(e) => { setStateFilter(e.target.value); setCountyFilter("all") }}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300"
                >
                  <option value="all">All States</option>
                  {(filterOptions?.states ?? []).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* County */}
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">County</label>
                <select
                  value={countyFilter}
                  onChange={(e) => setCountyFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300"
                >
                  <option value="all">All Counties</option>
                  {filteredCounties.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Sale Type */}
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Sale Type</label>
                <select
                  value={saleTypeFilter}
                  onChange={(e) => setSaleTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300"
                >
                  {SALE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* Auction Date */}
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Auction Date</label>
                <select
                  value={dateRangeFilter}
                  onChange={(e) => setDateRangeFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300"
                >
                  {DATE_RANGES.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            Failed to load pipeline data. Using cached data.
          </div>
        )}

        {/* Pipeline Board */}
        <PipelineBoard
          stages={stages}
          deals={filteredDeals}
          isLoading={isLoading && !pipelineData}
          error={null}
          onMoveDeal={handleMoveDeal}
          onDealClick={handleDealClick}
          onCreateDeal={() => setCreateDialogOpen(true)}
        />

        <CreateDealDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          stages={stages}
          onSuccess={() => refetch()}
        />

        <DealDetailSheet
          deal={selectedDeal}
          open={detailSheetOpen}
          onOpenChange={setDetailSheetOpen}
          stages={stages}
        />
      </main>
    </div>
  )
}

// ============================================
// StatCard Component
// ============================================

function StatCard({
  title,
  value,
  icon,
  isPositive,
  isAlert,
}: {
  title: string
  value: string
  icon: React.ReactNode
  isPositive?: boolean
  isAlert?: boolean
}) {
  return (
    <div
      className={cn(
        "bg-white dark:bg-slate-800 rounded-lg border p-4",
        isAlert
          ? "border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800"
          : "border-slate-200 dark:border-slate-700"
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className={cn(
            "text-sm font-medium",
            isAlert
              ? "text-red-600 dark:text-red-400"
              : "text-slate-500 dark:text-slate-400"
          )}
        >
          {title}
        </span>
        <span
          className={cn(
            isAlert
              ? "text-red-500 dark:text-red-400"
              : "text-slate-400 dark:text-slate-500"
          )}
        >
          {icon}
        </span>
      </div>
      <div
        className={cn(
          "text-2xl font-bold",
          isPositive
            ? "text-green-600 dark:text-green-400"
            : isAlert
              ? "text-red-700 dark:text-red-400"
              : "text-slate-900 dark:text-white"
        )}
      >
        {value}
      </div>
    </div>
  )
}

// ============================================
// Page Export with Suspense Boundary
// ============================================

export default function PipelinePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <PipelineContent />
    </Suspense>
  )
}

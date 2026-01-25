"use client"

import {
  Building2,
  MapPin,
  CheckCircle2,
  Clock,
  Calendar,
  TrendingUp,
  AlertTriangle,
  Activity,
  RefreshCw,
  Database,
  ChevronDown,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { useDashboardData } from "@/hooks/useDashboardData"
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton"

export default function DashboardPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()

  // Fetch dashboard data
  const {
    data: dashboardResponse,
    isLoading: dataLoading,
    error,
    refetch,
    dataUpdatedAt,
  } = useDashboardData()

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, authLoading, router])

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

  const dashboardData = dashboardResponse?.data
  const dataSource = dashboardResponse?.source

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Main Content */}
      <main id="main-content" tabIndex={-1} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 outline-none">
        {/* Page Title with Data Source Indicator */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Real-time pipeline overview and key metrics
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            {/* Last updated indicator */}
            {dataUpdatedAt && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Activity className="h-3 w-3" aria-hidden="true" />
                <span>
                  Updated {new Date(dataUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                <span className="text-slate-400 hidden sm:inline">• Auto-refreshes every 10s</span>
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
            {/* Refresh button - min 44px touch target */}
            <button
              onClick={() => refetch()}
              className="flex items-center justify-center gap-1.5 px-3 min-h-[44px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              disabled={dataLoading}
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
        {dataLoading && !dashboardData && (
          <>
            {/* KPI Card Skeletons */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>

            {/* Main Grid Skeletons */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Pipeline Funnel Skeleton */}
              <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Skeleton className="h-5 w-5" />
                  <Skeleton className="h-5 w-32" />
                </div>
                <div className="space-y-0.5">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i}>
                      <div className="flex justify-between mb-1">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                      <Skeleton className="h-3 w-full rounded-full" />
                      {/* Add connector skeleton between bars (except after last bar) */}
                      {i < 3 && (
                        <div className="flex flex-col items-center py-2" aria-hidden="true">
                          <div className="flex flex-col -space-y-2 opacity-30">
                            <Skeleton className="h-4 w-4 rounded" />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Upcoming Auctions Skeleton */}
              <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Skeleton className="h-5 w-5" />
                  <Skeleton className="h-5 w-36" />
                </div>
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="p-3 rounded-lg border border-slate-200">
                      <div className="flex justify-between">
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                        <div className="text-right space-y-2">
                          <Skeleton className="h-4 w-16" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* County Progress Table Skeleton */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="p-6 border-b border-slate-200">
                <Skeleton className="h-6 w-36" />
              </div>
              <div className="p-4">
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-4 w-1/4" />
                      <Skeleton className="h-4 w-1/6" />
                      <Skeleton className="h-4 w-1/6" />
                      <Skeleton className="h-4 w-1/6" />
                      <Skeleton className="h-4 w-1/6" />
                      <Skeleton className="h-6 w-16 rounded-full" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Error State */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            Failed to load dashboard data. Using cached data if available.
          </div>
        )}

        {/* KPI Cards */}
        {dashboardData && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              <KpiCard
                title="Counties"
                value={dashboardData.stats.counties.total.toLocaleString()}
                description="Researched"
                icon={<MapPin className="h-5 w-5" aria-hidden="true" />}
                trend={dashboardData.stats.counties.trend}
              />
              <KpiCard
                title="Properties"
                value={dashboardData.stats.properties.total.toLocaleString()}
                description="In pipeline"
                icon={<Building2 className="h-5 w-5" aria-hidden="true" />}
                trend={dashboardData.stats.properties.trend}
              />
              <KpiCard
                title="Approved"
                value={dashboardData.stats.approved.total.toLocaleString()}
                description="Ready to bid"
                icon={<CheckCircle2 className="h-5 w-5" aria-hidden="true" />}
                trend={dashboardData.stats.approved.percentage}
              />
              <KpiCard
                title="Pending"
                value={dashboardData.stats.pending.total.toLocaleString()}
                description="Need processing"
                icon={<Clock className="h-5 w-5" aria-hidden="true" />}
                trend={dashboardData.stats.pending.percentage}
              />
              <KpiCard
                title="Auctions"
                value={dashboardData.stats.auctions.total.toLocaleString()}
                description="Next 7 days"
                icon={<Calendar className="h-5 w-5" aria-hidden="true" />}
                trend={
                  dashboardData.stats.auctions.urgency === "urgent"
                    ? "Urgent"
                    : "Upcoming"
                }
                urgent={dashboardData.stats.auctions.urgency === "urgent"}
              />
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Pipeline Funnel */}
              <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-slate-500" aria-hidden="true" />
                  Pipeline Funnel
                </h2>
                <div className="space-y-0.5">
                  <FunnelBar
                    label="Parsed"
                    count={dashboardData.funnel.parsed}
                    total={dashboardData.funnel.parsed}
                    color="bg-slate-400 dark:bg-slate-500"
                  />
                  <FunnelFlowConnector fromColor="text-slate-400 dark:text-slate-500" toColor="text-blue-500 dark:text-blue-400" />
                  <FunnelBar
                    label="Enriched"
                    count={dashboardData.funnel.enriched}
                    total={dashboardData.funnel.parsed}
                    color="bg-blue-500 dark:bg-blue-400"
                  />
                  <FunnelFlowConnector fromColor="text-blue-500 dark:text-blue-400" toColor="text-amber-500 dark:text-amber-400" />
                  <FunnelBar
                    label="Validated"
                    count={dashboardData.funnel.validated}
                    total={dashboardData.funnel.parsed}
                    color="bg-amber-500 dark:bg-amber-400"
                  />
                  <FunnelFlowConnector fromColor="text-amber-500 dark:text-amber-400" toColor="text-green-500 dark:text-green-400" />
                  <FunnelBar
                    label="Approved"
                    count={dashboardData.funnel.approved}
                    total={dashboardData.funnel.parsed}
                    color="bg-green-500 dark:bg-green-400"
                  />
                </div>
              </div>

              {/* Upcoming Auctions */}
              <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-slate-500" aria-hidden="true" />
                  Upcoming Auctions
                </h2>
                <div className="space-y-3">
                  {dashboardData.upcomingAuctions.length > 0 ? (
                    dashboardData.upcomingAuctions.map((auction) => (
                      <AuctionItem
                        key={auction.id}
                        county={auction.county}
                        state={auction.state}
                        date={auction.date}
                        daysUntil={auction.daysUntil}
                        properties={auction.propertyCount}
                      />
                    ))
                  ) : (
                    <div className="text-center py-4 text-slate-500">
                      No upcoming auctions scheduled
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Bottleneck Alerts */}
              <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" aria-hidden="true" />
                  Bottlenecks
                </h2>
                <div className="space-y-3">
                  {dashboardData.bottlenecks.length > 0 ? (
                    dashboardData.bottlenecks.map((bottleneck, index) => (
                      <BottleneckAlert
                        key={index}
                        title={bottleneck.title}
                        count={bottleneck.count}
                        severity={bottleneck.severity}
                        message={bottleneck.message}
                      />
                    ))
                  ) : (
                    <div className="text-center py-4 text-green-600">
                      No bottlenecks detected - pipeline is healthy!
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Activity className="h-5 w-5 text-slate-500" aria-hidden="true" />
                  Recent Activity
                </h2>
                <div className="space-y-3">
                  {dashboardData.recentActivity.length > 0 ? (
                    dashboardData.recentActivity.map((activity) => (
                      <ActivityItem
                        key={activity.id}
                        action={activity.action}
                        details={activity.details}
                        time={activity.time}
                      />
                    ))
                  ) : (
                    <div className="text-center py-4 text-slate-500">
                      No recent activity to display
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* County Progress Table */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="p-6 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  County Progress
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        County
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Regrid
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Validated
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Approved
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Next Auction
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {dashboardData.countyProgress.length > 0 ? (
                      dashboardData.countyProgress.map((county) => (
                        <CountyRow
                          key={county.id}
                          county={county.county}
                          state={county.state}
                          total={county.total}
                          regrid={county.regridCount}
                          validated={county.validated}
                          approved={county.approved}
                          daysUntil={county.daysUntilAuction}
                        />
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-6 py-8 text-center text-slate-500"
                        >
                          No county data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

// Component Definitions

function KpiCard({
  title,
  value,
  description,
  icon,
  trend,
  urgent = false,
}: {
  title: string
  value: string
  description: string
  icon: React.ReactNode
  trend: string
  urgent?: boolean
}) {
  return (
    <div
      className={cn(
        "bg-white dark:bg-slate-800 rounded-lg border p-4",
        urgent ? "border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800" : "border-slate-200 dark:border-slate-700"
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className={cn(
            "text-sm font-medium",
            urgent ? "text-red-600 dark:text-red-400" : "text-slate-500 dark:text-slate-400"
          )}
        >
          {title}
        </span>
        <span className={urgent ? "text-red-500 dark:text-red-400" : "text-slate-400 dark:text-slate-500"}>
          {icon}
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <span
          className={cn(
            "text-2xl font-bold",
            urgent ? "text-red-700 dark:text-red-400" : "text-slate-900 dark:text-white"
          )}
        >
          {value}
        </span>
        <span className="text-sm text-slate-500 dark:text-slate-400">{description}</span>
      </div>
      <div
        className={cn(
          "text-xs mt-2",
          urgent ? "text-red-600 dark:text-red-400 font-medium" : "text-slate-500 dark:text-slate-400"
        )}
      >
        {trend}
      </div>
    </div>
  )
}

function FunnelBar({
  label,
  count,
  total,
  color,
}: {
  label: string
  count: number
  total: number
  color: string
}) {
  const percentage = total > 0 ? (count / total) * 100 : 0
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {count.toLocaleString()} ({percentage.toFixed(1)}%)
        </span>
      </div>
      <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-3">
        <div
          className={cn("h-3 rounded-full transition-all", color)}
          style={{ width: `${Math.max(percentage, 1)}%` }}
        />
      </div>
    </div>
  )
}

function FunnelFlowConnector({ fromColor, toColor }: { fromColor?: string; toColor?: string }) {
  return (
    <div className="flex flex-col items-center py-2" aria-hidden="true">
      {/* Visual flow indicator with stacked chevrons */}
      <div className="flex flex-col -space-y-2 opacity-60 hover:opacity-100 transition-opacity">
        <ChevronDown className={cn("h-4 w-4", fromColor || "text-slate-400 dark:text-slate-500")} />
        <ChevronDown className={cn("h-4 w-4", toColor || "text-slate-400 dark:text-slate-500")} />
      </div>
    </div>
  )
}

function AuctionItem({
  county,
  state,
  date,
  daysUntil,
  properties,
}: {
  county: string
  state: string
  date: string
  daysUntil: number
  properties: number
}) {
  const urgency =
    daysUntil <= 7 ? "critical" : daysUntil <= 30 ? "warning" : "normal"
  return (
    <div
      className={cn(
        "p-3 rounded-lg border",
        urgency === "critical"
          ? "bg-red-50 border-red-200"
          : urgency === "warning"
            ? "bg-amber-50 border-amber-200"
            : "bg-slate-50 border-slate-200"
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-slate-900">
            {county}, {state}
          </div>
          <div className="text-sm text-slate-500">{date}</div>
        </div>
        <div className="text-right">
          <div
            className={cn(
              "text-sm font-bold",
              urgency === "critical"
                ? "text-red-600"
                : urgency === "warning"
                  ? "text-amber-600"
                  : "text-slate-600"
            )}
          >
            {daysUntil} days
          </div>
          <div className="text-xs text-slate-500">{properties} properties</div>
        </div>
      </div>
    </div>
  )
}

function BottleneckAlert({
  title,
  count,
  severity,
  message,
}: {
  title: string
  count: number
  severity: "critical" | "warning" | "info"
  message: string
}) {
  return (
    <div
      className={cn(
        "p-3 rounded-lg border flex items-start gap-3",
        severity === "critical"
          ? "bg-red-50 border-red-200"
          : severity === "warning"
            ? "bg-amber-50 border-amber-200"
            : "bg-blue-50 border-blue-200"
      )}
    >
      <AlertTriangle
        className={cn(
          "h-5 w-5 mt-0.5 flex-shrink-0",
          severity === "critical"
            ? "text-red-500"
            : severity === "warning"
              ? "text-amber-500"
              : "text-blue-500"
        )}
        aria-hidden="true"
      />
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <span className="font-medium text-slate-900">{title}</span>
          <span
            className={cn(
              "text-sm font-bold",
              severity === "critical"
                ? "text-red-600"
                : severity === "warning"
                  ? "text-amber-600"
                  : "text-blue-600"
            )}
          >
            {count.toLocaleString()}
          </span>
        </div>
        <p className="text-sm text-slate-600 mt-1">{message}</p>
      </div>
    </div>
  )
}

function ActivityItem({
  action,
  details,
  time,
}: {
  action: string
  details: string
  time: string
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="h-2 w-2 rounded-full bg-primary mt-2 flex-shrink-0" />
      <div className="flex-1">
        <div className="text-sm font-medium text-slate-900">{action}</div>
        <div className="text-sm text-slate-500">{details}</div>
      </div>
      <div className="text-xs text-slate-400">{time}</div>
    </div>
  )
}

function CountyRow({
  county,
  state,
  total,
  regrid,
  validated,
  approved,
  daysUntil,
}: {
  county: string
  state: string
  total: number
  regrid: number
  validated: number
  approved: number
  daysUntil: number | null
}) {
  const regridPct = total > 0 ? (regrid / total) * 100 : 0
  const urgency =
    daysUntil !== null && daysUntil <= 7
      ? "critical"
      : daysUntil !== null && daysUntil <= 30
        ? "warning"
        : "normal"

  return (
    <tr className="hover:bg-slate-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="font-medium text-slate-900">{county}</div>
        <div className="text-sm text-slate-500">{state}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
        {total.toLocaleString()}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <div className="w-16 bg-slate-100 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full"
              style={{ width: `${regridPct}%` }}
            />
          </div>
          <span className="text-sm text-slate-500">
            {regridPct.toFixed(0)}%
          </span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
        {validated}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
        {approved}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {daysUntil !== null ? (
          <span
            className={cn(
              "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
              urgency === "critical"
                ? "bg-red-100 text-red-800"
                : urgency === "warning"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-green-100 text-green-800"
            )}
          >
            {daysUntil} days
          </span>
        ) : (
          <span className="text-sm text-slate-400">-</span>
        )}
      </td>
    </tr>
  )
}

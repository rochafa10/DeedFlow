"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Bell,
  AlertTriangle,
  XCircle,
  Info,
  CheckCircle2,
  ArrowLeft,
  Calendar,
  Clock,
  Filter,
  Search,
  ExternalLink,
  Loader2,
  Database,
} from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { logger } from "@/lib/logger"

const pageLogger = logger.withContext('[Auction Alerts Page]')

// Sample alerts shown when no real alerts exist in database
const SAMPLE_ALERTS = [
  {
    id: "sample-1",
    type: "critical" as const,
    title: "Westmoreland Registration Deadline",
    message: "Registration closes in 1 day for Westmoreland County auction",
    date: "2026-01-09",
    auctionId: "1",
    county: "Westmoreland",
    state: "PA",
    auctionDate: "2026-01-16",
    acknowledged: false,
  },
  {
    id: "sample-2",
    type: "warning" as const,
    title: "Westmoreland Auction Imminent",
    message: "Westmoreland County auction is in 7 days. Ensure due diligence is complete.",
    date: "2026-01-09",
    auctionId: "1",
    county: "Westmoreland",
    state: "PA",
    auctionDate: "2026-01-16",
    acknowledged: false,
  },
  {
    id: "sample-3",
    type: "info" as const,
    title: "New Property List Available",
    message: "Blair County has posted an updated property list with 15 new parcels added to the auction.",
    date: "2026-01-08",
    auctionId: "2",
    county: "Blair",
    state: "PA",
    auctionDate: "2026-03-11",
    acknowledged: false,
  },
  {
    id: "sample-4",
    type: "info" as const,
    title: "Philadelphia Auction Announced",
    message: "Philadelphia County has announced their spring tax lien auction. Registration opens Feb 1.",
    date: "2026-01-05",
    auctionId: "3",
    county: "Philadelphia",
    state: "PA",
    auctionDate: "2026-04-15",
    acknowledged: true,
  },
]

interface Alert {
  id: string
  type: "critical" | "warning" | "info"
  title: string
  message: string
  date: string
  auctionId: string | null
  county: string
  state: string
  auctionDate: string | null
  acknowledged: boolean
}

type AlertType = "critical" | "warning" | "info"
type FilterType = "all" | "critical" | "warning" | "info" | "unacknowledged"
type DataSource = "live" | "sample" | "loading" | "error"

const ALERT_CONFIG: Record<AlertType, {
  color: string
  icon: React.ReactNode
  bgColor: string
  label: string
}> = {
  critical: {
    color: "text-red-700",
    bgColor: "bg-red-50 border-red-200",
    icon: <XCircle className="h-5 w-5 text-red-600" />,
    label: "Critical",
  },
  warning: {
    color: "text-amber-700",
    bgColor: "bg-amber-50 border-amber-200",
    icon: <AlertTriangle className="h-5 w-5 text-amber-600" />,
    label: "Warning",
  },
  info: {
    color: "text-blue-700",
    bgColor: "bg-blue-50 border-blue-200",
    icon: <Info className="h-5 w-5 text-blue-600" />,
    label: "Info",
  },
}

export default function AuctionAlertsPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<FilterType>("all")
  const [showFilters, setShowFilters] = useState(false)
  const [dataSource, setDataSource] = useState<DataSource>("loading")
  const [isLoading, setIsLoading] = useState(true)

  // Fetch alerts from API
  const fetchAlerts = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/alerts')

      if (!response.ok) {
        throw new Error('Failed to fetch alerts')
      }

      const data = await response.json()

      if (data.alerts && data.alerts.length > 0) {
        setAlerts(data.alerts)
        setDataSource("live")
      } else {
        // No real alerts, use sample data
        setAlerts(SAMPLE_ALERTS)
        setDataSource("sample")
      }
    } catch (error) {
      pageLogger.error('Error fetching alerts', { error: error instanceof Error ? error.message : String(error) })
      // Fallback to sample data on error
      setAlerts(SAMPLE_ALERTS)
      setDataSource("sample")
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, authLoading, router])

  // Fetch alerts on mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchAlerts()
    }
  }, [isAuthenticated, fetchAlerts])

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

  // Filter alerts
  const filteredAlerts = alerts.filter((alert) => {
    const matchesSearch =
      searchQuery === "" ||
      alert.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.county.toLowerCase().includes(searchQuery.toLowerCase())

    let matchesFilter = true
    if (filterType === "unacknowledged") {
      matchesFilter = !alert.acknowledged
    } else if (filterType !== "all") {
      matchesFilter = alert.type === filterType
    }

    return matchesSearch && matchesFilter
  })

  // Sort alerts: unacknowledged first, then by severity, then by date
  const sortedAlerts = [...filteredAlerts].sort((a, b) => {
    // Unacknowledged first
    if (a.acknowledged !== b.acknowledged) {
      return a.acknowledged ? 1 : -1
    }
    // Then by severity
    const severityOrder = { critical: 0, warning: 1, info: 2 }
    if (severityOrder[a.type as AlertType] !== severityOrder[b.type as AlertType]) {
      return severityOrder[a.type as AlertType] - severityOrder[b.type as AlertType]
    }
    // Then by date (newest first)
    return new Date(b.date).getTime() - new Date(a.date).getTime()
  })

  // Handle acknowledge
  const handleAcknowledge = async (alertId: string) => {
    // Optimistic update
    setAlerts((prev) =>
      prev.map((alert) =>
        alert.id === alertId ? { ...alert, acknowledged: true } : alert
      )
    )

    // If using live data, update in database
    if (dataSource === "live" && !alertId.startsWith("sample-")) {
      try {
        await fetch('/api/alerts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ alertId, acknowledge: true }),
        })
      } catch (error) {
        pageLogger.error('Failed to acknowledge alert', { error: error instanceof Error ? error.message : String(error) })
        // Could revert optimistic update here if needed
      }
    }
  }

  // Handle acknowledge all
  const handleAcknowledgeAll = async () => {
    // Optimistic update
    setAlerts((prev) => prev.map((alert) => ({ ...alert, acknowledged: true })))

    // If using live data, update in database
    if (dataSource === "live") {
      try {
        await fetch('/api/alerts', { method: 'PATCH' })
      } catch (error) {
        pageLogger.error('Failed to acknowledge all alerts', { error: error instanceof Error ? error.message : String(error) })
      }
    }
  }

  // Count stats
  const unacknowledgedCount = alerts.filter((a) => !a.acknowledged).length
  const criticalCount = alerts.filter((a) => a.type === "critical" && !a.acknowledged).length
  const warningCount = alerts.filter((a) => a.type === "warning" && !a.acknowledged).length

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => router.push("/auctions")}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Auctions
        </button>

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Bell className="h-6 w-6 text-primary" />
                Auction Alerts
              </h1>
              {/* Data Source Badge */}
              {!isLoading && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full",
                    dataSource === "live"
                      ? "bg-green-100 text-green-700"
                      : "bg-amber-100 text-amber-700"
                  )}
                >
                  <Database className="h-3 w-3" />
                  {dataSource === "live" ? "Live Data" : "Sample Data"}
                </span>
              )}
            </div>
            <p className="text-slate-600 mt-1">
              Stay updated on auction deadlines and important notifications
              {dataSource === "sample" && (
                <span className="text-amber-600 text-sm ml-2">
                  (Showing sample data - no real alerts in database)
                </span>
              )}
            </p>
          </div>

          {unacknowledgedCount > 0 && (
            <button
              onClick={handleAcknowledgeAll}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium"
            >
              <CheckCircle2 className="h-4 w-4" />
              Acknowledge All ({unacknowledgedCount})
            </button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-slate-600 text-sm mb-1">
              <Bell className="h-4 w-4" />
              Unread Alerts
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {unacknowledgedCount}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-red-200 p-4">
            <div className="flex items-center gap-2 text-red-600 text-sm mb-1">
              <XCircle className="h-4 w-4" />
              Critical
            </div>
            <div className="text-2xl font-bold text-red-600">{criticalCount}</div>
          </div>
          <div className="bg-white rounded-lg border border-amber-200 p-4">
            <div className="flex items-center gap-2 text-amber-600 text-sm mb-1">
              <AlertTriangle className="h-4 w-4" />
              Warnings
            </div>
            <div className="text-2xl font-bold text-amber-600">{warningCount}</div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search alerts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as FilterType)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Alerts</option>
                <option value="unacknowledged">Unread Only</option>
                <option value="critical">Critical</option>
                <option value="warning">Warnings</option>
                <option value="info">Info</option>
              </select>
            </div>
          </div>
        </div>

        {/* Alerts List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
              <Loader2 className="h-8 w-8 text-primary mx-auto mb-4 animate-spin" />
              <p className="text-slate-500">Loading alerts...</p>
            </div>
          ) : sortedAlerts.length > 0 ? (
            sortedAlerts.map((alert) => {
              const config = ALERT_CONFIG[alert.type as AlertType]
              return (
                <div
                  key={alert.id}
                  className={cn(
                    "bg-white rounded-lg border-l-4 shadow-sm overflow-hidden",
                    config.bgColor,
                    alert.acknowledged && "opacity-60"
                  )}
                >
                  <div className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 mt-0.5">{config.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className={cn("font-semibold", config.color)}>
                                {alert.title}
                              </h3>
                              <span
                                className={cn(
                                  "px-2 py-0.5 text-xs font-medium rounded",
                                  alert.type === "critical"
                                    ? "bg-red-100 text-red-700"
                                    : alert.type === "warning"
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-blue-100 text-blue-700"
                                )}
                              >
                                {config.label}
                              </span>
                              {alert.acknowledged && (
                                <span className="flex items-center gap-1 text-xs text-green-600">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Acknowledged
                                </span>
                              )}
                            </div>
                            <p className="text-slate-600 mt-1">{alert.message}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 mt-3 text-sm text-slate-500">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {new Date(alert.date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {alert.county}, {alert.state}
                          </div>
                          {alert.auctionDate && (
                          <div>
                            Auction:{" "}
                            {new Date(alert.auctionDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </div>
                        )}
                        </div>

                        <div className="flex items-center gap-3 mt-3">
                          {!alert.acknowledged && (
                            <button
                              onClick={() => handleAcknowledge(alert.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              Acknowledge
                            </button>
                          )}
                          <button
                            onClick={() => router.push(`/auctions/${alert.auctionId}`)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-primary text-sm font-medium hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            View Auction
                            <ExternalLink className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
              <Bell className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No Alerts Found</h3>
              <p className="text-slate-500">
                {searchQuery || filterType !== "all"
                  ? "Try adjusting your search or filter criteria."
                  : "You're all caught up! No auction alerts at this time."}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ")
}

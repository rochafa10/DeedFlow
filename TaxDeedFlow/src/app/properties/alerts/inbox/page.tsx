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
  TrendingDown,
  MapPin,
} from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"

// Sample alerts shown when no real alerts exist in database
const SAMPLE_ALERTS = [
  {
    id: "sample-1",
    type: "critical" as const,
    title: "Price Drop Alert - Westmoreland Property",
    message: "123 Main St reduced from $50,000 to $35,000 - 30% discount. Auction in 5 days.",
    date: "2026-01-20",
    propertyId: "1",
    county: "Westmoreland",
    state: "PA",
    parcelNumber: "45-123-45",
    acknowledged: false,
  },
  {
    id: "sample-2",
    type: "warning" as const,
    title: "New Match: High-Value Residential",
    message: "New property matches your saved criteria: 3BR/2BA residential in Blair County, $45,000 opening bid.",
    date: "2026-01-19",
    propertyId: "2",
    county: "Blair",
    state: "PA",
    parcelNumber: "12-567-89",
    acknowledged: false,
  },
  {
    id: "sample-3",
    type: "info" as const,
    title: "Property Status Update",
    message: "456 Oak Ave has been updated with new photos and title information.",
    date: "2026-01-18",
    propertyId: "3",
    county: "Blair",
    state: "PA",
    parcelNumber: "23-456-78",
    acknowledged: false,
  },
  {
    id: "sample-4",
    type: "info" as const,
    title: "Watch List Property Sold",
    message: "789 Pine Street from your watch list has been sold. Final bid: $52,000.",
    date: "2026-01-15",
    propertyId: "4",
    county: "Philadelphia",
    state: "PA",
    parcelNumber: "34-789-12",
    acknowledged: true,
  },
  {
    id: "sample-5",
    type: "critical" as const,
    title: "Bid Strategy Alert",
    message: "Recommended max bid updated for 321 Elm St due to new comparable sales data.",
    date: "2026-01-14",
    propertyId: "5",
    county: "Westmoreland",
    state: "PA",
    parcelNumber: "56-321-34",
    acknowledged: false,
  },
]

interface Alert {
  id: string
  type: "critical" | "warning" | "info"
  title: string
  message: string
  date: string
  propertyId: string | null
  county: string
  state: string
  parcelNumber: string | null
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

export default function PropertyAlertsInboxPage() {
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
      const response = await fetch('/api/property-alerts')

      if (!response.ok) {
        throw new Error('Failed to fetch property alerts')
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
      alert.county.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (alert.parcelNumber && alert.parcelNumber.toLowerCase().includes(searchQuery.toLowerCase()))

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
        await fetch('/api/property-alerts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ alertId, acknowledge: true }),
        })
      } catch (error) {
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
        await fetch('/api/property-alerts', { method: 'PATCH' })
      } catch (error) {
        // Error handled silently
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
          onClick={() => router.push("/properties")}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Properties
        </button>

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Bell className="h-6 w-6 text-primary" />
                Property Alerts
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
              Track price changes, new matches, and property updates
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
                placeholder="Search alerts by title, county, or parcel number..."
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
                            <MapPin className="h-3.5 w-3.5" />
                            {alert.county}, {alert.state}
                          </div>
                          {alert.parcelNumber && (
                            <div>
                              Parcel: {alert.parcelNumber}
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
                          {alert.propertyId && (
                            <button
                              onClick={() => router.push(`/properties/${alert.propertyId}`)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-primary text-sm font-medium hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              View Property
                              <ExternalLink className="h-3.5 w-3.5" />
                            </button>
                          )}
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
                  : "You're all caught up! No property alerts at this time."}
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

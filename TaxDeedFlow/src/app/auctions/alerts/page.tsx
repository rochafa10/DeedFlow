"use client"

import { useState, useEffect } from "react"
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
} from "lucide-react"
import { Header } from "@/components/layout/Header"
import { useAuth } from "@/contexts/AuthContext"

// Mock alerts data - extended version
const MOCK_ALERTS = [
  {
    id: "1",
    type: "critical",
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
    id: "2",
    type: "warning",
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
    id: "3",
    type: "info",
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
    id: "4",
    type: "info",
    title: "Philadelphia Auction Announced",
    message: "Philadelphia County has announced their spring tax lien auction. Registration opens Feb 1.",
    date: "2026-01-05",
    auctionId: "3",
    county: "Philadelphia",
    state: "PA",
    auctionDate: "2026-04-15",
    acknowledged: true,
  },
  {
    id: "5",
    type: "warning",
    title: "Blair Registration Opens Soon",
    message: "Blair County auction registration opens in 14 days. Prepare your documents.",
    date: "2026-01-04",
    auctionId: "2",
    county: "Blair",
    state: "PA",
    auctionDate: "2026-03-11",
    acknowledged: true,
  },
  {
    id: "6",
    type: "critical",
    title: "Deposit Deadline Approaching",
    message: "Westmoreland County requires deposit submission by Jan 8. Action required immediately.",
    date: "2026-01-07",
    auctionId: "1",
    county: "Westmoreland",
    state: "PA",
    auctionDate: "2026-01-16",
    acknowledged: false,
  },
  {
    id: "7",
    type: "info",
    title: "Cambria Property List Updated",
    message: "Cambria County has updated their tax sale property list. 23 properties removed.",
    date: "2026-01-03",
    auctionId: "4",
    county: "Cambria",
    state: "PA",
    auctionDate: "2026-05-20",
    acknowledged: true,
  },
  {
    id: "8",
    type: "warning",
    title: "Somerset Auction Date Changed",
    message: "Somerset County has moved their auction from Sep 1 to Sep 8. Update your calendar.",
    date: "2026-01-02",
    auctionId: "5",
    county: "Somerset",
    state: "PA",
    auctionDate: "2026-09-08",
    acknowledged: true,
  },
]

type AlertType = "critical" | "warning" | "info"
type FilterType = "all" | "critical" | "warning" | "info" | "unacknowledged"

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
  const [alerts, setAlerts] = useState(MOCK_ALERTS)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<FilterType>("all")
  const [showFilters, setShowFilters] = useState(false)

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
  const handleAcknowledge = (alertId: string) => {
    setAlerts((prev) =>
      prev.map((alert) =>
        alert.id === alertId ? { ...alert, acknowledged: true } : alert
      )
    )
  }

  // Handle acknowledge all
  const handleAcknowledgeAll = () => {
    setAlerts((prev) => prev.map((alert) => ({ ...alert, acknowledged: true })))
  }

  // Count stats
  const unacknowledgedCount = alerts.filter((a) => !a.acknowledged).length
  const criticalCount = alerts.filter((a) => a.type === "critical" && !a.acknowledged).length
  const warningCount = alerts.filter((a) => a.type === "warning" && !a.acknowledged).length

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

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
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Bell className="h-6 w-6 text-primary" />
              Auction Alerts
            </h1>
            <p className="text-slate-600 mt-1">
              Stay updated on auction deadlines and important notifications
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
          {sortedAlerts.length > 0 ? (
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
                          <div>
                            Auction:{" "}
                            {new Date(alert.auctionDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </div>
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

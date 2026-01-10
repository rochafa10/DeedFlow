"use client"

import { useState, useEffect } from "react"
import {
  Calendar,
  MapPin,
  Clock,
  AlertTriangle,
  Bell,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ExternalLink,
  Filter,
  Search,
  CheckCircle2,
  XCircle,
  Info,
  Users,
  Timer,
  Loader2,
} from "lucide-react"
import { Header } from "@/components/layout/Header"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"

// Types
interface Auction {
  id: string
  county: string
  state: string
  countyId?: string
  date: string
  type: string
  platform: string
  location: string
  propertyCount: number
  registrationDeadline: string | null
  registrationDaysUntil: number | null
  depositRequired: string
  status: string
  daysUntil: number
  notes?: string
}

interface Alert {
  id: string
  type: "critical" | "warning" | "info"
  title: string
  message: string
  date: string
  auctionId: string | null
  daysUntilEvent: number | null
}

type AlertType = "critical" | "warning" | "info"

const ALERT_CONFIG: Record<AlertType, { color: string; icon: React.ReactNode; bgColor: string }> = {
  critical: {
    color: "text-red-700",
    bgColor: "bg-red-50 border-red-200",
    icon: <XCircle className="h-4 w-4 text-red-600" />,
  },
  warning: {
    color: "text-amber-700",
    bgColor: "bg-amber-50 border-amber-200",
    icon: <AlertTriangle className="h-4 w-4 text-amber-600" />,
  },
  info: {
    color: "text-blue-700",
    bgColor: "bg-blue-50 border-blue-200",
    icon: <Info className="h-4 w-4 text-blue-600" />,
  },
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export default function AuctionsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedAuctions, setSelectedAuctions] = useState<Auction[]>([])
  const [showDateDetails, setShowDateDetails] = useState(false)

  // Data fetching state
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [stats, setStats] = useState<{ totalUpcoming: number; thisMonth: number }>({ totalUpcoming: 0, thisMonth: 0 })
  const [isLoadingAuctions, setIsLoadingAuctions] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, authLoading, router])

  // Fetch auctions from API
  useEffect(() => {
    async function fetchAuctions() {
      if (!isAuthenticated) return

      setIsLoadingAuctions(true)
      setLoadError(null)

      try {
        const response = await fetch("/api/auctions")

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `Failed to fetch auctions: ${response.status}`)
        }

        const result = await response.json()
        setAuctions(result.data?.auctions || [])
        setAlerts(result.data?.alerts || [])
        setStats(result.data?.stats || { totalUpcoming: 0, thisMonth: 0 })
      } catch (error) {
        console.error("Failed to fetch auctions:", error)
        setLoadError(error instanceof Error ? error.message : "Failed to load auctions")
      } finally {
        setIsLoadingAuctions(false)
      }
    }

    if (isAuthenticated) {
      fetchAuctions()
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

  // Show loading state while fetching auctions
  if (isLoadingAuctions) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-slate-500 dark:text-slate-400">Loading auctions...</p>
          </div>
        </div>
      </div>
    )
  }

  // Show error state if loading failed
  if (loadError) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3 text-center">
            <AlertTriangle className="h-10 w-10 text-red-500" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Failed to load auctions</h2>
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

  // Filter auctions based on search
  const filteredAuctions = auctions.filter((auction) => {
    const matchesSearch =
      searchQuery === "" ||
      auction.county.toLowerCase().includes(searchQuery.toLowerCase()) ||
      auction.state.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  // Get auctions for current month view
  const getAuctionDates = () => {
    const dates: Record<string, Auction[]> = {}
    auctions.forEach((auction) => {
      if (!dates[auction.date]) {
        dates[auction.date] = []
      }
      dates[auction.date].push(auction)
    })
    return dates
  }

  const auctionDates = getAuctionDates()

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  const prevYear = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear() - 1, currentMonth.getMonth(), 1))
  }

  const nextYear = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear() + 1, currentMonth.getMonth(), 1))
  }

  const handleDateClick = (dateStr: string, dateAuctions: Auction[]) => {
    setSelectedDate(dateStr)
    setSelectedAuctions(dateAuctions)
    setShowDateDetails(true)
  }

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentMonth)
    const firstDay = getFirstDayOfMonth(currentMonth)
    const days = []

    // Empty cells for days before the first of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 bg-slate-50" />)
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
      const dayAuctions = auctionDates[dateStr] || []
      const hasAuctions = dayAuctions.length > 0
      const today = new Date()
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
      const isToday = dateStr === todayStr
      const isSelected = dateStr === selectedDate

      days.push(
        <div
          key={day}
          onClick={() => hasAuctions && handleDateClick(dateStr, dayAuctions)}
          className={cn(
            "h-24 p-2 border-t border-slate-200 transition-colors",
            hasAuctions && "cursor-pointer hover:bg-blue-50",
            isSelected && "bg-blue-100",
            isToday && "bg-amber-50"
          )}
        >
          <div className="flex items-center justify-between">
            <span
              className={cn(
                "text-sm font-medium",
                isToday && "bg-amber-500 text-white px-1.5 py-0.5 rounded",
                !isToday && "text-slate-700"
              )}
            >
              {day}
            </span>
          </div>
          {dayAuctions.length > 0 && (
            <div className="mt-1 space-y-1">
              {dayAuctions.slice(0, 2).map((auction) => (
                <div
                  key={auction.id}
                  className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded truncate"
                >
                  {auction.county}
                </div>
              ))}
              {dayAuctions.length > 2 && (
                <div className="text-xs text-slate-500">
                  +{dayAuctions.length - 2} more
                </div>
              )}
            </div>
          )}
        </div>
      )
    }

    return days
  }

  // Calculate days until auction
  const getDaysUntil = (dateStr: string) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Normalize to start of day
    const auctionDate = new Date(dateStr)
    const diff = Math.ceil((auctionDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Auction Calendar</h1>
          <p className="text-slate-600 mt-1">
            Track upcoming tax auctions and registration deadlines
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar Section - 2 columns */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              {/* Calendar Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
                <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </h2>
                <div className="flex items-center gap-1">
                  {/* Year navigation - previous */}
                  <button
                    onClick={prevYear}
                    className="p-1 rounded hover:bg-slate-200 transition-colors"
                    title="Previous year"
                  >
                    <ChevronsLeft className="h-5 w-5 text-slate-600" />
                  </button>
                  {/* Month navigation - previous */}
                  <button
                    onClick={prevMonth}
                    className="p-1 rounded hover:bg-slate-200 transition-colors"
                    title="Previous month"
                  >
                    <ChevronLeft className="h-5 w-5 text-slate-600" />
                  </button>
                  {/* Month navigation - next */}
                  <button
                    onClick={nextMonth}
                    className="p-1 rounded hover:bg-slate-200 transition-colors"
                    title="Next month"
                  >
                    <ChevronRight className="h-5 w-5 text-slate-600" />
                  </button>
                  {/* Year navigation - next */}
                  <button
                    onClick={nextYear}
                    className="p-1 rounded hover:bg-slate-200 transition-colors"
                    title="Next year"
                  >
                    <ChevronsRight className="h-5 w-5 text-slate-600" />
                  </button>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7">
                {/* Day Headers */}
                {DAYS.map((day) => (
                  <div
                    key={day}
                    className="py-2 text-center text-xs font-medium text-slate-500 bg-slate-50 border-b border-slate-200"
                  >
                    {day}
                  </div>
                ))}

                {/* Calendar Days */}
                {renderCalendarDays()}
              </div>

              {/* Legend */}
              <div className="px-4 py-3 border-t border-slate-200 bg-slate-50">
                <div className="flex items-center gap-4 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-amber-500 rounded" />
                    <span>Today</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-blue-100 rounded" />
                    <span>Auction</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Alerts Section - 1 column */}
          <div className="space-y-6">
            {/* Alerts Panel */}
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Alerts
                </h2>
              </div>
              <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                {alerts.length > 0 ? (
                  alerts.map((alert) => {
                    const config = ALERT_CONFIG[alert.type as AlertType]
                    return (
                      <div
                        key={alert.id}
                        className={cn(
                          "px-4 py-3 border-l-4",
                          config.bgColor
                        )}
                      >
                        <div className="flex items-start gap-2">
                          {config.icon}
                          <div className="flex-1 min-w-0">
                            <div className={cn("font-medium text-sm", config.color)}>
                              {alert.title}
                            </div>
                            <p className="text-sm text-slate-600 mt-0.5">
                              {alert.message}
                            </p>
                            <div className="text-xs text-slate-400 mt-1">
                              {new Date(alert.date).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="px-4 py-8 text-center text-slate-500">
                    No active alerts
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-lg border border-slate-200 p-4">
                <div className="text-2xl font-bold text-slate-900">
                  {stats.totalUpcoming}
                </div>
                <div className="text-sm text-slate-500">Upcoming Auctions</div>
              </div>
              <div className="bg-white rounded-lg border border-slate-200 p-4">
                <div className="text-2xl font-bold text-red-600">{stats.thisMonth}</div>
                <div className="text-sm text-slate-500">This Month</div>
              </div>
            </div>
          </div>
        </div>

        {/* Registration Deadlines Panel */}
        <div className="mt-6 bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Registration Deadlines
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            {auctions.length > 0 ? (
              auctions.filter(a => a.registrationDeadline).map((auction) => {
                const daysUntilRegistration = auction.registrationDaysUntil ?? getDaysUntil(auction.registrationDeadline!)
                let status: "CLOSED" | "URGENT" | "SOON" | "OPEN"
                let statusColor: string
                let statusBg: string

                if (daysUntilRegistration < 0) {
                  status = "CLOSED"
                  statusColor = "text-slate-500"
                  statusBg = "bg-slate-100"
                } else if (daysUntilRegistration <= 3) {
                  status = "URGENT"
                  statusColor = "text-red-700"
                  statusBg = "bg-red-100"
                } else if (daysUntilRegistration <= 14) {
                  status = "SOON"
                  statusColor = "text-amber-700"
                  statusBg = "bg-amber-100"
                } else {
                  status = "OPEN"
                  statusColor = "text-green-700"
                  statusBg = "bg-green-100"
                }

                return (
                  <div key={auction.id} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        <Timer className={cn(
                          "h-5 w-5",
                          status === "CLOSED" ? "text-slate-400" :
                          status === "URGENT" ? "text-red-500" :
                          status === "SOON" ? "text-amber-500" :
                          "text-green-500"
                        )} />
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">
                          {auction.county}, {auction.state}
                        </div>
                        <div className="text-sm text-slate-500">
                          {auction.registrationDeadline ? (
                            <>Deadline: {new Date(auction.registrationDeadline).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}</>
                          ) : (
                            <>No registration deadline</>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className={cn(
                          "text-sm font-medium",
                          daysUntilRegistration < 0 ? "text-slate-500" :
                          daysUntilRegistration <= 3 ? "text-red-600" :
                          daysUntilRegistration <= 14 ? "text-amber-600" :
                          "text-slate-700"
                        )}>
                          {daysUntilRegistration < 0
                            ? "Closed"
                            : daysUntilRegistration === 0
                            ? "Today"
                            : `${daysUntilRegistration} days`}
                        </div>
                      </div>
                      <span className={cn(
                        "px-2 py-1 text-xs font-semibold rounded",
                        statusBg,
                        statusColor
                      )}>
                        {status}
                      </span>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="px-4 py-8 text-center text-slate-500">
                No upcoming registration deadlines
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Auctions List */}
        <div className="mt-6 bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Upcoming Auctions
              </h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search auctions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    County
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Platform
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Properties
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Registration
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredAuctions.map((auction) => {
                  const daysUntil = getDaysUntil(auction.date)
                  return (
                    <tr key={auction.id} className="hover:bg-slate-50">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-slate-400" />
                          <div>
                            <span className="font-medium text-slate-900">
                              {auction.county}
                            </span>
                            <span className="text-slate-500 ml-1">
                              {auction.state}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div>
                          <div className="text-sm text-slate-900">
                            {new Date(auction.date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </div>
                          <div
                            className={cn(
                              "text-xs",
                              daysUntil <= 7
                                ? "text-red-600 font-medium"
                                : daysUntil <= 30
                                ? "text-amber-600"
                                : "text-slate-500"
                            )}
                          >
                            {daysUntil} days
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-slate-700">
                          {auction.type}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div>
                          <div className="text-sm text-slate-900">
                            {auction.platform}
                          </div>
                          <div className="text-xs text-slate-500">
                            {auction.location}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm font-medium text-slate-900">
                          {auction.propertyCount.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div>
                          <div className="text-sm text-slate-700">
                            {new Date(auction.registrationDeadline).toLocaleDateString(
                              "en-US",
                              { month: "short", day: "numeric" }
                            )}
                          </div>
                          <div className="text-xs text-slate-500">
                            Deposit: {auction.depositRequired}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <button
                          onClick={() => router.push(`/auctions/${auction.id}`)}
                          className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 font-medium"
                        >
                          View
                          <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Date Details Modal */}
      {showDateDetails && selectedDate && selectedAuctions.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowDateDetails(false)}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  {new Date(selectedDate).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  {selectedAuctions.length} auction{selectedAuctions.length > 1 ? "s" : ""} scheduled
                </p>
              </div>
              <button
                onClick={() => setShowDateDetails(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-4 overflow-y-auto flex-1">
              <div className="space-y-4">
                {selectedAuctions.map((auction) => {
                  const daysUntil = getDaysUntil(auction.date)
                  return (
                    <div
                      key={auction.id}
                      className="bg-slate-50 rounded-lg p-4 border border-slate-200"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-slate-400" />
                            {auction.county}, {auction.state}
                          </h3>
                          <span
                            className={cn(
                              "text-xs font-medium mt-1 inline-block",
                              daysUntil <= 7
                                ? "text-red-600"
                                : daysUntil <= 30
                                ? "text-amber-600"
                                : "text-slate-500"
                            )}
                          >
                            {daysUntil} days away
                          </span>
                        </div>
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                          {auction.type}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <div className="text-slate-500">Platform</div>
                          <div className="font-medium text-slate-900">
                            {auction.platform} ({auction.location})
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-500">Properties</div>
                          <div className="font-medium text-slate-900">
                            {auction.propertyCount.toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-500">Registration Deadline</div>
                          <div className="font-medium text-slate-900">
                            {new Date(auction.registrationDeadline).toLocaleDateString(
                              "en-US",
                              { month: "short", day: "numeric", year: "numeric" }
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-500">Deposit Required</div>
                          <div className="font-medium text-slate-900">
                            {auction.depositRequired}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-200">
                        <button
                          onClick={() => {
                            setShowDateDetails(false)
                            router.push(`/auctions/${auction.id}`)
                          }}
                          className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 font-medium"
                        >
                          View Auction Details
                          <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-lg flex-shrink-0">
              <button
                onClick={() => setShowDateDetails(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ")
}

"use client"

import { useState } from "react"
import {
  Calendar,
  MapPin,
  Clock,
  AlertTriangle,
  Bell,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Filter,
  Search,
  CheckCircle2,
  XCircle,
  Info,
} from "lucide-react"
import { Header } from "@/components/layout/Header"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

// Mock auction data
const MOCK_AUCTIONS = [
  {
    id: "1",
    county: "Westmoreland",
    state: "PA",
    date: "2026-01-16",
    type: "Tax Deed",
    platform: "In-Person",
    location: "Courthouse",
    propertyCount: 172,
    registrationDeadline: "2026-01-10",
    depositRequired: "$5,000",
    status: "upcoming",
  },
  {
    id: "2",
    county: "Blair",
    state: "PA",
    date: "2026-03-11",
    type: "Tax Deed",
    platform: "Bid4Assets",
    location: "Online",
    propertyCount: 252,
    registrationDeadline: "2026-03-04",
    depositRequired: "$2,500",
    status: "upcoming",
  },
  {
    id: "3",
    county: "Philadelphia",
    state: "PA",
    date: "2026-04-15",
    type: "Tax Lien",
    platform: "Bid4Assets",
    location: "Online",
    propertyCount: 4521,
    registrationDeadline: "2026-04-08",
    depositRequired: "$10,000",
    status: "upcoming",
  },
  {
    id: "4",
    county: "Cambria",
    state: "PA",
    date: "2026-05-20",
    type: "Tax Deed",
    platform: "In-Person",
    location: "Courthouse",
    propertyCount: 845,
    registrationDeadline: "2026-05-13",
    depositRequired: "$3,000",
    status: "upcoming",
  },
  {
    id: "5",
    county: "Somerset",
    state: "PA",
    date: "2026-09-08",
    type: "Tax Deed",
    platform: "GovEase",
    location: "Online",
    propertyCount: 2663,
    registrationDeadline: "2026-09-01",
    depositRequired: "$5,000",
    status: "upcoming",
  },
]

// Mock alerts data
const MOCK_ALERTS = [
  {
    id: "1",
    type: "critical",
    title: "Westmoreland Registration Deadline",
    message: "Registration closes in 1 day for Westmoreland County auction",
    date: "2026-01-09",
    auctionId: "1",
  },
  {
    id: "2",
    type: "warning",
    title: "Westmoreland Auction Imminent",
    message: "Westmoreland County auction is in 7 days",
    date: "2026-01-09",
    auctionId: "1",
  },
  {
    id: "3",
    type: "info",
    title: "New Property List Available",
    message: "Blair County has posted an updated property list with 15 new parcels",
    date: "2026-01-08",
    auctionId: "2",
  },
  {
    id: "4",
    type: "info",
    title: "Philadelphia Auction Announced",
    message: "Philadelphia County has announced their spring tax lien auction",
    date: "2026-01-05",
    auctionId: "3",
  },
]

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
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 0, 1)) // January 2026
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedAuctions, setSelectedAuctions] = useState<typeof MOCK_AUCTIONS>([])
  const [showDateDetails, setShowDateDetails] = useState(false)

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

  // Filter auctions based on search
  const filteredAuctions = MOCK_AUCTIONS.filter((auction) => {
    const matchesSearch =
      searchQuery === "" ||
      auction.county.toLowerCase().includes(searchQuery.toLowerCase()) ||
      auction.state.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  // Get auctions for current month view
  const getAuctionDates = () => {
    const dates: Record<string, typeof MOCK_AUCTIONS> = {}
    MOCK_AUCTIONS.forEach((auction) => {
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

  const handleDateClick = (dateStr: string, auctions: typeof MOCK_AUCTIONS) => {
    setSelectedDate(dateStr)
    setSelectedAuctions(auctions)
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
      const isToday = dateStr === "2026-01-09" // Mock today's date
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
    const today = new Date("2026-01-09")
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
                <div className="flex items-center gap-2">
                  <button
                    onClick={prevMonth}
                    className="p-1 rounded hover:bg-slate-200 transition-colors"
                  >
                    <ChevronLeft className="h-5 w-5 text-slate-600" />
                  </button>
                  <button
                    onClick={nextMonth}
                    className="p-1 rounded hover:bg-slate-200 transition-colors"
                  >
                    <ChevronRight className="h-5 w-5 text-slate-600" />
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
                {MOCK_ALERTS.map((alert) => {
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
                })}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-lg border border-slate-200 p-4">
                <div className="text-2xl font-bold text-slate-900">
                  {MOCK_AUCTIONS.length}
                </div>
                <div className="text-sm text-slate-500">Upcoming Auctions</div>
              </div>
              <div className="bg-white rounded-lg border border-slate-200 p-4">
                <div className="text-2xl font-bold text-red-600">1</div>
                <div className="text-sm text-slate-500">This Month</div>
              </div>
            </div>
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
                          onClick={() => router.push(`/counties/${auction.id}`)}
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
                            router.push(`/counties/${auction.id}`)
                          }}
                          className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 font-medium"
                        >
                          View County Details
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

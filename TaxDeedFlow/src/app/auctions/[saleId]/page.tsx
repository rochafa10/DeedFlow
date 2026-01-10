"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  Calendar,
  MapPin,
  Clock,
  ArrowLeft,
  ExternalLink,
  Building2,
  DollarSign,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Users,
  Gavel,
  CreditCard,
  Timer,
  ClipboardList,
  Info,
  Download,
} from "lucide-react"
import { Header } from "@/components/layout/Header"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"

// Type definitions for API response
interface AuctionData {
  id: string
  county: string
  countyId: string
  state: string
  stateName: string
  date: string
  type: string
  platform: string
  location: string
  propertyCount: number
  registrationDeadline: string | null
  registrationDaysUntil: number | null
  registrationStatus: string
  depositRequired: string | null
  depositAmount: number | null
  status: string
  daysUntil: number
  urgency: string
  notes: string | null
  rules: {
    registrationRequired: boolean
    registrationDeadlineDays: number | null
    registrationFormUrl: string | null
    depositRefundable: boolean
    depositPaymentMethods: string[]
    minimumBidRule: string
    minimumBidAmount: number | null
    bidIncrement: number | null
    buyersPremiumPct: number | null
    paymentDeadlineHours: number
    paymentMethods: string[]
    financingAllowed: boolean
    deedRecordingTimeline: string | null
    redemptionPeriodDays: number | null
    possessionTimeline: string | null
    asIsSale: boolean
    liensSurvive: string[]
    titleInsuranceAvailable: boolean
    rulesSourceUrl: string | null
    lastVerifiedAt: string | null
    rawRulesText: string | null
  } | null
  propertyStats: {
    total: number
    approved: number
    caution: number
    rejected: number
    totalTaxDue: number
    avgTaxDue: number
  }
  properties: {
    id: string
    parcelId: string
    address: string
    owner: string
    totalDue: number
    hasRegridData: boolean
    validationStatus: string | null
  }[]
  alerts: {
    id: string
    type: string
    severity: string
    title: string
    message: string
    daysUntilEvent: number
    acknowledged: boolean
    createdAt: string
  }[]
  documents: {
    id: string
    type: string
    title: string
    url: string
    format: string
    propertyCount: number
    publicationDate: string
  }[]
  contacts: {
    id: string
    type: string
    title: string
    phone: string | null
    email: string | null
    url: string
  }[]
}

export default function AuctionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [activeTab, setActiveTab] = useState<"briefing" | "rules" | "documents">("briefing")
  const [checkedRequirements, setCheckedRequirements] = useState<Set<number>>(new Set())
  const [auction, setAuction] = useState<AuctionData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const saleId = params.saleId as string

  // Fetch auction data from API
  useEffect(() => {
    const fetchAuction = async () => {
      if (!saleId || !isAuthenticated) return

      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/auctions/${saleId}`)
        if (!response.ok) {
          if (response.status === 404) {
            setError("Auction not found")
          } else {
            throw new Error("Failed to fetch auction data")
          }
          return
        }

        const result = await response.json()
        setAuction(result.data)
      } catch (err) {
        console.error("Error fetching auction:", err)
        setError("Failed to load auction data")
        toast.error("Failed to load auction data")
      } finally {
        setIsLoading(false)
      }
    }

    fetchAuction()
  }, [saleId, isAuthenticated])

  // Load checked requirements from localStorage
  useEffect(() => {
    if (typeof window !== "undefined" && saleId) {
      const saved = localStorage.getItem(`auction-checklist-${saleId}`)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          setCheckedRequirements(new Set(parsed))
        } catch (e) {
          // Invalid data, ignore
        }
      }
    }
  }, [saleId])

  // Toggle requirement check
  const toggleRequirement = (index: number) => {
    setCheckedRequirements((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
        // Show toast when checking off an item
        toast.success("Requirement completed!", {
          description: "Your progress has been saved.",
        })
      }
      // Save to localStorage
      localStorage.setItem(`auction-checklist-${saleId}`, JSON.stringify([...newSet]))
      return newSet
    })
  }

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, authLoading, router])

  // Show loading state while checking auth
  if (authLoading || isLoading) {
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

  // Handle auction not found or error
  if (error || !auction) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => router.push("/auctions")}
            className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Auctions
          </button>
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Auction Not Found
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              {error || "The auction you're looking for doesn't exist or has been removed."}
            </p>
          </div>
        </main>
      </div>
    )
  }

  // Build bidder requirements list from rules
  const bidderRequirements: string[] = []
  if (auction.rules) {
    if (auction.rules.registrationRequired) {
      bidderRequirements.push("Pre-registration required by deadline")
    }
    if (auction.depositAmount) {
      bidderRequirements.push(`Refundable deposit of ${auction.depositRequired}`)
    }
    if (auction.rules.depositPaymentMethods?.length > 0) {
      bidderRequirements.push(`Deposit methods: ${auction.rules.depositPaymentMethods.join(", ")}`)
    }
    bidderRequirements.push("Valid government-issued photo ID")
    bidderRequirements.push("Must be 18 years or older")
  } else {
    // Default requirements when rules not available
    bidderRequirements.push("Pre-registration may be required")
    if (auction.depositRequired) {
      bidderRequirements.push(`Deposit: ${auction.depositRequired}`)
    }
    bidderRequirements.push("Valid government-issued photo ID")
  }

  // Build bidding process steps from rules
  const biddingProcess: string[] = []
  if (auction.rules) {
    biddingProcess.push("Properties auctioned in order listed")
    if (auction.rules.minimumBidRule) {
      biddingProcess.push(`Opening bid: ${auction.rules.minimumBidRule === "taxes_owed" ? "Total amount due" : auction.rules.minimumBidRule}`)
    }
    if (auction.rules.bidIncrement) {
      biddingProcess.push(`Bidding in $${auction.rules.bidIncrement} increments`)
    }
    biddingProcess.push("Highest bidder wins property")
    if (auction.rules.buyersPremiumPct) {
      biddingProcess.push(`Buyer's premium: ${auction.rules.buyersPremiumPct}%`)
    }
  } else {
    biddingProcess.push("Properties auctioned in order listed")
    biddingProcess.push("Opening bid is total amount due")
    biddingProcess.push("Highest bidder wins property")
  }

  // Get primary contact
  const primaryContact = auction.contacts[0]

  // Build payment methods list
  const paymentMethods = auction.rules?.paymentMethods || ["Certified Check", "Money Order", "Cash"]

  // Build payment deadline string
  const paymentDeadline = auction.rules?.paymentDeadlineHours
    ? `Within ${auction.rules.paymentDeadlineHours} hours after sale`
    : "Within 30 days of sale"

  // Build redemption period string
  const redemptionPeriod = auction.rules?.redemptionPeriodDays
    ? `${auction.rules.redemptionPeriodDays} days`
    : "None - Tax Deed sale"

  // Calculate days until registration
  const daysUntilRegistration = auction.registrationDaysUntil ?? 0

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => router.push("/auctions")}
          className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Auctions
        </button>

        {/* Header Section */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {auction.county} County, {auction.state}
                </h1>
                <span className={cn(
                  "px-3 py-1 rounded-full text-sm font-medium",
                  auction.type === "Tax Deed" || auction.type === "repository" || auction.type === "judicial" || auction.type === "upset"
                    ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                    : "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400"
                )}>
                  {auction.type}
                </span>
              </div>
              <div className="flex items-center gap-4 text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {new Date(auction.date).toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-slate-600 dark:text-slate-400">
                <MapPin className="h-4 w-4" />
                <span>{auction.location || auction.platform}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {primaryContact?.url && (
                <a
                  href={primaryContact.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  Official Website
                </a>
              )}
              {auction.countyId && (
                <button
                  onClick={() => router.push(`/counties/${auction.countyId}`)}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  <Building2 className="h-4 w-4" />
                  View County
                </button>
              )}
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm mb-1">
              <Timer className="h-4 w-4" />
              Days Until Auction
            </div>
            <div className={cn(
              "text-2xl font-bold",
              auction.daysUntil <= 7
                ? "text-red-600 dark:text-red-400"
                : auction.daysUntil <= 30
                ? "text-amber-600 dark:text-amber-400"
                : "text-slate-900 dark:text-slate-100"
            )}>
              {auction.daysUntil}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm mb-1">
              <Building2 className="h-4 w-4" />
              Properties
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {auction.propertyCount.toLocaleString()}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm mb-1">
              <DollarSign className="h-4 w-4" />
              Deposit Required
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {auction.depositRequired || "N/A"}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm mb-1">
              <Gavel className="h-4 w-4" />
              Platform
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {auction.platform || "TBD"}
            </div>
          </div>
        </div>

        {/* Key Dates Section */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Key Dates
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                daysUntilRegistration <= 3 ? "bg-red-100 dark:bg-red-900/30" : "bg-amber-100 dark:bg-amber-900/30"
              )}>
                <Users className={cn(
                  "h-5 w-5",
                  daysUntilRegistration <= 3 ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"
                )} />
              </div>
              <div>
                <div className="font-medium text-slate-900 dark:text-slate-100">Registration Deadline</div>
                <div className="text-slate-600 dark:text-slate-400">
                  {auction.registrationDeadline
                    ? new Date(auction.registrationDeadline).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "Contact county for details"}
                </div>
                {auction.registrationDaysUntil !== null && (
                  <div className={cn(
                    "text-sm font-medium",
                    daysUntilRegistration <= 3 ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"
                  )}>
                    {daysUntilRegistration} days remaining
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Gavel className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="font-medium text-slate-900 dark:text-slate-100">Auction Date</div>
                <div className="text-slate-600 dark:text-slate-400">
                  {new Date(auction.date).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-500">
                  {auction.daysUntil} days away
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <CreditCard className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <div className="font-medium text-slate-900 dark:text-slate-100">Payment Deadline</div>
                <div className="text-slate-600 dark:text-slate-400">{paymentDeadline}</div>
                <div className="text-sm text-slate-500 dark:text-slate-500">
                  Methods: {paymentMethods.slice(0, 2).join(", ")}
                  {paymentMethods.length > 2 && ` +${paymentMethods.length - 2} more`}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabbed Content */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          {/* Tabs */}
          <div className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <div className="flex">
              <button
                onClick={() => setActiveTab("briefing")}
                className={cn(
                  "px-6 py-3 text-sm font-medium transition-colors flex items-center gap-2",
                  activeTab === "briefing"
                    ? "text-primary border-b-2 border-primary bg-white dark:bg-slate-800"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                )}
              >
                <Info className="h-4 w-4" />
                Property Stats
              </button>
              <button
                onClick={() => setActiveTab("rules")}
                className={cn(
                  "px-6 py-3 text-sm font-medium transition-colors flex items-center gap-2",
                  activeTab === "rules"
                    ? "text-primary border-b-2 border-primary bg-white dark:bg-slate-800"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                )}
              >
                <ClipboardList className="h-4 w-4" />
                Auction Rules
              </button>
              <button
                onClick={() => setActiveTab("documents")}
                className={cn(
                  "px-6 py-3 text-sm font-medium transition-colors flex items-center gap-2",
                  activeTab === "documents"
                    ? "text-primary border-b-2 border-primary bg-white dark:bg-slate-800"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                )}
              >
                <FileText className="h-4 w-4" />
                Documents
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Property Stats Tab */}
            {activeTab === "briefing" && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Property Overview</h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    This {auction.type} sale includes {auction.propertyCount.toLocaleString()} properties in {auction.county} County, {auction.stateName || auction.state}.
                    {auction.propertyStats.totalTaxDue > 0 && (
                      <> Total tax due is ${auction.propertyStats.totalTaxDue.toLocaleString()}, averaging ${auction.propertyStats.avgTaxDue.toLocaleString()} per property.</>
                    )}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                    <h3 className="font-semibold text-green-800 dark:text-green-300 mb-3 flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5" />
                      Approved Properties
                    </h3>
                    <div className="text-3xl font-bold text-green-700 dark:text-green-400 mb-2">
                      {auction.propertyStats.approved}
                    </div>
                    <p className="text-green-600 dark:text-green-500 text-sm">
                      Properties that passed visual validation and are ready for analysis
                    </p>
                  </div>

                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
                    <h3 className="font-semibold text-amber-800 dark:text-amber-300 mb-3 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      Needs Review
                    </h3>
                    <div className="text-3xl font-bold text-amber-700 dark:text-amber-400 mb-2">
                      {auction.propertyStats.caution}
                    </div>
                    <p className="text-amber-600 dark:text-amber-500 text-sm">
                      Properties flagged for manual review before proceeding
                    </p>
                  </div>
                </div>

                {/* Sample Properties */}
                {auction.properties.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">Sample Properties</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-700">
                            <th className="text-left py-2 px-3 font-medium text-slate-600 dark:text-slate-400">Parcel ID</th>
                            <th className="text-left py-2 px-3 font-medium text-slate-600 dark:text-slate-400">Address</th>
                            <th className="text-right py-2 px-3 font-medium text-slate-600 dark:text-slate-400">Tax Due</th>
                            <th className="text-center py-2 px-3 font-medium text-slate-600 dark:text-slate-400">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {auction.properties.slice(0, 10).map((property) => (
                            <tr key={property.id} className="border-b border-slate-100 dark:border-slate-800">
                              <td className="py-2 px-3 font-mono text-xs text-slate-700 dark:text-slate-300">{property.parcelId}</td>
                              <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{property.address}</td>
                              <td className="py-2 px-3 text-right text-slate-700 dark:text-slate-300">
                                {property.totalDue ? `$${Number(property.totalDue).toLocaleString()}` : "N/A"}
                              </td>
                              <td className="py-2 px-3 text-center">
                                {property.validationStatus ? (
                                  <span className={cn(
                                    "px-2 py-0.5 rounded text-xs font-medium",
                                    property.validationStatus === "APPROVED"
                                      ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                      : property.validationStatus === "CAUTION"
                                      ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                                      : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                                  )}>
                                    {property.validationStatus}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 dark:text-slate-500 text-xs">Pending</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {auction.properties.length > 10 && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                        Showing 10 of {auction.properties.length} properties
                      </p>
                    )}
                  </div>
                )}

                {/* Alerts */}
                {auction.alerts.length > 0 && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                    <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
                      <Info className="h-5 w-5" />
                      Active Alerts
                    </h3>
                    <ul className="space-y-2">
                      {auction.alerts.map((alert) => (
                        <li key={alert.id} className="flex items-start gap-2 text-blue-700 dark:text-blue-400">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-xs font-medium",
                            alert.severity === "critical"
                              ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                              : alert.severity === "warning"
                              ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                              : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                          )}>
                            {alert.severity}
                          </span>
                          <span>{alert.title}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Auction Rules Tab */}
            {activeTab === "rules" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                      <Users className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                      Bidder Requirements
                    </h3>
                    <ul className="space-y-2">
                      {bidderRequirements.map((req, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <button
                            onClick={() => toggleRequirement(index)}
                            className={cn(
                              "flex items-center justify-center h-5 w-5 rounded border-2 flex-shrink-0 mt-0.5 transition-colors",
                              checkedRequirements.has(index)
                                ? "bg-green-500 border-green-500 text-white"
                                : "border-slate-300 dark:border-slate-600 hover:border-green-400"
                            )}
                            aria-label={checkedRequirements.has(index) ? "Uncheck requirement" : "Check requirement"}
                          >
                            {checkedRequirements.has(index) && (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <span className={cn(
                            "transition-colors",
                            checkedRequirements.has(index)
                              ? "text-slate-400 dark:text-slate-500 line-through"
                              : "text-slate-600 dark:text-slate-400"
                          )}>
                            {req}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {bidderRequirements.length > 0 && (
                      <div className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                        {checkedRequirements.size} of {bidderRequirements.length} completed
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                      <Gavel className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                      Bidding Process
                    </h3>
                    <ol className="space-y-2">
                      {biddingProcess.map((step, index) => (
                        <li key={index} className="flex items-start gap-2 text-slate-600 dark:text-slate-400">
                          <span className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium px-2 py-0.5 rounded flex-shrink-0">
                            {index + 1}
                          </span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>

                <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">Payment Methods</h4>
                      <ul className="space-y-1">
                        {paymentMethods.map((method, index) => (
                          <li key={index} className="text-slate-600 dark:text-slate-400 text-sm">
                            {method}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">Payment Deadline</h4>
                      <p className="text-slate-600 dark:text-slate-400 text-sm">{paymentDeadline}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">Redemption Period</h4>
                      <p className="text-slate-600 dark:text-slate-400 text-sm">{redemptionPeriod}</p>
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                {auction.contacts.length > 0 && (
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Contact Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      {primaryContact?.phone && (
                        <div>
                          <div className="text-slate-500 dark:text-slate-400">Phone</div>
                          <div className="font-medium text-slate-900 dark:text-slate-100">{primaryContact.phone}</div>
                        </div>
                      )}
                      {primaryContact?.email && (
                        <div>
                          <div className="text-slate-500 dark:text-slate-400">Email</div>
                          <a href={`mailto:${primaryContact.email}`} className="font-medium text-primary hover:underline">
                            {primaryContact.email}
                          </a>
                        </div>
                      )}
                      {primaryContact?.url && (
                        <div>
                          <div className="text-slate-500 dark:text-slate-400">Website</div>
                          <a href={primaryContact.url} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline flex items-center gap-1">
                            Visit Website
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Documents Tab */}
            {activeTab === "documents" && (
              <div>
                {auction.documents.length > 0 ? (
                  <div className="space-y-3">
                    {auction.documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded">
                            <FileText className="h-5 w-5 text-red-600 dark:text-red-400" />
                          </div>
                          <div>
                            <div className="font-medium text-slate-900 dark:text-slate-100">{doc.title}</div>
                            <div className="text-sm text-slate-500 dark:text-slate-400">
                              {doc.format?.toUpperCase() || "Document"}
                              {doc.publicationDate && ` • Added ${new Date(doc.publicationDate).toLocaleDateString()}`}
                              {doc.propertyCount && ` • ${doc.propertyCount} properties`}
                            </div>
                          </div>
                        </div>
                        {doc.url && (
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-1.5 text-sm text-primary hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          >
                            <Download className="h-4 w-4" />
                            Download
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                    No documents available for this auction yet.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ")
}

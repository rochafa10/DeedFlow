"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import {
  ArrowLeft,
  MapPin,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  ExternalLink,
  BarChart3,
  History,
  Gavel,
  TrendingUp,
  Users,
  Link as LinkIcon,
} from "lucide-react"
import { Header } from "@/components/layout/Header"
import { useAuth } from "@/contexts/AuthContext"

// Mock county data - in production this would come from API
const MOCK_COUNTIES: Record<string, CountyDetail> = {
  "1": {
    id: "1",
    name: "Westmoreland",
    state: "PA",
    status: "active",
    propertyCount: 172,
    progress: 85,
    nextAuctionDate: "Jan 16, 2026",
    daysUntilAuction: 7,
    documentsCount: 8,
    researchedAt: "2026-01-05",
    // Additional details
    website: "https://www.co.westmoreland.pa.us",
    taxOfficePhone: "(724) 830-3150",
    taxOfficeEmail: "taxclaim@co.westmoreland.pa.us",
    saleType: "Tax Deed",
    depositRequired: 10,
    depositAmount: null,
    registrationDeadline: "Jan 10, 2026",
    paymentDeadline: "Jan 30, 2026",
    bidderRequirements: ["Photo ID", "Proof of Funds", "Registration Form"],
    pipelineStats: {
      parsed: 172,
      enriched: 158,
      validated: 150,
      approved: 145,
    },
    recentActivity: [
      { date: "2026-01-05", action: "Research completed", agent: "Research Agent" },
      { date: "2026-01-04", action: "Property list updated", agent: "Parser Agent" },
      { date: "2026-01-03", action: "158 properties enriched", agent: "Regrid Scraper" },
      { date: "2026-01-02", action: "Visual validation started", agent: "Visual Validator" },
    ],
  },
  "2": {
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
    website: "https://www.blairco.org",
    taxOfficePhone: "(814) 693-3100",
    taxOfficeEmail: "taxclaim@blairco.org",
    saleType: "Tax Deed",
    depositRequired: 5,
    depositAmount: 500,
    registrationDeadline: "Mar 1, 2026",
    paymentDeadline: "Mar 25, 2026",
    bidderRequirements: ["Photo ID", "Deposit Check"],
    pipelineStats: {
      parsed: 252,
      enriched: 180,
      validated: 160,
      approved: 155,
    },
    recentActivity: [
      { date: "2026-01-03", action: "Research completed", agent: "Research Agent" },
      { date: "2026-01-02", action: "252 properties parsed", agent: "Parser Agent" },
    ],
  },
  "3": {
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
    website: "https://www.co.somerset.pa.us",
    taxOfficePhone: "(814) 445-1500",
    taxOfficeEmail: "taxclaim@co.somerset.pa.us",
    saleType: "Tax Deed",
    depositRequired: 10,
    depositAmount: null,
    registrationDeadline: "Aug 25, 2026",
    paymentDeadline: "Sep 22, 2026",
    bidderRequirements: ["Photo ID", "Registration Form", "Deposit"],
    pipelineStats: {
      parsed: 2663,
      enriched: 800,
      validated: 600,
      approved: 750,
    },
    recentActivity: [
      { date: "2026-01-02", action: "Research completed", agent: "Research Agent" },
      { date: "2026-01-01", action: "2663 properties parsed", agent: "Parser Agent" },
    ],
  },
}

interface PipelineStats {
  parsed: number
  enriched: number
  validated: number
  approved: number
}

interface ActivityItem {
  date: string
  action: string
  agent: string
}

interface CountyDetail {
  id: string
  name: string
  state: string
  status: string
  propertyCount: number
  progress: number
  nextAuctionDate: string | null
  daysUntilAuction: number | null
  documentsCount: number
  researchedAt: string | null
  website: string
  taxOfficePhone: string
  taxOfficeEmail: string
  saleType: string
  depositRequired: number
  depositAmount: number | null
  registrationDeadline: string | null
  paymentDeadline: string | null
  bidderRequirements: string[]
  pipelineStats: PipelineStats
  recentActivity: ActivityItem[]
}

type CountyStatus = "active" | "pending" | "archived"

const STATUS_CONFIG: Record<
  CountyStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  active: {
    label: "Active",
    color: "bg-green-100 text-green-700",
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  pending: {
    label: "Pending Research",
    color: "bg-amber-100 text-amber-700",
    icon: <Clock className="h-4 w-4" />,
  },
  archived: {
    label: "Archived",
    color: "bg-slate-100 text-slate-700",
    icon: <AlertTriangle className="h-4 w-4" />,
  },
}

type TabType = "overview" | "properties" | "documents" | "auction" | "activity"

export default function CountyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>("overview")
  const [county, setCounty] = useState<CountyDetail | null>(null)
  const [loading, setLoading] = useState(true)

  const countyId = params.id as string

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, authLoading, router])

  // Load county data
  useEffect(() => {
    // Simulate API call
    const loadCounty = () => {
      setLoading(true)
      // In production, fetch from API
      const found = MOCK_COUNTIES[countyId]
      setCounty(found || null)
      setLoading(false)
    }

    if (countyId) {
      loadCounty()
    }
  }, [countyId])

  // Show loading state
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500">Loading...</div>
      </div>
    )
  }

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null
  }

  // Show not found
  if (!county) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => router.push("/counties")}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Counties
          </button>
          <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              County Not Found
            </h2>
            <p className="text-slate-600">
              The county you're looking for doesn't exist or has been removed.
            </p>
          </div>
        </main>
      </div>
    )
  }

  const statusConfig = STATUS_CONFIG[county.status as CountyStatus]

  const tabs = [
    { id: "overview" as const, label: "Overview", icon: <FileText className="h-4 w-4" /> },
    { id: "properties" as const, label: "Properties", icon: <Building2 className="h-4 w-4" /> },
    { id: "documents" as const, label: "Documents", icon: <FileText className="h-4 w-4" /> },
    { id: "auction" as const, label: "Auction Info", icon: <Gavel className="h-4 w-4" /> },
    { id: "activity" as const, label: "Activity", icon: <History className="h-4 w-4" /> },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => router.push("/counties")}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Counties
        </button>

        {/* County Header */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-slate-900">
                  {county.name} County
                </h1>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium",
                    statusConfig.color
                  )}
                >
                  {statusConfig.icon}
                  {statusConfig.label}
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <MapPin className="h-4 w-4" />
                <span>{county.state}</span>
                {county.website && (
                  <>
                    <span className="text-slate-300">|</span>
                    <a
                      href={county.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-primary hover:underline"
                    >
                      <LinkIcon className="h-3.5 w-3.5" />
                      Official Website
                    </a>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              {county.nextAuctionDate && (
                <div className="text-right">
                  <div className="text-sm text-slate-500">Next Auction</div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <span className="text-lg font-semibold text-slate-900">
                      {county.nextAuctionDate}
                    </span>
                  </div>
                  {county.daysUntilAuction !== null && (
                    <span
                      className={cn(
                        "text-sm",
                        county.daysUntilAuction <= 14
                          ? "text-red-600"
                          : county.daysUntilAuction <= 30
                          ? "text-amber-600"
                          : "text-slate-500"
                      )}
                    >
                      {county.daysUntilAuction} days away
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
              <Building2 className="h-4 w-4" />
              Total Properties
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {county.propertyCount.toLocaleString()}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
              <TrendingUp className="h-4 w-4" />
              Pipeline Progress
            </div>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold text-slate-900">{county.progress}%</div>
              <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full",
                    county.progress >= 75
                      ? "bg-green-500"
                      : county.progress >= 50
                      ? "bg-amber-500"
                      : "bg-blue-500"
                  )}
                  style={{ width: `${county.progress}%` }}
                />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
              <FileText className="h-4 w-4" />
              Documents
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {county.documentsCount}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
              <CheckCircle2 className="h-4 w-4" />
              Approved
            </div>
            <div className="text-2xl font-bold text-green-600">
              {county.pipelineStats.approved}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="border-b border-slate-200">
            <div className="flex overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                    activeTab === tab.id
                      ? "border-primary text-primary"
                      : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                  )}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Contact Information */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">
                    Contact Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <div className="text-sm text-slate-500">Phone</div>
                      <div className="font-medium text-slate-900">
                        {county.taxOfficePhone}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-500">Email</div>
                      <div className="font-medium text-slate-900">
                        {county.taxOfficeEmail}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-500">Website</div>
                      <a
                        href={county.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-primary hover:underline flex items-center gap-1"
                      >
                        {county.website.replace("https://", "")}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </div>

                {/* Pipeline Stats */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">
                    Pipeline Status
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-50 rounded-lg p-4">
                      <div className="text-sm text-slate-500">Parsed</div>
                      <div className="text-xl font-semibold text-slate-900">
                        {county.pipelineStats.parsed}
                      </div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="text-sm text-blue-600">Enriched</div>
                      <div className="text-xl font-semibold text-blue-900">
                        {county.pipelineStats.enriched}
                      </div>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-4">
                      <div className="text-sm text-amber-600">Validated</div>
                      <div className="text-xl font-semibold text-amber-900">
                        {county.pipelineStats.validated}
                      </div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="text-sm text-green-600">Approved</div>
                      <div className="text-xl font-semibold text-green-900">
                        {county.pipelineStats.approved}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Research Status */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">
                    Research Status
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-slate-500">Last Researched</div>
                      <div className="font-medium text-slate-900">
                        {county.researchedAt
                          ? new Date(county.researchedAt).toLocaleDateString()
                          : "Never"}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-500">Sale Type</div>
                      <div className="font-medium text-slate-900">
                        {county.saleType}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "properties" && (
              <div className="text-center py-12">
                <Building2 className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p className="text-slate-600 mb-4">
                  View all {county.propertyCount.toLocaleString()} properties in {county.name} County
                </p>
                <button
                  onClick={() => router.push(`/properties?county=${county.name}`)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                >
                  View Properties
                  <ExternalLink className="h-4 w-4" />
                </button>
              </div>
            )}

            {activeTab === "documents" && (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p className="text-slate-600">
                  {county.documentsCount} documents available for this county.
                </p>
                <p className="text-sm text-slate-500 mt-2">
                  Document viewer coming soon.
                </p>
              </div>
            )}

            {activeTab === "auction" && (
              <div className="space-y-6">
                {/* Auction Details */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">
                    Auction Details
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <div className="text-sm text-slate-500">Sale Type</div>
                      <div className="font-medium text-slate-900">
                        {county.saleType}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-500">Deposit Required</div>
                      <div className="font-medium text-slate-900">
                        {county.depositAmount
                          ? `$${county.depositAmount.toLocaleString()}`
                          : `${county.depositRequired}%`}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-500">Next Auction Date</div>
                      <div className="font-medium text-slate-900">
                        {county.nextAuctionDate || "TBD"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Important Deadlines */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">
                    Important Deadlines
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <div className="text-sm text-amber-600">Registration Deadline</div>
                      <div className="font-semibold text-amber-900">
                        {county.registrationDeadline || "TBD"}
                      </div>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="text-sm text-blue-600">Payment Deadline</div>
                      <div className="font-semibold text-blue-900">
                        {county.paymentDeadline || "TBD"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bidder Requirements */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">
                    Bidder Requirements
                  </h3>
                  <ul className="space-y-2">
                    {county.bidderRequirements.map((req, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span className="text-slate-700">{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {activeTab === "activity" && (
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  Recent Activity
                </h3>
                <div className="space-y-4">
                  {county.recentActivity.map((activity, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-4 pb-4 border-b border-slate-100 last:border-0"
                    >
                      <div className="w-2 h-2 mt-2 rounded-full bg-primary" />
                      <div className="flex-1">
                        <div className="font-medium text-slate-900">
                          {activity.action}
                        </div>
                        <div className="text-sm text-slate-500">
                          {activity.agent} • {activity.date}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
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

"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Building2,
  FileText,
  Clock,
  CheckCircle2,
  Download,
  ExternalLink,
  Eye,
  AlertTriangle,
  Activity,
  Users,
  Info,
  Link as LinkIcon,
  Gavel,
  Play,
  X,
} from "lucide-react"
import { Header } from "@/components/layout/Header"
import { useAuth } from "@/contexts/AuthContext"
import { Breadcrumbs } from "@/components/shared/Breadcrumbs"

// TypeScript interface for API response
interface CountyData {
  id: string
  name: string
  state: string
  stateName: string
  status: "active" | "pending" | "archived"
  researchStatus: string | null
  lastResearchedAt: string | null
  createdAt: string

  // Stats
  propertyCount: number
  activePropertyCount: number
  progress: number
  nextAuctionDate: string | null
  daysUntilAuction: number | null
  documentsCount: number

  // Pipeline stats
  pipelineStats: {
    total: number
    parsed: number
    withRegrid: number
    validated: number
    approved: number
    caution: number
    rejected: number
    regridPct: number
    validationPct: number
  }

  // Documents
  documents: {
    id: string
    type: string
    title: string
    url: string
    format: string | null
    propertyCount: number | null
    parsingStatus: string | null
    publicationDate: string | null
    year: number | null
    createdAt: string
  }[]

  // Upcoming auctions
  upcomingAuctions: {
    id: string
    type: string
    date: string
    daysUntil: number
    platform: string | null
    location: string | null
    propertyCount: number | null
    depositRequired: number | null
    registrationDeadline: string | null
    status: string | null
  }[]

  // Contacts
  contacts: {
    id: string
    type: string
    title: string
    url: string
    phone: string | null
    email: string | null
  }[]

  // Vendor portal
  vendorPortal: {
    id: string
    name: string
    url: string
    registrationUrl: string | null
    isPrimary: boolean
  } | null

  // Resources
  resources: {
    id: string
    type: string
    title: string
    url: string
    description: string | null
  }[]

  // Notes
  notes: {
    id: string
    type: string
    text: string
    priority: number
    createdAt: string
  }[]

  // Recent activity
  recentActivity: {
    id: string
    type: string
    title: string
    description: string
    timestamp: string
  }[]

  // Sample properties
  properties: {
    id: string
    parcelId: string
    address: string
    totalDue: number | null
    hasRegridData: boolean
    validationStatus: string | null
    auctionStatus: string | null
    saleType: string | null
    saleDate: string | null
  }[]
}

// Document type configuration
const DOC_TYPE_CONFIG: Record<string, { label: string; color: string; darkColor: string; icon: React.ReactNode }> = {
  property_list: {
    label: "Property List",
    color: "bg-blue-100 text-blue-700",
    darkColor: "dark:bg-blue-900/30 dark:text-blue-400",
    icon: <Building2 className="h-4 w-4" />,
  },
  auction_rules: {
    label: "Auction Rules",
    color: "bg-purple-100 text-purple-700",
    darkColor: "dark:bg-purple-900/30 dark:text-purple-400",
    icon: <Gavel className="h-4 w-4" />,
  },
  registration_form: {
    label: "Registration Form",
    color: "bg-green-100 text-green-700",
    darkColor: "dark:bg-green-900/30 dark:text-green-400",
    icon: <FileText className="h-4 w-4" />,
  },
  tax_map: {
    label: "Tax Map",
    color: "bg-amber-100 text-amber-700",
    darkColor: "dark:bg-amber-900/30 dark:text-amber-400",
    icon: <MapPin className="h-4 w-4" />,
  },
  legal_notice: {
    label: "Legal Notice",
    color: "bg-red-100 text-red-700",
    darkColor: "dark:bg-red-900/30 dark:text-red-400",
    icon: <AlertTriangle className="h-4 w-4" />,
  },
  other: {
    label: "Other",
    color: "bg-slate-100 text-slate-700",
    darkColor: "dark:bg-slate-700 dark:text-slate-300",
    icon: <FileText className="h-4 w-4" />,
  },
}

type TabType = "overview" | "documents" | "properties" | "activity"

export default function CountyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>("overview")
  const [showBatchModal, setShowBatchModal] = useState(false)
  const [batchSize, setBatchSize] = useState(50)
  const [batchStarting, setBatchStarting] = useState(false)

  // State for API data
  const [county, setCounty] = useState<CountyData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const countyId = params.id as string

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, authLoading, router])

  // Fetch county data from API
  useEffect(() => {
    const fetchCounty = async () => {
      if (!countyId || !isAuthenticated) return

      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/counties/${countyId}`)

        if (!response.ok) {
          if (response.status === 404) {
            setError("County not found")
          } else {
            throw new Error("Failed to fetch county data")
          }
          return
        }

        const result = await response.json()
        setCounty(result.data)
      } catch (err) {
        console.error("Error fetching county:", err)
        setError("Failed to load county data")
        toast.error("Failed to load county data")
      } finally {
        setIsLoading(false)
      }
    }

    fetchCounty()
  }, [countyId, isAuthenticated])

  // Show loading state
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-slate-500 dark:text-slate-400">Loading...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  // Handle county not found or error
  if (error || !county) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <h2 className="text-lg font-medium text-slate-900 dark:text-white">{error || "County not found"}</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-2">The county you are looking for does not exist.</p>
            <button
              onClick={() => router.push("/counties")}
              className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              Back to Counties
            </button>
          </div>
        </main>
      </div>
    )
  }

  // Get next upcoming auction for display
  const nextAuction = county.upcomingAuctions.length > 0 ? county.upcomingAuctions[0] : null

  // Calculate processed and pending properties
  const processedCount = county.pipelineStats.withRegrid
  const pendingCount = county.propertyCount - processedCount

  // Get official website from contacts
  const officialWebsite = county.contacts.find(c => c.type === "official_website")?.url || null
  const taxSaleInfo = county.contacts.find(c => c.type === "tax_sale_info" || c.type === "tax_claim_bureau")?.url || null

  const tabs: { id: TabType; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: "overview", label: "Overview", icon: <Info className="h-4 w-4" /> },
    { id: "documents", label: "Documents", icon: <FileText className="h-4 w-4" />, count: county.documents.length },
    { id: "properties", label: "Properties", icon: <Building2 className="h-4 w-4" />, count: county.propertyCount },
    { id: "activity", label: "Activity", icon: <Activity className="h-4 w-4" /> },
  ]

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Header />
      <Breadcrumbs
        items={[
          { label: "Counties", href: "/counties" },
          { label: `${county.name} County` },
        ]}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button and Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push("/counties")}
            className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-4 text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Counties
          </button>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {county.name} County, {county.state}
                </h1>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                    county.status === "active"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : county.status === "pending"
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      : "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                  )}
                >
                  {county.status === "active" ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <Clock className="h-3 w-3" />
                  )}
                  {county.status === "active" ? "Active" : county.status === "pending" ? "Pending" : "Archived"}
                </span>
              </div>
              {county.lastResearchedAt && (
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Last researched:{" "}
                  {new Date(county.lastResearchedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>

            {officialWebsite && (
              <a
                href={officialWebsite}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                <ExternalLink className="h-4 w-4" />
                Official Website
              </a>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm mb-1">
              <Building2 className="h-4 w-4" />
              Properties
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{county.propertyCount.toLocaleString()}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm mb-1">
              <FileText className="h-4 w-4" />
              Documents
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{county.documents.length}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm mb-1">
              <Activity className="h-4 w-4" />
              Progress
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{county.progress}%</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm mb-1">
              <Calendar className="h-4 w-4" />
              Next Auction
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {county.daysUntilAuction !== null ? `${county.daysUntilAuction}d` : "-"}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="border-b border-slate-200 dark:border-slate-700">
            <div className="flex overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                    activeTab === tab.id
                      ? "border-primary text-primary"
                      : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  {tab.icon}
                  {tab.label}
                  {tab.count !== undefined && (
                    <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs px-2 py-0.5 rounded-full">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === "overview" && (
              <div className="grid md:grid-cols-2 gap-6">
                {/* Auction Information */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <Gavel className="h-4 w-4" />
                    Auction Information
                  </h3>
                  <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 space-y-3">
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Auction Type</div>
                      <div className="font-medium text-slate-900 dark:text-white">
                        {nextAuction?.type || "Not scheduled"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Next Auction Date</div>
                      <div className="font-medium text-slate-900 dark:text-white">
                        {nextAuction ? (
                          <>
                            {new Date(nextAuction.date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                            <span
                              className={cn(
                                "ml-2 text-sm",
                                nextAuction.daysUntil <= 14
                                  ? "text-red-600 dark:text-red-400"
                                  : nextAuction.daysUntil <= 30
                                  ? "text-amber-600 dark:text-amber-400"
                                  : "text-slate-500 dark:text-slate-400"
                              )}
                            >
                              ({nextAuction.daysUntil} days)
                            </span>
                          </>
                        ) : (
                          "Not scheduled"
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Registration Deadline</div>
                      <div className="font-medium text-slate-900 dark:text-white">
                        {nextAuction?.registrationDeadline
                          ? new Date(nextAuction.registrationDeadline).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "Not specified"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Deposit Required</div>
                      <div className="font-medium text-slate-900 dark:text-white">
                        {nextAuction?.depositRequired
                          ? `$${nextAuction.depositRequired.toLocaleString()}`
                          : "Not specified"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Platform</div>
                      <div className="font-medium text-slate-900 dark:text-white">
                        {nextAuction?.platform || "Not specified"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pipeline Stats */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Pipeline Stats
                  </h3>
                  <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Total Properties</span>
                      <span className="font-medium text-slate-900 dark:text-white">{county.pipelineStats.total}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600 dark:text-slate-400">With Regrid Data</span>
                      <span className="font-medium text-slate-900 dark:text-white">
                        {county.pipelineStats.withRegrid} ({county.pipelineStats.regridPct}%)
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Validated</span>
                      <span className="font-medium text-slate-900 dark:text-white">
                        {county.pipelineStats.validated} ({county.pipelineStats.validationPct}%)
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-green-600 dark:text-green-400">Approved</span>
                      <span className="font-medium text-green-600 dark:text-green-400">{county.pipelineStats.approved}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-amber-600 dark:text-amber-400">Caution</span>
                      <span className="font-medium text-amber-600 dark:text-amber-400">{county.pipelineStats.caution}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-red-600 dark:text-red-400">Rejected</span>
                      <span className="font-medium text-red-600 dark:text-red-400">{county.pipelineStats.rejected}</span>
                    </div>
                  </div>
                </div>

                {/* Important Notes */}
                {county.notes.length > 0 && (
                  <div className="md:col-span-2 space-y-4">
                    <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      Important Notes
                    </h3>
                    <ul className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 space-y-2">
                      {county.notes.map((note) => (
                        <li key={note.id} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                          {note.text}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Contacts */}
                {county.contacts.length > 0 && (
                  <div className="md:col-span-2 space-y-4">
                    <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Contacts
                    </h3>
                    <div className="grid sm:grid-cols-2 gap-4">
                      {county.contacts.filter(c => c.phone || c.email).map((contact) => (
                        <div key={contact.id} className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
                          <div className="font-medium text-slate-900 dark:text-white">{contact.title}</div>
                          <div className="text-sm text-slate-600 dark:text-slate-400 capitalize">{contact.type.replace(/_/g, " ")}</div>
                          <div className="mt-2 space-y-1 text-sm">
                            {contact.email && (
                              <a
                                href={`mailto:${contact.email}`}
                                className="flex items-center gap-2 text-primary hover:underline"
                              >
                                {contact.email}
                              </a>
                            )}
                            {contact.phone && (
                              <div className="text-slate-600 dark:text-slate-400">{contact.phone}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Links */}
                <div className="md:col-span-2 space-y-4">
                  <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <LinkIcon className="h-4 w-4" />
                    Important Links
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {officialWebsite && (
                      <a
                        href={officialWebsite}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-900 rounded-lg text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Official Website
                      </a>
                    )}
                    {taxSaleInfo && (
                      <a
                        href={taxSaleInfo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-900 rounded-lg text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                      >
                        <Gavel className="h-4 w-4" />
                        Tax Sale Information
                      </a>
                    )}
                    {county.vendorPortal && (
                      <a
                        href={county.vendorPortal.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-sm text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800"
                      >
                        <ExternalLink className="h-4 w-4" />
                        {county.vendorPortal.name}
                        <span className="text-xs bg-blue-100 dark:bg-blue-900/50 px-1.5 py-0.5 rounded">Vendor Portal</span>
                      </a>
                    )}
                    {county.resources.map((resource) => (
                      <a
                        key={resource.id}
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-900 rounded-lg text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                        title={resource.description || undefined}
                      >
                        <ExternalLink className="h-4 w-4" />
                        {resource.title}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Documents Tab */}
            {activeTab === "documents" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    County Documents
                    <span className="ml-2 text-sm font-normal text-slate-500 dark:text-slate-400">
                      ({county.documents.length} documents)
                    </span>
                  </h3>
                </div>

                {county.documents.length > 0 ? (
                  <div className="divide-y divide-slate-200 dark:divide-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                    {county.documents.map((doc) => {
                      const typeConfig = DOC_TYPE_CONFIG[doc.type] || DOC_TYPE_CONFIG.other
                      return (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className={cn("p-2 rounded-lg", typeConfig.color, typeConfig.darkColor)}>
                              {typeConfig.icon}
                            </div>
                            <div>
                              <div className="font-medium text-slate-900 dark:text-white">{doc.title}</div>
                              <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400 mt-1">
                                <span className={cn("px-2 py-0.5 rounded text-xs", typeConfig.color, typeConfig.darkColor)}>
                                  {typeConfig.label}
                                </span>
                                {doc.format && <span>{doc.format.toUpperCase()}</span>}
                                {doc.propertyCount && <span>{doc.propertyCount} properties</span>}
                                {doc.createdAt && (
                                  <span>
                                    Added{" "}
                                    {new Date(doc.createdAt).toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    })}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {doc.url && (
                              <>
                                <a
                                  href={doc.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                                  title="View Document"
                                >
                                  <Eye className="h-4 w-4" />
                                </a>
                                <a
                                  href={doc.url}
                                  download
                                  className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                                  title="Download Document"
                                >
                                  <Download className="h-4 w-4" />
                                </a>
                              </>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No documents yet</h3>
                    <p className="text-slate-500 dark:text-slate-400">
                      Documents will appear here once research is completed.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Properties Tab */}
            {activeTab === "properties" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    Properties
                    <span className="ml-2 text-sm font-normal text-slate-500 dark:text-slate-400">
                      ({county.propertyCount.toLocaleString()} properties)
                    </span>
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowBatchModal(true)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                    >
                      <Play className="h-3.5 w-3.5" />
                      Start Regrid Batch
                    </button>
                    <button
                      onClick={() => router.push(`/properties?county=${county.name}`)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white text-sm rounded-lg hover:bg-primary/90"
                    >
                      View All Properties
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                    <div>
                      <div className="text-3xl font-bold text-slate-900 dark:text-white">{county.propertyCount}</div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">Total Properties</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                        {processedCount}
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">Processed</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                        {pendingCount}
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">Pending</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-slate-900 dark:text-white">{county.progress}%</div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">Complete</div>
                    </div>
                  </div>
                </div>

                {/* Sample Properties Table */}
                {county.properties.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Sample Properties</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-700">
                            <th className="text-left py-2 px-3 font-medium text-slate-600 dark:text-slate-400">Parcel ID</th>
                            <th className="text-left py-2 px-3 font-medium text-slate-600 dark:text-slate-400">Address</th>
                            <th className="text-right py-2 px-3 font-medium text-slate-600 dark:text-slate-400">Total Due</th>
                            <th className="text-center py-2 px-3 font-medium text-slate-600 dark:text-slate-400">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {county.properties.slice(0, 10).map((prop) => (
                            <tr key={prop.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                              <td className="py-2 px-3 text-slate-900 dark:text-white font-mono text-xs">{prop.parcelId}</td>
                              <td className="py-2 px-3 text-slate-700 dark:text-slate-300">{prop.address}</td>
                              <td className="py-2 px-3 text-right text-slate-900 dark:text-white">
                                {prop.totalDue ? `$${prop.totalDue.toLocaleString()}` : "-"}
                              </td>
                              <td className="py-2 px-3 text-center">
                                {prop.validationStatus ? (
                                  <span
                                    className={cn(
                                      "inline-flex px-2 py-0.5 rounded text-xs font-medium",
                                      prop.validationStatus === "APPROVED"
                                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                        : prop.validationStatus === "CAUTION"
                                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                    )}
                                  >
                                    {prop.validationStatus}
                                  </span>
                                ) : prop.hasRegridData ? (
                                  <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                    Regrid Done
                                  </span>
                                ) : (
                                  <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400">
                                    Pending
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Activity Tab */}
            {activeTab === "activity" && (
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-900 dark:text-white">Recent Activity</h3>

                {county.recentActivity.length > 0 ? (
                  <div className="relative">
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700" />
                    <div className="space-y-4">
                      {county.recentActivity.map((activity) => (
                        <div key={activity.id} className="relative pl-10">
                          <div className="absolute left-2.5 w-3 h-3 bg-primary rounded-full border-2 border-white dark:border-slate-800" />
                          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 shadow-sm">
                            <div className="font-medium text-slate-900 dark:text-white">{activity.title}</div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{activity.description}</p>
                            <div className="flex items-center gap-4 mt-3 text-xs text-slate-500 dark:text-slate-400">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(activity.timestamp).toLocaleDateString()} at{" "}
                                {new Date(activity.timestamp).toLocaleTimeString()}
                              </span>
                              <span className="capitalize">{activity.type.replace(/_/g, " ")}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No activity yet</h3>
                    <p className="text-slate-500 dark:text-slate-400">
                      Activity will be logged as research and processing continues.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Batch Job Modal */}
        {showBatchModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setShowBatchModal(false)}
            />
            {/* Modal */}
            <div className="relative bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md mx-4">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Start Regrid Batch Job
                </h3>
                <button
                  onClick={() => setShowBatchModal(false)}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                >
                  <X className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 space-y-4">
                <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">County</span>
                    <span className="font-medium text-slate-900 dark:text-white">{county.name}, {county.state}</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Properties to Process</span>
                    <span className="font-medium text-slate-900 dark:text-white">
                      {pendingCount.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Batch Size
                  </label>
                  <select
                    value={batchSize}
                    onChange={(e) => setBatchSize(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value={25}>25 properties per batch</option>
                    <option value={50}>50 properties per batch (Recommended)</option>
                    <option value={100}>100 properties per batch</option>
                  </select>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Smaller batches are more reliable but take longer to complete.
                  </p>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-700 dark:text-blue-300">
                      <p className="font-medium">Regrid Scraping</p>
                      <p className="mt-1">
                        This will fetch property data including lot size, zoning, and satellite images
                        from Regrid for all unprocessed properties.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setShowBatchModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    setBatchStarting(true)
                    try {
                      // Create the batch job via API
                      const response = await fetch("/api/batch-jobs", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                          job_type: "regrid_scraping",
                          county_id: county.id,
                          batch_size: batchSize,
                        }),
                      })

                      if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}))
                        throw new Error(errorData.message || "Failed to create batch job")
                      }

                      const result = await response.json()
                      const jobId = result.data?.id

                      // Start the job immediately (change status to in_progress)
                      if (jobId) {
                        const startResponse = await fetch(`/api/batch-jobs/${jobId}`, {
                          method: "PATCH",
                          headers: {
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({
                            status: "in_progress",
                          }),
                        })

                        if (!startResponse.ok) {
                          console.warn("Job created but failed to start immediately")
                        }
                      }

                      toast.success("Batch job created and started! The n8n workflow will process properties automatically.")
                      setShowBatchModal(false)
                      router.push("/batch-jobs")
                    } catch (err) {
                      console.error("Batch job error:", err)
                      toast.error(err instanceof Error ? err.message : "Failed to start batch job")
                    } finally {
                      setBatchStarting(false)
                    }
                  }}
                  disabled={batchStarting}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {batchStarting ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Start Batch Job
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ")
}

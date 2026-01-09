"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
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

// Mock county detail data
const MOCK_COUNTIES: Record<string, {
  id: string
  name: string
  state: string
  status: "active" | "pending" | "archived"
  propertyCount: number
  progress: number
  nextAuctionDate: string | null
  daysUntilAuction: number | null
  documentsCount: number
  researchedAt: string | null
  officialWebsite: string | null
  taxSaleInfo: string | null
  auctionType: string
  registrationDeadline: string | null
  depositRequired: string | null
  bidderRequirements: string[]
  documents: {
    id: string
    name: string
    type: "property_list" | "auction_rules" | "registration_form" | "tax_map" | "legal_notice" | "other"
    url: string
    uploadedAt: string
    fileSize: string
  }[]
  contacts: {
    name: string
    title: string
    email: string
    phone: string
  }[]
  recentActivity: {
    id: string
    action: string
    details: string
    timestamp: string
    user: string
  }[]
  vendorPortal?: {
    name: string
    url: string
    description: string
  }
}> = {
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
    officialWebsite: "https://www.co.westmoreland.pa.us/",
    taxSaleInfo: "https://www.co.westmoreland.pa.us/taxsale",
    auctionType: "Repository Sale",
    registrationDeadline: "Jan 14, 2026",
    depositRequired: "$500 certified check",
    bidderRequirements: [
      "Valid government-issued ID",
      "Completed registration form",
      "Certified check or money order for deposit",
      "No outstanding taxes in the county",
    ],
    documents: [
      {
        id: "doc-1",
        name: "2026 Tax Sale Property List",
        type: "property_list",
        url: "https://example.com/westmoreland-property-list-2026.pdf",
        uploadedAt: "2026-01-05",
        fileSize: "2.4 MB",
      },
      {
        id: "doc-2",
        name: "Bidder Registration Form",
        type: "registration_form",
        url: "https://example.com/westmoreland-registration.pdf",
        uploadedAt: "2026-01-03",
        fileSize: "156 KB",
      },
      {
        id: "doc-3",
        name: "Tax Sale Rules and Procedures",
        type: "auction_rules",
        url: "https://example.com/westmoreland-rules.pdf",
        uploadedAt: "2025-12-15",
        fileSize: "512 KB",
      },
      {
        id: "doc-4",
        name: "County Tax Map Index",
        type: "tax_map",
        url: "https://example.com/westmoreland-tax-map.pdf",
        uploadedAt: "2025-11-20",
        fileSize: "8.7 MB",
      },
      {
        id: "doc-5",
        name: "Legal Notice - Public Sale",
        type: "legal_notice",
        url: "https://example.com/westmoreland-legal-notice.pdf",
        uploadedAt: "2026-01-02",
        fileSize: "89 KB",
      },
    ],
    contacts: [
      {
        name: "John Smith",
        title: "Tax Claim Bureau Director",
        email: "jsmith@co.westmoreland.pa.us",
        phone: "(724) 830-3000",
      },
      {
        name: "Mary Johnson",
        title: "Tax Sale Coordinator",
        email: "mjohnson@co.westmoreland.pa.us",
        phone: "(724) 830-3001",
      },
    ],
    recentActivity: [
      {
        id: "act-1",
        action: "Property list updated",
        details: "Added 12 new properties to the sale list",
        timestamp: "2026-01-08T14:30:00Z",
        user: "System",
      },
      {
        id: "act-2",
        action: "Document uploaded",
        details: "2026 Tax Sale Property List uploaded",
        timestamp: "2026-01-05T10:15:00Z",
        user: "John Smith",
      },
      {
        id: "act-3",
        action: "Research completed",
        details: "Initial county research completed",
        timestamp: "2026-01-05T09:00:00Z",
        user: "Claude Agent",
      },
    ],
    vendorPortal: {
      name: "Bid4Assets",
      url: "https://www.bid4assets.com/westmoreland",
      description: "Online auction platform for Westmoreland County tax sales",
    },
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
    officialWebsite: "https://www.blairco.org/",
    taxSaleInfo: "https://www.blairco.org/taxsale",
    auctionType: "Upset Sale",
    registrationDeadline: "Mar 9, 2026",
    depositRequired: "$1,000 or 10% of bid",
    bidderRequirements: [
      "Valid government-issued ID",
      "Pre-registration required",
      "Payment within 30 days",
    ],
    documents: [
      {
        id: "doc-b1",
        name: "2026 Upset Sale Property List",
        type: "property_list",
        url: "https://example.com/blair-property-list.pdf",
        uploadedAt: "2026-01-03",
        fileSize: "3.1 MB",
      },
      {
        id: "doc-b2",
        name: "Sale Rules and Terms",
        type: "auction_rules",
        url: "https://example.com/blair-rules.pdf",
        uploadedAt: "2025-12-20",
        fileSize: "245 KB",
      },
    ],
    contacts: [
      {
        name: "Sarah Williams",
        title: "Tax Claim Director",
        email: "swilliams@blairco.org",
        phone: "(814) 693-3000",
      },
    ],
    recentActivity: [
      {
        id: "act-b1",
        action: "Research completed",
        details: "Initial county research completed",
        timestamp: "2026-01-03T11:00:00Z",
        user: "Claude Agent",
      },
    ],
  },
}

// Document type configuration
const DOC_TYPE_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  property_list: {
    label: "Property List",
    color: "bg-blue-100 text-blue-700",
    icon: <Building2 className="h-4 w-4" />,
  },
  auction_rules: {
    label: "Auction Rules",
    color: "bg-purple-100 text-purple-700",
    icon: <Gavel className="h-4 w-4" />,
  },
  registration_form: {
    label: "Registration Form",
    color: "bg-green-100 text-green-700",
    icon: <FileText className="h-4 w-4" />,
  },
  tax_map: {
    label: "Tax Map",
    color: "bg-amber-100 text-amber-700",
    icon: <MapPin className="h-4 w-4" />,
  },
  legal_notice: {
    label: "Legal Notice",
    color: "bg-red-100 text-red-700",
    icon: <AlertTriangle className="h-4 w-4" />,
  },
  other: {
    label: "Other",
    color: "bg-slate-100 text-slate-700",
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

  const countyId = params.id as string
  const county = MOCK_COUNTIES[countyId]

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, authLoading, router])

  // Show loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500">Loading...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  // Handle county not found
  if (!county) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h2 className="text-lg font-medium text-slate-900">County not found</h2>
            <p className="text-slate-500 mt-2">The county you are looking for does not exist.</p>
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

  const tabs: { id: TabType; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: "overview", label: "Overview", icon: <Info className="h-4 w-4" /> },
    { id: "documents", label: "Documents", icon: <FileText className="h-4 w-4" />, count: county.documents.length },
    { id: "properties", label: "Properties", icon: <Building2 className="h-4 w-4" />, count: county.propertyCount },
    { id: "activity", label: "Activity", icon: <Activity className="h-4 w-4" /> },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button and Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push("/counties")}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Counties
          </button>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900">
                  {county.name} County, {county.state}
                </h1>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                    county.status === "active"
                      ? "bg-green-100 text-green-700"
                      : county.status === "pending"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-slate-100 text-slate-700"
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
              {county.researchedAt && (
                <p className="text-sm text-slate-500 mt-1">
                  Last researched:{" "}
                  {new Date(county.researchedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>

            {county.officialWebsite && (
              <a
                href={county.officialWebsite}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <ExternalLink className="h-4 w-4" />
                Official Website
              </a>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-slate-600 text-sm mb-1">
              <Building2 className="h-4 w-4" />
              Properties
            </div>
            <div className="text-2xl font-bold text-slate-900">{county.propertyCount.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-slate-600 text-sm mb-1">
              <FileText className="h-4 w-4" />
              Documents
            </div>
            <div className="text-2xl font-bold text-slate-900">{county.documents.length}</div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-slate-600 text-sm mb-1">
              <Activity className="h-4 w-4" />
              Progress
            </div>
            <div className="text-2xl font-bold text-slate-900">{county.progress}%</div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-slate-600 text-sm mb-1">
              <Calendar className="h-4 w-4" />
              Next Auction
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {county.daysUntilAuction !== null ? `${county.daysUntilAuction}d` : "-"}
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
                    "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                    activeTab === tab.id
                      ? "border-primary text-primary"
                      : "border-transparent text-slate-600 hover:text-slate-900"
                  )}
                >
                  {tab.icon}
                  {tab.label}
                  {tab.count !== undefined && (
                    <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">
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
                  <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                    <Gavel className="h-4 w-4" />
                    Auction Information
                  </h3>
                  <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                    <div>
                      <div className="text-xs text-slate-500">Auction Type</div>
                      <div className="font-medium text-slate-900">{county.auctionType}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Next Auction Date</div>
                      <div className="font-medium text-slate-900">
                        {county.nextAuctionDate || "Not scheduled"}
                        {county.daysUntilAuction !== null && (
                          <span
                            className={cn(
                              "ml-2 text-sm",
                              county.daysUntilAuction <= 14
                                ? "text-red-600"
                                : county.daysUntilAuction <= 30
                                ? "text-amber-600"
                                : "text-slate-500"
                            )}
                          >
                            ({county.daysUntilAuction} days)
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Registration Deadline</div>
                      <div className="font-medium text-slate-900">
                        {county.registrationDeadline || "Not specified"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Deposit Required</div>
                      <div className="font-medium text-slate-900">
                        {county.depositRequired || "Not specified"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bidder Requirements */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Bidder Requirements
                  </h3>
                  <ul className="bg-slate-50 rounded-lg p-4 space-y-2">
                    {county.bidderRequirements.map((req, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-slate-700">
                        <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Contacts */}
                {county.contacts.length > 0 && (
                  <div className="md:col-span-2 space-y-4">
                    <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Contacts
                    </h3>
                    <div className="grid sm:grid-cols-2 gap-4">
                      {county.contacts.map((contact, index) => (
                        <div key={index} className="bg-slate-50 rounded-lg p-4">
                          <div className="font-medium text-slate-900">{contact.name}</div>
                          <div className="text-sm text-slate-600">{contact.title}</div>
                          <div className="mt-2 space-y-1 text-sm">
                            <a
                              href={`mailto:${contact.email}`}
                              className="flex items-center gap-2 text-primary hover:underline"
                            >
                              {contact.email}
                            </a>
                            <div className="text-slate-600">{contact.phone}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Links */}
                <div className="md:col-span-2 space-y-4">
                  <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                    <LinkIcon className="h-4 w-4" />
                    Important Links
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {county.officialWebsite && (
                      <a
                        href={county.officialWebsite}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg text-sm text-slate-700 hover:bg-slate-100"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Official Website
                      </a>
                    )}
                    {county.taxSaleInfo && (
                      <a
                        href={county.taxSaleInfo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg text-sm text-slate-700 hover:bg-slate-100"
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
                        className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg text-sm text-blue-700 hover:bg-blue-100 border border-blue-200"
                        title={county.vendorPortal.description}
                      >
                        <ExternalLink className="h-4 w-4" />
                        {county.vendorPortal.name}
                        <span className="text-xs bg-blue-100 px-1.5 py-0.5 rounded">Vendor Portal</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Documents Tab */}
            {activeTab === "documents" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900">
                    County Documents
                    <span className="ml-2 text-sm font-normal text-slate-500">
                      ({county.documents.length} documents)
                    </span>
                  </h3>
                </div>

                {county.documents.length > 0 ? (
                  <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg overflow-hidden">
                    {county.documents.map((doc) => {
                      const typeConfig = DOC_TYPE_CONFIG[doc.type] || DOC_TYPE_CONFIG.other
                      return (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className={cn("p-2 rounded-lg", typeConfig.color)}>
                              {typeConfig.icon}
                            </div>
                            <div>
                              <div className="font-medium text-slate-900">{doc.name}</div>
                              <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                                <span className={cn("px-2 py-0.5 rounded text-xs", typeConfig.color)}>
                                  {typeConfig.label}
                                </span>
                                <span>{doc.fileSize}</span>
                                <span>
                                  Uploaded{" "}
                                  {new Date(doc.uploadedAt).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
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
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 mb-2">No documents yet</h3>
                    <p className="text-slate-500">
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
                  <h3 className="font-semibold text-slate-900">
                    Properties
                    <span className="ml-2 text-sm font-normal text-slate-500">
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

                <div className="bg-slate-50 rounded-lg p-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                    <div>
                      <div className="text-3xl font-bold text-slate-900">{county.propertyCount}</div>
                      <div className="text-sm text-slate-500">Total Properties</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-green-600">
                        {Math.round(county.propertyCount * (county.progress / 100))}
                      </div>
                      <div className="text-sm text-slate-500">Processed</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-amber-600">
                        {county.propertyCount - Math.round(county.propertyCount * (county.progress / 100))}
                      </div>
                      <div className="text-sm text-slate-500">Pending</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-slate-900">{county.progress}%</div>
                      <div className="text-sm text-slate-500">Complete</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Activity Tab */}
            {activeTab === "activity" && (
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-900">Recent Activity</h3>

                {county.recentActivity.length > 0 ? (
                  <div className="relative">
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />
                    <div className="space-y-4">
                      {county.recentActivity.map((activity) => (
                        <div key={activity.id} className="relative pl-10">
                          <div className="absolute left-2.5 w-3 h-3 bg-primary rounded-full border-2 border-white" />
                          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                            <div className="font-medium text-slate-900">{activity.action}</div>
                            <p className="text-sm text-slate-600 mt-1">{activity.details}</p>
                            <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(activity.timestamp).toLocaleDateString()} at{" "}
                                {new Date(activity.timestamp).toLocaleTimeString()}
                              </span>
                              <span>by {activity.user}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 mb-2">No activity yet</h3>
                    <p className="text-slate-500">
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
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900">
                  Start Regrid Batch Job
                </h3>
                <button
                  onClick={() => setShowBatchModal(false)}
                  className="p-1 hover:bg-slate-100 rounded-lg"
                >
                  <X className="h-5 w-5 text-slate-500" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 space-y-4">
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">County</span>
                    <span className="font-medium text-slate-900">{county.name}, {county.state}</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm text-slate-600">Properties to Process</span>
                    <span className="font-medium text-slate-900">
                      {(county.propertyCount - Math.round(county.propertyCount * (county.progress / 100))).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Batch Size
                  </label>
                  <select
                    value={batchSize}
                    onChange={(e) => setBatchSize(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value={25}>25 properties per batch</option>
                    <option value={50}>50 properties per batch (Recommended)</option>
                    <option value={100}>100 properties per batch</option>
                  </select>
                  <p className="mt-1 text-xs text-slate-500">
                    Smaller batches are more reliable but take longer to complete.
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-700">
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
              <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-200">
                <button
                  onClick={() => setShowBatchModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setBatchStarting(true)
                    // Simulate starting a batch job
                    setTimeout(() => {
                      setBatchStarting(false)
                      setShowBatchModal(false)
                      router.push("/batch-jobs")
                    }, 1500)
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

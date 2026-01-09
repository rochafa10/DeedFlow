"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import {
  ArrowLeft,
  MapPin,
  DollarSign,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Image as ImageIcon,
  BarChart3,
  History,
  ExternalLink,
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Gavel,
  Home,
  Ruler,
} from "lucide-react"
import { Header } from "@/components/layout/Header"
import { useAuth } from "@/contexts/AuthContext"
import { Breadcrumbs } from "@/components/shared/Breadcrumbs"

// Mock property data - in production this would come from API
const MOCK_PROPERTIES: Record<string, PropertyDetail> = {
  "1": {
    id: "1",
    parcelId: "10-01-001-0001",
    address: "123 Main St",
    city: "Greensburg",
    county: "Westmoreland",
    state: "PA",
    zipCode: "15601",
    totalDue: 5234.56,
    status: "parsed",
    propertyType: "Residential",
    lotSize: "0.25 acres",
    saleType: "Tax Deed",
    validation: null,
    yearBuilt: 1985,
    bedrooms: 3,
    bathrooms: 2,
    squareFeet: 1800,
    assessedValue: 125000,
    taxYear: 2024,
    saleDate: "Jan 16, 2026",
    minimumBid: 5234.56,
  },
  "2": {
    id: "2",
    parcelId: "10-01-001-0002",
    address: "456 Oak Ave",
    city: "Greensburg",
    county: "Westmoreland",
    state: "PA",
    zipCode: "15601",
    totalDue: 12450.0,
    status: "enriched",
    propertyType: "Commercial",
    lotSize: "1.5 acres",
    saleType: "Tax Deed",
    validation: null,
    yearBuilt: 1970,
    bedrooms: null,
    bathrooms: null,
    squareFeet: 5000,
    assessedValue: 350000,
    taxYear: 2024,
    saleDate: "Jan 16, 2026",
    minimumBid: 12450.0,
    regridData: {
      lotSizeAcres: 1.5,
      lotSizeSqFt: 65340,
      propertyClass: "Commercial",
      zoning: "C-2 Commercial",
      assessedLandValue: 150000,
      assessedImprovementValue: 200000,
      marketValue: 425000,
      lastSaleDate: "2015-06-15",
      lastSalePrice: 380000,
      ownerName: "ABC Holdings LLC",
      ownerAddress: "123 Business Park Dr, Pittsburgh, PA 15222",
    },
  },
  "3": {
    id: "3",
    parcelId: "10-01-002-0001",
    address: "789 Pine Rd",
    city: "Latrobe",
    county: "Westmoreland",
    state: "PA",
    zipCode: "15650",
    totalDue: 3200.0,
    status: "validated",
    propertyType: "Residential",
    lotSize: "0.5 acres",
    saleType: "Tax Deed",
    validation: "approved",
    yearBuilt: 1995,
    bedrooms: 4,
    bathrooms: 2.5,
    squareFeet: 2400,
    assessedValue: 185000,
    taxYear: 2024,
    saleDate: "Jan 16, 2026",
    minimumBid: 3200.0,
    validationData: {
      status: "approved",
      confidenceScore: 92,
      validatedAt: "2026-01-08T14:30:00Z",
      validatedBy: "Visual Validator Agent",
      findings: [
        { type: "positive", message: "Property appears to be a well-maintained single-family home" },
        { type: "positive", message: "Lot size is consistent with county records" },
        { type: "positive", message: "No visible structural damage detected" },
        { type: "info", message: "Aerial imagery shows recent landscaping updates" },
      ],
      imagesAnalyzed: 4,
      recommendation: "Property is suitable for investment consideration",
    },
  },
  "4": {
    id: "4",
    parcelId: "07-02-001-0015",
    address: "321 Elm St",
    city: "Hollidaysburg",
    county: "Blair",
    state: "PA",
    zipCode: "16648",
    totalDue: 8750.25,
    status: "approved",
    propertyType: "Residential",
    lotSize: "0.33 acres",
    saleType: "Tax Lien",
    validation: "approved",
    yearBuilt: 2000,
    bedrooms: 3,
    bathrooms: 2,
    squareFeet: 2100,
    assessedValue: 210000,
    taxYear: 2024,
    saleDate: "Mar 11, 2026",
    minimumBid: 8750.25,
  },
}

interface RegridData {
  lotSizeAcres: number
  lotSizeSqFt: number
  propertyClass: string
  zoning: string
  assessedLandValue: number
  assessedImprovementValue: number
  marketValue: number
  lastSaleDate: string | null
  lastSalePrice: number | null
  ownerName: string
  ownerAddress: string
}

interface ValidationFinding {
  type: "positive" | "negative" | "warning" | "info"
  message: string
}

interface ValidationData {
  status: "approved" | "caution" | "rejected"
  confidenceScore: number
  validatedAt: string
  validatedBy: string
  findings: ValidationFinding[]
  imagesAnalyzed: number
  recommendation: string
}

interface PropertyDetail {
  id: string
  parcelId: string
  address: string
  city: string
  county: string
  state: string
  zipCode: string
  totalDue: number
  status: string
  propertyType: string
  lotSize: string
  saleType: string
  validation: string | null
  yearBuilt: number | null
  bedrooms: number | null
  bathrooms: number | null
  squareFeet: number | null
  assessedValue: number | null
  taxYear: number
  saleDate: string
  minimumBid: number
  regridData?: RegridData
  validationData?: ValidationData
}

type PropertyStatus = "parsed" | "enriched" | "validated" | "approved"

const STATUS_CONFIG: Record<
  PropertyStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  parsed: {
    label: "Parsed",
    color: "bg-slate-100 text-slate-700",
    icon: <Clock className="h-4 w-4" />,
  },
  enriched: {
    label: "Enriched",
    color: "bg-blue-100 text-blue-700",
    icon: <Building2 className="h-4 w-4" />,
  },
  validated: {
    label: "Validated",
    color: "bg-amber-100 text-amber-700",
    icon: <AlertTriangle className="h-4 w-4" />,
  },
  approved: {
    label: "Approved",
    color: "bg-green-100 text-green-700",
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
}

type ValidationStatus = "approved" | "caution" | "rejected"

const VALIDATION_CONFIG: Record<
  ValidationStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  approved: {
    label: "Approved",
    color: "bg-green-100 text-green-700",
    icon: <ShieldCheck className="h-4 w-4" />,
  },
  caution: {
    label: "Caution",
    color: "bg-amber-100 text-amber-700",
    icon: <ShieldAlert className="h-4 w-4" />,
  },
  rejected: {
    label: "Rejected",
    color: "bg-red-100 text-red-700",
    icon: <ShieldX className="h-4 w-4" />,
  },
}

type TabType = "overview" | "regrid" | "validation" | "images" | "analysis" | "history"

export default function PropertyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>("overview")
  const [property, setProperty] = useState<PropertyDetail | null>(null)
  const [loading, setLoading] = useState(true)

  const propertyId = params.id as string

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, authLoading, router])

  // Load property data
  useEffect(() => {
    // Simulate API call
    const loadProperty = () => {
      setLoading(true)
      // In production, fetch from API
      const found = MOCK_PROPERTIES[propertyId]
      setProperty(found || null)
      setLoading(false)
    }

    if (propertyId) {
      loadProperty()
    }
  }, [propertyId])

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
  if (!property) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => router.push("/properties")}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Properties
          </button>
          <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              Property Not Found
            </h2>
            <p className="text-slate-600">
              The property you're looking for doesn't exist or has been removed.
            </p>
          </div>
        </main>
      </div>
    )
  }

  const statusConfig = STATUS_CONFIG[property.status as PropertyStatus]
  const validationConfig = property.validation
    ? VALIDATION_CONFIG[property.validation as ValidationStatus]
    : null

  const tabs = [
    { id: "overview" as const, label: "Overview", icon: <FileText className="h-4 w-4" /> },
    { id: "regrid" as const, label: "Regrid Data", icon: <Building2 className="h-4 w-4" /> },
    { id: "validation" as const, label: "Validation", icon: <Shield className="h-4 w-4" /> },
    { id: "images" as const, label: "Images", icon: <ImageIcon className="h-4 w-4" /> },
    { id: "analysis" as const, label: "Analysis", icon: <BarChart3 className="h-4 w-4" /> },
    { id: "history" as const, label: "History", icon: <History className="h-4 w-4" /> },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[
            { label: "Properties", href: "/properties" },
            { label: property.parcelId },
          ]}
        />

        {/* Property Header */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-slate-900">
                  {property.address}
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
                {validationConfig && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium",
                      validationConfig.color
                    )}
                  >
                    {validationConfig.icon}
                    {validationConfig.label}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <MapPin className="h-4 w-4" />
                <span>
                  {property.city}, {property.state} {property.zipCode}
                </span>
                <span className="text-slate-300">|</span>
                <span>{property.county} County</span>
              </div>
              <div className="mt-2 font-mono text-sm text-slate-500">
                Parcel ID: {property.parcelId}
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <div className="text-right">
                <div className="text-sm text-slate-500">Total Due</div>
                <div className="text-2xl font-bold text-slate-900 flex items-center gap-1">
                  <DollarSign className="h-5 w-5" />
                  {property.totalDue.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              </div>
              <div className="flex items-center gap-1 text-sm text-slate-600">
                <Gavel className="h-4 w-4" />
                {property.saleType}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
              <Home className="h-4 w-4" />
              Property Type
            </div>
            <div className="font-semibold text-slate-900">
              {property.propertyType}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
              <Ruler className="h-4 w-4" />
              Lot Size
            </div>
            <div className="font-semibold text-slate-900">{property.lotSize}</div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
              <Calendar className="h-4 w-4" />
              Sale Date
            </div>
            <div className="font-semibold text-slate-900">{property.saleDate}</div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
              <DollarSign className="h-4 w-4" />
              Assessed Value
            </div>
            <div className="font-semibold text-slate-900">
              ${property.assessedValue?.toLocaleString() || "N/A"}
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
                {/* Tax Information */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">
                    Tax Information
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <div className="text-sm text-slate-500">Tax Year</div>
                      <div className="font-medium text-slate-900">
                        {property.taxYear}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-500">Total Due</div>
                      <div className="font-medium text-slate-900">
                        ${property.totalDue.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-500">Minimum Bid</div>
                      <div className="font-medium text-slate-900">
                        ${property.minimumBid.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Property Details */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">
                    Property Details
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {property.yearBuilt && (
                      <div>
                        <div className="text-sm text-slate-500">Year Built</div>
                        <div className="font-medium text-slate-900">
                          {property.yearBuilt}
                        </div>
                      </div>
                    )}
                    {property.squareFeet && (
                      <div>
                        <div className="text-sm text-slate-500">Square Feet</div>
                        <div className="font-medium text-slate-900">
                          {property.squareFeet.toLocaleString()} sq ft
                        </div>
                      </div>
                    )}
                    {property.bedrooms && (
                      <div>
                        <div className="text-sm text-slate-500">Bedrooms</div>
                        <div className="font-medium text-slate-900">
                          {property.bedrooms}
                        </div>
                      </div>
                    )}
                    {property.bathrooms && (
                      <div>
                        <div className="text-sm text-slate-500">Bathrooms</div>
                        <div className="font-medium text-slate-900">
                          {property.bathrooms}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "regrid" && (
              property.regridData ? (
                <div className="space-y-6">
                  {/* Lot Information */}
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">
                      Lot Information
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-sm text-slate-500">Lot Size (Acres)</div>
                        <div className="font-medium text-slate-900">
                          {property.regridData.lotSizeAcres} acres
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-slate-500">Lot Size (Sq Ft)</div>
                        <div className="font-medium text-slate-900">
                          {property.regridData.lotSizeSqFt.toLocaleString()} sq ft
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-slate-500">Property Class</div>
                        <div className="font-medium text-slate-900">
                          {property.regridData.propertyClass}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-slate-500">Zoning</div>
                        <div className="font-medium text-slate-900">
                          {property.regridData.zoning}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Valuation */}
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">
                      Valuation
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <div className="text-sm text-slate-500">Assessed Land Value</div>
                        <div className="font-medium text-slate-900">
                          ${property.regridData.assessedLandValue.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-slate-500">Assessed Improvement Value</div>
                        <div className="font-medium text-slate-900">
                          ${property.regridData.assessedImprovementValue.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-slate-500">Market Value</div>
                        <div className="font-medium text-slate-900 text-lg">
                          ${property.regridData.marketValue.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sale History */}
                  {property.regridData.lastSaleDate && (
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-4">
                        Last Sale
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-slate-500">Sale Date</div>
                          <div className="font-medium text-slate-900">
                            {property.regridData.lastSaleDate}
                          </div>
                        </div>
                        {property.regridData.lastSalePrice && (
                          <div>
                            <div className="text-sm text-slate-500">Sale Price</div>
                            <div className="font-medium text-slate-900">
                              ${property.regridData.lastSalePrice.toLocaleString()}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Owner Information */}
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">
                      Owner Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-slate-500">Owner Name</div>
                        <div className="font-medium text-slate-900">
                          {property.regridData.ownerName}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-slate-500">Mailing Address</div>
                        <div className="font-medium text-slate-900">
                          {property.regridData.ownerAddress}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No Regrid data available for this property yet.</p>
                  <p className="text-sm mt-2">
                    Regrid data will be available after enrichment.
                  </p>
                </div>
              )
            )}

            {activeTab === "validation" && (
              property.validationData ? (
                <div className="space-y-6">
                  {/* Validation Status Banner */}
                  <div className={cn(
                    "p-4 rounded-lg border",
                    property.validationData.status === "approved" && "bg-green-50 border-green-200",
                    property.validationData.status === "caution" && "bg-amber-50 border-amber-200",
                    property.validationData.status === "rejected" && "bg-red-50 border-red-200",
                  )}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {property.validationData.status === "approved" && (
                          <ShieldCheck className="h-8 w-8 text-green-600" />
                        )}
                        {property.validationData.status === "caution" && (
                          <ShieldAlert className="h-8 w-8 text-amber-600" />
                        )}
                        {property.validationData.status === "rejected" && (
                          <ShieldX className="h-8 w-8 text-red-600" />
                        )}
                        <div>
                          <div className={cn(
                            "text-lg font-semibold",
                            property.validationData.status === "approved" && "text-green-800",
                            property.validationData.status === "caution" && "text-amber-800",
                            property.validationData.status === "rejected" && "text-red-800",
                          )}>
                            Validation Status: {property.validationData.status.charAt(0).toUpperCase() + property.validationData.status.slice(1)}
                          </div>
                          <div className="text-sm text-slate-600">
                            Validated by {property.validationData.validatedBy} on{" "}
                            {new Date(property.validationData.validatedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-slate-500">Confidence Score</div>
                        <div className={cn(
                          "text-2xl font-bold",
                          property.validationData.confidenceScore >= 80 && "text-green-600",
                          property.validationData.confidenceScore >= 60 && property.validationData.confidenceScore < 80 && "text-amber-600",
                          property.validationData.confidenceScore < 60 && "text-red-600",
                        )}>
                          {property.validationData.confidenceScore}%
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recommendation */}
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">
                      Recommendation
                    </h3>
                    <p className="text-slate-700">
                      {property.validationData.recommendation}
                    </p>
                  </div>

                  {/* Findings */}
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">
                      Findings
                    </h3>
                    <div className="space-y-2">
                      {property.validationData.findings.map((finding, index) => (
                        <div
                          key={index}
                          className={cn(
                            "flex items-start gap-3 p-3 rounded-lg",
                            finding.type === "positive" && "bg-green-50",
                            finding.type === "negative" && "bg-red-50",
                            finding.type === "warning" && "bg-amber-50",
                            finding.type === "info" && "bg-blue-50",
                          )}
                        >
                          <div className={cn(
                            "mt-0.5",
                            finding.type === "positive" && "text-green-600",
                            finding.type === "negative" && "text-red-600",
                            finding.type === "warning" && "text-amber-600",
                            finding.type === "info" && "text-blue-600",
                          )}>
                            {finding.type === "positive" && <CheckCircle2 className="h-5 w-5" />}
                            {finding.type === "negative" && <ShieldX className="h-5 w-5" />}
                            {finding.type === "warning" && <AlertTriangle className="h-5 w-5" />}
                            {finding.type === "info" && <FileText className="h-5 w-5" />}
                          </div>
                          <span className="text-slate-700">{finding.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Images Analyzed */}
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <ImageIcon className="h-4 w-4" />
                    <span>{property.validationData.imagesAnalyzed} images analyzed</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No validation results available yet.</p>
                  <p className="text-sm mt-2">
                    Visual validation will be performed after enrichment.
                  </p>
                </div>
              )
            )}

            {activeTab === "images" && (
              <div className="text-center py-12 text-slate-500">
                <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No images available for this property yet.</p>
                <p className="text-sm mt-2">
                  Images will be loaded from Regrid after enrichment.
                </p>
              </div>
            )}

            {activeTab === "analysis" && (
              <div className="text-center py-12 text-slate-500">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Analysis not yet available.</p>
                <p className="text-sm mt-2">
                  Property analysis will be available after validation.
                </p>
              </div>
            )}

            {activeTab === "history" && (
              <div className="text-center py-12 text-slate-500">
                <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No history available yet.</p>
                <p className="text-sm mt-2">
                  Pipeline activity will be tracked here.
                </p>
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

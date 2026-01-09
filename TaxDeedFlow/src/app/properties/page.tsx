"use client"

import { useState } from "react"
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Building2,
  MapPin,
  DollarSign,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ExternalLink,
  Shield,
  ShieldAlert,
  ShieldX,
  ShieldCheck,
  Gavel,
  Download,
} from "lucide-react"
import { Header } from "@/components/layout/Header"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect } from "react"

// Mock property data for demo
const MOCK_PROPERTIES = [
  {
    id: "1",
    parcelId: "10-01-001-0001",
    address: "123 Main St",
    city: "Greensburg",
    county: "Westmoreland",
    state: "PA",
    totalDue: 5234.56,
    status: "parsed",
    propertyType: "Residential",
    lotSize: "0.25 acres",
    saleType: "Tax Deed",
    validation: null,
  },
  {
    id: "2",
    parcelId: "10-01-001-0002",
    address: "456 Oak Ave",
    city: "Greensburg",
    county: "Westmoreland",
    state: "PA",
    totalDue: 12450.0,
    status: "enriched",
    propertyType: "Commercial",
    lotSize: "1.5 acres",
    saleType: "Tax Deed",
    validation: null,
  },
  {
    id: "3",
    parcelId: "10-01-002-0001",
    address: "789 Pine Rd",
    city: "Latrobe",
    county: "Westmoreland",
    state: "PA",
    totalDue: 3200.0,
    status: "validated",
    propertyType: "Residential",
    lotSize: "0.5 acres",
    saleType: "Tax Deed",
    validation: "approved",
  },
  {
    id: "4",
    parcelId: "07-02-001-0015",
    address: "321 Elm St",
    city: "Hollidaysburg",
    county: "Blair",
    state: "PA",
    totalDue: 8750.25,
    status: "approved",
    propertyType: "Residential",
    lotSize: "0.33 acres",
    saleType: "Tax Lien",
    validation: "approved",
  },
  {
    id: "5",
    parcelId: "07-02-002-0008",
    address: "555 Maple Dr",
    city: "Altoona",
    county: "Blair",
    state: "PA",
    totalDue: 2100.0,
    status: "parsed",
    propertyType: "Vacant Land",
    lotSize: "2.0 acres",
    saleType: "Tax Deed",
    validation: null,
  },
  {
    id: "6",
    parcelId: "56-03-001-0022",
    address: "888 Cedar Ln",
    city: "Somerset",
    county: "Somerset",
    state: "PA",
    totalDue: 15600.0,
    status: "enriched",
    propertyType: "Industrial",
    lotSize: "5.0 acres",
    saleType: "Tax Deed",
    validation: null,
  },
  {
    id: "7",
    parcelId: "56-03-002-0011",
    address: "999 Birch Way",
    city: "Berlin",
    county: "Somerset",
    state: "PA",
    totalDue: 4500.0,
    status: "parsed",
    propertyType: "Residential",
    lotSize: "0.75 acres",
    saleType: "Tax Lien",
    validation: null,
  },
  {
    id: "8",
    parcelId: "14-01-003-0005",
    address: "111 Walnut St",
    city: "State College",
    county: "Centre",
    state: "PA",
    totalDue: 22000.0,
    status: "validated",
    propertyType: "Multi-Family",
    lotSize: "0.4 acres",
    saleType: "Tax Deed",
    validation: "caution",
  },
  {
    id: "9",
    parcelId: "10-01-003-0001",
    address: "200 Cherry St",
    city: "Greensburg",
    county: "Westmoreland",
    state: "PA",
    totalDue: 7890.00,
    status: "parsed",
    propertyType: "Residential",
    lotSize: "0.3 acres",
    saleType: "Tax Deed",
    validation: null,
  },
  {
    id: "10",
    parcelId: "07-02-003-0001",
    address: "450 Spruce Ave",
    city: "Altoona",
    county: "Blair",
    state: "PA",
    totalDue: 3450.00,
    status: "enriched",
    propertyType: "Commercial",
    lotSize: "0.8 acres",
    saleType: "Tax Lien",
    validation: null,
  },
  {
    id: "11",
    parcelId: "56-03-003-0001",
    address: "777 Ash Blvd",
    city: "Somerset",
    county: "Somerset",
    state: "PA",
    totalDue: 9200.00,
    status: "validated",
    propertyType: "Residential",
    lotSize: "0.45 acres",
    saleType: "Tax Deed",
    validation: "approved",
  },
  {
    id: "12",
    parcelId: "14-01-004-0001",
    address: "333 Hickory Ln",
    city: "Bellefonte",
    county: "Centre",
    state: "PA",
    totalDue: 18500.00,
    status: "approved",
    propertyType: "Industrial",
    lotSize: "3.0 acres",
    saleType: "Tax Deed",
    validation: "approved",
  },
  {
    id: "13",
    parcelId: "10-01-004-0001",
    address: "505 Willow Way",
    city: "Latrobe",
    county: "Westmoreland",
    state: "PA",
    totalDue: 4100.00,
    status: "parsed",
    propertyType: "Vacant Land",
    lotSize: "1.2 acres",
    saleType: "Tax Lien",
    validation: null,
  },
  {
    id: "14",
    parcelId: "07-02-004-0001",
    address: "620 Poplar Dr",
    city: "Hollidaysburg",
    county: "Blair",
    state: "PA",
    totalDue: 6780.00,
    status: "enriched",
    propertyType: "Residential",
    lotSize: "0.5 acres",
    saleType: "Tax Deed",
    validation: null,
  },
  {
    id: "15",
    parcelId: "56-03-004-0001",
    address: "888 Juniper Ct",
    city: "Berlin",
    county: "Somerset",
    state: "PA",
    totalDue: 2950.00,
    status: "parsed",
    propertyType: "Residential",
    lotSize: "0.35 acres",
    saleType: "Tax Lien",
    validation: null,
  },
]

type PropertyStatus = "parsed" | "enriched" | "validated" | "approved"

const STATUS_CONFIG: Record<
  PropertyStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  parsed: {
    label: "Parsed",
    color: "bg-slate-100 text-slate-700",
    icon: <Clock className="h-3 w-3" />,
  },
  enriched: {
    label: "Enriched",
    color: "bg-blue-100 text-blue-700",
    icon: <Building2 className="h-3 w-3" />,
  },
  validated: {
    label: "Validated",
    color: "bg-amber-100 text-amber-700",
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  approved: {
    label: "Approved",
    color: "bg-green-100 text-green-700",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
}

type ValidationStatus = "approved" | "caution" | "rejected" | null

const VALIDATION_CONFIG: Record<
  NonNullable<ValidationStatus>,
  { label: string; color: string; icon: React.ReactNode }
> = {
  approved: {
    label: "Approved",
    color: "bg-green-100 text-green-700",
    icon: <ShieldCheck className="h-3 w-3" />,
  },
  caution: {
    label: "Caution",
    color: "bg-amber-100 text-amber-700",
    icon: <ShieldAlert className="h-3 w-3" />,
  },
  rejected: {
    label: "Rejected",
    color: "bg-red-100 text-red-700",
    icon: <ShieldX className="h-3 w-3" />,
  },
}

export default function PropertiesPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<PropertyStatus | "all">("all")
  const [countyFilter, setCountyFilter] = useState<string>("all")
  const [showFilters, setShowFilters] = useState(false)
  const itemsPerPage = 10

  // Get unique counties for filter dropdown
  const uniqueCounties = Array.from(new Set(MOCK_PROPERTIES.map(p => p.county))).sort()

  // Read county from URL params
  useEffect(() => {
    const countyParam = searchParams.get("county")
    if (countyParam && uniqueCounties.includes(countyParam)) {
      setCountyFilter(countyParam)
    }
  }, [searchParams, uniqueCounties])

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

  // Filter properties based on search, status, and county
  const filteredProperties = MOCK_PROPERTIES.filter((property) => {
    const matchesSearch =
      searchQuery === "" ||
      property.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      property.parcelId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      property.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      property.county.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus =
      statusFilter === "all" || property.status === statusFilter

    const matchesCounty =
      countyFilter === "all" || property.county === countyFilter

    return matchesSearch && matchesStatus && matchesCounty
  })

  // Count active filters
  const activeFilterCount = [statusFilter !== "all", countyFilter !== "all"].filter(Boolean).length

  // Pagination
  const totalPages = Math.ceil(filteredProperties.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedProperties = filteredProperties.slice(
    startIndex,
    startIndex + itemsPerPage
  )

  // Export to CSV function
  const exportToCSV = () => {
    // CSV header
    const headers = [
      "Parcel ID",
      "Address",
      "City",
      "State",
      "County",
      "Total Due",
      "Sale Type",
      "Property Type",
      "Lot Size",
      "Stage",
      "Validation"
    ]

    // CSV rows from filtered properties
    const rows = filteredProperties.map(property => [
      property.parcelId,
      property.address,
      property.city,
      property.state,
      property.county,
      property.totalDue.toFixed(2),
      property.saleType,
      property.propertyType,
      property.lotSize,
      STATUS_CONFIG[property.status as PropertyStatus].label,
      property.validation ? VALIDATION_CONFIG[property.validation as NonNullable<ValidationStatus>].label : "Pending"
    ])

    // Combine headers and rows
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n")

    // Create blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)

    // Generate filename with filters info
    const filterInfo = []
    if (statusFilter !== "all") filterInfo.push(statusFilter)
    if (countyFilter !== "all") filterInfo.push(countyFilter)
    const filterSuffix = filterInfo.length > 0 ? `_${filterInfo.join("_")}` : ""
    const timestamp = new Date().toISOString().split("T")[0]
    link.setAttribute("download", `properties${filterSuffix}_${timestamp}.csv`)

    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Properties</h1>
          <p className="text-slate-600 mt-1">
            Browse and manage properties in the pipeline
          </p>
        </div>

        {/* Search and Filters Bar */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by address, parcel ID, city, or county..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* Filters Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors",
                showFilters
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              )}
            >
              <Filter className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="bg-white/20 text-xs px-1.5 py-0.5 rounded">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Export Button */}
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="flex flex-wrap gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value as PropertyStatus | "all")
                      setCurrentPage(1)
                    }}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="all">All Statuses</option>
                    <option value="parsed">Parsed</option>
                    <option value="enriched">Enriched</option>
                    <option value="validated">Validated</option>
                    <option value="approved">Approved</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    County
                  </label>
                  <select
                    value={countyFilter}
                    onChange={(e) => {
                      setCountyFilter(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="all">All Counties</option>
                    {uniqueCounties.map((county) => (
                      <option key={county} value={county}>
                        {county}
                      </option>
                    ))}
                  </select>
                </div>
                {activeFilterCount > 0 && (
                  <div className="flex items-end">
                    <button
                      onClick={() => {
                        setStatusFilter("all")
                        setCountyFilter("all")
                        setCurrentPage(1)
                      }}
                      className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700 underline"
                    >
                      Clear all filters
                    </button>
                  </div>
                )}
              </div>
              {/* Active Filter Chips */}
              {activeFilterCount > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {statusFilter !== "all" && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                      Status: {STATUS_CONFIG[statusFilter].label}
                      <button
                        onClick={() => {
                          setStatusFilter("all")
                          setCurrentPage(1)
                        }}
                        className="hover:bg-primary/20 rounded-full p-0.5"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {countyFilter !== "all" && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                      County: {countyFilter}
                      <button
                        onClick={() => {
                          setCountyFilter("all")
                          setCurrentPage(1)
                        }}
                        className="hover:bg-primary/20 rounded-full p-0.5"
                      >
                        ×
                      </button>
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Results Summary */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-slate-600">
            Showing{" "}
            <span className="font-medium">{paginatedProperties.length}</span> of{" "}
            <span className="font-medium">{filteredProperties.length}</span>{" "}
            properties
          </p>

          {/* Status Pills */}
          <div className="hidden sm:flex items-center gap-2">
            {(["parsed", "enriched", "validated", "approved"] as const).map(
              (status) => {
                const count = MOCK_PROPERTIES.filter(
                  (p) => p.status === status
                ).length
                return (
                  <button
                    key={status}
                    onClick={() => {
                      setStatusFilter(statusFilter === status ? "all" : status)
                      setCurrentPage(1)
                    }}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                      statusFilter === status
                        ? STATUS_CONFIG[status].color
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    )}
                  >
                    {STATUS_CONFIG[status].icon}
                    {STATUS_CONFIG[status].label} ({count})
                  </button>
                )
              }
            )}
          </div>
        </div>

        {/* Properties Table */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Parcel ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Address
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    County
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Total Due
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Sale Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Stage
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Validation
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {paginatedProperties.length > 0 ? (
                  paginatedProperties.map((property) => (
                    <tr key={property.id} className="hover:bg-slate-50">
                      {/* Parcel ID */}
                      <td className="px-4 py-4">
                        <span className="text-sm font-mono text-slate-700">
                          {property.parcelId}
                        </span>
                      </td>
                      {/* Address */}
                      <td className="px-4 py-4">
                        <div className="font-medium text-slate-900">
                          {property.address}
                        </div>
                        <div className="text-xs text-slate-500">
                          {property.city}, {property.state}
                        </div>
                      </td>
                      {/* County */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" />
                          <span className="text-sm text-slate-700">
                            {property.county}
                          </span>
                        </div>
                      </td>
                      {/* Total Due */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3.5 w-3.5 text-slate-400" />
                          <span className="text-sm font-medium text-slate-900">
                            {property.totalDue.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                      </td>
                      {/* Sale Type */}
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center gap-1 text-sm text-slate-700">
                          <Gavel className="h-3.5 w-3.5 text-slate-400" />
                          {property.saleType}
                        </span>
                      </td>
                      {/* Stage (Status) */}
                      <td className="px-4 py-4">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                            STATUS_CONFIG[property.status as PropertyStatus]
                              .color
                          )}
                        >
                          {STATUS_CONFIG[property.status as PropertyStatus].icon}
                          {STATUS_CONFIG[property.status as PropertyStatus].label}
                        </span>
                      </td>
                      {/* Validation */}
                      <td className="px-4 py-4">
                        {property.validation ? (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                              VALIDATION_CONFIG[property.validation as NonNullable<ValidationStatus>]
                                .color
                            )}
                          >
                            {VALIDATION_CONFIG[property.validation as NonNullable<ValidationStatus>].icon}
                            {VALIDATION_CONFIG[property.validation as NonNullable<ValidationStatus>].label}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                            <Shield className="h-3 w-3" />
                            Pending
                          </span>
                        )}
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-4">
                        <button
                          onClick={() => router.push(`/properties/${property.id}`)}
                          className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 font-medium"
                        >
                          View
                          <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      No properties found matching your criteria
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                        currentPage === page
                          ? "bg-primary text-white"
                          : "text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      {page}
                    </button>
                  )
                )}
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
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

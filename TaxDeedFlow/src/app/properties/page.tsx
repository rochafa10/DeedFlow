"use client"

import { useState, Suspense, useCallback } from "react"
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
    saleDate: "2026-01-16",
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
    saleDate: "2026-01-16",
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
    saleDate: "2026-01-16",
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
    saleDate: "2026-03-11",
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
    saleDate: "2026-03-11",
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
    saleDate: "2026-09-08",
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
    saleDate: "2026-09-08",
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
    saleDate: "2026-05-20",
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
    saleDate: "2026-01-16",
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
    saleDate: "2026-03-11",
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
    saleDate: "2026-09-08",
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
    saleDate: "2026-05-20",
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
    saleDate: "2026-01-16",
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
    saleDate: "2026-03-11",
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
    saleDate: "2026-09-08",
  },
]

// Date range options for filtering
const DATE_RANGES = [
  { value: "all", label: "All Dates" },
  { value: "7days", label: "Next 7 Days" },
  { value: "30days", label: "Next 30 Days" },
  { value: "90days", label: "Next 90 Days" },
  { value: "6months", label: "Next 6 Months" },
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

function PropertiesContent() {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<PropertyStatus | "all">("all")
  const [countyFilter, setCountyFilter] = useState<string>("all")
  const [dateRangeFilter, setDateRangeFilter] = useState<string>("all")
  const [showFilters, setShowFilters] = useState(false)
  const itemsPerPage = 10

  // Get unique counties for filter dropdown
  const uniqueCounties = Array.from(new Set(MOCK_PROPERTIES.map(p => p.county))).sort()

  // Valid status values for URL param validation
  const validStatuses: PropertyStatus[] = ["parsed", "enriched", "validated", "approved"]

  // Function to update URL parameters
  const updateUrlParams = useCallback((updates: { stage?: string | null; county?: string | null; dateRange?: string | null; q?: string | null; page?: number | null }) => {
    const params = new URLSearchParams(searchParams.toString())

    if (updates.stage !== undefined) {
      if (updates.stage && updates.stage !== "all") {
        params.set("stage", updates.stage)
      } else {
        params.delete("stage")
      }
    }

    if (updates.county !== undefined) {
      if (updates.county && updates.county !== "all") {
        params.set("county", updates.county)
      } else {
        params.delete("county")
      }
    }

    if (updates.dateRange !== undefined) {
      if (updates.dateRange && updates.dateRange !== "all") {
        params.set("dateRange", updates.dateRange)
      } else {
        params.delete("dateRange")
      }
    }

    if (updates.q !== undefined) {
      if (updates.q && updates.q.trim() !== "") {
        params.set("q", updates.q.trim())
      } else {
        params.delete("q")
      }
    }

    if (updates.page !== undefined) {
      if (updates.page && updates.page > 1) {
        params.set("page", updates.page.toString())
      } else {
        params.delete("page")
      }
    }

    const queryString = params.toString()
    const newUrl = queryString ? `/properties?${queryString}` : "/properties"
    router.replace(newUrl, { scroll: false })
  }, [searchParams, router])

  // Read county from URL params (also reset when param is removed)
  useEffect(() => {
    const countyParam = searchParams.get("county")
    if (countyParam && uniqueCounties.includes(countyParam)) {
      setCountyFilter(countyParam)
    } else if (!countyParam) {
      setCountyFilter("all")
    }
  }, [searchParams, uniqueCounties])

  // Read stage/status from URL params (also reset when param is removed)
  useEffect(() => {
    const stageParam = searchParams.get("stage")
    if (stageParam && validStatuses.includes(stageParam as PropertyStatus)) {
      setStatusFilter(stageParam as PropertyStatus)
    } else if (!stageParam) {
      setStatusFilter("all")
    }
  }, [searchParams])

  // Read date range from URL params
  useEffect(() => {
    const dateRangeParam = searchParams.get("dateRange")
    const validDateRanges = DATE_RANGES.map(r => r.value)
    if (dateRangeParam && validDateRanges.includes(dateRangeParam)) {
      setDateRangeFilter(dateRangeParam)
    } else if (!dateRangeParam) {
      setDateRangeFilter("all")
    }
  }, [searchParams])

  // Read search query from URL params
  useEffect(() => {
    const qParam = searchParams.get("q")
    if (qParam) {
      setSearchQuery(qParam)
    } else {
      setSearchQuery("")
    }
  }, [searchParams])

  // Auto-expand filters panel when there are active URL filter params
  useEffect(() => {
    const hasStage = searchParams.get("stage")
    const hasCounty = searchParams.get("county")
    const hasDateRange = searchParams.get("dateRange")
    if (hasStage || hasCounty || hasDateRange) {
      setShowFilters(true)
    }
  }, [searchParams])

  // Read page from URL params with validation for malformed values
  useEffect(() => {
    const pageParam = searchParams.get("page")
    if (pageParam) {
      // Parse and validate the page number
      const parsedPage = parseInt(pageParam, 10)

      // Check if it's a valid positive integer
      if (!isNaN(parsedPage) && parsedPage > 0 && Number.isInteger(parsedPage)) {
        // Will be clamped to valid range when totalPages is calculated
        setCurrentPage(parsedPage)
      } else {
        // Invalid page parameter - fall back to default (page 1)
        console.warn(`[Properties] Invalid page parameter "${pageParam}", defaulting to page 1`)
        setCurrentPage(1)
      }
    }
  }, [searchParams])

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

  // Helper function to check if sale date is within range
  const isWithinDateRange = (saleDate: string, range: string): boolean => {
    if (range === "all") return true

    const today = new Date()
    const sale = new Date(saleDate)
    const diffDays = Math.ceil((sale.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    switch (range) {
      case "7days":
        return diffDays >= 0 && diffDays <= 7
      case "30days":
        return diffDays >= 0 && diffDays <= 30
      case "90days":
        return diffDays >= 0 && diffDays <= 90
      case "6months":
        return diffDays >= 0 && diffDays <= 180
      default:
        return true
    }
  }

  // Filter properties based on search, status, county, and date range
  const trimmedSearch = searchQuery.trim().toLowerCase()
  const filteredProperties = MOCK_PROPERTIES.filter((property) => {
    const matchesSearch =
      trimmedSearch === "" ||
      property.address.toLowerCase().includes(trimmedSearch) ||
      property.parcelId.toLowerCase().includes(trimmedSearch) ||
      property.city.toLowerCase().includes(trimmedSearch) ||
      property.county.toLowerCase().includes(trimmedSearch)

    const matchesStatus =
      statusFilter === "all" || property.status === statusFilter

    const matchesCounty =
      countyFilter === "all" || property.county === countyFilter

    const matchesDateRange = isWithinDateRange(property.saleDate, dateRangeFilter)

    return matchesSearch && matchesStatus && matchesCounty && matchesDateRange
  })

  // Count active filters
  const activeFilterCount = [statusFilter !== "all", countyFilter !== "all", dateRangeFilter !== "all"].filter(Boolean).length

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredProperties.length / itemsPerPage))
  // Clamp currentPage to valid range (handles case where page param exceeds total pages)
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages)
  const startIndex = (validCurrentPage - 1) * itemsPerPage
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
                  const value = e.target.value
                  setSearchQuery(value)
                  setCurrentPage(1)
                  updateUrlParams({ q: value, page: null })
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
                      const newValue = e.target.value as PropertyStatus | "all"
                      setStatusFilter(newValue)
                      setCurrentPage(1)
                      updateUrlParams({ stage: newValue, page: null })
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
                      const newValue = e.target.value
                      setCountyFilter(newValue)
                      setCurrentPage(1)
                      updateUrlParams({ county: newValue, page: null })
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
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Sale Date
                  </label>
                  <select
                    value={dateRangeFilter}
                    onChange={(e) => {
                      const newValue = e.target.value
                      setDateRangeFilter(newValue)
                      setCurrentPage(1)
                      updateUrlParams({ dateRange: newValue, page: null })
                    }}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {DATE_RANGES.map((range) => (
                      <option key={range.value} value={range.value}>
                        {range.label}
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
                        setDateRangeFilter("all")
                        setCurrentPage(1)
                        updateUrlParams({ stage: null, county: null, dateRange: null, page: null })
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
                          updateUrlParams({ stage: null, page: null })
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
                          updateUrlParams({ county: null, page: null })
                        }}
                        className="hover:bg-primary/20 rounded-full p-0.5"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {dateRangeFilter !== "all" && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                      Sale Date: {DATE_RANGES.find(r => r.value === dateRangeFilter)?.label}
                      <button
                        onClick={() => {
                          setDateRangeFilter("all")
                          setCurrentPage(1)
                          updateUrlParams({ dateRange: null, page: null })
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
                      const newValue = statusFilter === status ? "all" : status
                      setStatusFilter(newValue)
                      setCurrentPage(1)
                      updateUrlParams({ stage: newValue === "all" ? null : newValue, page: null })
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
                      className="px-4 py-16 text-center"
                    >
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                          <Search className="h-8 w-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900 mb-2">
                          No properties found
                        </h3>
                        {trimmedSearch && (
                          <p className="text-sm text-slate-500 mb-4">
                            No results for &quot;{searchQuery.trim()}&quot;
                          </p>
                        )}
                        <div className="text-sm text-slate-500 space-y-1">
                          <p>Try adjusting your search or filters:</p>
                          <ul className="list-disc list-inside text-left inline-block mt-2">
                            {trimmedSearch && (
                              <li>Check for typos in your search term</li>
                            )}
                            <li>Try a different address, parcel ID, or city</li>
                            {(statusFilter !== "all" || countyFilter !== "all") && (
                              <li>Remove some filters to see more results</li>
                            )}
                          </ul>
                        </div>
                        {(trimmedSearch || statusFilter !== "all" || countyFilter !== "all" || dateRangeFilter !== "all") && (
                          <button
                            onClick={() => {
                              setSearchQuery("")
                              setStatusFilter("all")
                              setCountyFilter("all")
                              setDateRangeFilter("all")
                              setCurrentPage(1)
                              updateUrlParams({ stage: null, county: null, dateRange: null, q: null, page: null })
                            }}
                            className="mt-4 px-4 py-2 text-sm font-medium text-primary hover:text-primary/80 border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors"
                          >
                            Clear all filters
                          </button>
                        )}
                      </div>
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
                Page {validCurrentPage} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={validCurrentPage === 1}
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
                        validCurrentPage === page
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
                  disabled={validCurrentPage === totalPages}
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

function PropertiesLoading() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-slate-500">Loading properties...</div>
    </div>
  )
}

export default function PropertiesPage() {
  return (
    <Suspense fallback={<PropertiesLoading />}>
      <PropertiesContent />
    </Suspense>
  )
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ")
}

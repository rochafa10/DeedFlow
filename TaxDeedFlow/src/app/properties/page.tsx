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
} from "lucide-react"
import { Header } from "@/components/layout/Header"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
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

export default function PropertiesPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<PropertyStatus | "all">("all")
  const [showFilters, setShowFilters] = useState(false)
  const itemsPerPage = 10

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

  // Filter properties based on search and status
  const filteredProperties = MOCK_PROPERTIES.filter((property) => {
    const matchesSearch =
      searchQuery === "" ||
      property.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      property.parcelId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      property.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      property.county.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus =
      statusFilter === "all" || property.status === statusFilter

    return matchesSearch && matchesStatus
  })

  // Pagination
  const totalPages = Math.ceil(filteredProperties.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedProperties = filteredProperties.slice(
    startIndex,
    startIndex + itemsPerPage
  )

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
              {statusFilter !== "all" && (
                <span className="bg-white/20 text-xs px-1.5 py-0.5 rounded">
                  1
                </span>
              )}
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
              </div>
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
                    Property
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Amount Due
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Status
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
                      <td className="px-4 py-4">
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                            <Building2 className="h-5 w-5 text-slate-400" />
                          </div>
                          <div>
                            <div className="font-medium text-slate-900">
                              {property.address}
                            </div>
                            <div className="text-xs text-slate-500">
                              {property.parcelId}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" />
                          <span className="text-sm text-slate-700">
                            {property.city}, {property.county}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {property.state} • {property.lotSize}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-slate-700">
                          {property.propertyType}
                        </span>
                      </td>
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
                      <td className="px-4 py-4">
                        <button className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 font-medium">
                          View
                          <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={6}
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

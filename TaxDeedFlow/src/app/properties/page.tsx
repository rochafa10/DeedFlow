"use client"

import { useState, Suspense, useCallback } from "react"
import { authFetch, authDelete } from "@/lib/api/authFetch"
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
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Calendar,
  Bookmark,
  BookmarkPlus,
  X,
  Trash2,
  Star,
  CheckSquare,
  Square,
  Heart,
  MinusSquare,
  Loader2,
  Database,
} from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect } from "react"
import { formatDate, DATE_FORMAT_KEY, cn } from "@/lib/utils"
import { MobileDataTable } from "@/components/shared/MobileDataTable"

// Property type for API data
interface Property {
  id: string
  parcelId: string
  address: string
  city: string
  county: string
  state: string
  totalDue: number
  status: string
  auctionStatus: string
  propertyType: string
  propertyClass: string | null // Property class from Regrid (Residence, Lot, etc.)
  lotSize: string
  saleType: string
  validation: string | null
  saleDate: string
  // Regrid data fields
  yearBuilt: number | null
  bedrooms: number | null
  bathrooms: number | null
  buildingSqft: number | null
  assessedValue: number | null
  lotSizeAcres: number | null
  lotDimensions: string | null
  waterService: string | null
  sewerService: string | null
  // Regrid enrichment indicator
  hasRegridData: boolean
}

// Date range options for filtering
const DATE_RANGES = [
  { value: "all", label: "All Dates" },
  { value: "thisWeek", label: "This Week" },
  { value: "7days", label: "Next 7 Days" },
  { value: "30days", label: "Next 30 Days" },
  { value: "90days", label: "Next 90 Days" },
  { value: "6months", label: "Next 6 Months" },
]

type PropertyStatus = "active" | "pending" | "expired" | "sold" | "withdrawn" | "unknown"

const STATUS_CONFIG: Record<
  PropertyStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  active: {
    label: "Active",
    color: "bg-green-100 text-green-700",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  pending: {
    label: "Pending",
    color: "bg-amber-100 text-amber-700",
    icon: <Clock className="h-3 w-3" />,
  },
  expired: {
    label: "Expired",
    color: "bg-slate-100 text-slate-700",
    icon: <Clock className="h-3 w-3" />,
  },
  sold: {
    label: "Sold",
    color: "bg-blue-100 text-blue-700",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  withdrawn: {
    label: "Withdrawn",
    color: "bg-red-100 text-red-700",
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  unknown: {
    label: "Unknown",
    color: "bg-slate-100 text-slate-500",
    icon: <Clock className="h-3 w-3" />,
  },
}

// Auction status configuration for the separate auction status filter/display
type AuctionStatusType = "active" | "expired" | "unknown" | "sold" | "withdrawn" | "all"

const AUCTION_STATUS_CONFIG: Record<
  Exclude<AuctionStatusType, "all">,
  { label: string; color: string; icon: React.ReactNode }
> = {
  active: {
    label: "Active",
    color: "bg-green-100 text-green-800",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  expired: {
    label: "Expired",
    color: "bg-red-100 text-red-800",
    icon: <Clock className="h-3 w-3" />,
  },
  unknown: {
    label: "Unknown",
    color: "bg-gray-100 text-gray-800",
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  sold: {
    label: "Sold",
    color: "bg-blue-100 text-blue-800",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  withdrawn: {
    label: "Withdrawn",
    color: "bg-yellow-100 text-yellow-800",
    icon: <AlertTriangle className="h-3 w-3" />,
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

type SortField = "saleDate" | "totalDue" | "county" | "parcelId" | null
type SortDirection = "asc" | "desc"

// Saved filter type
interface SavedFilter {
  id: string
  name: string
  filters: {
    status: PropertyStatus | "all"
    county: string
    dateRange: string
    searchQuery: string
  }
  createdAt: string
  isDefault?: boolean
}

// localStorage key for saved filters
const SAVED_FILTERS_KEY = "taxdeedflow_saved_filters"

// localStorage key for page size preference
const PAGE_SIZE_KEY = "taxdeedflow_page_size"

// Page size options
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

function PropertiesContent() {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<PropertyStatus | "all">("all")
  const [auctionStatusFilter, setAuctionStatusFilter] = useState<AuctionStatusType>("active")
  const [countyFilter, setCountyFilter] = useState<string>("all")
  const [dateRangeFilter, setDateRangeFilter] = useState<string>("all")
  const [saleTypeFilter, setSaleTypeFilter] = useState<string>("all")
  const [showFilters, setShowFilters] = useState(false)
  const [sortField, setSortField] = useState<SortField>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])
  const [showSaveFilterModal, setShowSaveFilterModal] = useState(false)
  const [newFilterName, setNewFilterName] = useState("")
  const [showSavedFilters, setShowSavedFilters] = useState(false)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [dateFormatPreference, setDateFormatPreference] = useState("MMM DD, YYYY")
  const [selectedProperties, setSelectedProperties] = useState<Set<string>>(new Set())
  const [properties, setProperties] = useState<Property[]>([])
  const [isLoadingProperties, setIsLoadingProperties] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [allCounties, setAllCounties] = useState<string[]>([])
  const [scrapingPropertyId, setScrapingPropertyId] = useState<string | null>(null)

  // Sale ID filter (for filtering properties by specific auction)
  const saleIdFilter = searchParams.get("sale_id")

  // Read saleType directly from URL params for the fetch (to avoid race condition)
  const saleTypeParam = searchParams.get("saleType")

  // Fetch properties from API
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        setIsLoadingProperties(true)
        setLoadError(null)
        // Build query params - pass auction_status filter to API
        const params = new URLSearchParams()
        // Request more properties to get all counties represented
        params.append('limit', '500')
        // Pass auction_status to API (defaults to 'active' on server if not provided)
        // 'all' means show all properties regardless of auction status
        if (auctionStatusFilter) {
          params.append('auction_status', auctionStatusFilter)
        }
        // Pass sale_id filter to API (for filtering by specific auction)
        if (saleIdFilter) {
          params.append('sale_id', saleIdFilter)
        }
        // Pass date_range filter to API for server-side filtering
        // This ensures properties within the date range are fetched from database
        if (dateRangeFilter && dateRangeFilter !== 'all') {
          params.append('date_range', dateRangeFilter)
        }
        // Pass sale_type filter to API for server-side filtering
        // Use saleTypeParam (from URL) to avoid race condition with state initialization
        if (saleTypeParam && saleTypeParam !== 'all') {
          params.append('sale_type', saleTypeParam)
        }
        const queryString = params.toString()
        const response = await authFetch(`/api/properties?${queryString}`)
        if (!response.ok) {
          throw new Error("Failed to fetch properties")
        }
        const result = await response.json()
        // Transform API data to match component's expected format
        // API response type includes regrid_data for enriched property information
        const transformedProperties: Property[] = (result.data || []).map((p: {
          id: string
          parcel_id?: string
          parcelId?: string
          property_address?: string
          address?: string
          city?: string
          county?: string
          counties?: { county_name?: string; state_code?: string }
          state?: string
          total_due?: number
          totalDue?: number
          auction_status?: string
          status?: string
          property_type?: string
          propertyType?: string
          property_class?: string
          lot_size?: string
          lotSize?: string
          sale_type?: string
          saleType?: string
          visual_validation_status?: string
          validation?: string | null
          sale_date?: string
          saleDate?: string
          // Regrid enrichment data - provides fallback values for property details
          regrid_data?: {
            property_type?: string
            land_use?: string
            zoning?: string
            lot_size_sqft?: number
            lot_size_acres?: number
            lot_dimensions?: string
            building_sqft?: number
            year_built?: number
            bedrooms?: number
            bathrooms?: number
            assessed_value?: number
            market_value?: number
            water_service?: string
            sewer_service?: string
            latitude?: number
            longitude?: number
            additional_fields?: {
              address?: string
              city?: string
              state?: string
              zip?: string
              [key: string]: unknown
            }
          } | null
        }) => ({
          id: p.id,
          parcelId: p.parcel_id || p.parcelId || "",
          // Address fallback chain: property_address -> address -> regrid address -> default
          address: p.property_address || p.address || p.regrid_data?.additional_fields?.address || "Address not available",
          // City fallback: city -> regrid city -> empty
          city: p.city || p.regrid_data?.additional_fields?.city || "",
          county: p.counties?.county_name || p.county || "Unknown",
          state: p.counties?.state_code || p.state || p.regrid_data?.additional_fields?.state || "PA",
          totalDue: p.total_due || p.totalDue || 0,
          status: p.auction_status || p.status || "parsed",
          // Property type fallback: property_type -> propertyType -> regrid property_type -> default
          propertyType: p.property_type || p.propertyType || p.regrid_data?.property_type || "Unknown",
          // Property class from database (Residence, Lot, Commercial, etc.)
          propertyClass: p.property_class || null,
          // Lot size fallback: lot_size -> lotSize -> formatted regrid acres -> default
          lotSize: p.lot_size || p.lotSize || (p.regrid_data?.lot_size_acres ? `${p.regrid_data.lot_size_acres.toFixed(2)} acres` : "Unknown"),
          saleType: p.sale_type || p.saleType || "Tax Deed",
          validation: p.visual_validation_status?.toLowerCase() || p.validation || null,
          saleDate: p.sale_date || p.saleDate || "",
          auctionStatus: p.auction_status || "unknown",
          // Regrid data fields - read from synced properties columns first, fallback to regrid_data
          yearBuilt: p.year_built || p.regrid_data?.year_built || null,
          bedrooms: p.bedrooms || p.regrid_data?.bedrooms || null,
          bathrooms: p.bathrooms || p.regrid_data?.bathrooms || null,
          buildingSqft: p.building_sqft || p.regrid_data?.building_sqft || null,
          assessedValue: p.assessed_value || p.regrid_data?.assessed_value || null,
          lotSizeAcres: p.lot_size_acres || p.regrid_data?.lot_size_acres || null,
          lotDimensions: p.lot_dimensions || p.regrid_data?.lot_dimensions || null,
          waterService: p.water_service || p.regrid_data?.water_service || null,
          sewerService: p.sewer_service || p.regrid_data?.sewer_service || null,
          // Regrid enrichment indicator - true if regrid_data exists
          hasRegridData: !!p.regrid_data,
        }))
        setProperties(transformedProperties)
      } catch (error) {
        console.error("Error fetching properties:", error)
        setLoadError(error instanceof Error ? error.message : "Failed to load properties")
      } finally {
        setIsLoadingProperties(false)
      }
    }
    fetchProperties()
  }, [auctionStatusFilter, saleIdFilter, dateRangeFilter, saleTypeParam]) // Re-fetch when auction status, sale_id, date range, or sale type filter changes

  // Fetch all counties for the filter dropdown (separate from properties)
  useEffect(() => {
    const fetchCounties = async () => {
      try {
        const response = await authFetch('/api/counties?has_properties=true')
        if (response.ok) {
          const result = await response.json()
          const countyNames = (result.data || [])
            .map((c: { name: string }) => c.name)
            .filter((name: string) => name && name !== 'Unknown')
            .sort()
          setAllCounties(countyNames)
        }
      } catch (error) {
        console.error("Error fetching counties:", error)
      }
    }
    fetchCounties()
  }, [])

  // Handle delete property
  const handleDeleteProperty = async (propertyId: string) => {
    setIsDeleting(true)
    try {
      const response = await authDelete(`/api/properties/${propertyId}`)
      if (response.ok) {
        // Remove from local state
        setProperties(prev => prev.filter(p => p.id !== propertyId))
        setDeleteConfirmId(null)
        // Remove from selected properties if it was selected
        setSelectedProperties(prev => {
          const next = new Set(prev)
          next.delete(propertyId)
          return next
        })
      } else {
        const error = await response.json()
        console.error("Delete failed:", error)
        alert(error.error || "Failed to delete property")
      }
    } catch (error) {
      console.error("Error deleting property:", error)
      alert("Failed to delete property. Please try again.")
    } finally {
      setIsDeleting(false)
    }
  }

  // Handle scrape Regrid data for a single property
  // Calls the n8n webhook "TDF - Single Property Scraper" which uses pwrunner to extract 50+ fields
  const handleScrapeRegrid = async (propertyId: string) => {
    setScrapingPropertyId(propertyId)
    try {
      // Find the property to get its details
      const property = properties.find(p => p.id === propertyId)
      if (!property) {
        alert("Property not found")
        return
      }

      // Get county slug for Regrid search
      const countySlug = property.county?.toLowerCase().replace(/\s+/g, '-') || ''
      const stateSlug = property.state?.toLowerCase() || 'pa'

      // Call the n8n webhook which triggers the full Regrid scraper workflow
      // This uses the pwrunner container with the v17 script to extract 50+ fields
      // Note: This may take 30-60 seconds as it uses browser automation on the VPS
      const response = await fetch("https://n8n.lfb-investments.com/webhook/scrape-property", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          property_id: propertyId,
          parcel_id: property.parcelId,
          county: countySlug,
          state: stateSlug,
        }),
      })

      const data = await response.json()

      if (data.success) {
        // Update local state with all the new data from Regrid
        setProperties(prev => prev.map(p => {
          if (p.id === propertyId) {
            const regridData = data.regrid_data || {}
            return {
              ...p,
              hasRegridData: true,
              hasScreenshot: true,
              // Update address if found and property didn't have one
              address: regridData.address || p.address,
              // Update other fields from regrid_data if available
              yearBuilt: regridData.year_built || p.yearBuilt,
              bedrooms: regridData.bedrooms || p.bedrooms,
              bathrooms: regridData.bathrooms || p.bathrooms,
              buildingSqft: regridData.building_sqft || p.buildingSqft,
              assessedValue: regridData.assessed_value || p.assessedValue,
            }
          }
          return p
        }))

        const extractedFields = data.regrid_data ? Object.keys(data.regrid_data).filter(k => data.regrid_data[k] !== null).length : 0
        alert(`Regrid data captured successfully! Extracted ${extractedFields} fields.`)
      } else {
        alert(data.error || "Failed to scrape Regrid data")
      }
    } catch (error) {
      console.error("Error scraping Regrid:", error)
      alert("Failed to scrape Regrid data. Please try again.")
    } finally {
      setScrapingPropertyId(null)
    }
  }

  // Get unique counties for filter dropdown - use allCounties from API, fallback to properties
  const uniqueCounties = allCounties.length > 0
    ? allCounties
    : Array.from(new Set(properties.map(p => p.county))).filter(c => c && c !== 'Unknown').sort()

  // Valid status values for URL param validation
  const validStatuses: PropertyStatus[] = ["active", "pending", "expired", "sold", "withdrawn", "unknown"]

  // Function to update URL parameters
  const updateUrlParams = useCallback((updates: { stage?: string | null; auctionStatus?: string | null; county?: string | null; dateRange?: string | null; saleType?: string | null; q?: string | null; page?: number | null; sort?: string | null; dir?: string | null; pageSize?: number | null }) => {
    const params = new URLSearchParams(searchParams.toString())

    if (updates.stage !== undefined) {
      if (updates.stage && updates.stage !== "all") {
        params.set("stage", updates.stage)
      } else {
        params.delete("stage")
      }
    }

    if (updates.auctionStatus !== undefined) {
      if (updates.auctionStatus && updates.auctionStatus !== "all") {
        params.set("auctionStatus", updates.auctionStatus)
      } else {
        params.delete("auctionStatus")
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

    if (updates.saleType !== undefined) {
      if (updates.saleType && updates.saleType !== "all") {
        params.set("saleType", updates.saleType)
      } else {
        params.delete("saleType")
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

    if (updates.sort !== undefined) {
      if (updates.sort) {
        params.set("sort", updates.sort)
      } else {
        params.delete("sort")
      }
    }

    if (updates.dir !== undefined) {
      if (updates.dir && updates.dir !== "asc") {
        params.set("dir", updates.dir)
      } else {
        params.delete("dir")
      }
    }

    if (updates.pageSize !== undefined) {
      if (updates.pageSize && updates.pageSize !== 10) {
        params.set("pageSize", updates.pageSize.toString())
      } else {
        params.delete("pageSize")
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

  // Read auction status from URL params (default to "active" if not set)
  useEffect(() => {
    const auctionStatusParam = searchParams.get("auctionStatus")
    const validAuctionStatuses: AuctionStatusType[] = ["active", "expired", "unknown", "sold", "withdrawn", "all"]
    if (auctionStatusParam && validAuctionStatuses.includes(auctionStatusParam as AuctionStatusType)) {
      setAuctionStatusFilter(auctionStatusParam as AuctionStatusType)
    } else if (!auctionStatusParam) {
      // Default to "active" to show only active properties by default
      setAuctionStatusFilter("active")
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

  // Read sale type from URL params
  useEffect(() => {
    const saleTypeParam = searchParams.get("saleType")
    const validSaleTypes = ["all", "upset", "judicial", "repository"]
    if (saleTypeParam && validSaleTypes.includes(saleTypeParam)) {
      setSaleTypeFilter(saleTypeParam)
    } else if (!saleTypeParam) {
      setSaleTypeFilter("all")
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
    const hasSaleType = searchParams.get("saleType")
    if (hasStage || hasCounty || hasDateRange || hasSaleType) {
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

  // Read sort params from URL
  useEffect(() => {
    const sortParam = searchParams.get("sort")
    const dirParam = searchParams.get("dir")
    const validSortFields: SortField[] = ["saleDate", "totalDue", "county", "parcelId"]

    if (sortParam && validSortFields.includes(sortParam as SortField)) {
      setSortField(sortParam as SortField)
    } else if (!sortParam) {
      setSortField(null)
    }

    if (dirParam === "desc") {
      setSortDirection("desc")
    } else {
      setSortDirection("asc")
    }
  }, [searchParams])

  // Read page size from URL params or localStorage
  useEffect(() => {
    const pageSizeParam = searchParams.get("pageSize")
    if (pageSizeParam) {
      const parsedSize = parseInt(pageSizeParam, 10)
      if (PAGE_SIZE_OPTIONS.includes(parsedSize)) {
        setItemsPerPage(parsedSize)
        return
      }
    }
    // Fall back to localStorage if no URL param
    try {
      const stored = localStorage.getItem(PAGE_SIZE_KEY)
      if (stored) {
        const parsedSize = parseInt(stored, 10)
        if (PAGE_SIZE_OPTIONS.includes(parsedSize)) {
          setItemsPerPage(parsedSize)
        }
      }
    } catch (err) {
      console.error("Failed to load page size preference:", err)
    }
  }, [searchParams])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, authLoading, router])

  // Load saved filters from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SAVED_FILTERS_KEY)
      if (stored) {
        setSavedFilters(JSON.parse(stored))
      }
    } catch (err) {
      console.error("Failed to load saved filters:", err)
    }
  }, [])

  // Load date format preference from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(DATE_FORMAT_KEY)
      if (stored) {
        setDateFormatPreference(stored)
      }
    } catch (err) {
      console.error("Failed to load date format preference:", err)
    }

    // Listen for storage changes (when settings page updates the preference)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === DATE_FORMAT_KEY && e.newValue) {
        setDateFormatPreference(e.newValue)
      }
    }
    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [])

  // Save filter function
  const handleSaveFilter = () => {
    if (!newFilterName.trim()) return

    const newFilter: SavedFilter = {
      id: `filter-${Date.now()}`,
      name: newFilterName.trim(),
      filters: {
        status: statusFilter,
        county: countyFilter,
        dateRange: dateRangeFilter,
        searchQuery: searchQuery.trim(),
      },
      createdAt: new Date().toISOString(),
    }

    const updatedFilters = [...savedFilters, newFilter]
    setSavedFilters(updatedFilters)
    localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(updatedFilters))
    setNewFilterName("")
    setShowSaveFilterModal(false)
  }

  // Delete saved filter function
  const handleDeleteFilter = (filterId: string) => {
    const updatedFilters = savedFilters.filter((f) => f.id !== filterId)
    setSavedFilters(updatedFilters)
    localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(updatedFilters))
  }

  // Apply saved filter function
  const handleApplyFilter = (filter: SavedFilter) => {
    setStatusFilter(filter.filters.status)
    setCountyFilter(filter.filters.county)
    setDateRangeFilter(filter.filters.dateRange)
    setSearchQuery(filter.filters.searchQuery)
    setCurrentPage(1)
    setShowFilters(true)
    updateUrlParams({
      stage: filter.filters.status === "all" ? null : filter.filters.status,
      county: filter.filters.county === "all" ? null : filter.filters.county,
      dateRange: filter.filters.dateRange === "all" ? null : filter.filters.dateRange,
      q: filter.filters.searchQuery || null,
      page: null,
    })
  }

  // Check if current filters match a saved filter
  const hasActiveFilters = statusFilter !== "all" || auctionStatusFilter !== "active" || countyFilter !== "all" || dateRangeFilter !== "all" || searchQuery.trim() !== "" || !!saleIdFilter

  // Set filter as default
  const handleSetAsDefault = (filterId: string) => {
    const updatedFilters = savedFilters.map((f) => ({
      ...f,
      isDefault: f.id === filterId,
    }))
    setSavedFilters(updatedFilters)
    localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(updatedFilters))
  }

  // Remove default from filter
  const handleRemoveDefault = (filterId: string) => {
    const updatedFilters = savedFilters.map((f) => ({
      ...f,
      isDefault: f.id === filterId ? false : f.isDefault,
    }))
    setSavedFilters(updatedFilters)
    localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(updatedFilters))
  }

  // Apply default filter on initial load (only if no URL params)
  useEffect(() => {
    // Only apply default filter if there are no URL params
    const hasUrlParams = searchParams.get("stage") || searchParams.get("county") || searchParams.get("dateRange") || searchParams.get("q")
    if (hasUrlParams) return

    const defaultFilter = savedFilters.find((f) => f.isDefault)
    if (defaultFilter) {
      handleApplyFilter(defaultFilter)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedFilters.length]) // Only run when savedFilters is loaded

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

  // Show loading state while fetching properties
  if (isLoadingProperties) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-slate-500 dark:text-slate-400">Loading properties...</p>
          </div>
        </div>
      </div>
    )
  }

  // Show error state if loading failed
  if (loadError) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3 text-center">
            <AlertTriangle className="h-10 w-10 text-red-500" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Failed to load properties</h2>
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

  // Helper function to check if sale date is within range
  const isWithinDateRange = (saleDate: string, range: string): boolean => {
    if (range === "all") return true

    const today = new Date()
    const sale = new Date(saleDate)
    const diffDays = Math.ceil((sale.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    switch (range) {
      case "thisWeek": {
        // Get the start of the current week (Sunday)
        const startOfWeek = new Date(today)
        startOfWeek.setHours(0, 0, 0, 0)
        startOfWeek.setDate(today.getDate() - today.getDay()) // Go back to Sunday

        // Get the end of the current week (Saturday 23:59:59)
        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 6)
        endOfWeek.setHours(23, 59, 59, 999)

        // Check if sale date falls within this week
        return sale >= startOfWeek && sale <= endOfWeek
      }
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

  // Filter properties based on search, status, auction status, county, and date range
  const trimmedSearch = searchQuery.trim().toLowerCase()
  const filteredProperties = properties.filter((property) => {
    const matchesSearch =
      trimmedSearch === "" ||
      property.address.toLowerCase().includes(trimmedSearch) ||
      property.parcelId.toLowerCase().includes(trimmedSearch) ||
      property.city.toLowerCase().includes(trimmedSearch) ||
      property.county.toLowerCase().includes(trimmedSearch)

    const matchesStatus =
      statusFilter === "all" || property.status === statusFilter

    const matchesAuctionStatus =
      auctionStatusFilter === "all" || property.auctionStatus === auctionStatusFilter

    const matchesCounty =
      countyFilter === "all" || property.county === countyFilter

    const matchesDateRange = isWithinDateRange(property.saleDate, dateRangeFilter)

    return matchesSearch && matchesStatus && matchesAuctionStatus && matchesCounty && matchesDateRange
  })

  // Count active filters (auctionStatus "active" is the default, so only count if different)
  const activeFilterCount = [statusFilter !== "all", auctionStatusFilter !== "active", countyFilter !== "all", dateRangeFilter !== "all", saleTypeFilter !== "all", !!saleIdFilter].filter(Boolean).length

  // Sort properties if a sort field is selected
  const sortedProperties = [...filteredProperties].sort((a, b) => {
    if (!sortField) return 0

    let comparison = 0
    switch (sortField) {
      case "saleDate":
        // Date comparison - chronological order
        comparison = new Date(a.saleDate).getTime() - new Date(b.saleDate).getTime()
        break
      case "totalDue":
        comparison = a.totalDue - b.totalDue
        break
      case "county":
        comparison = a.county.localeCompare(b.county)
        break
      case "parcelId":
        comparison = a.parcelId.localeCompare(b.parcelId)
        break
      default:
        return 0
    }

    return sortDirection === "asc" ? comparison : -comparison
  })

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedProperties.length / itemsPerPage))
  // Clamp currentPage to valid range (handles case where page param exceeds total pages)
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages)
  const startIndex = (validCurrentPage - 1) * itemsPerPage
  const paginatedProperties = sortedProperties.slice(
    startIndex,
    startIndex + itemsPerPage
  )

  // Handle sort column click
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if clicking same field
      const newDirection = sortDirection === "asc" ? "desc" : "asc"
      setSortDirection(newDirection)
      setCurrentPage(1)
      updateUrlParams({ dir: newDirection, page: null })
    } else {
      // New field, reset to ascending
      setSortField(field)
      setSortDirection("asc")
      setCurrentPage(1)
      updateUrlParams({ sort: field, dir: null, page: null })
    }
  }

  // Handle page size change
  const handlePageSizeChange = (newSize: number) => {
    setItemsPerPage(newSize)
    setCurrentPage(1)
    // Save to localStorage for persistence
    try {
      localStorage.setItem(PAGE_SIZE_KEY, newSize.toString())
    } catch (err) {
      console.error("Failed to save page size preference:", err)
    }
    updateUrlParams({ pageSize: newSize, page: null })
  }

  // Bulk selection handlers
  const handleSelectProperty = (propertyId: string) => {
    setSelectedProperties(prev => {
      const newSet = new Set(prev)
      if (newSet.has(propertyId)) {
        newSet.delete(propertyId)
      } else {
        newSet.add(propertyId)
      }
      return newSet
    })
  }

  const handleSelectAll = () => {
    const currentPageIds = paginatedProperties.map(p => p.id)
    const allCurrentPageSelected = currentPageIds.every(id => selectedProperties.has(id))

    if (allCurrentPageSelected) {
      // Deselect all on current page
      setSelectedProperties(prev => {
        const newSet = new Set(prev)
        currentPageIds.forEach(id => newSet.delete(id))
        return newSet
      })
    } else {
      // Select all on current page
      setSelectedProperties(prev => {
        const newSet = new Set(prev)
        currentPageIds.forEach(id => newSet.add(id))
        return newSet
      })
    }
  }

  const handleClearSelection = () => {
    setSelectedProperties(new Set())
  }

  const handleBulkAddToWatchlist = () => {
    // In a real app, this would call an API
    console.log("Adding to watchlist:", Array.from(selectedProperties))
    alert(`Added ${selectedProperties.size} properties to watchlist`)
    setSelectedProperties(new Set())
  }

  const handleBulkExport = () => {
    // Export only selected properties
    const selectedProps = sortedProperties.filter(p => selectedProperties.has(p.id))
    const headers = [
      "Parcel ID", "Address", "City", "State", "County", "Total Due",
      "Property Class", "Year Built", "Bedrooms", "Bathrooms", "Building Sq Ft", "Assessed Value",
      "Lot Dimensions", "Water Service", "Sewer Service",
      "Sale Date", "Sale Type", "Property Type", "Lot Size", "Stage", "Auction Status", "Validation", "Has Regrid Data"
    ]
    const rows = selectedProps.map(property => [
      property.parcelId, property.address, property.city, property.state,
      property.county, property.totalDue.toFixed(2),
      property.propertyClass || "",
      property.yearBuilt || "", property.bedrooms || "", property.bathrooms || "",
      property.buildingSqft || "", property.assessedValue || "",
      property.lotDimensions || "", property.waterService || "", property.sewerService || "",
      property.saleDate,
      property.saleType, property.propertyType, property.lotSize,
      STATUS_CONFIG[property.status as PropertyStatus].label,
      AUCTION_STATUS_CONFIG[property.auctionStatus as Exclude<AuctionStatusType, "all">]?.label || property.auctionStatus,
      property.validation ? VALIDATION_CONFIG[property.validation as NonNullable<ValidationStatus>].label : "Pending",
      property.hasRegridData ? "Yes" : "No"
    ])

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `selected-properties-${new Date().toISOString().split("T")[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Check if all properties on current page are selected
  const allCurrentPageSelected = paginatedProperties.length > 0 &&
    paginatedProperties.every(p => selectedProperties.has(p.id))
  const someCurrentPageSelected = paginatedProperties.some(p => selectedProperties.has(p.id))

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
      "Property Class",
      "Year Built",
      "Bedrooms",
      "Bathrooms",
      "Building Sq Ft",
      "Assessed Value",
      "Lot Dimensions",
      "Water Service",
      "Sewer Service",
      "Sale Date",
      "Sale Type",
      "Property Type",
      "Lot Size",
      "Stage",
      "Auction Status",
      "Validation",
      "Has Regrid Data"
    ]

    // CSV rows from sorted properties (respects current sort order)
    const rows = sortedProperties.map(property => [
      property.parcelId,
      property.address,
      property.city,
      property.state,
      property.county,
      property.totalDue.toFixed(2),
      property.propertyClass || "",
      property.yearBuilt || "",
      property.bedrooms || "",
      property.bathrooms || "",
      property.buildingSqft || "",
      property.assessedValue || "",
      property.lotDimensions || "",
      property.waterService || "",
      property.sewerService || "",
      property.saleDate,
      property.saleType,
      property.propertyType,
      property.lotSize,
      STATUS_CONFIG[property.status as PropertyStatus].label,
      AUCTION_STATUS_CONFIG[property.auctionStatus as Exclude<AuctionStatusType, "all">]?.label || property.auctionStatus,
      property.validation ? VALIDATION_CONFIG[property.validation as NonNullable<ValidationStatus>].label : "Pending",
      property.hasRegridData ? "Yes" : "No"
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

            {/* Filters Button - min 44px touch target */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "flex items-center justify-center gap-2 px-4 min-h-[44px] rounded-lg border text-sm font-medium transition-colors",
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

            {/* Export Button - min 44px touch target */}
            <button
              onClick={exportToCSV}
              className="flex items-center justify-center gap-2 px-4 min-h-[44px] rounded-lg border text-sm font-medium transition-colors bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>

            {/* Save Filter Button - min 44px touch target */}
            {hasActiveFilters && (
              <button
                onClick={() => setShowSaveFilterModal(true)}
                className="flex items-center justify-center gap-2 px-4 min-h-[44px] rounded-lg border text-sm font-medium transition-colors bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              >
                <BookmarkPlus className="h-4 w-4" />
                Save Filter
              </button>
            )}

            {/* Saved Filters Button - min 44px touch target */}
            {savedFilters.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowSavedFilters(!showSavedFilters)}
                  className={cn(
                    "flex items-center justify-center gap-2 px-4 min-h-[44px] rounded-lg border text-sm font-medium transition-colors",
                    showSavedFilters
                      ? "bg-amber-500 text-white border-amber-500"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  )}
                >
                  <Bookmark className="h-4 w-4" />
                  Saved ({savedFilters.length})
                </button>

                {/* Saved Filters Dropdown */}
                {showSavedFilters && (
                  <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-lg border border-slate-200 shadow-lg z-20">
                    <div className="p-3 border-b border-slate-200">
                      <h4 className="font-medium text-slate-900">Saved Filters</h4>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {savedFilters.map((filter) => (
                        <div
                          key={filter.id}
                          className={cn(
                            "p-3 border-b border-slate-100 last:border-b-0 hover:bg-slate-50",
                            filter.isDefault && "bg-amber-50"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <button
                              onClick={() => {
                                handleApplyFilter(filter)
                                setShowSavedFilters(false)
                              }}
                              className="flex-1 text-left"
                            >
                              <div className="flex items-center gap-1.5 font-medium text-slate-900 text-sm">
                                {filter.isDefault && (
                                  <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                                )}
                                {filter.name}
                                {filter.isDefault && (
                                  <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Default</span>
                                )}
                              </div>
                              <div className="text-xs text-slate-500 mt-1">
                                {[
                                  filter.filters.status !== "all" && `Status: ${STATUS_CONFIG[filter.filters.status].label}`,
                                  filter.filters.county !== "all" && `County: ${filter.filters.county}`,
                                  filter.filters.dateRange !== "all" && `Date: ${DATE_RANGES.find(r => r.value === filter.filters.dateRange)?.label}`,
                                  filter.filters.searchQuery && `Search: "${filter.filters.searchQuery}"`,
                                ].filter(Boolean).join(" · ") || "No filters"}
                              </div>
                            </button>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => filter.isDefault ? handleRemoveDefault(filter.id) : handleSetAsDefault(filter.id)}
                                className={cn(
                                  "min-w-[44px] min-h-[44px] p-2 rounded flex items-center justify-center",
                                  filter.isDefault
                                    ? "text-amber-500 hover:text-amber-600 hover:bg-amber-100"
                                    : "text-slate-400 hover:text-amber-500 hover:bg-amber-50"
                                )}
                                title={filter.isDefault ? "Remove as default" : "Set as default"}
                                aria-label={filter.isDefault ? "Remove as default" : "Set as default"}
                              >
                                <Star className={cn("h-4 w-4", filter.isDefault && "fill-current")} />
                              </button>
                              <button
                                onClick={() => handleDeleteFilter(filter.id)}
                                className="min-w-[44px] min-h-[44px] p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded flex items-center justify-center"
                                title="Delete filter"
                                aria-label="Delete filter"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="flex flex-wrap gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Pipeline Stage
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
                    <option value="all">All Stages</option>
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="expired">Expired</option>
                    <option value="sold">Sold</option>
                    <option value="withdrawn">Withdrawn</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Auction Status
                  </label>
                  <select
                    value={auctionStatusFilter}
                    onChange={(e) => {
                      const newValue = e.target.value as AuctionStatusType
                      setAuctionStatusFilter(newValue)
                      setCurrentPage(1)
                      updateUrlParams({ auctionStatus: newValue, page: null })
                    }}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                    <option value="unknown">Unknown</option>
                    <option value="all">All</option>
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
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Sale Type
                  </label>
                  <select
                    value={saleTypeFilter}
                    onChange={(e) => {
                      const newValue = e.target.value
                      setSaleTypeFilter(newValue)
                      setCurrentPage(1)
                      updateUrlParams({ saleType: newValue, page: null })
                    }}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="all">All Types</option>
                    <option value="upset">Upset</option>
                    <option value="judicial">Judicial</option>
                    <option value="repository">Repository</option>
                  </select>
                </div>
                {activeFilterCount > 0 && (
                  <div className="flex items-end">
                    <button
                      onClick={() => {
                        setStatusFilter("all")
                        setAuctionStatusFilter("active")
                        setCountyFilter("all")
                        setDateRangeFilter("all")
                        setSaleTypeFilter("all")
                        setCurrentPage(1)
                        updateUrlParams({ stage: null, auctionStatus: null, county: null, dateRange: null, saleType: null, page: null })
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
                        className="min-w-[24px] min-h-[24px] hover:bg-primary/20 rounded-full flex items-center justify-center"
                        aria-label="Remove status filter"
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
                        className="min-w-[24px] min-h-[24px] hover:bg-primary/20 rounded-full flex items-center justify-center"
                        aria-label="Remove county filter"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {saleIdFilter && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded-full">
                      <Gavel className="h-3 w-3" />
                      Filtered by Auction
                      <button
                        onClick={() => {
                          setCurrentPage(1)
                          router.push("/properties")
                        }}
                        className="min-w-[24px] min-h-[24px] hover:bg-amber-200 rounded-full flex items-center justify-center"
                        aria-label="Remove auction filter"
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
                        className="min-w-[24px] min-h-[24px] hover:bg-primary/20 rounded-full flex items-center justify-center"
                        aria-label="Remove date range filter"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {saleTypeFilter !== "all" && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                      Sale Type: {saleTypeFilter.charAt(0).toUpperCase() + saleTypeFilter.slice(1)}
                      <button
                        onClick={() => {
                          setSaleTypeFilter("all")
                          setCurrentPage(1)
                          updateUrlParams({ saleType: null, page: null })
                        }}
                        className="min-w-[24px] min-h-[24px] hover:bg-primary/20 rounded-full flex items-center justify-center"
                        aria-label="Remove sale type filter"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {auctionStatusFilter !== "active" && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                      Auction: {AUCTION_STATUS_CONFIG[auctionStatusFilter as Exclude<AuctionStatusType, "all">]?.label || "All"}
                      <button
                        onClick={() => {
                          setAuctionStatusFilter("active")
                          setCurrentPage(1)
                          updateUrlParams({ auctionStatus: null, page: null })
                        }}
                        className="min-w-[24px] min-h-[24px] hover:bg-primary/20 rounded-full flex items-center justify-center"
                        aria-label="Remove auction status filter"
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
            {(["active", "pending", "expired", "sold", "withdrawn", "unknown"] as const).map(
              (status) => {
                const count = properties.filter(
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

        {/* Bulk Selection Action Bar */}
        {selectedProperties.size > 0 && (
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-primary">
                {selectedProperties.size} {selectedProperties.size === 1 ? "property" : "properties"} selected
              </span>
              <button
                onClick={handleClearSelection}
                className="text-xs text-slate-500 hover:text-slate-700 underline"
              >
                Clear selection
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleBulkAddToWatchlist}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors"
              >
                <Heart className="h-4 w-4" />
                Add to Watchlist
              </button>
              <button
                onClick={handleBulkExport}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
              >
                <Download className="h-4 w-4" />
                Export Selected
              </button>
            </div>
          </div>
        )}

        {/* Properties Table */}
        <MobileDataTable
          cardView={
            <div className="space-y-3">
              {paginatedProperties.length > 0 ? (
                paginatedProperties.map((property) => (
                  <div
                    key={property.id}
                    className={cn(
                      "bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3",
                      selectedProperties.has(property.id) && "ring-2 ring-blue-500 bg-blue-50/50 dark:bg-blue-900/10"
                    )}
                  >
                    {/* Header: Checkbox + Status + Validation */}
                    <div className="flex items-start justify-between gap-2">
                      <button
                        onClick={() => handleSelectProperty(property.id)}
                        className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:text-primary transition-colors"
                        aria-label={selectedProperties.has(property.id) ? "Deselect property" : "Select property"}
                      >
                        {selectedProperties.has(property.id) ? (
                          <CheckSquare className="h-5 w-5 text-primary" />
                        ) : (
                          <Square className="h-5 w-5 text-slate-400" />
                        )}
                      </button>
                      <div className="flex-1 flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                            STATUS_CONFIG[property.status as PropertyStatus].color
                          )}
                        >
                          {STATUS_CONFIG[property.status as PropertyStatus].icon}
                          {STATUS_CONFIG[property.status as PropertyStatus].label}
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                            AUCTION_STATUS_CONFIG[property.auctionStatus as Exclude<AuctionStatusType, "all">]?.color || "bg-gray-100 text-gray-800"
                          )}
                        >
                          {AUCTION_STATUS_CONFIG[property.auctionStatus as Exclude<AuctionStatusType, "all">]?.icon || <AlertTriangle className="h-3 w-3" />}
                          {AUCTION_STATUS_CONFIG[property.auctionStatus as Exclude<AuctionStatusType, "all">]?.label || property.auctionStatus}
                        </span>
                        {property.validation ? (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                              VALIDATION_CONFIG[property.validation as NonNullable<ValidationStatus>].color
                            )}
                          >
                            {VALIDATION_CONFIG[property.validation as NonNullable<ValidationStatus>].icon}
                            {VALIDATION_CONFIG[property.validation as NonNullable<ValidationStatus>].label}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs text-slate-400 dark:text-slate-500">
                            <Shield className="h-3 w-3" />
                            Pending
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Parcel ID */}
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Parcel ID</div>
                      <div className="text-sm font-mono text-slate-900 dark:text-slate-100">{property.parcelId}</div>
                    </div>

                    {/* Address */}
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Address</div>
                      <div className="font-medium text-slate-900 dark:text-slate-100">{property.address}</div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        {property.city}, {property.state}
                      </div>
                    </div>

                    {/* Property Type + Total Due (side by side) */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Type</div>
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                          <span className="text-sm text-slate-900 dark:text-slate-100">{property.propertyClass || "-"}</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Total Due</div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {property.totalDue.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* County */}
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">County</div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                        <span className="text-sm text-slate-900 dark:text-slate-100">{property.county}</span>
                      </div>
                    </div>

                    {/* Sale Date + Sale Type (side by side) */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Sale Date</div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                          <span className="text-sm text-slate-900 dark:text-slate-100">
                            {formatDate(property.saleDate, dateFormatPreference)}
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Sale Type</div>
                        <div className="flex items-center gap-1">
                          <Gavel className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                          <span className="text-sm text-slate-900 dark:text-slate-100">{property.saleType}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                      {!property.hasRegridData && (
                        <button
                          onClick={() => handleScrapeRegrid(property.id)}
                          className="flex-1 min-h-[44px] px-4 py-2 flex items-center justify-center gap-2 text-sm text-white bg-amber-600 hover:bg-amber-700 rounded-lg font-medium transition-colors disabled:opacity-50"
                          disabled={scrapingPropertyId === property.id}
                        >
                          {scrapingPropertyId === property.id ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Scraping...
                            </>
                          ) : (
                            <>
                              <Database className="h-4 w-4" />
                              Scrape
                            </>
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => router.push(`/report/${property.id}`)}
                        className="flex-1 min-h-[44px] px-4 py-2 flex items-center justify-center gap-2 text-sm text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 rounded-lg font-medium transition-colors"
                      >
                        View Report
                        <ExternalLink className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(property.id)}
                        className="min-w-[44px] min-h-[44px] flex items-center justify-center text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                        title="Delete property"
                        aria-label="Delete property"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-8">
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4">
                      <Search className="h-8 w-8 text-slate-400 dark:text-slate-500" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                      No properties found
                    </h3>
                    {trimmedSearch && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                        No results for &quot;{searchQuery.trim()}&quot;
                      </p>
                    )}
                    <div className="text-sm text-slate-500 dark:text-slate-400 space-y-1">
                      <p>Try:</p>
                      <ul className="list-disc list-inside">
                        {trimmedSearch && (
                          <li>Check for typos in your search term</li>
                        )}
                        <li>Try a different address, parcel ID, or city</li>
                        {(statusFilter !== "all" || countyFilter !== "all") && (
                          <li>Remove some filters to see more results</li>
                        )}
                      </ul>
                    </div>
                    {(trimmedSearch || statusFilter !== "all" || auctionStatusFilter !== "active" || countyFilter !== "all" || dateRangeFilter !== "all" || saleTypeFilter !== "all") && (
                      <button
                        onClick={() => {
                          setSearchQuery("")
                          setStatusFilter("all")
                          setAuctionStatusFilter("active")
                          setCountyFilter("all")
                          setDateRangeFilter("all")
                          setSaleTypeFilter("all")
                          setCurrentPage(1)
                          updateUrlParams({ stage: null, auctionStatus: null, county: null, dateRange: null, saleType: null, q: null, page: null })
                        }}
                        className="mt-4 px-4 py-2 text-sm font-medium text-primary hover:text-primary/80 dark:text-blue-400 dark:hover:text-blue-300 border border-primary/30 dark:border-blue-500/30 rounded-lg hover:bg-primary/5 dark:hover:bg-blue-500/10 transition-colors"
                      >
                        Clear all filters
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-10">
                    <button
                      onClick={handleSelectAll}
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:text-slate-700 transition-colors"
                      aria-label={allCurrentPageSelected ? "Deselect all" : "Select all"}
                      title={allCurrentPageSelected ? "Deselect all on page" : "Select all on page"}
                    >
                      {allCurrentPageSelected ? (
                        <CheckSquare className="h-4 w-4 text-primary" />
                      ) : someCurrentPageSelected ? (
                        <MinusSquare className="h-4 w-4 text-primary" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort("parcelId")}
                      className="flex items-center gap-1 hover:text-slate-700 transition-colors"
                    >
                      Parcel ID
                      {sortField === "parcelId" ? (
                        sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-50" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Address
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort("county")}
                      className="flex items-center gap-1 hover:text-slate-700 transition-colors"
                    >
                      County
                      {sortField === "county" ? (
                        sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-50" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort("totalDue")}
                      className="flex items-center gap-1 hover:text-slate-700 transition-colors"
                    >
                      Total Due
                      {sortField === "totalDue" ? (
                        sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-50" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Year Built
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Bed/Bath
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Sq Ft
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Assessed Value
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Lot Size
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Water
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Sewer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort("saleDate")}
                      className="flex items-center gap-1 hover:text-slate-700 transition-colors"
                    >
                      Sale Date
                      {sortField === "saleDate" ? (
                        sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-50" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Sale Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Stage
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Auction Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Validation
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Regrid
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {paginatedProperties.length > 0 ? (
                  paginatedProperties.map((property) => (
                    <tr key={property.id} className={cn("hover:bg-slate-50", selectedProperties.has(property.id) && "bg-primary/5")}>
                      {/* Checkbox */}
                      <td className="px-4 py-4">
                        <button
                          onClick={() => handleSelectProperty(property.id)}
                          className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:text-primary transition-colors"
                          aria-label={selectedProperties.has(property.id) ? "Deselect property" : "Select property"}
                        >
                          {selectedProperties.has(property.id) ? (
                            <CheckSquare className="h-4 w-4 text-primary" />
                          ) : (
                            <Square className="h-4 w-4 text-slate-400" />
                          )}
                        </button>
                      </td>
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
                      {/* Property Type/Class */}
                      <td className="px-4 py-4">
                        <span className="text-sm text-slate-600">
                          {property.propertyClass || "-"}
                        </span>
                      </td>
                      {/* Year Built */}
                      <td className="px-4 py-4">
                        <span className="text-sm text-slate-600">
                          {property.yearBuilt || "-"}
                        </span>
                      </td>
                      {/* Bed/Bath */}
                      <td className="px-4 py-4">
                        <span className="text-sm text-slate-600">
                          {property.bedrooms && property.bathrooms
                            ? `${property.bedrooms}/${property.bathrooms}`
                            : "-"}
                        </span>
                      </td>
                      {/* Sq Ft */}
                      <td className="px-4 py-4">
                        <span className="text-sm text-slate-600">
                          {property.buildingSqft
                            ? property.buildingSqft.toLocaleString()
                            : "-"}
                        </span>
                      </td>
                      {/* Assessed Value */}
                      <td className="px-4 py-4">
                        <span className="text-sm text-slate-600">
                          {property.assessedValue
                            ? `$${property.assessedValue.toLocaleString()}`
                            : "-"}
                        </span>
                      </td>
                      {/* Lot Size/Dimensions */}
                      <td className="px-4 py-4">
                        <span className="text-sm text-slate-600">
                          {property.lotDimensions || property.lotSize || "-"}
                        </span>
                      </td>
                      {/* Water Service */}
                      <td className="px-4 py-4">
                        <span className="text-sm text-slate-600">
                          {property.waterService || "-"}
                        </span>
                      </td>
                      {/* Sewer Service */}
                      <td className="px-4 py-4">
                        <span className="text-sm text-slate-600">
                          {property.sewerService || "-"}
                        </span>
                      </td>
                      {/* Sale Date */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          <span className="text-sm text-slate-700">
                            {property.saleType?.toLowerCase() === "repository"
                              ? <span className="text-green-600 font-medium">Available Now</span>
                              : formatDate(property.saleDate, dateFormatPreference)}
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
                      {/* Auction Status */}
                      <td className="px-4 py-4">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                            AUCTION_STATUS_CONFIG[property.auctionStatus as Exclude<AuctionStatusType, "all">]?.color || "bg-gray-100 text-gray-800"
                          )}
                        >
                          {AUCTION_STATUS_CONFIG[property.auctionStatus as Exclude<AuctionStatusType, "all">]?.icon || <AlertTriangle className="h-3 w-3" />}
                          {AUCTION_STATUS_CONFIG[property.auctionStatus as Exclude<AuctionStatusType, "all">]?.label || property.auctionStatus}
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
                      {/* Regrid Data Indicator */}
                      <td className="px-4 py-4">
                        {property.hasRegridData ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            <Database className="h-3 w-3" />
                            Enriched
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                            <Database className="h-3 w-3" />
                            Pending
                          </span>
                        )}
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          {!property.hasRegridData && (
                            <button
                              onClick={() => handleScrapeRegrid(property.id)}
                              className="min-h-[44px] px-2 flex items-center gap-1 text-sm text-amber-600 hover:text-amber-700 font-medium disabled:opacity-50"
                              disabled={scrapingPropertyId === property.id}
                              title="Scrape Regrid data for this property"
                            >
                              {scrapingPropertyId === property.id ? (
                                <>
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  Scraping...
                                </>
                              ) : (
                                <>
                                  <Database className="h-3.5 w-3.5" />
                                  Scrape
                                </>
                              )}
                            </button>
                          )}
                          <button
                            onClick={() => router.push(`/report/${property.id}`)}
                            className="min-h-[44px] px-2 flex items-center gap-1 text-sm text-primary hover:text-primary/80 font-medium"
                          >
                            View Report
                            <ExternalLink className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(property.id)}
                            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-sm text-red-500 hover:text-red-700 font-medium"
                            title="Delete property"
                            aria-label="Delete property"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={20}
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
                        {(trimmedSearch || statusFilter !== "all" || auctionStatusFilter !== "active" || countyFilter !== "all" || dateRangeFilter !== "all" || saleTypeFilter !== "all") && (
                          <button
                            onClick={() => {
                              setSearchQuery("")
                              setStatusFilter("all")
                              setAuctionStatusFilter("active")
                              setCountyFilter("all")
                              setDateRangeFilter("all")
                              setSaleTypeFilter("all")
                              setCurrentPage(1)
                              updateUrlParams({ stage: null, auctionStatus: null, county: null, dateRange: null, saleType: null, q: null, page: null })
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

          {/* Pagination and Page Size */}
          <div className="px-4 py-3 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <p className="text-sm text-slate-500">
                Page {validCurrentPage} of {totalPages}
              </p>
              {/* Page Size Selector */}
              <div className="flex items-center gap-2">
                <label htmlFor="pageSize" className="text-sm text-slate-500">
                  Show:
                </label>
                <select
                  id="pageSize"
                  value={itemsPerPage}
                  onChange={(e) => handlePageSizeChange(parseInt(e.target.value, 10))}
                  className="px-2 py-1 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={validCurrentPage === 1}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={cn(
                        "min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-sm font-medium transition-colors",
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
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </MobileDataTable>

        {/* Save Filter Modal */}
        {showSaveFilterModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => {
                setShowSaveFilterModal(false)
                setNewFilterName("")
              }}
            />
            {/* Modal */}
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900">
                  Save Filter
                </h3>
                <button
                  onClick={() => {
                    setShowSaveFilterModal(false)
                    setNewFilterName("")
                  }}
                  className="min-w-[44px] min-h-[44px] p-2 hover:bg-slate-100 rounded-lg flex items-center justify-center"
                  aria-label="Close modal"
                >
                  <X className="h-5 w-5 text-slate-500" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Filter Name
                  </label>
                  <input
                    type="text"
                    value={newFilterName}
                    onChange={(e) => setNewFilterName(e.target.value)}
                    placeholder="e.g., High Value Blair County"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSaveFilter()
                      }
                    }}
                  />
                </div>

                {/* Preview of current filters */}
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-xs font-medium text-slate-500 mb-2">Current Filters:</div>
                  <div className="flex flex-wrap gap-2">
                    {statusFilter !== "all" && (
                      <span className="px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-700">
                        Status: {STATUS_CONFIG[statusFilter].label}
                      </span>
                    )}
                    {countyFilter !== "all" && (
                      <span className="px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-700">
                        County: {countyFilter}
                      </span>
                    )}
                    {saleIdFilter && (
                      <span className="px-2 py-1 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
                        Filtered by Auction
                      </span>
                    )}
                    {dateRangeFilter !== "all" && (
                      <span className="px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-700">
                        Date: {DATE_RANGES.find(r => r.value === dateRangeFilter)?.label}
                      </span>
                    )}
                    {saleTypeFilter !== "all" && (
                      <span className="px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-700">
                        Sale Type: {saleTypeFilter.charAt(0).toUpperCase() + saleTypeFilter.slice(1)}
                      </span>
                    )}
                    {searchQuery.trim() && (
                      <span className="px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-700">
                        Search: &quot;{searchQuery.trim()}&quot;
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-200">
                <button
                  onClick={() => {
                    setShowSaveFilterModal(false)
                    setNewFilterName("")
                  }}
                  className="min-h-[44px] px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveFilter}
                  disabled={!newFilterName.trim()}
                  className="flex items-center gap-2 min-h-[44px] px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <BookmarkPlus className="h-4 w-4" />
                  Save Filter
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => !isDeleting && setDeleteConfirmId(null)}
            />
            {/* Modal */}
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <div className="flex items-center gap-2 text-red-600">
                  <Trash2 className="h-5 w-5" />
                  <h3 className="font-semibold">Delete Property</h3>
                </div>
                <button
                  onClick={() => !isDeleting && setDeleteConfirmId(null)}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600"
                  disabled={isDeleting}
                  aria-label="Close modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                <p className="text-slate-600">
                  Are you sure you want to delete this property? This action cannot be undone.
                </p>
                {(() => {
                  const propertyToDelete = properties.find(p => p.id === deleteConfirmId)
                  return propertyToDelete ? (
                    <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                      <div className="font-medium text-slate-900">{propertyToDelete.address}</div>
                      <div className="text-sm text-slate-500">{propertyToDelete.parcelId}</div>
                    </div>
                  ) : null
                })()}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-200">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="min-h-[44px] px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteProperty(deleteConfirmId)}
                  disabled={isDeleting}
                  className="flex items-center gap-2 min-h-[44px] px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="h-4 w-4" />
                  {isDeleting ? "Deleting..." : "Delete Property"}
                </button>
              </div>
            </div>
          </div>
        )}
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

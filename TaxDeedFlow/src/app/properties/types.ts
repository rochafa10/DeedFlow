// Property types and interfaces for the properties page
// This file is pure TypeScript - no React or UI imports

export interface Property {
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
  propertyClass: string | null
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
  hasRegridData: boolean
  // Owner Info & Valuation
  ownerName: string | null
  marketValue: number | null
  lastSalePrice: number | null
  lastSaleDate: string | null
  landValue: number | null
  improvementValue: number | null
  // Investment Indicators
  opportunityZone: boolean | null
  minimumBid: number | null
  schoolDistrict: string | null
  zoning: string | null
  censusTract: string | null
  // Lot Details
  stories: number | null
  buildingCount: number | null
  frontage: number | null
  lotType: string | null
  terrain: string | null
  deedAcres: number | null
}

export type PropertyStatus = "active" | "pending" | "expired" | "sold" | "withdrawn" | "unknown"

export type AuctionStatusType = "active" | "expired" | "unknown" | "sold" | "withdrawn" | "all"

export type ValidationStatus = "approved" | "caution" | "rejected" | null

export type SortField =
  | "saleDate"
  | "totalDue"
  | "county"
  | "parcelId"
  | "assessedValue"
  | "marketValue"
  | "lastSalePrice"
  | "minimumBid"
  | null

export type SortDirection = "asc" | "desc"

export interface SavedFilter {
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

export interface RenderContext {
  selectedProperties: Set<string>
  handleSelectProperty: (id: string) => void
  handleSelectAll: () => void
  allCurrentPageSelected: boolean
  someCurrentPageSelected: boolean
  handleSort: (field: SortField) => void
  sortField: SortField
  sortDirection: SortDirection
  router: { push: (url: string) => void; replace: (url: string) => void; back: () => void; forward: () => void; refresh: () => void; prefetch: (url: string) => void }
  formatDate: (date: string, format?: string) => string
  dateFormatPreference: string
  handleScrapeRegrid: (id: string) => void
  scrapingPropertyId: string | null
  setDeleteConfirmId: (id: string | null) => void
}

export const DATE_RANGES = [
  { value: "all", label: "All Dates" },
  { value: "thisWeek", label: "This Week" },
  { value: "7days", label: "Next 7 Days" },
  { value: "30days", label: "Next 30 Days" },
  { value: "90days", label: "Next 90 Days" },
  { value: "6months", label: "Next 6 Months" },
]

// Status config item shape (without icon, since icons require React)
// Icons are defined in columns.tsx where React is available
export interface StatusConfigItem {
  label: string
  color: string
}

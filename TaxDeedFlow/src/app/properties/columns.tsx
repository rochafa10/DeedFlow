import { ReactNode } from "react"
import {
  MapPin, DollarSign, CheckCircle2, Clock, AlertTriangle,
  Shield, ShieldAlert, ShieldX, ShieldCheck, Gavel,
  Calendar, CheckSquare, Square,
  ExternalLink, Trash2, Database, Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type {
  Property,
  PropertyStatus,
  AuctionStatusType,
  ValidationStatus,
  SortField,
  RenderContext,
  StatusConfigItem,
} from "./types"

// ---------------------------------------------------------------------------
// Status config objects (with JSX icons)
// ---------------------------------------------------------------------------

export const STATUS_CONFIG: Record<PropertyStatus, StatusConfigItem & { icon: ReactNode }> = {
  active: { label: "Active", color: "bg-green-100 text-green-700", icon: <CheckCircle2 className="h-3 w-3" /> },
  pending: { label: "Pending", color: "bg-amber-100 text-amber-700", icon: <Clock className="h-3 w-3" /> },
  expired: { label: "Expired", color: "bg-slate-100 text-slate-700", icon: <Clock className="h-3 w-3" /> },
  sold: { label: "Sold", color: "bg-blue-100 text-blue-700", icon: <CheckCircle2 className="h-3 w-3" /> },
  withdrawn: { label: "Withdrawn", color: "bg-red-100 text-red-700", icon: <AlertTriangle className="h-3 w-3" /> },
  unknown: { label: "Unknown", color: "bg-slate-100 text-slate-500", icon: <Clock className="h-3 w-3" /> },
  parsed: { label: "Parsed", color: "bg-blue-100 text-blue-600", icon: <Clock className="h-3 w-3" /> },
}

export const AUCTION_STATUS_CONFIG: Record<Exclude<AuctionStatusType, "all">, StatusConfigItem & { icon: ReactNode }> = {
  active: { label: "Active", color: "bg-green-100 text-green-800", icon: <CheckCircle2 className="h-3 w-3" /> },
  expired: { label: "Expired", color: "bg-red-100 text-red-800", icon: <Clock className="h-3 w-3" /> },
  unknown: { label: "Unknown", color: "bg-gray-100 text-gray-800", icon: <AlertTriangle className="h-3 w-3" /> },
  sold: { label: "Sold", color: "bg-blue-100 text-blue-800", icon: <CheckCircle2 className="h-3 w-3" /> },
  withdrawn: { label: "Withdrawn", color: "bg-yellow-100 text-yellow-800", icon: <AlertTriangle className="h-3 w-3" /> },
}

export const VALIDATION_CONFIG: Record<NonNullable<ValidationStatus>, StatusConfigItem & { icon: ReactNode }> = {
  approved: { label: "Approved", color: "bg-green-100 text-green-700", icon: <ShieldCheck className="h-3 w-3" /> },
  caution: { label: "Caution", color: "bg-amber-100 text-amber-700", icon: <ShieldAlert className="h-3 w-3" /> },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700", icon: <ShieldX className="h-3 w-3" /> },
  reject: { label: "Rejected", color: "bg-red-100 text-red-700", icon: <ShieldX className="h-3 w-3" /> },
}

// ---------------------------------------------------------------------------
// Column definition interface
// ---------------------------------------------------------------------------

export interface ColumnDef {
  id: string
  label: string
  frozen?: boolean
  frozenIndex?: number
  defaultVisible?: boolean
  alwaysVisible?: boolean
  sortable?: boolean
  sortKey?: SortField
  width: number
  group?: string
  render: (property: Property, ctx: RenderContext) => ReactNode
  exportValue?: (property: Property) => string
}

// ---------------------------------------------------------------------------
// Frozen-column style helper
// ---------------------------------------------------------------------------

export function getFrozenStyles(
  col: ColumnDef,
  isHeader: boolean,
  isSelected: boolean,
  allColumns: ColumnDef[]
) {
  if (!col.frozen) return { style: {} as React.CSSProperties, className: "" }

  const leftOffset = allColumns
    .filter(c => c.frozen && (c.frozenIndex ?? 0) < (col.frozenIndex ?? 0))
    .reduce((sum, c) => sum + c.width, 0)

  const maxFrozenIndex = Math.max(
    ...allColumns.filter(c => c.frozen).map(c => c.frozenIndex ?? 0)
  )
  const isLastFrozen = col.frozenIndex === maxFrozenIndex

  return {
    style: {
      position: "sticky" as const,
      left: `${leftOffset}px`,
      zIndex: isHeader ? 30 : 20,
      minWidth: `${col.width}px`,
      maxWidth: `${col.width}px`,
    },
    className: cn(
      isHeader
        ? "bg-slate-50 dark:bg-slate-800"
        : isSelected
          ? "bg-blue-50 dark:bg-blue-950"
          : "bg-white dark:bg-slate-900",
      isLastFrozen && "shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] dark:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)]"
    ),
  }
}

// ---------------------------------------------------------------------------
// Currency formatting helper
// ---------------------------------------------------------------------------

function fmtCurrency(value: number | null | undefined): string {
  if (value == null) return "-"
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtCurrencyWhole(value: number | null | undefined): string {
  if (value == null) return "-"
  return `$${value.toLocaleString()}`
}

// ---------------------------------------------------------------------------
// ALL 37 COLUMN DEFINITIONS
// ---------------------------------------------------------------------------

export const COLUMN_DEFINITIONS: ColumnDef[] = [
  // =========================================================================
  // FROZEN COLUMNS
  // =========================================================================

  // 1. Checkbox
  {
    id: "checkbox",
    label: "",
    frozen: true,
    frozenIndex: 0,
    width: 52,
    alwaysVisible: true,
    render: (property: Property, ctx: RenderContext) => (
      <button
        onClick={() => ctx.handleSelectProperty(property.id)}
        className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:text-primary transition-colors"
        aria-label={ctx.selectedProperties.has(property.id) ? "Deselect property" : "Select property"}
      >
        {ctx.selectedProperties.has(property.id) ? (
          <CheckSquare className="h-4 w-4 text-primary" />
        ) : (
          <Square className="h-4 w-4 text-slate-400" />
        )}
      </button>
    ),
    // No exportValue - skip in CSV
  },

  // 2. Parcel ID
  {
    id: "parcelId",
    label: "Parcel ID",
    frozen: true,
    frozenIndex: 1,
    width: 160,
    alwaysVisible: true,
    sortable: true,
    sortKey: "parcelId",
    render: (property: Property) => (
      <span className="text-sm font-mono text-slate-700 dark:text-slate-300">
        {property.parcelId}
      </span>
    ),
    exportValue: (p: Property) => p.parcelId,
  },

  // 3. Address
  {
    id: "address",
    label: "Address",
    frozen: true,
    frozenIndex: 2,
    width: 200,
    alwaysVisible: true,
    render: (property: Property) => (
      <div>
        <div className="font-medium text-slate-900 dark:text-slate-100">{property.address}</div>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          {property.city}, {property.state}
        </div>
      </div>
    ),
    exportValue: (p: Property) => p.address,
  },

  // 4. County
  {
    id: "county",
    label: "County",
    frozen: true,
    frozenIndex: 3,
    width: 120,
    alwaysVisible: true,
    sortable: true,
    sortKey: "county",
    render: (property: Property) => (
      <div className="flex items-center gap-1.5">
        <MapPin className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
        <span className="text-sm text-slate-700 dark:text-slate-300">{property.county}</span>
      </div>
    ),
    exportValue: (p: Property) => p.county,
  },

  // =========================================================================
  // DEFAULT VISIBLE COLUMNS - Core Data
  // =========================================================================

  // 5. Total Due
  {
    id: "totalDue",
    label: "Total Due",
    width: 120,
    defaultVisible: true,
    sortable: true,
    sortKey: "totalDue",
    group: "Core Data",
    render: (property: Property) => (
      <div className="flex items-center gap-1">
        <DollarSign className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
        <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
          {property.totalDue.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      </div>
    ),
    exportValue: (p: Property) => p.totalDue.toFixed(2),
  },

  // 6. Type (Property Class)
  {
    id: "type",
    label: "Type",
    width: 100,
    defaultVisible: true,
    group: "Core Data",
    render: (property: Property) => (
      <span className="text-sm text-slate-600 dark:text-slate-400">
        {property.propertyClass || "-"}
      </span>
    ),
    exportValue: (p: Property) => p.propertyClass || "",
  },

  // 7. Year Built
  {
    id: "yearBuilt",
    label: "Year Built",
    width: 90,
    defaultVisible: true,
    group: "Core Data",
    render: (property: Property) => (
      <span className="text-sm text-slate-600 dark:text-slate-400">
        {property.yearBuilt || "-"}
      </span>
    ),
    exportValue: (p: Property) => String(p.yearBuilt || ""),
  },

  // 8. Bed/Bath
  {
    id: "bedBath",
    label: "Bed/Bath",
    width: 90,
    defaultVisible: true,
    group: "Core Data",
    render: (property: Property) => (
      <span className="text-sm text-slate-600 dark:text-slate-400">
        {property.bedrooms && property.bathrooms
          ? `${property.bedrooms}/${property.bathrooms}`
          : "-"}
      </span>
    ),
    exportValue: (p: Property) =>
      p.bedrooms && p.bathrooms
        ? `${p.bedrooms}/${p.bathrooms}`
        : "",
  },

  // 9. Sq Ft
  {
    id: "sqFt",
    label: "Sq Ft",
    width: 100,
    defaultVisible: true,
    group: "Core Data",
    render: (property: Property) => (
      <span className="text-sm text-slate-600 dark:text-slate-400">
        {property.buildingSqft
          ? property.buildingSqft.toLocaleString()
          : "-"}
      </span>
    ),
    exportValue: (p: Property) => String(p.buildingSqft || ""),
  },

  // 10. Assessed Value
  {
    id: "assessedValue",
    label: "Assessed Value",
    width: 130,
    defaultVisible: true,
    sortable: true,
    sortKey: "assessedValue",
    group: "Core Data",
    render: (property: Property) => (
      <span className="text-sm text-slate-600 dark:text-slate-400">
        {property.assessedValue
          ? `$${property.assessedValue.toLocaleString()}`
          : "-"}
      </span>
    ),
    exportValue: (p: Property) =>
      p.assessedValue ? p.assessedValue.toString() : "",
  },

  // 11. Lot Size
  {
    id: "lotSize",
    label: "Lot Size",
    width: 110,
    defaultVisible: true,
    group: "Core Data",
    render: (property: Property) => (
      <span className="text-sm text-slate-600 dark:text-slate-400">
        {property.lotDimensions || property.lotSize || "-"}
      </span>
    ),
    exportValue: (p: Property) =>
      p.lotDimensions || p.lotSize || "",
  },

  // 12. Water
  {
    id: "water",
    label: "Water",
    width: 90,
    defaultVisible: true,
    group: "Core Data",
    render: (property: Property) => (
      <span className="text-sm text-slate-600 dark:text-slate-400">
        {property.waterService || "-"}
      </span>
    ),
    exportValue: (p: Property) => p.waterService || "",
  },

  // 13. Sewer
  {
    id: "sewer",
    label: "Sewer",
    width: 90,
    defaultVisible: true,
    group: "Core Data",
    render: (property: Property) => (
      <span className="text-sm text-slate-600 dark:text-slate-400">
        {property.sewerService || "-"}
      </span>
    ),
    exportValue: (p: Property) => p.sewerService || "",
  },

  // 14. Sale Date
  {
    id: "saleDate",
    label: "Sale Date",
    width: 130,
    defaultVisible: true,
    sortable: true,
    sortKey: "saleDate",
    group: "Core Data",
    render: (property: Property, ctx: RenderContext) => (
      <div className="flex items-center gap-1.5">
        <Calendar className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
        <span className="text-sm text-slate-700 dark:text-slate-300">
          {property.saleType?.toLowerCase() === "repository" ? (
            <span className="text-green-600 dark:text-green-400 font-medium">Available Now</span>
          ) : (
            ctx.formatDate(property.saleDate, ctx.dateFormatPreference)
          )}
        </span>
      </div>
    ),
    exportValue: (p: Property) => p.saleDate,
  },

  // 15. Sale Type
  {
    id: "saleType",
    label: "Sale Type",
    width: 110,
    defaultVisible: true,
    group: "Core Data",
    render: (property: Property) => (
      <span className="inline-flex items-center gap-1 text-sm text-slate-700 dark:text-slate-300">
        <Gavel className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
        {property.saleType}
      </span>
    ),
    exportValue: (p: Property) => p.saleType,
  },

  // 16. Stage (Status)
  {
    id: "stage",
    label: "Stage",
    width: 110,
    defaultVisible: true,
    group: "Core Data",
    render: (property: Property) => {
      const cfg = STATUS_CONFIG[property.status as PropertyStatus]
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
            cfg?.color || "bg-slate-100 text-slate-500"
          )}
        >
          {cfg?.icon || <Clock className="h-3 w-3" />}
          {cfg?.label || property.status}
        </span>
      )
    },
    exportValue: (p: Property) =>
      STATUS_CONFIG[p.status as PropertyStatus]?.label || p.status,
  },

  // 17. Auction Status
  {
    id: "auctionStatus",
    label: "Auction Status",
    width: 130,
    defaultVisible: true,
    group: "Core Data",
    render: (property: Property) => {
      const key = property.auctionStatus as Exclude<AuctionStatusType, "all">
      const cfg = AUCTION_STATUS_CONFIG[key]
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
            cfg?.color || "bg-gray-100 text-gray-800"
          )}
        >
          {cfg?.icon || <AlertTriangle className="h-3 w-3" />}
          {cfg?.label || property.auctionStatus}
        </span>
      )
    },
    exportValue: (p: Property) =>
      AUCTION_STATUS_CONFIG[p.auctionStatus as Exclude<AuctionStatusType, "all">]?.label || p.auctionStatus,
  },

  // 18. Validation
  {
    id: "validation",
    label: "Validation",
    width: 110,
    defaultVisible: true,
    group: "Core Data",
    render: (property: Property) => {
      if (property.validation) {
        const key = property.validation as NonNullable<ValidationStatus>
        const cfg = VALIDATION_CONFIG[key]
        return (
          <span
            className={cn(
              "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
              cfg?.color || "bg-slate-100 text-slate-500"
            )}
          >
            {cfg?.icon}
            {cfg?.label || property.validation}
          </span>
        )
      }
      return (
        <span className="inline-flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
          <Shield className="h-3 w-3" />
          Pending
        </span>
      )
    },
    exportValue: (p: Property) =>
      p.validation
        ? VALIDATION_CONFIG[p.validation as NonNullable<ValidationStatus>]?.label || p.validation
        : "Pending",
  },

  // 19. Regrid
  {
    id: "regrid",
    label: "Regrid",
    width: 100,
    defaultVisible: true,
    group: "Core Data",
    render: (property: Property) =>
      property.hasRegridData ? (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
          <Database className="h-3 w-3" />
          Enriched
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
          <Database className="h-3 w-3" />
          Pending
        </span>
      ),
    exportValue: (p: Property) => (p.hasRegridData ? "Yes" : "No"),
  },

  // =========================================================================
  // NEW COLUMNS - Owner & Valuation (defaultVisible: false)
  // =========================================================================

  // 20. Owner Name
  {
    id: "ownerName",
    label: "Owner Name",
    width: 160,
    defaultVisible: false,
    group: "Owner & Valuation",
    render: (property: Property) => (
      <span className="text-sm text-slate-600 dark:text-slate-400">
        {property.ownerName || "-"}
      </span>
    ),
    exportValue: (p: Property) => p.ownerName || "",
  },

  // 21. Market Value
  {
    id: "marketValue",
    label: "Market Value",
    width: 120,
    defaultVisible: false,
    sortable: true,
    sortKey: "marketValue",
    group: "Owner & Valuation",
    render: (property: Property) => (
      <span className="text-sm text-slate-600 dark:text-slate-400">
        {fmtCurrencyWhole(property.marketValue)}
      </span>
    ),
    exportValue: (p: Property) =>
      p.marketValue ? p.marketValue.toString() : "",
  },

  // 22. Last Sale Price
  {
    id: "lastSalePrice",
    label: "Last Sale Price",
    width: 120,
    defaultVisible: false,
    sortable: true,
    sortKey: "lastSalePrice",
    group: "Owner & Valuation",
    render: (property: Property) => (
      <span className="text-sm text-slate-600 dark:text-slate-400">
        {fmtCurrencyWhole(property.lastSalePrice)}
      </span>
    ),
    exportValue: (p: Property) =>
      p.lastSalePrice ? p.lastSalePrice.toString() : "",
  },

  // 23. Last Sale Date
  {
    id: "lastSaleDate",
    label: "Last Sale Date",
    width: 110,
    defaultVisible: false,
    group: "Owner & Valuation",
    render: (property: Property, ctx: RenderContext) => (
      <span className="text-sm text-slate-600 dark:text-slate-400">
        {property.lastSaleDate
          ? ctx.formatDate(property.lastSaleDate, ctx.dateFormatPreference)
          : "-"}
      </span>
    ),
    exportValue: (p: Property) => p.lastSaleDate || "",
  },

  // 24. Land Value
  {
    id: "landValue",
    label: "Land Value",
    width: 110,
    defaultVisible: false,
    group: "Owner & Valuation",
    render: (property: Property) => (
      <span className="text-sm text-slate-600 dark:text-slate-400">
        {fmtCurrencyWhole(property.landValue)}
      </span>
    ),
    exportValue: (p: Property) =>
      p.landValue ? p.landValue.toString() : "",
  },

  // 25. Improvement Value
  {
    id: "improvementValue",
    label: "Improvement Value",
    width: 130,
    defaultVisible: false,
    group: "Owner & Valuation",
    render: (property: Property) => (
      <span className="text-sm text-slate-600 dark:text-slate-400">
        {fmtCurrencyWhole(property.improvementValue)}
      </span>
    ),
    exportValue: (p: Property) =>
      p.improvementValue ? p.improvementValue.toString() : "",
  },

  // =========================================================================
  // NEW COLUMNS - Investment (defaultVisible: false)
  // =========================================================================

  // 26. Opportunity Zone
  {
    id: "opportunityZone",
    label: "Opp. Zone",
    width: 110,
    defaultVisible: false,
    group: "Investment",
    render: (property: Property) => {
      if (property.opportunityZone == null) {
        return <span className="text-sm text-slate-400 dark:text-slate-500">-</span>
      }
      return property.opportunityZone ? (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
          Yes
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
          No
        </span>
      )
    },
    exportValue: (p: Property) => {
      if (p.opportunityZone == null) return ""
      return p.opportunityZone ? "Yes" : "No"
    },
  },

  // 27. Minimum Bid
  {
    id: "minimumBid",
    label: "Min. Bid",
    width: 120,
    defaultVisible: false,
    sortable: true,
    sortKey: "minimumBid",
    group: "Investment",
    render: (property: Property) => (
      <span className="text-sm text-slate-600 dark:text-slate-400">
        {fmtCurrencyWhole(property.minimumBid)}
      </span>
    ),
    exportValue: (p: Property) =>
      p.minimumBid ? p.minimumBid.toString() : "",
  },

  // 28. School District
  {
    id: "schoolDistrict",
    label: "School District",
    width: 150,
    defaultVisible: false,
    group: "Investment",
    render: (property: Property) => (
      <span className="text-sm text-slate-600 dark:text-slate-400">
        {property.schoolDistrict || "-"}
      </span>
    ),
    exportValue: (p: Property) => p.schoolDistrict || "",
  },

  // 29. Zoning
  {
    id: "zoning",
    label: "Zoning",
    width: 100,
    defaultVisible: false,
    group: "Investment",
    render: (property: Property) => (
      <span className="text-sm text-slate-600 dark:text-slate-400">
        {property.zoning || "-"}
      </span>
    ),
    exportValue: (p: Property) => p.zoning || "",
  },

  // 30. Census Tract
  {
    id: "censusTract",
    label: "Census Tract",
    width: 120,
    defaultVisible: false,
    group: "Investment",
    render: (property: Property) => (
      <span className="text-sm text-slate-600 dark:text-slate-400">
        {property.censusTract || "-"}
      </span>
    ),
    exportValue: (p: Property) => p.censusTract || "",
  },

  // =========================================================================
  // NEW COLUMNS - Lot Details (defaultVisible: false)
  // =========================================================================

  // 31. Stories
  {
    id: "stories",
    label: "Stories",
    width: 80,
    defaultVisible: false,
    group: "Lot Details",
    render: (property: Property) => (
      <span className="text-sm text-slate-600 dark:text-slate-400">
        {property.stories != null ? property.stories : "-"}
      </span>
    ),
    exportValue: (p: Property) => (p.stories != null ? String(p.stories) : ""),
  },

  // 32. Building Count
  {
    id: "buildingCount",
    label: "Buildings",
    width: 110,
    defaultVisible: false,
    group: "Lot Details",
    render: (property: Property) => (
      <span className="text-sm text-slate-600 dark:text-slate-400">
        {property.buildingCount != null ? property.buildingCount : "-"}
      </span>
    ),
    exportValue: (p: Property) =>
      p.buildingCount != null ? String(p.buildingCount) : "",
  },

  // 33. Frontage
  {
    id: "frontage",
    label: "Frontage",
    width: 100,
    defaultVisible: false,
    group: "Lot Details",
    render: (property: Property) => (
      <span className="text-sm text-slate-600 dark:text-slate-400">
        {property.frontage != null
          ? `${property.frontage.toLocaleString()} ft`
          : "-"}
      </span>
    ),
    exportValue: (p: Property) =>
      p.frontage != null ? String(p.frontage) : "",
  },

  // 34. Lot Type
  {
    id: "lotType",
    label: "Lot Type",
    width: 100,
    defaultVisible: false,
    group: "Lot Details",
    render: (property: Property) => (
      <span className="text-sm text-slate-600 dark:text-slate-400">
        {property.lotType || "-"}
      </span>
    ),
    exportValue: (p: Property) => p.lotType || "",
  },

  // 35. Terrain
  {
    id: "terrain",
    label: "Terrain",
    width: 100,
    defaultVisible: false,
    group: "Lot Details",
    render: (property: Property) => (
      <span className="text-sm text-slate-600 dark:text-slate-400">
        {property.terrain || "-"}
      </span>
    ),
    exportValue: (p: Property) => p.terrain || "",
  },

  // 36. Deed Acres
  {
    id: "deedAcres",
    label: "Deed Acres",
    width: 100,
    defaultVisible: false,
    group: "Lot Details",
    render: (property: Property) => (
      <span className="text-sm text-slate-600 dark:text-slate-400">
        {property.deedAcres != null
          ? property.deedAcres.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          : "-"}
      </span>
    ),
    exportValue: (p: Property) =>
      p.deedAcres != null ? p.deedAcres.toFixed(2) : "",
  },

  // =========================================================================
  // ACTIONS COLUMN
  // =========================================================================

  // 37. Actions
  {
    id: "actions",
    label: "Actions",
    width: 180,
    alwaysVisible: true,
    render: (property: Property, ctx: RenderContext) => (
      <div className="flex items-center gap-2">
        {!property.hasRegridData && (
          <button
            onClick={() => ctx.handleScrapeRegrid(property.id)}
            className="min-h-[44px] px-2 flex items-center gap-1 text-sm text-amber-600 hover:text-amber-700 font-medium disabled:opacity-50"
            disabled={ctx.scrapingPropertyId === property.id}
            title="Scrape Regrid data for this property"
          >
            {ctx.scrapingPropertyId === property.id ? (
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
          onClick={() => ctx.router.push(`/report/${property.id}`)}
          className="min-h-[44px] px-2 flex items-center gap-1 text-sm text-primary hover:text-primary/80 font-medium"
        >
          View Report
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => ctx.setDeleteConfirmId(property.id)}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center text-sm text-red-500 hover:text-red-700 font-medium"
          title="Delete property"
          aria-label="Delete property"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    ),
    // No exportValue - skip actions in CSV
  },
]

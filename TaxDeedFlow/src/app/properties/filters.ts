// Filter constants and matching functions for the properties page
// Pure logic - no React or UI imports

import { Property } from "./types"

// --- Filter Option Constants ---

export const PROPERTY_CLASS_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "Residence", label: "Residence" },
  { value: "Lot", label: "Lot" },
  { value: "Commercial", label: "Commercial" },
  { value: "Industrial", label: "Industrial" },
  { value: "Agricultural", label: "Agricultural" },
  { value: "unknown", label: "Unknown" },
]

export const VALIDATION_STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "approved", label: "Approved" },
  { value: "caution", label: "Caution" },
  { value: "rejected", label: "Rejected" },
  { value: "pending", label: "Pending" },
]

export const REGRID_STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "enriched", label: "Enriched" },
  { value: "pending", label: "Pending" },
]

export const TOTAL_DUE_RANGES = [
  { value: "all", label: "All" },
  { value: "0-1000", label: "$0 - $1K" },
  { value: "1000-5000", label: "$1K - $5K" },
  { value: "5000-10000", label: "$5K - $10K" },
  { value: "10000+", label: "$10K+" },
]

export const ASSESSED_VALUE_RANGES = [
  { value: "all", label: "All" },
  { value: "0-25000", label: "$0 - $25K" },
  { value: "25000-50000", label: "$25K - $50K" },
  { value: "50000-100000", label: "$50K - $100K" },
  { value: "100000+", label: "$100K+" },
]

// --- Filter Matching Functions ---

export function matchesPropertyClass(property: Property, filter: string): boolean {
  if (filter === "all") return true
  if (filter === "unknown") return !property.propertyClass
  return property.propertyClass === filter
}

export function matchesValidation(property: Property, filter: string): boolean {
  if (filter === "all") return true
  if (filter === "pending") return !property.validation
  return property.validation === filter
}

export function matchesRegridStatus(property: Property, filter: string): boolean {
  if (filter === "all") return true
  if (filter === "enriched") return property.hasRegridData
  if (filter === "pending") return !property.hasRegridData
  return true
}

export function matchesTotalDueRange(property: Property, filter: string): boolean {
  if (filter === "all") return true
  if (filter.endsWith("+")) {
    const min = parseInt(filter)
    return property.totalDue >= min
  }
  const [min, max] = filter.split("-").map(Number)
  return property.totalDue >= min && property.totalDue < max
}

export function matchesAssessedValueRange(property: Property, filter: string): boolean {
  if (filter === "all") return true
  if (!property.assessedValue) return false
  if (filter.endsWith("+")) {
    const min = parseInt(filter)
    return property.assessedValue >= min
  }
  const [min, max] = filter.split("-").map(Number)
  return property.assessedValue >= min && property.assessedValue < max
}

export function isWithinDateRange(saleDate: string, range: string): boolean {
  if (!saleDate || saleDate === "") return range === "all"
  if (range === "all") return true

  const today = new Date()
  const sale = new Date(saleDate)
  const diffDays = Math.ceil((sale.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  switch (range) {
    case "thisWeek": {
      const startOfWeek = new Date(today)
      startOfWeek.setHours(0, 0, 0, 0)
      startOfWeek.setDate(today.getDate() - today.getDay())
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6)
      endOfWeek.setHours(23, 59, 59, 999)
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

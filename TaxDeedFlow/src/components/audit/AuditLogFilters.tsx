"use client"

import { Search, Filter, X, Calendar } from "lucide-react"
import type { AuditLogFilters as AuditLogFiltersType } from "@/types/audit-log"

interface AuditLogFiltersProps {
  filters: AuditLogFiltersType
  onFiltersChange: (filters: AuditLogFiltersType) => void
  onReset: () => void
  showFilters: boolean
  onToggleFilters: () => void
}

const SEVERITY_OPTIONS = [
  { value: "all", label: "All Severities" },
  { value: "debug", label: "Debug" },
  { value: "info", label: "Info" },
  { value: "warning", label: "Warning" },
  { value: "error", label: "Error" },
  { value: "critical", label: "Critical" },
]

const ENTITY_TYPE_OPTIONS = [
  { value: "all", label: "All Entities" },
  { value: "property", label: "Property" },
  { value: "deal", label: "Deal" },
  { value: "watchlist", label: "Watchlist" },
  { value: "organization", label: "Organization" },
  { value: "user", label: "User" },
  { value: "assignment", label: "Assignment" },
  { value: "report", label: "Report" },
]

const DATE_RANGES = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7days", label: "Last 7 Days" },
  { value: "30days", label: "Last 30 Days" },
  { value: "90days", label: "Last 90 Days" },
]

export function AuditLogFilters({
  filters,
  onFiltersChange,
  onReset,
  showFilters,
  onToggleFilters,
}: AuditLogFiltersProps) {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ ...filters, search: e.target.value })
  }

  const handleSeverityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    onFiltersChange({
      ...filters,
      severity: value === "all" ? undefined : (value as AuditLogFiltersType["severity"]),
    })
  }

  const handleEntityTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    onFiltersChange({
      ...filters,
      entity_type: value === "all" ? undefined : value,
    })
  }

  const handleDateRangeChange = (value: string) => {
    const now = new Date()
    let date_from: string | undefined
    let date_to: string | undefined

    switch (value) {
      case "today":
        date_from = new Date(now.setHours(0, 0, 0, 0)).toISOString()
        date_to = new Date(now.setHours(23, 59, 59, 999)).toISOString()
        break
      case "yesterday":
        const yesterday = new Date(now)
        yesterday.setDate(yesterday.getDate() - 1)
        date_from = new Date(yesterday.setHours(0, 0, 0, 0)).toISOString()
        date_to = new Date(yesterday.setHours(23, 59, 59, 999)).toISOString()
        break
      case "7days":
        date_from = new Date(now.setDate(now.getDate() - 7)).toISOString()
        break
      case "30days":
        date_from = new Date(now.setDate(now.getDate() - 30)).toISOString()
        break
      case "90days":
        date_from = new Date(now.setDate(now.getDate() - 90)).toISOString()
        break
      case "all":
      default:
        date_from = undefined
        date_to = undefined
    }

    onFiltersChange({ ...filters, date_from, date_to })
  }

  const hasActiveFilters =
    filters.search ||
    filters.severity ||
    filters.entity_type ||
    filters.date_from ||
    filters.date_to

  return (
    <div className="mb-6 space-y-4">
      {/* Search and Filter Toggle */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search audit logs..."
            value={filters.search || ""}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={onToggleFilters}
          className={`px-4 py-2 border rounded-lg flex items-center gap-2 transition-colors ${
            showFilters
              ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300"
              : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
          }`}
        >
          <Filter className="h-4 w-4" />
          Filters
          {hasActiveFilters && (
            <span className="ml-1 px-1.5 py-0.5 bg-blue-500 text-white text-xs rounded-full">
              •
            </span>
          )}
        </button>
        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            Reset
          </button>
        )}
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/50 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Severity Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Severity
              </label>
              <select
                value={filters.severity || "all"}
                onChange={handleSeverityChange}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {SEVERITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Entity Type Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Entity Type
              </label>
              <select
                value={filters.entity_type || "all"}
                onChange={handleEntityTypeChange}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {ENTITY_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                <Calendar className="inline h-4 w-4 mr-1" />
                Date Range
              </label>
              <select
                value={
                  filters.date_from
                    ? filters.date_to
                      ? "custom"
                      : "7days"
                    : "all"
                }
                onChange={(e) => handleDateRangeChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {DATE_RANGES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

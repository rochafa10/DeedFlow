"use client"

import {
  Shield,
  AlertTriangle,
  Info,
  AlertCircle,
  AlertOctagon,
  Bug,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  User,
  FileText,
} from "lucide-react"
import { formatDate } from "@/lib/utils"
import type { AuditLogWithDetails } from "@/types/audit-log"

interface AuditLogTableProps {
  logs: AuditLogWithDetails[]
  isLoading: boolean
  error: Error | null
  currentPage: number
  totalPages: number
  totalCount: number
  itemsPerPage: number
  sortField: "created_at" | "severity" | "action" | "entity_type" | null
  sortDirection: "asc" | "desc"
  onSort: (field: "created_at" | "severity" | "action" | "entity_type") => void
  onPageChange: (page: number) => void
}

type SeverityLevel = "debug" | "info" | "warning" | "error" | "critical"

const SEVERITY_CONFIG: Record<
  SeverityLevel,
  { label: string; color: string; icon: React.ReactNode }
> = {
  debug: {
    label: "Debug",
    color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    icon: <Bug className="h-3 w-3" />,
  },
  info: {
    label: "Info",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    icon: <Info className="h-3 w-3" />,
  },
  warning: {
    label: "Warning",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  error: {
    label: "Error",
    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    icon: <AlertCircle className="h-3 w-3" />,
  },
  critical: {
    label: "Critical",
    color: "bg-red-200 text-red-900 dark:bg-red-900/50 dark:text-red-200",
    icon: <AlertOctagon className="h-3 w-3" />,
  },
}

export function AuditLogTable({
  logs,
  isLoading,
  error,
  currentPage,
  totalPages,
  totalCount,
  itemsPerPage,
  sortField,
  sortDirection,
  onSort,
  onPageChange,
}: AuditLogTableProps) {
  const getSortIcon = (field: "created_at" | "severity" | "action" | "entity_type") => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 opacity-50" />
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="h-3 w-3" />
    ) : (
      <ArrowDown className="h-3 w-3" />
    )
  }

  const formatActionDisplay = (action: string) => {
    const parts = action.split(".")
    if (parts.length === 2) {
      const [category, actionName] = parts
      return (
        <span>
          <span className="text-slate-500 dark:text-slate-400">{category}.</span>
          {actionName.replace(/_/g, " ")}
        </span>
      )
    }
    return action.replace(/_/g, " ")
  }

  const formatEntityType = (entityType: string) => {
    return entityType.charAt(0).toUpperCase() + entityType.slice(1)
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
          Error Loading Audit Logs
        </h3>
        <p className="text-slate-600 dark:text-slate-400">{error.message}</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            className="h-16 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <div className="p-12 text-center">
        <Shield className="h-16 w-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
          No Audit Logs Found
        </h3>
        <p className="text-slate-600 dark:text-slate-400">
          No audit log entries match your current filters.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">
                <button
                  onClick={() => onSort("created_at")}
                  className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-100"
                >
                  Timestamp
                  {getSortIcon("created_at")}
                </button>
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">
                <button
                  onClick={() => onSort("severity")}
                  className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-100"
                >
                  Severity
                  {getSortIcon("severity")}
                </button>
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">
                <button
                  onClick={() => onSort("action")}
                  className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-100"
                >
                  Action
                  {getSortIcon("action")}
                </button>
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">
                <button
                  onClick={() => onSort("entity_type")}
                  className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-100"
                >
                  Entity
                  {getSortIcon("entity_type")}
                </button>
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">
                Description
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">
                User
              </th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr
                key={log.id}
                className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                {/* Timestamp */}
                <td className="py-3 px-4 text-sm text-slate-900 dark:text-slate-100">
                  {formatDate(log.created_at)}
                </td>

                {/* Severity */}
                <td className="py-3 px-4">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      SEVERITY_CONFIG[log.severity as SeverityLevel].color
                    }`}
                  >
                    {SEVERITY_CONFIG[log.severity as SeverityLevel].icon}
                    {SEVERITY_CONFIG[log.severity as SeverityLevel].label}
                  </span>
                </td>

                {/* Action */}
                <td className="py-3 px-4 text-sm text-slate-900 dark:text-slate-100 font-mono">
                  {formatActionDisplay(log.action)}
                </td>

                {/* Entity */}
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                    <div>
                      <div className="text-sm text-slate-900 dark:text-slate-100">
                        {formatEntityType(log.entity_type)}
                      </div>
                      {log.entity_id && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                          {log.entity_id.slice(0, 8)}...
                        </div>
                      )}
                    </div>
                  </div>
                </td>

                {/* Description */}
                <td className="py-3 px-4 text-sm text-slate-700 dark:text-slate-300 max-w-md truncate">
                  {log.description}
                </td>

                {/* User */}
                <td className="py-3 px-4">
                  {log.user_id ? (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                      <span className="text-sm text-slate-700 dark:text-slate-300 font-mono">
                        {log.user_id.slice(0, 8)}...
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-slate-500 dark:text-slate-400 italic">
                      System
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
        <div className="text-sm text-slate-600 dark:text-slate-400">
          Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
          {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} entries
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>

          <div className="flex items-center gap-1">
            {[...Array(Math.min(totalPages, 5))].map((_, i) => {
              let pageNum: number
              if (totalPages <= 5) {
                pageNum = i + 1
              } else if (currentPage <= 3) {
                pageNum = i + 1
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i
              } else {
                pageNum = currentPage - 2 + i
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium ${
                    currentPage === pageNum
                      ? "bg-blue-500 text-white"
                      : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                  }`}
                >
                  {pageNum}
                </button>
              )
            })}
          </div>

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

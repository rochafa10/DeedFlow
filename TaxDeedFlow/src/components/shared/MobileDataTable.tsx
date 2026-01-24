"use client"

import { useState } from "react"
import { LayoutGrid, Table as TableIcon } from "lucide-react"

interface MobileDataTableProps {
  children: React.ReactNode
  cardView?: React.ReactNode
  defaultView?: "table" | "card"
  className?: string
}

export function MobileDataTable({
  children,
  cardView,
  defaultView = "table",
  className = "",
}: MobileDataTableProps) {
  const [viewMode, setViewMode] = useState<"table" | "card">(defaultView)

  // If no card view is provided, always show table
  if (!cardView) {
    return (
      <div className={`bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden ${className}`}>
        {children}
      </div>
    )
  }

  return (
    <div className={className}>
      {/* View Toggle - Only show on mobile */}
      <div className="mb-4 flex justify-end md:hidden">
        <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1">
          <button
            onClick={() => setViewMode("table")}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors
              ${viewMode === "table"
                ? "bg-blue-600 text-white"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }
            `}
            aria-label="Table view"
            aria-pressed={viewMode === "table"}
          >
            <TableIcon className="h-4 w-4" />
            <span className="hidden xs:inline">Table</span>
          </button>
          <button
            onClick={() => setViewMode("card")}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors
              ${viewMode === "card"
                ? "bg-blue-600 text-white"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }
            `}
            aria-label="Card view"
            aria-pressed={viewMode === "card"}
          >
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden xs:inline">Cards</span>
          </button>
        </div>
      </div>

      {/* Mobile: Show selected view, Desktop: Always show table */}
      <div className="md:hidden">
        {viewMode === "card" ? (
          cardView
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            {children}
          </div>
        )}
      </div>

      {/* Desktop: Always show table view */}
      <div className="hidden md:block">
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  )
}

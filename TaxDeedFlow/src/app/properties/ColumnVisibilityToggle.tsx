"use client"

import { useState, useRef, useEffect } from "react"
import { SlidersHorizontal, Lock } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ColumnDefinition {
  id: string
  label: string
  group?: string
  alwaysVisible?: boolean
  defaultVisible?: boolean
}

interface ColumnVisibilityToggleProps {
  columns: ColumnDefinition[]
  visibleColumns: Set<string>
  onToggleColumn: (columnId: string) => void
  onResetToDefaults: () => void
}

export function ColumnVisibilityToggle({
  columns,
  visibleColumns,
  onToggleColumn,
  onResetToDefaults,
}: ColumnVisibilityToggleProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return

    function handleMouseDown(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleMouseDown)
    return () => document.removeEventListener("mousedown", handleMouseDown)
  }, [isOpen])

  // Group columns by their group property
  const groupedColumns = columns.reduce<Record<string, ColumnDefinition[]>>(
    (acc, col) => {
      let group: string
      if (col.alwaysVisible) {
        group = "Pinned"
      } else if (col.group) {
        group = col.group
      } else {
        group = "Core Data"
      }
      if (!acc[group]) acc[group] = []
      acc[group].push(col)
      return acc
    },
    {}
  )

  // Order groups: Pinned first, then alphabetical, Core Data last
  const groupOrder = Object.keys(groupedColumns).sort((a, b) => {
    if (a === "Pinned") return -1
    if (b === "Pinned") return 1
    if (a === "Core Data") return -1
    if (b === "Core Data") return 1
    return a.localeCompare(b)
  })

  const visibleCount = columns.filter(
    (c) => visibleColumns.has(c.id) && !c.alwaysVisible
  ).length
  const toggleableCount = columns.filter((c) => !c.alwaysVisible).length

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center justify-center gap-2 px-4 min-h-[44px] rounded-lg border text-sm font-medium transition-colors",
          isOpen
            ? "bg-primary text-white border-primary"
            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700"
        )}
      >
        <SlidersHorizontal className="h-4 w-4" />
        Columns
        {visibleCount < toggleableCount && (
          <span className="ml-1 text-xs opacity-75">
            ({visibleCount}/{toggleableCount})
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-lg bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700 z-50">
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              Toggle Columns
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Choose which columns to display
            </p>
          </div>

          {/* Column groups */}
          <div className="max-h-96 overflow-y-auto py-2">
            {groupOrder.map((group) => (
              <div key={group} className="mb-2">
                {/* Group header */}
                <div className="px-4 py-1.5">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    {group}
                  </span>
                </div>

                {/* Columns in group */}
                {groupedColumns[group].map((col) => {
                  const isChecked = visibleColumns.has(col.id)
                  const isLocked = col.alwaysVisible

                  return (
                    <button
                      key={col.id}
                      onClick={() => {
                        if (!isLocked) onToggleColumn(col.id)
                      }}
                      disabled={isLocked}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-1.5 text-sm transition-colors text-left",
                        isLocked
                          ? "cursor-default text-slate-400 dark:text-slate-500"
                          : "cursor-pointer text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                      )}
                    >
                      {/* Checkbox */}
                      <div
                        className={cn(
                          "h-4 w-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors",
                          isChecked
                            ? isLocked
                              ? "bg-slate-300 dark:bg-slate-600 border-slate-300 dark:border-slate-600"
                              : "bg-primary border-primary"
                            : "border-slate-300 dark:border-slate-600"
                        )}
                      >
                        {isChecked && (
                          <svg
                            className={cn(
                              "h-3 w-3",
                              isLocked
                                ? "text-slate-500 dark:text-slate-400"
                                : "text-white"
                            )}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={3}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </div>

                      {/* Label */}
                      <span className="flex-1 truncate">{col.label}</span>

                      {/* Lock icon for always-visible columns */}
                      {isLocked && (
                        <Lock className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                      )}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>

          {/* Footer with reset */}
          <div className="px-4 py-2.5 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={onResetToDefaults}
              className="text-xs font-medium text-primary hover:text-primary/80 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
            >
              Reset to Defaults
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

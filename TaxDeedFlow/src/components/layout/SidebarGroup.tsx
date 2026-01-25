"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Props for the SidebarGroup component.
 *
 * @property label - The section header text
 * @property collapsed - Whether the sidebar is in collapsed state
 * @property children - The navigation items within this group
 */
export interface SidebarGroupProps {
  label: string
  collapsed: boolean
  children: React.ReactNode
}

/**
 * SidebarGroup - A section group component for organizing sidebar navigation items.
 *
 * Features:
 * - Shows uppercase section header when expanded
 * - Shows subtle separator line when collapsed
 * - Smooth opacity transition for header text
 * - Dark mode compatible
 */
export function SidebarGroup({
  label,
  collapsed,
  children,
}: SidebarGroupProps) {
  return (
    <div className="py-2">
      {/* Section header / separator */}
      <div
        className={cn(
          "mb-2 px-3",
          "transition-all duration-200"
        )}
      >
        {collapsed ? (
          // When collapsed: show a subtle horizontal separator
          <div
            className="h-px bg-slate-200 dark:bg-slate-700 mx-auto"
            role="separator"
            aria-hidden="true"
          />
        ) : (
          // When expanded: show the section label
          <h3
            className={cn(
              "text-xs font-semibold uppercase tracking-wider",
              "text-slate-500 dark:text-slate-400",
              "transition-opacity duration-200"
            )}
          >
            {label}
          </h3>
        )}
      </div>

      {/* Navigation items */}
      <nav className="space-y-1" role="navigation" aria-label={label}>
        {children}
      </nav>
    </div>
  )
}

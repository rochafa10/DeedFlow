"use client"

/**
 * Sidebar - Main sidebar container component
 *
 * Provides the fixed sidebar layout with navigation and collapse toggle.
 * Handles responsive behavior and smooth width transitions.
 *
 * @module components/layout/Sidebar
 * @author Claude Code Agent
 * @date 2026-01-24
 */

import { PanelLeft, PanelLeftClose } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSidebar } from "@/contexts/SidebarContext"
import { SidebarNav } from "./SidebarNav"

/**
 * Sidebar - Fixed sidebar container with collapsible navigation
 *
 * Features:
 * - Fixed position on left side, below header
 * - Smooth width transition between collapsed (64px) and expanded (240px)
 * - Hidden on mobile viewports (sidebar replaced by mobile menu)
 * - Scrollable navigation area
 * - Collapse/expand toggle button at bottom
 * - Full dark mode support
 * - Accessible toggle with 44px minimum touch target
 *
 * @example
 * ```tsx
 * <Sidebar />
 * ```
 */
export function Sidebar() {
  // Get sidebar state and actions from context
  const { isCollapsed, toggleSidebar, isMobile } = useSidebar()

  // Hide sidebar on mobile (mobile uses a different navigation pattern)
  if (isMobile) {
    return null
  }

  return (
    <aside
      className={cn(
        // Fixed positioning: left side, below header
        "fixed left-0 top-16 z-40",
        // Full height minus header (4rem = 64px)
        "h-[calc(100vh-4rem)]",
        // Flex column for nav + toggle layout
        "flex flex-col",
        // Background and border
        "bg-white dark:bg-slate-900",
        "border-r border-slate-200 dark:border-slate-800",
        // Smooth width transition
        "transition-all duration-300 ease-in-out",
        // Width based on collapsed state
        isCollapsed ? "w-16" : "w-60"
      )}
      role="complementary"
      aria-label="Main sidebar navigation"
    >
      {/* Navigation area - scrollable */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <SidebarNav />
      </div>

      {/* Collapse toggle at bottom */}
      <div className="border-t border-slate-200 dark:border-slate-800 p-2">
        <button
          onClick={toggleSidebar}
          className={cn(
            // Base styles - ensure minimum touch target of 44x44px
            "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg",
            "min-h-[44px]",
            // Colors and hover
            "text-slate-600 dark:text-slate-400",
            "hover:bg-slate-100 dark:hover:bg-slate-800",
            "hover:text-slate-900 dark:hover:text-slate-100",
            // Transition
            "transition-colors duration-200",
            // Focus styles for keyboard navigation
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
            "dark:focus-visible:ring-offset-slate-900",
            // Center icon when collapsed
            isCollapsed && "justify-center px-2"
          )}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!isCollapsed}
          type="button"
        >
          {/* Icon - changes based on collapsed state */}
          {isCollapsed ? (
            <PanelLeft
              className="h-5 w-5 flex-shrink-0"
              aria-hidden="true"
            />
          ) : (
            <PanelLeftClose
              className="h-5 w-5 flex-shrink-0"
              aria-hidden="true"
            />
          )}

          {/* Label - hidden when collapsed */}
          <span
            className={cn(
              "text-sm font-medium whitespace-nowrap",
              "transition-opacity duration-200",
              isCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
            )}
          >
            Collapse
          </span>
        </button>
      </div>
    </aside>
  )
}

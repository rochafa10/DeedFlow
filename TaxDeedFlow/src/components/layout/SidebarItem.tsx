"use client"

import * as React from "react"
import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

/**
 * Props for the SidebarItem component.
 *
 * @property href - The navigation destination URL
 * @property icon - A Lucide icon component to display
 * @property label - The text label for the navigation item
 * @property active - Whether this item represents the current page
 * @property collapsed - Whether the sidebar is in collapsed state
 */
export interface SidebarItemProps {
  href: string
  icon: LucideIcon
  label: string
  active: boolean
  collapsed: boolean
}

/**
 * SidebarItem - A navigation item component for the collapsible sidebar.
 *
 * Features:
 * - Shows icon + label when expanded, icon only with tooltip when collapsed
 * - Active state with primary color background
 * - Minimum 44x44px touch target for accessibility
 * - Focus ring for keyboard navigation
 * - Smooth transitions for label opacity
 * - Dark mode compatible
 */
export function SidebarItem({
  href,
  icon: Icon,
  label,
  active,
  collapsed,
}: SidebarItemProps) {
  // The inner content of the navigation item
  const itemContent = (
    <Link
      href={href}
      className={cn(
        // Base styles - ensure minimum touch target of 44x44px
        "flex items-center gap-3 px-3 py-2.5 rounded-lg",
        "min-h-[44px] min-w-[44px]",
        "transition-colors duration-200",
        // Focus styles for keyboard navigation
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        "dark:focus-visible:ring-offset-slate-900",
        // Active state
        active && "bg-primary text-primary-foreground",
        // Inactive state with hover
        !active && [
          "text-slate-600 dark:text-slate-400",
          "hover:bg-slate-100 dark:hover:bg-slate-800",
          "hover:text-slate-900 dark:hover:text-slate-100",
        ],
        // Center icon when collapsed
        collapsed && "justify-center px-2"
      )}
      aria-current={active ? "page" : undefined}
    >
      {/* Icon - always visible */}
      <Icon
        className={cn(
          "h-5 w-5 flex-shrink-0",
          // Ensure icon inherits the correct color
          active ? "text-primary-foreground" : "text-current"
        )}
        aria-hidden="true"
      />

      {/* Label - hidden when collapsed with smooth opacity transition */}
      <span
        className={cn(
          "text-sm font-medium whitespace-nowrap",
          "transition-opacity duration-200",
          collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
        )}
      >
        {label}
      </span>
    </Link>
  )

  // When collapsed, wrap with tooltip to show label on hover
  // Note: TooltipProvider is already provided by SidebarNav parent component
  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {itemContent}
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          {label}
        </TooltipContent>
      </Tooltip>
    )
  }

  // When expanded, render without tooltip
  return itemContent
}

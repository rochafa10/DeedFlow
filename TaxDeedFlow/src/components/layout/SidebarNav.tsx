"use client"

/**
 * SidebarNav - Navigation component for the sidebar
 *
 * Renders navigation groups and items based on the sidebarNavConfig.
 * Handles active state detection and passes collapsed state to children.
 *
 * @module components/layout/SidebarNav
 * @author Claude Code Agent
 * @date 2026-01-24
 */

import { usePathname } from "next/navigation"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useSidebar } from "@/contexts/SidebarContext"
import { sidebarNavConfig, isNavItemActive } from "./sidebarNavConfig"
import { SidebarGroup } from "./SidebarGroup"
import { SidebarItem } from "./SidebarItem"

/**
 * SidebarNav - Main navigation component for the sidebar
 *
 * Features:
 * - Renders navigation groups with section headers
 * - Determines active state based on current pathname
 * - Supports nested route matching for active state
 * - Wraps items in TooltipProvider for performance
 * - Responsive to sidebar collapsed state
 *
 * @example
 * ```tsx
 * <SidebarNav />
 * ```
 */
export function SidebarNav() {
  // Get current pathname for active state detection
  const pathname = usePathname()

  // Get collapsed state from context
  const { isCollapsed } = useSidebar()

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex flex-col gap-2 py-4 px-2">
        {sidebarNavConfig.map((group) => (
          <SidebarGroup
            key={group.group}
            label={group.group}
            collapsed={isCollapsed}
          >
            {group.items.map((item) => (
              <SidebarItem
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={isNavItemActive(item.href, pathname)}
                collapsed={isCollapsed}
              />
            ))}
          </SidebarGroup>
        ))}
      </div>
    </TooltipProvider>
  )
}

/**
 * Sidebar Navigation Configuration
 *
 * Defines the navigation structure for the application sidebar.
 * Groups are rendered as collapsible sections with their contained items.
 *
 * @module components/layout/sidebarNavConfig
 * @author Claude Code Agent
 * @date 2026-01-24
 */

import { LucideIcon } from "lucide-react"
import {
  LayoutDashboard,
  Building2,
  MapPin,
  Gavel,
  Heart,
  GitBranch,
  Layers,
  Workflow,
  Users,
  ScrollText,
  ShieldCheck,
  Settings,
} from "lucide-react"

// ============================================
// Types
// ============================================

/**
 * Single navigation item within a group
 */
export interface NavItem {
  /** Display label for the navigation item */
  label: string
  /** Route path for navigation */
  href: string
  /** Lucide icon component to display */
  icon: LucideIcon
}

/**
 * Group of related navigation items
 */
export interface NavGroup {
  /** Group heading label */
  group: string
  /** Navigation items within this group */
  items: NavItem[]
}

// ============================================
// Navigation Configuration
// ============================================

/**
 * Main sidebar navigation configuration
 *
 * Groups:
 * - Main: Primary navigation (Dashboard, Properties, Counties)
 * - Auctions: Auction-related pages (Auctions, Watchlist)
 * - Operations: Pipeline and batch operations
 * - Admin: Administrative functions
 *
 * @example
 * ```tsx
 * import { sidebarNavConfig } from './sidebarNavConfig'
 *
 * {sidebarNavConfig.map((group) => (
 *   <SidebarGroup key={group.group} title={group.group}>
 *     {group.items.map((item) => (
 *       <SidebarItem key={item.href} {...item} />
 *     ))}
 *   </SidebarGroup>
 * ))}
 * ```
 */
export const sidebarNavConfig: NavGroup[] = [
  {
    group: "Main",
    items: [
      {
        label: "Dashboard",
        href: "/",
        icon: LayoutDashboard,
      },
      {
        label: "Properties",
        href: "/properties",
        icon: Building2,
      },
      {
        label: "Counties",
        href: "/counties",
        icon: MapPin,
      },
    ],
  },
  {
    group: "Auctions",
    items: [
      {
        label: "Auctions",
        href: "/auctions",
        icon: Gavel,
      },
      {
        label: "Watchlist",
        href: "/watchlist",
        icon: Heart,
      },
    ],
  },
  {
    group: "Operations",
    items: [
      {
        label: "Pipeline",
        href: "/pipeline",
        icon: GitBranch,
      },
      {
        label: "Batch Jobs",
        href: "/batch-jobs",
        icon: Layers,
      },
      {
        label: "Orchestration",
        href: "/orchestration",
        icon: Workflow,
      },
    ],
  },
  {
    group: "Admin",
    items: [
      {
        label: "Team",
        href: "/team",
        icon: Users,
      },
      {
        label: "Audit Log",
        href: "/audit-log",
        icon: ScrollText,
      },
      {
        label: "Data Integrity",
        href: "/data-integrity",
        icon: ShieldCheck,
      },
      {
        label: "Settings",
        href: "/settings",
        icon: Settings,
      },
    ],
  },
]

/**
 * Get all navigation items as a flat array
 * Useful for search or keyboard navigation
 */
export function getAllNavItems(): NavItem[] {
  return sidebarNavConfig.flatMap((group) => group.items)
}

/**
 * Find a navigation item by its href
 */
export function findNavItemByHref(href: string): NavItem | undefined {
  return getAllNavItems().find((item) => item.href === href)
}

/**
 * Check if a given path matches a nav item (supports nested routes)
 * @param itemHref - The href of the nav item
 * @param currentPath - The current browser path
 * @returns boolean indicating if the item should be marked as active
 */
export function isNavItemActive(itemHref: string, currentPath: string): boolean {
  // Exact match for root
  if (itemHref === "/") {
    return currentPath === "/"
  }

  // For other paths, check if current path starts with item href
  return currentPath.startsWith(itemHref)
}

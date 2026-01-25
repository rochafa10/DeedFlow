"use client"

/**
 * AppShell - Main application layout wrapper
 *
 * Integrates Header, Sidebar, and main content area with responsive behavior.
 * Handles dynamic margin adjustment based on sidebar state.
 *
 * @module components/layout/AppShell
 * @author Claude Code Agent
 * @date 2026-01-24
 */

import { useSidebar } from "@/contexts/SidebarContext"
import { usePathname } from "next/navigation"
import { Header } from "./Header"
import { Sidebar } from "./Sidebar"
import { cn } from "@/lib/utils"

/**
 * Props for AppShell component
 */
interface AppShellProps {
  /** Child components to render in main content area */
  children: React.ReactNode
}

/**
 * AppShell - Layout wrapper component
 *
 * Features:
 * - Renders Header at the top (fixed)
 * - Renders Sidebar on the left (except on auth pages)
 * - Adjusts main content margin based on sidebar state:
 *   - ml-0 when on mobile (sidebar hidden)
 *   - ml-16 (64px) when sidebar is collapsed
 *   - ml-60 (240px) when sidebar is expanded
 * - Smooth margin transitions for better UX
 * - Full height layout with proper spacing below fixed header
 *
 * @example
 * ```tsx
 * <AppShell>
 *   <div className="p-6">
 *     <h1>Page Content</h1>
 *   </div>
 * </AppShell>
 * ```
 */
export function AppShell({ children }: AppShellProps) {
  // Get sidebar state for margin calculations
  const { isCollapsed, isMobile } = useSidebar()

  // Get current pathname to determine if on auth page
  const pathname = usePathname()

  // Auth pages should not show the sidebar
  // These pages have their own centered layout
  const isAuthPage =
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/forgot-password")

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Fixed header at top */}
      <Header />

      {/* Sidebar - only shown on non-auth pages */}
      {!isAuthPage && <Sidebar />}

      {/* Main content area with dynamic margin */}
      <main
        id="main-content"
        className={cn(
          // Padding top to account for fixed header (h-16 = 4rem = 64px)
          "pt-16",
          // Minimum full height
          "min-h-screen",
          // Smooth transition for margin changes
          "transition-all duration-300 ease-in-out",
          // Dynamic margin based on sidebar state:
          // - No margin on auth pages or mobile (sidebar hidden)
          // - 64px (w-16) when collapsed
          // - 240px (w-60) when expanded
          isAuthPage || isMobile
            ? "ml-0"
            : isCollapsed
              ? "ml-16"
              : "ml-60"
        )}
      >
        {children}
      </main>
    </div>
  )
}

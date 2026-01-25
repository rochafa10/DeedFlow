"use client"

/**
 * SidebarContext
 *
 * Global state management for sidebar collapse/expand functionality.
 * Handles responsive behavior, localStorage persistence, and hydration-safe mounting.
 *
 * @module contexts/SidebarContext
 * @author Claude Code Agent
 * @date 2026-01-24
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react"

// ============================================
// Constants
// ============================================

/** localStorage key for sidebar collapsed state */
const STORAGE_KEY = "taxdeedflow_sidebar_collapsed"

/** Breakpoint for mobile detection (in pixels) */
const MOBILE_BREAKPOINT = 768

// ============================================
// Types
// ============================================

/**
 * SidebarContext state and actions
 */
interface SidebarContextType {
  /** Whether the sidebar is currently collapsed */
  isCollapsed: boolean
  /** Set the collapsed state directly */
  setIsCollapsed: (collapsed: boolean) => void
  /** Toggle between collapsed and expanded states */
  toggleSidebar: () => void
  /** Whether the current viewport is mobile-sized */
  isMobile: boolean
}

// ============================================
// Context
// ============================================

const SidebarContext = createContext<SidebarContextType | null>(null)

// ============================================
// Provider Component
// ============================================

/**
 * SidebarProvider - Manages global sidebar state
 *
 * Features:
 * - Tracks collapsed/expanded state
 * - Persists state to localStorage
 * - Detects mobile viewport
 * - Hydration-safe (uses mounted state to prevent SSR mismatch)
 * - Listens for window resize events
 *
 * @example
 * ```tsx
 * <SidebarProvider>
 *   <App />
 * </SidebarProvider>
 * ```
 */
export function SidebarProvider({ children }: { children: ReactNode }) {
  // Track if component has mounted (for hydration safety)
  const [mounted, setMounted] = useState(false)

  // Sidebar collapsed state
  const [isCollapsed, setIsCollapsedState] = useState(false)

  // Mobile viewport detection
  const [isMobile, setIsMobile] = useState(false)

  /**
   * Initialize state after mount to prevent hydration mismatch
   */
  useEffect(() => {
    setMounted(true)

    // Read initial collapsed state from localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored !== null) {
        setIsCollapsedState(stored === "true")
      }
    } catch {
      // localStorage may not be available (e.g., private browsing)
    }

    // Check initial viewport size
    const checkMobile = () => window.innerWidth < MOBILE_BREAKPOINT
    setIsMobile(checkMobile())

    // On mobile, start collapsed by default
    if (checkMobile()) {
      setIsCollapsedState(true)
    }
  }, [])

  /**
   * Handle window resize for mobile detection
   */
  useEffect(() => {
    if (!mounted) return

    const handleResize = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT
      setIsMobile(mobile)

      // Auto-collapse on mobile, but don't auto-expand on desktop
      // (let user control desktop state)
      if (mobile && !isCollapsed) {
        setIsCollapsedState(true)
      }
    }

    // Debounce resize handler for performance
    let timeoutId: NodeJS.Timeout
    const debouncedResize = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(handleResize, 100)
    }

    window.addEventListener("resize", debouncedResize)

    return () => {
      window.removeEventListener("resize", debouncedResize)
      clearTimeout(timeoutId)
    }
  }, [mounted, isCollapsed])

  /**
   * Set collapsed state and persist to localStorage
   */
  const setIsCollapsed = useCallback((collapsed: boolean) => {
    setIsCollapsedState(collapsed)

    try {
      localStorage.setItem(STORAGE_KEY, String(collapsed))
    } catch {
      // localStorage may not be available
    }
  }, [])

  /**
   * Toggle between collapsed and expanded states
   */
  const toggleSidebar = useCallback(() => {
    setIsCollapsed(!isCollapsed)
  }, [isCollapsed, setIsCollapsed])

  /**
   * Listen for storage events to sync state across tabs
   */
  useEffect(() => {
    if (!mounted) return

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && event.newValue !== null) {
        setIsCollapsedState(event.newValue === "true")
      }
    }

    window.addEventListener("storage", handleStorageChange)

    return () => {
      window.removeEventListener("storage", handleStorageChange)
    }
  }, [mounted])

  // Provide default values during SSR to prevent hydration mismatch
  const contextValue: SidebarContextType = {
    isCollapsed: mounted ? isCollapsed : false,
    setIsCollapsed,
    toggleSidebar,
    isMobile: mounted ? isMobile : false,
  }

  return (
    <SidebarContext.Provider value={contextValue}>
      {children}
    </SidebarContext.Provider>
  )
}

// ============================================
// Custom Hook
// ============================================

/**
 * useSidebar - Access sidebar context
 *
 * Must be used within a SidebarProvider.
 *
 * @throws {Error} If used outside SidebarProvider
 *
 * @example
 * ```tsx
 * const { isCollapsed, toggleSidebar, isMobile } = useSidebar()
 *
 * return (
 *   <button onClick={toggleSidebar}>
 *     {isCollapsed ? 'Expand' : 'Collapse'}
 *   </button>
 * )
 * ```
 */
export function useSidebar(): SidebarContextType {
  const context = useContext(SidebarContext)

  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider")
  }

  return context
}

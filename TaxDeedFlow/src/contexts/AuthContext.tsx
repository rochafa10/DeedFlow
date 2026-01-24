"use client"

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"
import { User, AuthState, LoginCredentials } from "@/types/auth"
import { Organization } from "@/types/team"

// Session timeout configuration (in milliseconds)
// Default: 30 minutes of inactivity
const SESSION_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes
const SESSION_CHECK_INTERVAL_MS = 60 * 1000 // Check every minute
const ACTIVITY_EVENTS = ["mousedown", "keydown", "scroll", "touchstart", "click"]

// Storage keys
const USER_STORAGE_KEY = "taxdeedflow_user"
const LAST_ACTIVITY_KEY = "taxdeedflow_last_activity"
const ORGANIZATION_STORAGE_KEY = "taxdeedflow_organization"

// Demo organization for development
const DEMO_ORGANIZATION: Organization = {
  id: "demo-org-1",
  name: "Demo Investment Firm",
  slug: "demo-firm",
  planType: "enterprise",
  settings: {
    features: {
      shared_watchlists: true,
      deal_pipeline: true,
      audit_log: true,
      advanced_analytics: true,
    },
    limits: {
      max_members: 50,
      max_watchlists: 100,
      max_properties_per_watchlist: 500,
    },
  },
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date(),
}

// Demo user for development (admin)
const DEMO_USER: User = {
  id: "demo-user-1",
  email: "demo@taxdeedflow.com",
  name: "Demo User",
  role: "admin",
  createdAt: new Date(),
  currentOrganizationId: DEMO_ORGANIZATION.id,
  organizationRole: "admin",
}

// Viewer user for testing role-based access control
const VIEWER_USER: User = {
  id: "viewer-user-1",
  email: "viewer@taxdeedflow.com",
  name: "Viewer User",
  role: "viewer",
  createdAt: new Date(),
  currentOrganizationId: DEMO_ORGANIZATION.id,
  organizationRole: "viewer",
}

// Analyst user for testing role-based access control
const ANALYST_USER: User = {
  id: "analyst-user-1",
  email: "analyst@taxdeedflow.com",
  name: "Analyst User",
  role: "analyst",
  createdAt: new Date(),
  currentOrganizationId: DEMO_ORGANIZATION.id,
  organizationRole: "analyst",
}

// Demo credentials (for development only)
const DEMO_CREDENTIALS = {
  email: "demo@taxdeedflow.com",
  password: "demo123",
}

// Viewer credentials for testing
const VIEWER_CREDENTIALS = {
  email: "viewer@taxdeedflow.com",
  password: "viewer123",
}

// Analyst credentials for testing
const ANALYST_CREDENTIALS = {
  email: "analyst@taxdeedflow.com",
  password: "analyst123",
}

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  sessionTimeoutMs: number
  lastActivity: number | null
  currentOrganization: Organization | null
  switchOrganization: (organizationId: string) => Promise<void>
  refreshOrganization: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastActivity, setLastActivity] = useState<number | null>(null)
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null)

  // Update last activity time
  const updateLastActivity = useCallback(() => {
    const now = Date.now()
    setLastActivity(now)
    localStorage.setItem(LAST_ACTIVITY_KEY, now.toString())
  }, [])

  // Check if session has expired
  const checkSessionExpiry = useCallback(() => {
    const storedLastActivity = localStorage.getItem(LAST_ACTIVITY_KEY)
    const storedUser = localStorage.getItem(USER_STORAGE_KEY)

    if (!storedUser || !storedLastActivity) {
      return false
    }

    const lastActivityTime = parseInt(storedLastActivity, 10)
    const now = Date.now()
    const timeSinceActivity = now - lastActivityTime

    if (timeSinceActivity > SESSION_TIMEOUT_MS) {
      console.log("[Auth] Session expired due to inactivity")
      return true
    }

    return false
  }, [])

  // Handle session expiry
  const handleSessionExpiry = useCallback(async () => {
    setUser(null)
    setCurrentOrganization(null)
    localStorage.removeItem(USER_STORAGE_KEY)
    localStorage.removeItem(LAST_ACTIVITY_KEY)
    localStorage.removeItem(ORGANIZATION_STORAGE_KEY)
    console.log("[Auth] Session expired - user logged out")
  }, [])

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = () => {
      try {
        // First check if session has expired
        if (checkSessionExpiry()) {
          handleSessionExpiry()
          setIsLoading(false)
          return
        }

        const storedUser = localStorage.getItem(USER_STORAGE_KEY)
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser)
          setUser({
            ...parsedUser,
            createdAt: new Date(parsedUser.createdAt),
          })

          // Restore organization data if available
          const storedOrganization = localStorage.getItem(ORGANIZATION_STORAGE_KEY)
          if (storedOrganization) {
            const parsedOrganization = JSON.parse(storedOrganization)
            setCurrentOrganization({
              ...parsedOrganization,
              createdAt: new Date(parsedOrganization.createdAt),
              updatedAt: new Date(parsedOrganization.updatedAt),
              deletedAt: parsedOrganization.deletedAt ? new Date(parsedOrganization.deletedAt) : undefined,
            })
          }

          // Restore last activity
          const storedLastActivity = localStorage.getItem(LAST_ACTIVITY_KEY)
          if (storedLastActivity) {
            setLastActivity(parseInt(storedLastActivity, 10))
          } else {
            // If no last activity, set it now
            updateLastActivity()
          }
        }
      } catch (error) {
        console.error("Error checking session:", error)
        localStorage.removeItem(USER_STORAGE_KEY)
        localStorage.removeItem(LAST_ACTIVITY_KEY)
      } finally {
        setIsLoading(false)
      }
    }

    checkSession()
  }, [checkSessionExpiry, handleSessionExpiry, updateLastActivity])

  // Set up activity tracking when user is logged in
  useEffect(() => {
    if (!user) return

    // Update activity on user events
    const handleActivity = () => {
      updateLastActivity()
    }

    // Add event listeners for activity tracking
    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true })
    })

    // Set initial activity
    updateLastActivity()

    return () => {
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, handleActivity)
      })
    }
  }, [user, updateLastActivity])

  // Periodically check for session expiry
  useEffect(() => {
    if (!user) return

    const intervalId = setInterval(() => {
      if (checkSessionExpiry()) {
        handleSessionExpiry()
      }
    }, SESSION_CHECK_INTERVAL_MS)

    return () => {
      clearInterval(intervalId)
    }
  }, [user, checkSessionExpiry, handleSessionExpiry])

  // Listen for storage events to sync logout across tabs
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === USER_STORAGE_KEY) {
        if (event.newValue === null) {
          // User was logged out in another tab
          console.log("[Auth] Detected logout in another tab")
          setUser(null)
          setCurrentOrganization(null)
        } else if (event.newValue) {
          // User was logged in from another tab
          try {
            const parsedUser = JSON.parse(event.newValue)
            console.log("[Auth] Detected login in another tab")
            setUser({
              ...parsedUser,
              createdAt: new Date(parsedUser.createdAt),
            })
          } catch (error) {
            console.error("[Auth] Error parsing user from storage event:", error)
          }
        }
      }

      // Sync organization changes across tabs
      if (event.key === ORGANIZATION_STORAGE_KEY) {
        if (event.newValue === null) {
          setCurrentOrganization(null)
        } else if (event.newValue) {
          try {
            const parsedOrganization = JSON.parse(event.newValue)
            console.log("[Auth] Detected organization change in another tab")
            setCurrentOrganization({
              ...parsedOrganization,
              createdAt: new Date(parsedOrganization.createdAt),
              updatedAt: new Date(parsedOrganization.updatedAt),
              deletedAt: parsedOrganization.deletedAt ? new Date(parsedOrganization.deletedAt) : undefined,
            })
          } catch (error) {
            console.error("[Auth] Error parsing organization from storage event:", error)
          }
        }
      }

      // Also sync last activity across tabs
      if (event.key === LAST_ACTIVITY_KEY && event.newValue) {
        setLastActivity(parseInt(event.newValue, 10))
      }
    }

    window.addEventListener("storage", handleStorageChange)
    return () => {
      window.removeEventListener("storage", handleStorageChange)
    }
  }, [])

  const login = async (credentials: LoginCredentials): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true)

    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500))

      let userToLogin: User | null = null

      // Development: Check against demo credentials (admin)
      if (
        credentials.email === DEMO_CREDENTIALS.email &&
        credentials.password === DEMO_CREDENTIALS.password
      ) {
        userToLogin = DEMO_USER
      }
      // Development: Check against viewer credentials (viewer role)
      else if (
        credentials.email === VIEWER_CREDENTIALS.email &&
        credentials.password === VIEWER_CREDENTIALS.password
      ) {
        userToLogin = VIEWER_USER
      }
      // Development: Check against analyst credentials (analyst role)
      else if (
        credentials.email === ANALYST_CREDENTIALS.email &&
        credentials.password === ANALYST_CREDENTIALS.password
      ) {
        userToLogin = ANALYST_USER
      }

      if (userToLogin) {
        setUser(userToLogin)
        setCurrentOrganization(DEMO_ORGANIZATION)
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userToLogin))
        localStorage.setItem(ORGANIZATION_STORAGE_KEY, JSON.stringify(DEMO_ORGANIZATION))
        updateLastActivity()
        console.log("[Auth] Login successful for:", credentials.email)
        return { success: true }
      }

      // Invalid credentials - show error
      console.log("[Auth] Login failed for:", credentials.email)
      return { success: false, error: "Invalid email or password. Please use the demo credentials." }
    } catch (error) {
      console.error("[Auth] Login error:", error)
      return { success: false, error: "An error occurred during login" }
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    setIsLoading(true)
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 200))
      setUser(null)
      setCurrentOrganization(null)
      setLastActivity(null)
      localStorage.removeItem(USER_STORAGE_KEY)
      localStorage.removeItem(LAST_ACTIVITY_KEY)
      localStorage.removeItem(ORGANIZATION_STORAGE_KEY)
      console.log("[Auth] Logout successful")
    } catch (error) {
      console.error("[Auth] Logout error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const refreshUser = async () => {
    // First check if session has expired
    if (checkSessionExpiry()) {
      await handleSessionExpiry()
      return
    }

    // In production, this would refresh the user from the server
    const storedUser = localStorage.getItem(USER_STORAGE_KEY)
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser)
      setUser({
        ...parsedUser,
        createdAt: new Date(parsedUser.createdAt),
      })
    }
  }

  const switchOrganization = async (organizationId: string) => {
    // First check if session has expired
    if (checkSessionExpiry()) {
      await handleSessionExpiry()
      return
    }

    if (!user) {
      console.error("[Auth] Cannot switch organization: No user logged in")
      return
    }

    try {
      // In production, this would:
      // 1. Verify user has access to this organization via API
      // 2. Fetch organization details from server
      // 3. Update user's currentOrganizationId and organizationRole

      // For demo mode, we only support the demo organization
      if (organizationId === DEMO_ORGANIZATION.id) {
        // Update user with new organization context
        const updatedUser = {
          ...user,
          currentOrganizationId: organizationId,
          organizationRole: user.role, // In demo mode, org role matches user role
        }

        setUser(updatedUser)
        setCurrentOrganization(DEMO_ORGANIZATION)
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser))
        localStorage.setItem(ORGANIZATION_STORAGE_KEY, JSON.stringify(DEMO_ORGANIZATION))
        console.log("[Auth] Switched to organization:", organizationId)
      } else {
        console.error("[Auth] Organization not found:", organizationId)
      }
    } catch (error) {
      console.error("[Auth] Error switching organization:", error)
    }
  }

  const refreshOrganization = async () => {
    // First check if session has expired
    if (checkSessionExpiry()) {
      await handleSessionExpiry()
      return
    }

    if (!user?.currentOrganizationId) {
      setCurrentOrganization(null)
      return
    }

    // In production, this would fetch the organization from the server
    const storedOrganization = localStorage.getItem(ORGANIZATION_STORAGE_KEY)
    if (storedOrganization) {
      const parsedOrganization = JSON.parse(storedOrganization)
      setCurrentOrganization({
        ...parsedOrganization,
        createdAt: new Date(parsedOrganization.createdAt),
        updatedAt: new Date(parsedOrganization.updatedAt),
        deletedAt: parsedOrganization.deletedAt ? new Date(parsedOrganization.deletedAt) : undefined,
      })
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshUser,
        sessionTimeoutMs: SESSION_TIMEOUT_MS,
        lastActivity,
        currentOrganization,
        switchOrganization,
        refreshOrganization,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

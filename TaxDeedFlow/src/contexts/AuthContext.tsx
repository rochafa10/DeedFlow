"use client"

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"
import { User, AuthState, LoginCredentials } from "@/types/auth"

// Session timeout configuration (in milliseconds)
// Default: 30 minutes of inactivity
const SESSION_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes
const SESSION_CHECK_INTERVAL_MS = 60 * 1000 // Check every minute
const ACTIVITY_EVENTS = ["mousedown", "keydown", "scroll", "touchstart", "click"]

// Storage keys
const USER_STORAGE_KEY = "taxdeedflow_user"
const LAST_ACTIVITY_KEY = "taxdeedflow_last_activity"

// Demo user for development (admin)
const DEMO_USER: User = {
  id: "demo-user-1",
  email: "demo@taxdeedflow.com",
  name: "Demo User",
  role: "admin",
  createdAt: new Date(),
}

// Viewer user for testing role-based access control
const VIEWER_USER: User = {
  id: "viewer-user-1",
  email: "viewer@taxdeedflow.com",
  name: "Viewer User",
  role: "viewer",
  createdAt: new Date(),
}

// Analyst user for testing role-based access control
const ANALYST_USER: User = {
  id: "analyst-user-1",
  email: "analyst@taxdeedflow.com",
  name: "Analyst User",
  role: "analyst",
  createdAt: new Date(),
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
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastActivity, setLastActivity] = useState<number | null>(null)

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
    localStorage.removeItem(USER_STORAGE_KEY)
    localStorage.removeItem(LAST_ACTIVITY_KEY)
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
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userToLogin))
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
      setLastActivity(null)
      localStorage.removeItem(USER_STORAGE_KEY)
      localStorage.removeItem(LAST_ACTIVITY_KEY)
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

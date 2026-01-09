"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { User, AuthState, LoginCredentials } from "@/types/auth"

// Demo user for development
const DEMO_USER: User = {
  id: "demo-user-1",
  email: "demo@taxdeedflow.com",
  name: "Demo User",
  role: "admin",
  createdAt: new Date(),
}

// Demo credentials (for development only)
const DEMO_CREDENTIALS = {
  email: "demo@taxdeedflow.com",
  password: "demo123",
}

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = () => {
      try {
        const storedUser = localStorage.getItem("taxdeedflow_user")
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser)
          setUser({
            ...parsedUser,
            createdAt: new Date(parsedUser.createdAt),
          })
        }
      } catch (error) {
        console.error("Error checking session:", error)
        localStorage.removeItem("taxdeedflow_user")
      } finally {
        setIsLoading(false)
      }
    }

    checkSession()
  }, [])

  // Listen for storage events to sync logout across tabs
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "taxdeedflow_user") {
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

      // Development: Check against demo credentials only
      if (
        credentials.email === DEMO_CREDENTIALS.email &&
        credentials.password === DEMO_CREDENTIALS.password
      ) {
        setUser(DEMO_USER)
        localStorage.setItem("taxdeedflow_user", JSON.stringify(DEMO_USER))
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
      localStorage.removeItem("taxdeedflow_user")
      console.log("[Auth] Logout successful")
    } catch (error) {
      console.error("[Auth] Logout error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const refreshUser = async () => {
    // In production, this would refresh the user from the server
    const storedUser = localStorage.getItem("taxdeedflow_user")
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

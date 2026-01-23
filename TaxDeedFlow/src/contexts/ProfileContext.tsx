"use client"

/**
 * ProfileContext
 *
 * Global state management for investment profiles.
 * Provides CRUD operations and active profile tracking.
 *
 * @module contexts/ProfileContext
 * @author Claude Code Agent
 * @date 2026-01-23
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"

// ============================================
// Types
// ============================================

/**
 * Investment Profile structure
 */
export interface InvestmentProfile {
  id: string
  user_id: string
  name: string
  description: string | null
  is_default: boolean
  scoring_weights: {
    location: number
    risk: number
    financial: number
    market: number
    profit: number
  }
  risk_tolerance: "conservative" | "moderate" | "aggressive"
  created_at: string
  updated_at: string
}

/**
 * Create profile data (for new profiles)
 */
export interface CreateProfileData {
  name: string
  description?: string
  scoring_weights: {
    location: number
    risk: number
    financial: number
    market: number
    profit: number
  }
  risk_tolerance: "conservative" | "moderate" | "aggressive"
}

/**
 * Update profile data (for existing profiles)
 */
export interface UpdateProfileData {
  name?: string
  description?: string
  scoring_weights?: {
    location: number
    risk: number
    financial: number
    market: number
    profit: number
  }
  risk_tolerance?: "conservative" | "moderate" | "aggressive"
}

/**
 * Profile Context Type
 */
interface ProfileContextType {
  activeProfile: InvestmentProfile | null
  profiles: InvestmentProfile[]
  isLoading: boolean
  error: string | null
  fetchProfiles: () => Promise<void>
  setActiveProfile: (id: string) => Promise<void>
  createProfile: (data: CreateProfileData) => Promise<InvestmentProfile | null>
  updateProfile: (id: string, data: UpdateProfileData) => Promise<InvestmentProfile | null>
  deleteProfile: (id: string) => Promise<void>
  refreshProfiles: () => Promise<void>
}

// ============================================
// Storage Keys
// ============================================

const ACTIVE_PROFILE_KEY = "taxdeedflow_active_profile"

// ============================================
// Context
// ============================================

const ProfileContext = createContext<ProfileContextType | null>(null)

// ============================================
// Helper Functions
// ============================================

/**
 * Get authentication headers for API requests
 */
function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }

  if (typeof window !== "undefined") {
    try {
      const userToken = localStorage.getItem("taxdeedflow_user")
      if (userToken) {
        headers["X-User-Token"] = userToken
      }

      const csrfToken = localStorage.getItem("taxdeedflow_csrf_token")
      if (csrfToken) {
        headers["X-CSRF-Token"] = csrfToken
      }
    } catch {
      // Silent fail - localStorage may not be available
    }
  }

  return headers
}

// ============================================
// Provider Component
// ============================================

/**
 * ProfileProvider - Manages global profile state
 *
 * Features:
 * - Fetches profiles on mount
 * - Tracks active (default) profile
 * - Provides CRUD operations
 * - Persists active profile to localStorage
 * - Automatic refresh after mutations
 *
 * @example
 * ```tsx
 * <ProfileProvider>
 *   <App />
 * </ProfileProvider>
 * ```
 */
export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<InvestmentProfile[]>([])
  const [activeProfile, setActiveProfileState] = useState<InvestmentProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * Fetch all profiles for the current user
   */
  const fetchProfiles = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/profiles", {
        method: "GET",
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch profiles: ${response.statusText}`)
      }

      const data = await response.json()
      const profilesList = Array.isArray(data) ? data : data.data || []

      setProfiles(profilesList)

      // Find and set the active profile (marked as default)
      const defaultProfile = profilesList.find((p: InvestmentProfile) => p.is_default)
      if (defaultProfile) {
        setActiveProfileState(defaultProfile)
        localStorage.setItem(ACTIVE_PROFILE_KEY, defaultProfile.id)
      } else if (profilesList.length > 0) {
        // Fallback to first profile if no default
        setActiveProfileState(profilesList[0])
        localStorage.setItem(ACTIVE_PROFILE_KEY, profilesList[0].id)
      } else {
        setActiveProfileState(null)
        localStorage.removeItem(ACTIVE_PROFILE_KEY)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load profiles"
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Set a profile as the active (default) profile
   */
  const setActiveProfile = useCallback(async (id: string) => {
    setError(null)

    try {
      const response = await fetch(`/api/profiles/${id}/set-default`, {
        method: "POST",
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        throw new Error(`Failed to set default profile: ${response.statusText}`)
      }

      const result = await response.json()
      const updatedProfile = result.data || result

      // Update local state
      setActiveProfileState(updatedProfile)
      localStorage.setItem(ACTIVE_PROFILE_KEY, updatedProfile.id)

      // Update profiles list to reflect new default
      setProfiles((prev) =>
        prev.map((p) => ({
          ...p,
          is_default: p.id === id,
        }))
      )
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to set active profile"
      setError(errorMessage)
      throw err
    }
  }, [])

  /**
   * Create a new profile
   */
  const createProfile = useCallback(async (data: CreateProfileData): Promise<InvestmentProfile | null> => {
    setError(null)

    try {
      const response = await fetch("/api/profiles", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error(`Failed to create profile: ${response.statusText}`)
      }

      const result = await response.json()
      const newProfile = result.data || result

      // Refresh profiles to get updated list
      await fetchProfiles()

      return newProfile
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create profile"
      setError(errorMessage)
      return null
    }
  }, [fetchProfiles])

  /**
   * Update an existing profile
   */
  const updateProfile = useCallback(async (
    id: string,
    data: UpdateProfileData
  ): Promise<InvestmentProfile | null> => {
    setError(null)

    try {
      const response = await fetch(`/api/profiles/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error(`Failed to update profile: ${response.statusText}`)
      }

      const result = await response.json()
      const updatedProfile = result.data || result

      // Update local state
      setProfiles((prev) =>
        prev.map((p) => (p.id === id ? updatedProfile : p))
      )

      // Update active profile if it was the one updated
      if (activeProfile?.id === id) {
        setActiveProfileState(updatedProfile)
      }

      return updatedProfile
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update profile"
      setError(errorMessage)
      return null
    }
  }, [activeProfile])

  /**
   * Delete a profile (soft delete)
   */
  const deleteProfile = useCallback(async (id: string) => {
    setError(null)

    try {
      const response = await fetch(`/api/profiles/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        throw new Error(`Failed to delete profile: ${response.statusText}`)
      }

      // Refresh profiles to get updated list
      await fetchProfiles()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete profile"
      setError(errorMessage)
      throw err
    }
  }, [fetchProfiles])

  /**
   * Refresh profiles (alias for fetchProfiles)
   */
  const refreshProfiles = useCallback(async () => {
    await fetchProfiles()
  }, [fetchProfiles])

  /**
   * Fetch profiles on mount
   */
  useEffect(() => {
    fetchProfiles()
  }, [fetchProfiles])

  /**
   * Listen for storage events to sync profile changes across tabs
   */
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === ACTIVE_PROFILE_KEY) {
        if (event.newValue) {
          // Active profile changed in another tab - refresh profiles
          fetchProfiles()
        }
      }
    }

    window.addEventListener("storage", handleStorageChange)
    return () => {
      window.removeEventListener("storage", handleStorageChange)
    }
  }, [fetchProfiles])

  return (
    <ProfileContext.Provider
      value={{
        activeProfile,
        profiles,
        isLoading,
        error,
        fetchProfiles,
        setActiveProfile,
        createProfile,
        updateProfile,
        deleteProfile,
        refreshProfiles,
      }}
    >
      {children}
    </ProfileContext.Provider>
  )
}

// ============================================
// Custom Hook
// ============================================

/**
 * useProfile - Access profile context
 *
 * Must be used within a ProfileProvider.
 *
 * @throws {Error} If used outside ProfileProvider
 *
 * @example
 * ```tsx
 * const { activeProfile, profiles, createProfile } = useProfile()
 * ```
 */
export function useProfile() {
  const context = useContext(ProfileContext)
  if (!context) {
    throw new Error("useProfile must be used within a ProfileProvider")
  }
  return context
}

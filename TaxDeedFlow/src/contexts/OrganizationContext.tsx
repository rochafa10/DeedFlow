"use client"

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"
import { useAuth } from "@/contexts/AuthContext"
import {
  Organization,
  OrganizationMember,
  OrganizationSettings,
  InviteMemberRequest,
  UpdateMemberRoleRequest,
  UpdateOrganizationRequest,
  MemberRole,
  MemberStatus,
} from "@/types/team"

// Storage keys
const MEMBERS_STORAGE_KEY = "taxdeedflow_org_members"
const MEMBERS_TIMESTAMP_KEY = "taxdeedflow_org_members_timestamp"
const CACHE_DURATION_MS = 5 * 60 * 1000 // 5 minutes

// Demo members for development
const DEMO_MEMBERS: OrganizationMember[] = [
  {
    id: "member-1",
    organizationId: "demo-org-1",
    userId: "demo-user-1",
    role: "admin",
    status: "active",
    joinedAt: new Date("2024-01-01"),
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date(),
  },
  {
    id: "member-2",
    organizationId: "demo-org-1",
    userId: "analyst-user-1",
    role: "analyst",
    status: "active",
    joinedAt: new Date("2024-01-15"),
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date(),
  },
  {
    id: "member-3",
    organizationId: "demo-org-1",
    userId: "viewer-user-1",
    role: "viewer",
    status: "active",
    joinedAt: new Date("2024-02-01"),
    createdAt: new Date("2024-02-01"),
    updatedAt: new Date(),
  },
]

interface OrganizationContextType {
  members: OrganizationMember[]
  isLoadingMembers: boolean
  memberError: string | null
  fetchMembers: () => Promise<void>
  inviteMember: (request: InviteMemberRequest) => Promise<{ success: boolean; error?: string }>
  updateMemberRole: (memberId: string, role: MemberRole) => Promise<{ success: boolean; error?: string }>
  removeMember: (memberId: string) => Promise<{ success: boolean; error?: string }>
  updateOrganizationSettings: (settings: Partial<OrganizationSettings>) => Promise<{ success: boolean; error?: string }>
  hasFeature: (feature: keyof OrganizationSettings["features"]) => boolean
  canPerformAction: (action: "invite" | "remove" | "modify_settings" | "view_audit_log") => boolean
  getMemberCount: () => number
  getActiveMemberCount: () => number
}

const OrganizationContext = createContext<OrganizationContextType | null>(null)

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { user, currentOrganization, refreshOrganization } = useAuth()
  const [members, setMembers] = useState<OrganizationMember[]>([])
  const [isLoadingMembers, setIsLoadingMembers] = useState(false)
  const [memberError, setMemberError] = useState<string | null>(null)

  // Check if organization has a specific feature enabled
  const hasFeature = useCallback(
    (feature: keyof OrganizationSettings["features"]): boolean => {
      if (!currentOrganization) return false
      return currentOrganization.settings.features[feature] === true
    },
    [currentOrganization]
  )

  // Check if current user can perform an action
  const canPerformAction = useCallback(
    (action: "invite" | "remove" | "modify_settings" | "view_audit_log"): boolean => {
      if (!user || !user.organizationRole) return false

      const role = user.organizationRole

      switch (action) {
        case "invite":
        case "remove":
        case "modify_settings":
          // Only admins can invite, remove members, or modify settings
          return role === "admin"
        case "view_audit_log":
          // Only admins can view audit logs (for compliance)
          return role === "admin"
        default:
          return false
      }
    },
    [user]
  )

  // Get total member count
  const getMemberCount = useCallback((): number => {
    return members.length
  }, [members])

  // Get active member count (excluding pending, suspended, removed)
  const getActiveMemberCount = useCallback((): number => {
    return members.filter((m) => m.status === "active").length
  }, [members])

  // Check if cached members are still valid
  const isCacheValid = useCallback((organizationId: string): boolean => {
    const cached = localStorage.getItem(MEMBERS_STORAGE_KEY)
    const timestamp = localStorage.getItem(MEMBERS_TIMESTAMP_KEY)

    if (!cached || !timestamp) return false

    try {
      const cachedData = JSON.parse(cached)
      const cachedTimestamp = parseInt(timestamp, 10)
      const now = Date.now()

      // Check if cache is for the current organization and not expired
      if (cachedData.organizationId !== organizationId) return false
      if (now - cachedTimestamp > CACHE_DURATION_MS) return false

      return true
    } catch {
      return false
    }
  }, [])

  // Load cached members from localStorage
  const loadCachedMembers = useCallback((organizationId: string): OrganizationMember[] | null => {
    try {
      const cached = localStorage.getItem(MEMBERS_STORAGE_KEY)
      if (!cached) return null

      const cachedData = JSON.parse(cached)
      if (cachedData.organizationId !== organizationId) return null

      // Parse dates
      return cachedData.members.map((m: OrganizationMember) => ({
        ...m,
        joinedAt: m.joinedAt ? new Date(m.joinedAt) : undefined,
        invitationAcceptedAt: m.invitationAcceptedAt ? new Date(m.invitationAcceptedAt) : undefined,
        createdAt: new Date(m.createdAt),
        updatedAt: new Date(m.updatedAt),
      }))
    } catch {
      return null
    }
  }, [])

  // Save members to localStorage cache
  const saveMembersCache = useCallback((organizationId: string, membersData: OrganizationMember[]) => {
    try {
      const cacheData = {
        organizationId,
        members: membersData,
      }
      localStorage.setItem(MEMBERS_STORAGE_KEY, JSON.stringify(cacheData))
      localStorage.setItem(MEMBERS_TIMESTAMP_KEY, Date.now().toString())
    } catch (error) {
      console.error("[OrganizationContext] Error saving members cache:", error)
    }
  }, [])

  // Fetch organization members
  const fetchMembers = useCallback(async () => {
    if (!currentOrganization) {
      setMembers([])
      return
    }

    // Check cache first
    if (isCacheValid(currentOrganization.id)) {
      const cached = loadCachedMembers(currentOrganization.id)
      if (cached) {
        setMembers(cached)
        return
      }
    }

    setIsLoadingMembers(true)
    setMemberError(null)

    try {
      const response = await fetch(`/api/organizations/${currentOrganization.id}/members`, {
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch organization members")
      }

      const data = await response.json()

      // Parse dates
      const parsedMembers = data.members.map((m: OrganizationMember) => ({
        ...m,
        joinedAt: m.joinedAt ? new Date(m.joinedAt) : undefined,
        invitationAcceptedAt: m.invitationAcceptedAt ? new Date(m.invitationAcceptedAt) : undefined,
        createdAt: new Date(m.createdAt),
        updatedAt: new Date(m.updatedAt),
      }))

      setMembers(parsedMembers)
      saveMembersCache(currentOrganization.id, parsedMembers)
    } catch (error) {
      console.error("[OrganizationContext] Error fetching members:", error)
      setMemberError(error instanceof Error ? error.message : "Failed to fetch members")

      // Fall back to demo data if fetch fails
      if (process.env.NODE_ENV === "development") {
        setMembers(DEMO_MEMBERS)
      }
    } finally {
      setIsLoadingMembers(false)
    }
  }, [currentOrganization, isCacheValid, loadCachedMembers, saveMembersCache])

  // Invite a new member
  const inviteMember = useCallback(
    async (request: InviteMemberRequest): Promise<{ success: boolean; error?: string }> => {
      if (!currentOrganization) {
        return { success: false, error: "No organization selected" }
      }

      if (!canPerformAction("invite")) {
        return { success: false, error: "You don't have permission to invite members" }
      }

      try {
        const response = await fetch(`/api/organizations/${currentOrganization.id}/invitations`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(request),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || "Failed to invite member")
        }

        // Refresh members list
        await fetchMembers()

        return { success: true }
      } catch (error) {
        console.error("[OrganizationContext] Error inviting member:", error)
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to invite member",
        }
      }
    },
    [currentOrganization, canPerformAction, fetchMembers]
  )

  // Update member role
  const updateMemberRole = useCallback(
    async (memberId: string, role: MemberRole): Promise<{ success: boolean; error?: string }> => {
      if (!currentOrganization) {
        return { success: false, error: "No organization selected" }
      }

      if (!canPerformAction("remove")) {
        return { success: false, error: "You don't have permission to update member roles" }
      }

      try {
        const response = await fetch(`/api/organizations/${currentOrganization.id}/members`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            memberId,
            role,
          } as UpdateMemberRoleRequest & { memberId: string }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || "Failed to update member role")
        }

        // Refresh members list
        await fetchMembers()

        return { success: true }
      } catch (error) {
        console.error("[OrganizationContext] Error updating member role:", error)
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to update member role",
        }
      }
    },
    [currentOrganization, canPerformAction, fetchMembers]
  )

  // Remove a member
  const removeMember = useCallback(
    async (memberId: string): Promise<{ success: boolean; error?: string }> => {
      if (!currentOrganization) {
        return { success: false, error: "No organization selected" }
      }

      if (!canPerformAction("remove")) {
        return { success: false, error: "You don't have permission to remove members" }
      }

      try {
        const response = await fetch(`/api/organizations/${currentOrganization.id}/members`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ memberId }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || "Failed to remove member")
        }

        // Refresh members list
        await fetchMembers()

        return { success: true }
      } catch (error) {
        console.error("[OrganizationContext] Error removing member:", error)
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to remove member",
        }
      }
    },
    [currentOrganization, canPerformAction, fetchMembers]
  )

  // Update organization settings
  const updateOrganizationSettings = useCallback(
    async (settings: Partial<OrganizationSettings>): Promise<{ success: boolean; error?: string }> => {
      if (!currentOrganization) {
        return { success: false, error: "No organization selected" }
      }

      if (!canPerformAction("modify_settings")) {
        return { success: false, error: "You don't have permission to modify organization settings" }
      }

      try {
        const response = await fetch(`/api/organizations/${currentOrganization.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            settings,
          } as UpdateOrganizationRequest),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || "Failed to update organization settings")
        }

        // Refresh organization data in AuthContext
        await refreshOrganization()

        return { success: true }
      } catch (error) {
        console.error("[OrganizationContext] Error updating settings:", error)
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to update settings",
        }
      }
    },
    [currentOrganization, canPerformAction, refreshOrganization]
  )

  // Load members when organization changes
  useEffect(() => {
    if (currentOrganization) {
      // Load from cache immediately if available
      if (isCacheValid(currentOrganization.id)) {
        const cached = loadCachedMembers(currentOrganization.id)
        if (cached) {
          setMembers(cached)
        }
      }

      // Always fetch fresh data in the background
      fetchMembers()
    } else {
      setMembers([])
      setMemberError(null)
    }
  }, [currentOrganization, fetchMembers, isCacheValid, loadCachedMembers])

  // Demo mode: Use demo members when no API is available
  useEffect(() => {
    if (process.env.NODE_ENV === "development" && currentOrganization && members.length === 0 && !isLoadingMembers) {
      setMembers(DEMO_MEMBERS)
    }
  }, [currentOrganization, members.length, isLoadingMembers])

  const value: OrganizationContextType = {
    members,
    isLoadingMembers,
    memberError,
    fetchMembers,
    inviteMember,
    updateMemberRole,
    removeMember,
    updateOrganizationSettings,
    hasFeature,
    canPerformAction,
    getMemberCount,
    getActiveMemberCount,
  }

  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>
}

// Custom hook to use the OrganizationContext
export function useOrganization() {
  const context = useContext(OrganizationContext)
  if (!context) {
    throw new Error("useOrganization must be used within an OrganizationProvider")
  }
  return context
}

"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type {
  Organization,
  OrganizationMember,
  OrganizationMemberDetailed,
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
  InviteMemberRequest,
  UpdateMemberRoleRequest,
} from "@/types/team"

/**
 * Hook for fetching organization details
 *
 * @param organizationId - The organization ID to fetch
 * @returns Query result with organization data
 */
export function useOrganization(organizationId: string | null) {
  return useQuery<Organization, Error>({
    queryKey: ["organization", organizationId],
    queryFn: async () => {
      if (!organizationId) throw new Error("Organization ID required")

      const response = await fetch(`/api/organizations/${organizationId}`)
      if (!response.ok) {
        throw new Error("Failed to fetch organization")
      }
      return response.json()
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook for fetching organization members
 *
 * @param organizationId - The organization ID
 * @returns Query result with members list
 */
export function useOrganizationMembers(organizationId: string | null) {
  return useQuery<OrganizationMemberDetailed[], Error>({
    queryKey: ["organization", organizationId, "members"],
    queryFn: async () => {
      if (!organizationId) throw new Error("Organization ID required")

      const response = await fetch(`/api/organizations/${organizationId}/members`)
      if (!response.ok) {
        throw new Error("Failed to fetch members")
      }
      return response.json()
    },
    enabled: !!organizationId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

/**
 * Hook for creating a new organization
 *
 * @returns Mutation for creating organization
 */
export function useCreateOrganization() {
  const queryClient = useQueryClient()

  return useMutation<Organization, Error, CreateOrganizationRequest>({
    mutationFn: async (data) => {
      const response = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || "Failed to create organization")
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] })
    },
  })
}

/**
 * Hook for updating an organization
 *
 * @returns Mutation for updating organization
 */
export function useUpdateOrganization() {
  const queryClient = useQueryClient()

  return useMutation<
    Organization,
    Error,
    { organizationId: string; data: UpdateOrganizationRequest }
  >({
    mutationFn: async ({ organizationId, data }) => {
      const response = await fetch(`/api/organizations/${organizationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || "Failed to update organization")
      }

      return response.json()
    },
    onSuccess: (_, { organizationId }) => {
      queryClient.invalidateQueries({ queryKey: ["organization", organizationId] })
      queryClient.invalidateQueries({ queryKey: ["organizations"] })
    },
  })
}

/**
 * Hook for inviting a member to an organization
 *
 * @returns Mutation for inviting member
 */
export function useInviteMember() {
  const queryClient = useQueryClient()

  return useMutation<
    OrganizationMember,
    Error,
    { organizationId: string; data: InviteMemberRequest }
  >({
    mutationFn: async ({ organizationId, data }) => {
      const response = await fetch(`/api/organizations/${organizationId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || "Failed to invite member")
      }

      return response.json()
    },
    onSuccess: (_, { organizationId }) => {
      queryClient.invalidateQueries({ queryKey: ["organization", organizationId, "members"] })
    },
  })
}

/**
 * Hook for updating a member's role
 *
 * @returns Mutation for updating member role
 */
export function useUpdateMemberRole() {
  const queryClient = useQueryClient()

  return useMutation<
    OrganizationMember,
    Error,
    { organizationId: string; memberId: string; data: UpdateMemberRoleRequest }
  >({
    mutationFn: async ({ organizationId, memberId, data }) => {
      const response = await fetch(
        `/api/organizations/${organizationId}/members/${memberId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      )

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || "Failed to update member role")
      }

      return response.json()
    },
    onSuccess: (_, { organizationId }) => {
      queryClient.invalidateQueries({ queryKey: ["organization", organizationId, "members"] })
    },
  })
}

/**
 * Hook for removing a member from an organization
 *
 * @returns Mutation for removing member
 */
export function useRemoveMember() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, { organizationId: string; memberId: string }>({
    mutationFn: async ({ organizationId, memberId }) => {
      const response = await fetch(
        `/api/organizations/${organizationId}/members/${memberId}`,
        {
          method: "DELETE",
        }
      )

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || "Failed to remove member")
      }
    },
    onSuccess: (_, { organizationId }) => {
      queryClient.invalidateQueries({ queryKey: ["organization", organizationId, "members"] })
    },
  })
}

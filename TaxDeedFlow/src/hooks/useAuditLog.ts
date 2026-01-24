"use client"

import { useQuery } from "@tanstack/react-query"
import type {
  AuditLogWithDetails,
  AuditLogsListResponse,
  AuditLogFilters,
  AuditLogStats,
  UserActivitySummary,
  EntityAuditTrail,
} from "@/types/audit-log"

/**
 * Hook for fetching audit logs with filters
 *
 * @param filters - Filters for audit log query
 * @returns Query result with audit logs
 */
export function useAuditLogs(filters?: AuditLogFilters) {
  const queryParams = new URLSearchParams()

  if (filters?.organization_id) queryParams.set("organization_id", filters.organization_id)
  if (filters?.user_id) queryParams.set("user_id", filters.user_id)
  if (filters?.action) queryParams.set("action", filters.action)
  if (filters?.entity_type) queryParams.set("entity_type", filters.entity_type)
  if (filters?.entity_id) queryParams.set("entity_id", filters.entity_id)
  if (filters?.severity) queryParams.set("severity", filters.severity)
  if (filters?.severity_min) queryParams.set("severity_min", filters.severity_min)
  if (filters?.date_from) queryParams.set("date_from", filters.date_from)
  if (filters?.date_to) queryParams.set("date_to", filters.date_to)
  if (filters?.search) queryParams.set("search", filters.search)
  if (filters?.sort_by) queryParams.set("sort_by", filters.sort_by)
  if (filters?.sort_direction) queryParams.set("sort_direction", filters.sort_direction)
  if (filters?.page) queryParams.set("page", String(filters.page))
  if (filters?.limit) queryParams.set("limit", String(filters.limit))

  return useQuery<AuditLogsListResponse, Error>({
    queryKey: ["audit-logs", filters],
    queryFn: async () => {
      const url = `/api/audit-logs?${queryParams.toString()}`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error("Failed to fetch audit logs")
      }

      return response.json()
    },
    staleTime: 30 * 1000, // 30 seconds
  })
}

/**
 * Hook for fetching audit logs for an organization
 *
 * @param organizationId - The organization ID
 * @param filters - Additional filters
 * @returns Query result with organization audit logs
 */
export function useOrganizationAuditLogs(
  organizationId: string | null,
  filters?: Omit<AuditLogFilters, "organization_id">
) {
  return useAuditLogs(
    organizationId
      ? {
          ...filters,
          organization_id: organizationId,
        }
      : undefined
  )
}

/**
 * Hook for fetching audit logs for a specific user
 *
 * @param userId - The user ID
 * @param filters - Additional filters
 * @returns Query result with user audit logs
 */
export function useUserAuditLogs(
  userId: string | null,
  filters?: Omit<AuditLogFilters, "user_id">
) {
  return useAuditLogs(
    userId
      ? {
          ...filters,
          user_id: userId,
        }
      : undefined
  )
}

/**
 * Hook for fetching audit logs for a specific entity
 *
 * @param entityType - The entity type (e.g., 'property', 'deal', 'watchlist')
 * @param entityId - The entity ID
 * @returns Query result with entity audit trail
 */
export function useEntityAuditTrail(entityType: string | null, entityId: string | null) {
  return useQuery<EntityAuditTrail, Error>({
    queryKey: ["audit-trail", entityType, entityId],
    queryFn: async () => {
      if (!entityType || !entityId) {
        throw new Error("Entity type and ID required")
      }

      const response = await fetch(`/api/audit-logs/entity/${entityType}/${entityId}`)

      if (!response.ok) {
        throw new Error("Failed to fetch entity audit trail")
      }

      return response.json()
    },
    enabled: !!entityType && !!entityId,
    staleTime: 1 * 60 * 1000, // 1 minute
  })
}

/**
 * Hook for fetching audit log statistics for an organization
 *
 * @param organizationId - The organization ID
 * @param dateFrom - Start date for statistics
 * @param dateTo - End date for statistics
 * @returns Query result with audit log stats
 */
export function useAuditLogStats(
  organizationId: string | null,
  dateFrom?: string,
  dateTo?: string
) {
  const queryParams = new URLSearchParams()
  if (dateFrom) queryParams.set("date_from", dateFrom)
  if (dateTo) queryParams.set("date_to", dateTo)

  return useQuery<AuditLogStats, Error>({
    queryKey: ["audit-stats", organizationId, dateFrom, dateTo],
    queryFn: async () => {
      if (!organizationId) throw new Error("Organization ID required")

      const url = `/api/organizations/${organizationId}/audit-logs/stats?${queryParams.toString()}`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error("Failed to fetch audit log stats")
      }

      return response.json()
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook for fetching user activity summary
 *
 * @param userId - The user ID
 * @param organizationId - Optional organization context
 * @returns Query result with user activity summary
 */
export function useUserActivitySummary(userId: string | null, organizationId?: string) {
  const queryParams = new URLSearchParams()
  if (organizationId) queryParams.set("organization_id", organizationId)

  return useQuery<UserActivitySummary, Error>({
    queryKey: ["user-activity", userId, organizationId],
    queryFn: async () => {
      if (!userId) throw new Error("User ID required")

      const url = `/api/users/${userId}/activity-summary?${queryParams.toString()}`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error("Failed to fetch user activity summary")
      }

      return response.json()
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

/**
 * Hook for fetching recent audit logs (last 50)
 *
 * @param organizationId - Optional organization filter
 * @param severityMin - Minimum severity level to include
 * @returns Query result with recent audit logs
 */
export function useRecentAuditLogs(organizationId?: string, severityMin?: string) {
  return useAuditLogs({
    organization_id: organizationId,
    severity_min: severityMin as AuditLogFilters["severity_min"],
    sort_by: "created_at",
    sort_direction: "desc",
    limit: 50,
  })
}

/**
 * Hook for fetching critical/error audit logs
 *
 * @param organizationId - The organization ID
 * @returns Query result with critical audit logs
 */
export function useCriticalAuditLogs(organizationId: string | null) {
  return useAuditLogs(
    organizationId
      ? {
          organization_id: organizationId,
          severity_min: "error",
          sort_by: "created_at",
          sort_direction: "desc",
          limit: 100,
        }
      : undefined
  )
}

"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type {
  PipelineStage,
  Deal,
  DealComplete,
  PipelineOverview,
  DealActivity,
  DealWithMetrics,
  PipelineStageWithMetrics,
  CreatePipelineStageRequest,
  UpdatePipelineStageRequest,
  CreateDealRequest,
  UpdateDealRequest,
  MoveDealRequest,
  CreateDealActivityRequest,
  DealFilters,
  DealsListResponse,
  PipelineStats,
} from "@/types/deal-pipeline"

/**
 * Hook for fetching pipeline stages
 *
 * @param organizationId - The organization ID
 * @returns Query result with pipeline stages
 */
export function usePipelineStages(organizationId: string | null) {
  return useQuery<PipelineStageWithMetrics[], Error>({
    queryKey: ["pipeline", "stages", organizationId],
    queryFn: async () => {
      if (!organizationId) throw new Error("Organization ID required")

      const response = await fetch(`/api/organizations/${organizationId}/pipeline/stages`)
      if (!response.ok) {
        throw new Error("Failed to fetch pipeline stages")
      }
      return response.json()
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook for fetching pipeline overview
 *
 * @param organizationId - The organization ID
 * @returns Query result with pipeline overview
 */
export function usePipelineOverview(organizationId: string | null) {
  return useQuery<PipelineOverview[], Error>({
    queryKey: ["pipeline", "overview", organizationId],
    queryFn: async () => {
      if (!organizationId) throw new Error("Organization ID required")

      const response = await fetch(`/api/organizations/${organizationId}/pipeline/overview`)
      if (!response.ok) {
        throw new Error("Failed to fetch pipeline overview")
      }
      return response.json()
    },
    enabled: !!organizationId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 30 * 1000, // Refetch every 30 seconds for real-time updates
  })
}

/**
 * Hook for fetching deals with filters
 *
 * @param organizationId - The organization ID
 * @param filters - Optional filters for deals
 * @returns Query result with deals list
 */
export function useDeals(organizationId: string | null, filters?: DealFilters) {
  const queryParams = new URLSearchParams()
  if (filters?.stage_id) queryParams.set("stage_id", filters.stage_id)
  if (filters?.status) queryParams.set("status", filters.status)
  if (filters?.priority) queryParams.set("priority", filters.priority)
  if (filters?.assigned_to) queryParams.set("assigned_to", filters.assigned_to)
  if (filters?.search) queryParams.set("search", filters.search)
  if (filters?.page) queryParams.set("page", String(filters.page))
  if (filters?.limit) queryParams.set("limit", String(filters.limit))

  return useQuery<DealsListResponse, Error>({
    queryKey: ["deals", organizationId, filters],
    queryFn: async () => {
      if (!organizationId) throw new Error("Organization ID required")

      const url = `/api/organizations/${organizationId}/deals?${queryParams.toString()}`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error("Failed to fetch deals")
      }

      return response.json()
    },
    enabled: !!organizationId,
    staleTime: 1 * 60 * 1000, // 1 minute
  })
}

/**
 * Hook for fetching a single deal
 *
 * @param dealId - The deal ID
 * @returns Query result with deal details
 */
export function useDeal(dealId: string | null) {
  return useQuery<DealWithMetrics, Error>({
    queryKey: ["deal", dealId],
    queryFn: async () => {
      if (!dealId) throw new Error("Deal ID required")

      const response = await fetch(`/api/deals/${dealId}`)
      if (!response.ok) {
        throw new Error("Failed to fetch deal")
      }
      return response.json()
    },
    enabled: !!dealId,
    staleTime: 1 * 60 * 1000, // 1 minute
  })
}

/**
 * Hook for fetching deal activities
 *
 * @param dealId - The deal ID
 * @returns Query result with deal activities
 */
export function useDealActivities(dealId: string | null) {
  return useQuery<DealActivity[], Error>({
    queryKey: ["deal", dealId, "activities"],
    queryFn: async () => {
      if (!dealId) throw new Error("Deal ID required")

      const response = await fetch(`/api/deals/${dealId}/activities`)
      if (!response.ok) {
        throw new Error("Failed to fetch deal activities")
      }
      return response.json()
    },
    enabled: !!dealId,
    staleTime: 30 * 1000, // 30 seconds
  })
}

/**
 * Hook for fetching pipeline statistics
 *
 * @param organizationId - The organization ID
 * @returns Query result with pipeline stats
 */
export function usePipelineStats(organizationId: string | null) {
  return useQuery<PipelineStats, Error>({
    queryKey: ["pipeline", "stats", organizationId],
    queryFn: async () => {
      if (!organizationId) throw new Error("Organization ID required")

      const response = await fetch(`/api/organizations/${organizationId}/pipeline/stats`)
      if (!response.ok) {
        throw new Error("Failed to fetch pipeline stats")
      }
      return response.json()
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook for creating a pipeline stage
 *
 * @returns Mutation for creating stage
 */
export function useCreatePipelineStage() {
  const queryClient = useQueryClient()

  return useMutation<PipelineStage, Error, CreatePipelineStageRequest>({
    mutationFn: async (data) => {
      const response = await fetch(`/api/organizations/${data.organization_id}/pipeline/stages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || "Failed to create pipeline stage")
      }

      return response.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["pipeline", "stages", variables.organization_id],
      })
      queryClient.invalidateQueries({
        queryKey: ["pipeline", "overview", variables.organization_id],
      })
    },
  })
}

/**
 * Hook for creating a deal
 *
 * @returns Mutation for creating deal
 */
export function useCreateDeal() {
  const queryClient = useQueryClient()

  return useMutation<Deal, Error, CreateDealRequest>({
    mutationFn: async (data) => {
      const response = await fetch(`/api/organizations/${data.organization_id}/deals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || "Failed to create deal")
      }

      return response.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["deals", variables.organization_id] })
      queryClient.invalidateQueries({
        queryKey: ["pipeline", "overview", variables.organization_id],
      })
      queryClient.invalidateQueries({
        queryKey: ["pipeline", "stats", variables.organization_id],
      })
    },
  })
}

/**
 * Hook for updating a deal
 *
 * @returns Mutation for updating deal
 */
export function useUpdateDeal() {
  const queryClient = useQueryClient()

  return useMutation<Deal, Error, { dealId: string; data: UpdateDealRequest }>({
    mutationFn: async ({ dealId, data }) => {
      const response = await fetch(`/api/deals/${dealId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || "Failed to update deal")
      }

      return response.json()
    },
    onSuccess: (deal) => {
      queryClient.invalidateQueries({ queryKey: ["deal", deal.id] })
      queryClient.invalidateQueries({ queryKey: ["deals", deal.organizationId] })
      queryClient.invalidateQueries({ queryKey: ["pipeline", "overview", deal.organizationId] })
      queryClient.invalidateQueries({ queryKey: ["pipeline", "stats", deal.organizationId] })
    },
  })
}

/**
 * Hook for moving a deal between stages
 *
 * @returns Mutation for moving deal
 */
export function useMoveDeal() {
  const queryClient = useQueryClient()

  return useMutation<Deal, Error, MoveDealRequest>({
    mutationFn: async (data) => {
      const response = await fetch(`/api/deals/${data.deal_id}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to_stage_id: data.to_stage_id, note: data.note }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || "Failed to move deal")
      }

      return response.json()
    },
    onSuccess: (deal, variables) => {
      queryClient.invalidateQueries({ queryKey: ["deal", variables.deal_id] })
      queryClient.invalidateQueries({ queryKey: ["deal", variables.deal_id, "activities"] })
      queryClient.invalidateQueries({ queryKey: ["deals", deal.organizationId] })
      queryClient.invalidateQueries({ queryKey: ["pipeline", "overview", deal.organizationId] })
    },
  })
}

/**
 * Hook for creating a deal activity
 *
 * @returns Mutation for creating activity
 */
export function useCreateDealActivity() {
  const queryClient = useQueryClient()

  return useMutation<DealActivity, Error, CreateDealActivityRequest>({
    mutationFn: async (data) => {
      const response = await fetch(`/api/deals/${data.deal_id}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || "Failed to create deal activity")
      }

      return response.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["deal", variables.deal_id, "activities"] })
      queryClient.invalidateQueries({ queryKey: ["deal", variables.deal_id] })
    },
  })
}

/**
 * Hook for deleting a deal
 *
 * @returns Mutation for deleting deal
 */
export function useDeleteDeal() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, { dealId: string; organizationId: string }>({
    mutationFn: async ({ dealId }) => {
      const response = await fetch(`/api/deals/${dealId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || "Failed to delete deal")
      }
    },
    onSuccess: (_, { dealId, organizationId }) => {
      queryClient.invalidateQueries({ queryKey: ["deal", dealId] })
      queryClient.invalidateQueries({ queryKey: ["deals", organizationId] })
      queryClient.invalidateQueries({ queryKey: ["pipeline", "overview", organizationId] })
      queryClient.invalidateQueries({ queryKey: ["pipeline", "stats", organizationId] })
    },
  })
}

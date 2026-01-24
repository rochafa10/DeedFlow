"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type {
  Watchlist,
  WatchlistWithStats,
  WatchlistProperty,
  WatchlistPropertyDetailed,
  CreateWatchlistRequest,
  UpdateWatchlistRequest,
  AddToWatchlistRequest,
  UpdateWatchlistPropertyRequest,
  WatchlistFilters,
} from "@/types/watchlist"

/**
 * Hook for fetching user's watchlists
 *
 * @param filters - Optional filters for watchlists
 * @returns Query result with watchlists
 */
export function useWatchlists(filters?: WatchlistFilters) {
  const queryParams = new URLSearchParams()
  if (filters?.organization_id) queryParams.set("organization_id", filters.organization_id)
  if (filters?.visibility) queryParams.set("visibility", filters.visibility)
  if (filters?.is_shared !== undefined)
    queryParams.set("is_shared", String(filters.is_shared))

  return useQuery<WatchlistWithStats[], Error>({
    queryKey: ["watchlists", filters],
    queryFn: async () => {
      const url = `/api/watchlists?${queryParams.toString()}`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error("Failed to fetch watchlists")
      }

      return response.json()
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

/**
 * Hook for fetching a single watchlist
 *
 * @param watchlistId - The watchlist ID
 * @returns Query result with watchlist details
 */
export function useWatchlist(watchlistId: string | null) {
  return useQuery<WatchlistWithStats, Error>({
    queryKey: ["watchlist", watchlistId],
    queryFn: async () => {
      if (!watchlistId) throw new Error("Watchlist ID required")

      const response = await fetch(`/api/watchlists/${watchlistId}`)
      if (!response.ok) {
        throw new Error("Failed to fetch watchlist")
      }
      return response.json()
    },
    enabled: !!watchlistId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

/**
 * Hook for fetching properties in a watchlist
 *
 * @param watchlistId - The watchlist ID
 * @returns Query result with watchlist properties
 */
export function useWatchlistProperties(watchlistId: string | null) {
  return useQuery<WatchlistPropertyDetailed[], Error>({
    queryKey: ["watchlist", watchlistId, "properties"],
    queryFn: async () => {
      if (!watchlistId) throw new Error("Watchlist ID required")

      const response = await fetch(`/api/watchlists/${watchlistId}/properties`)
      if (!response.ok) {
        throw new Error("Failed to fetch watchlist properties")
      }
      return response.json()
    },
    enabled: !!watchlistId,
    staleTime: 1 * 60 * 1000, // 1 minute
  })
}

/**
 * Hook for creating a new watchlist
 *
 * @returns Mutation for creating watchlist
 */
export function useCreateWatchlist() {
  const queryClient = useQueryClient()

  return useMutation<Watchlist, Error, CreateWatchlistRequest>({
    mutationFn: async (data) => {
      const response = await fetch("/api/watchlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || "Failed to create watchlist")
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlists"] })
    },
  })
}

/**
 * Hook for updating a watchlist
 *
 * @returns Mutation for updating watchlist
 */
export function useUpdateWatchlist() {
  const queryClient = useQueryClient()

  return useMutation<
    Watchlist,
    Error,
    { watchlistId: string; data: UpdateWatchlistRequest }
  >({
    mutationFn: async ({ watchlistId, data }) => {
      const response = await fetch(`/api/watchlists/${watchlistId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || "Failed to update watchlist")
      }

      return response.json()
    },
    onSuccess: (_, { watchlistId }) => {
      queryClient.invalidateQueries({ queryKey: ["watchlist", watchlistId] })
      queryClient.invalidateQueries({ queryKey: ["watchlists"] })
    },
  })
}

/**
 * Hook for deleting a watchlist
 *
 * @returns Mutation for deleting watchlist
 */
export function useDeleteWatchlist() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, string>({
    mutationFn: async (watchlistId) => {
      const response = await fetch(`/api/watchlists/${watchlistId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || "Failed to delete watchlist")
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlists"] })
    },
  })
}

/**
 * Hook for adding a property to a watchlist
 *
 * @returns Mutation for adding property
 */
export function useAddToWatchlist() {
  const queryClient = useQueryClient()

  return useMutation<
    WatchlistProperty,
    Error,
    { watchlistId: string; data: AddToWatchlistRequest }
  >({
    mutationFn: async ({ watchlistId, data }) => {
      const response = await fetch(`/api/watchlists/${watchlistId}/properties`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || "Failed to add property to watchlist")
      }

      return response.json()
    },
    onSuccess: (_, { watchlistId }) => {
      queryClient.invalidateQueries({ queryKey: ["watchlist", watchlistId, "properties"] })
      queryClient.invalidateQueries({ queryKey: ["watchlist", watchlistId] })
    },
  })
}

/**
 * Hook for removing a property from a watchlist
 *
 * @returns Mutation for removing property
 */
export function useRemoveFromWatchlist() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, { watchlistId: string; propertyId: string }>({
    mutationFn: async ({ watchlistId, propertyId }) => {
      const response = await fetch(
        `/api/watchlists/${watchlistId}/properties/${propertyId}`,
        {
          method: "DELETE",
        }
      )

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || "Failed to remove property from watchlist")
      }
    },
    onSuccess: (_, { watchlistId }) => {
      queryClient.invalidateQueries({ queryKey: ["watchlist", watchlistId, "properties"] })
      queryClient.invalidateQueries({ queryKey: ["watchlist", watchlistId] })
    },
  })
}

/**
 * Hook for updating a property within a watchlist
 *
 * @returns Mutation for updating watchlist property
 */
export function useUpdateWatchlistProperty() {
  const queryClient = useQueryClient()

  return useMutation<
    WatchlistProperty,
    Error,
    { watchlistId: string; propertyId: string; data: UpdateWatchlistPropertyRequest }
  >({
    mutationFn: async ({ watchlistId, propertyId, data }) => {
      const response = await fetch(
        `/api/watchlists/${watchlistId}/properties/${propertyId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      )

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || "Failed to update watchlist property")
      }

      return response.json()
    },
    onSuccess: (_, { watchlistId }) => {
      queryClient.invalidateQueries({ queryKey: ["watchlist", watchlistId, "properties"] })
    },
  })
}

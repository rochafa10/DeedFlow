"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

/**
 * Property update request payload
 */
export interface PropertyUpdatePayload {
  [fieldName: string]: unknown
  override_reason?: string
}

/**
 * Property update response
 */
interface PropertyUpdateResponse {
  success: boolean
  message?: string
  data?: {
    id: string
    [key: string]: unknown
  }
}

/**
 * Updates a property via PATCH endpoint
 */
async function updateProperty(
  propertyId: string,
  updates: PropertyUpdatePayload
): Promise<PropertyUpdateResponse> {
  const response = await fetch(`/api/properties/${propertyId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updates),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || "Failed to update property")
  }

  return response.json()
}

/**
 * Hook for updating property fields via PATCH endpoint with optimistic updates
 *
 * Provides a mutation function to update property fields with:
 * - Optimistic UI updates (immediate feedback)
 * - Automatic rollback on error
 * - Cache invalidation on success
 * - Comprehensive error handling
 *
 * @param propertyId - The ID of the property to update
 * @returns Mutation object with update function and state
 *
 * @example
 * ```tsx
 * const { updateProperty, isPending, error } = usePropertyUpdate(propertyId)
 *
 * // Update a single field
 * await updateProperty({ total_due: 5000 })
 *
 * // Update multiple fields with reason
 * await updateProperty({
 *   total_due: 5000,
 *   parcel_id: "123-456-789",
 *   override_reason: "Corrected based on county records"
 * })
 *
 * // Handle loading state
 * if (isPending) return <Spinner />
 *
 * // Handle errors
 * if (error) return <ErrorMessage error={error} />
 * ```
 */
export function usePropertyUpdate(propertyId: string) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (updates: PropertyUpdatePayload) =>
      updateProperty(propertyId, updates),

    // Optimistic update: Update the UI immediately before the request completes
    onMutate: async (updates: PropertyUpdatePayload) => {
      // Cancel any outgoing refetches to prevent them from overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: ["property", propertyId] })

      // Snapshot the previous value for rollback
      const previousProperty = queryClient.getQueryData(["property", propertyId])

      // Optimistically update the cache
      queryClient.setQueryData(["property", propertyId], (old: any) => {
        if (!old) return old

        // Merge updates into existing data
        return {
          ...old,
          ...updates,
        }
      })

      // Return context with previous value for rollback
      return { previousProperty }
    },

    // On error, rollback to previous value
    onError: (error, updates, context) => {
      if (context?.previousProperty) {
        queryClient.setQueryData(["property", propertyId], context.previousProperty)
      }
    },

    // On success or error, refetch to ensure we have the latest data
    onSettled: () => {
      // Invalidate property data to refetch from server
      queryClient.invalidateQueries({ queryKey: ["property", propertyId] })
      // Invalidate overrides data to show updated override indicators
      queryClient.invalidateQueries({ queryKey: ["property-overrides", propertyId] })
    },
  })

  return {
    updateProperty: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    isSuccess: mutation.isSuccess,
    error: mutation.error,
    reset: mutation.reset,
  }
}

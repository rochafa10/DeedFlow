"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

/**
 * Property Override Type
 * Represents a user-made modification to a property field
 */
export interface PropertyOverride {
  id: string
  fieldName: string
  originalValue: string
  overrideValue: string
  reason: string | null
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

/**
 * Response from GET /api/properties/[id]/overrides
 */
interface PropertyOverridesResponse {
  data: PropertyOverride[]
  count: number
  source: "database" | "mock"
  error?: string
}

/**
 * Field state for checking if a field has been modified
 */
export interface FieldState {
  isModified: boolean
  originalValue?: string
  overrideValue?: string
  reason?: string | null
}

/**
 * Fetches property overrides from the API
 */
async function fetchPropertyOverrides(propertyId: string): Promise<PropertyOverridesResponse> {
  const response = await fetch(`/api/properties/${propertyId}/overrides`)

  if (!response.ok) {
    throw new Error("Failed to fetch property overrides")
  }

  return response.json()
}

/**
 * Updates a property field via PATCH endpoint
 */
async function updatePropertyField(
  propertyId: string,
  fieldName: string,
  value: unknown,
  reason?: string
): Promise<{ success: boolean }> {
  const response = await fetch(`/api/properties/${propertyId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ [fieldName]: value, override_reason: reason }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || "Failed to update property field")
  }

  return { success: true }
}

/**
 * Reverts a property field override
 */
async function revertPropertyField(
  propertyId: string,
  fieldName: string
): Promise<{ success: boolean }> {
  const response = await fetch(
    `/api/properties/${propertyId}/overrides?field=${fieldName}`,
    {
      method: "DELETE",
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || "Failed to revert property field")
  }

  return { success: true }
}

/**
 * Hook to manage property field overrides (user-made modifications)
 *
 * Provides functionality to:
 * - Fetch active overrides for a property
 * - Update property fields with change tracking
 * - Revert fields to original values
 * - Check modification state of individual fields
 *
 * @param propertyId - The ID of the property to manage overrides for
 * @returns Object with data, loading state, and mutation functions
 *
 * @example
 * ```tsx
 * const { data, isLoading, updateField, revertField, getFieldState } = usePropertyOverrides(propertyId)
 *
 * // Update a field
 * await updateField("total_due", 5000, "Corrected based on county records")
 *
 * // Check if field is modified
 * const fieldState = getFieldState("total_due")
 * if (fieldState.isModified) {
 *   console.log("Original:", fieldState.originalValue)
 *   console.log("Current:", fieldState.overrideValue)
 * }
 *
 * // Revert a field
 * await revertField("total_due")
 * ```
 */
export function usePropertyOverrides(propertyId: string) {
  const queryClient = useQueryClient()

  // Fetch overrides
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<PropertyOverridesResponse, Error>({
    queryKey: ["property-overrides", propertyId],
    queryFn: () => fetchPropertyOverrides(propertyId),
    staleTime: 30 * 1000, // 30 seconds
    enabled: !!propertyId,
  })

  // Update field mutation
  const updateFieldMutation = useMutation({
    mutationFn: ({
      fieldName,
      value,
      reason,
    }: {
      fieldName: string
      value: unknown
      reason?: string
    }) => updatePropertyField(propertyId, fieldName, value, reason),
    onSuccess: () => {
      // Invalidate and refetch overrides
      queryClient.invalidateQueries({ queryKey: ["property-overrides", propertyId] })
      // Invalidate property data to show updated values
      queryClient.invalidateQueries({ queryKey: ["property", propertyId] })
    },
  })

  // Revert field mutation
  const revertFieldMutation = useMutation({
    mutationFn: (fieldName: string) => revertPropertyField(propertyId, fieldName),
    onSuccess: () => {
      // Invalidate and refetch overrides
      queryClient.invalidateQueries({ queryKey: ["property-overrides", propertyId] })
      // Invalidate property data to show original values
      queryClient.invalidateQueries({ queryKey: ["property", propertyId] })
    },
  })

  /**
   * Updates a property field and tracks the change
   * @param fieldName - Name of the field to update
   * @param value - New value for the field
   * @param reason - Optional reason for the change
   */
  const updateField = async (
    fieldName: string,
    value: unknown,
    reason?: string
  ) => {
    return updateFieldMutation.mutateAsync({ fieldName, value, reason })
  }

  /**
   * Reverts a field to its original value
   * @param fieldName - Name of the field to revert
   */
  const revertField = async (fieldName: string) => {
    return revertFieldMutation.mutateAsync(fieldName)
  }

  /**
   * Gets the modification state of a specific field
   * @param fieldName - Name of the field to check
   * @returns Field state with modification status and values
   */
  const getFieldState = (fieldName: string): FieldState => {
    if (!data?.data) {
      return { isModified: false }
    }

    const override = data.data.find((o) => o.fieldName === fieldName)

    if (!override) {
      return { isModified: false }
    }

    return {
      isModified: true,
      originalValue: override.originalValue,
      overrideValue: override.overrideValue,
      reason: override.reason,
    }
  }

  return {
    data: data?.data || [],
    count: data?.count || 0,
    isLoading,
    error,
    refetch,
    updateField,
    revertField,
    getFieldState,
    isUpdating: updateFieldMutation.isPending,
    isReverting: revertFieldMutation.isPending,
  }
}

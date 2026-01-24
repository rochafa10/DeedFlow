import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/client"

/**
 * GET /api/properties/[id]/overrides
 * Returns all active overrides for a property with change history
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const propertyId = params.id

  try {
    const supabase = createServerClient()

    if (!supabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      )
    }

    // Fetch active overrides using the helper function
    const { data: overrides, error: overridesError } = await supabase
      .rpc("get_property_overrides", {
        p_property_id: propertyId
      })

    if (overridesError) {
      console.error("[API Property Overrides] Database error:", overridesError)
      return NextResponse.json(
        { error: "Database error", message: overridesError.message },
        { status: 500 }
      )
    }

    // Transform to frontend-friendly format
    const transformedOverrides = (overrides || []).map((override: {
      override_id: string
      field_name: string
      original_value: string
      override_value: string
      override_reason: string | null
      created_by: string | null
      created_at: string
      updated_at: string
    }) => ({
      id: override.override_id,
      fieldName: override.field_name,
      originalValue: override.original_value,
      overrideValue: override.override_value,
      reason: override.override_reason,
      createdBy: override.created_by,
      createdAt: override.created_at,
      updatedAt: override.updated_at,
    }))

    return NextResponse.json({
      data: transformedOverrides,
      count: transformedOverrides.length,
      source: "database",
    })
  } catch (error) {
    console.error("[API Property Overrides] Server error:", error)
    return NextResponse.json(
      { error: "Server error", message: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/properties/[id]/overrides?field=field_name
 * Reverts a property field override, restoring the original value
 * Marks the override as inactive to preserve change history
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const propertyId = params.id
  const { searchParams } = new URL(request.url)
  const fieldName = searchParams.get("field")

  // Validate required field parameter
  if (!fieldName) {
    return NextResponse.json(
      { error: "Missing required parameter", message: "field parameter is required" },
      { status: 400 }
    )
  }

  try {
    const supabase = createServerClient()

    if (!supabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      )
    }

    // Call the revert function
    const { data: reverted, error: revertError } = await supabase
      .rpc("revert_property_override", {
        p_property_id: propertyId,
        p_field_name: fieldName
      })

    if (revertError) {
      console.error("[API Property Overrides DELETE] Database error:", revertError)
      return NextResponse.json(
        { error: "Database error", message: revertError.message },
        { status: 500 }
      )
    }

    // Check if override was found and reverted
    if (!reverted) {
      return NextResponse.json(
        { error: "Override not found", message: `No active override found for field '${fieldName}'` },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Successfully reverted override for field '${fieldName}'`,
      fieldName,
      propertyId,
    })
  } catch (error) {
    console.error("[API Property Overrides DELETE] Server error:", error)
    return NextResponse.json(
      { error: "Server error", message: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}

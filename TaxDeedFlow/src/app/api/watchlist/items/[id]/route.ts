import { NextRequest, NextResponse } from "next/server"
import { validateApiAuth, unauthorizedResponse, forbiddenResponse } from "@/lib/auth/api-auth"
import { validateCsrf, csrfErrorResponse } from "@/lib/auth/csrf"
import { createServerClient } from "@/lib/supabase/client"

/**
 * GET /api/watchlist/items/[id]
 * Returns a single watchlist item with full details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const itemId = params.id

  try {
    const supabase = createServerClient()

    if (!supabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      )
    }

    // Fetch watchlist item with related data
    const { data: item, error: itemError } = await supabase
      .from("watchlist_items")
      .select(`
        *,
        watchlists (
          id,
          name,
          user_id
        ),
        properties (
          id,
          parcel_id,
          property_address,
          total_due,
          county_id,
          sale_date,
          auction_status
        )
      `)
      .eq("id", itemId)
      .single()

    if (itemError) {
      if (itemError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Watchlist item not found" },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { error: "Database error", message: itemError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: item,
      source: "database",
    })
  } catch (error) {
    return NextResponse.json(
      { error: "Server error", message: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/watchlist/items/[id]
 * Updates a watchlist item (max_bid, notes) - requires authentication and CSRF validation
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // CSRF Protection: Validate request origin
  const csrfResult = await validateCsrf(request)
  if (!csrfResult.valid) {
    return csrfErrorResponse(csrfResult.error)
  }

  // Validate authentication
  const authResult = await validateApiAuth(request)

  if (!authResult.authenticated) {
    return unauthorizedResponse(authResult.error)
  }

  // Only admin and analyst can update watchlist items
  if (authResult.user?.role === "viewer") {
    return forbiddenResponse("Viewers cannot update watchlist items.")
  }

  const itemId = params.id

  try {
    const body = await request.json()

    const supabase = createServerClient()

    if (!supabase) {
      // Demo mode - just return success with updated data
      return NextResponse.json({
        data: {
          id: itemId,
          ...body,
          updated_at: new Date().toISOString(),
        },
        message: "Watchlist item updated (demo mode)",
        source: "mock",
      })
    }

    // Check if item exists first
    const { data: existingItem, error: fetchError } = await supabase
      .from("watchlist_items")
      .select("id")
      .eq("id", itemId)
      .single()

    if (fetchError || !existingItem) {
      return NextResponse.json(
        { error: "Watchlist item not found" },
        { status: 404 }
      )
    }

    // Prepare update data - only allow specific fields to be updated
    const updateData: {
      max_bid?: number
      notes?: string
      updated_at: string
    } = {
      updated_at: new Date().toISOString(),
    }

    if (body.max_bid !== undefined) {
      updateData.max_bid = body.max_bid
    }

    if (body.notes !== undefined) {
      updateData.notes = body.notes
    }

    // Update the watchlist item
    const { data, error } = await supabase
      .from("watchlist_items")
      .update(updateData)
      .eq("id", itemId)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: "Database error", message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data,
      message: "Watchlist item updated successfully",
      source: "database",
    })
  } catch (error) {
    return NextResponse.json(
      { error: "Server error", message: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/watchlist/items/[id]
 * Removes a property from a watchlist - requires authentication and CSRF validation
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // CSRF Protection: Validate request origin
  const csrfResult = await validateCsrf(request)
  if (!csrfResult.valid) {
    return csrfErrorResponse(csrfResult.error)
  }

  // Validate authentication
  const authResult = await validateApiAuth(request)

  if (!authResult.authenticated) {
    return unauthorizedResponse(authResult.error)
  }

  // Only admin and analyst can delete watchlist items
  if (authResult.user?.role === "viewer") {
    return forbiddenResponse("Viewers cannot remove items from watchlists.")
  }

  const itemId = params.id

  try {
    const supabase = createServerClient()

    if (!supabase) {
      // Demo mode - just return success
      return NextResponse.json({
        success: true,
        message: "Watchlist item removed (demo mode)",
        source: "mock",
      })
    }

    // Delete the watchlist item
    const { error } = await supabase
      .from("watchlist_items")
      .delete()
      .eq("id", itemId)

    if (error) {
      return NextResponse.json(
        { error: "Database error", message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Property removed from watchlist successfully",
    })
  } catch (error) {
    return NextResponse.json(
      { error: "Server error", message: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}

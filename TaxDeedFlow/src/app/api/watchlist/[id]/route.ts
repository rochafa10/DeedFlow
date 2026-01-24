import { NextRequest, NextResponse } from "next/server"
import { validateApiAuth, unauthorizedResponse, forbiddenResponse } from "@/lib/auth/api-auth"
import { validateCsrf, csrfErrorResponse } from "@/lib/auth/csrf"
import { createServerClient } from "@/lib/supabase/client"

/**
 * GET /api/watchlist/[id]
 * Returns a single watchlist with summary data and item counts
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const watchlistId = params.id

  // Validate authentication
  const authResult = await validateApiAuth(request)

  if (!authResult.authenticated) {
    return unauthorizedResponse(authResult.error)
  }

  try {
    const supabase = createServerClient()

    if (!supabase) {
      // Demo mode - return mock watchlist
      return NextResponse.json({
        data: {
          watchlist_id: watchlistId,
          user_id: authResult.user?.id,
          name: "High Priority",
          description: "Properties ready for bidding",
          color: "#3b82f6",
          item_count: 5,
          urgent_count: 2,
          high_count: 3,
          medium_count: 0,
          low_count: 0,
          next_auction_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        source: "mock",
      })
    }

    // Fetch watchlist from Supabase using the summary view
    const { data: watchlist, error: watchlistError } = await supabase
      .from("vw_watchlist_summary")
      .select("*")
      .eq("watchlist_id", watchlistId)
      .eq("user_id", authResult.user?.id)
      .single()

    if (watchlistError) {
      if (watchlistError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Watchlist not found" },
          { status: 404 }
        )
      }
      console.error("[API Watchlist Detail] Database error:", watchlistError)
      return NextResponse.json(
        { error: "Database error", message: watchlistError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: watchlist,
      source: "database",
    })
  } catch (error) {
    console.error("[API Watchlist Detail] Server error:", error)
    return NextResponse.json(
      { error: "Server error", message: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/watchlist/[id]
 * Update watchlist name, description, or color - requires authentication and CSRF validation
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const watchlistId = params.id

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

  // Only admin and analyst can update watchlists (viewers can read only)
  if (authResult.user?.role === "viewer") {
    return forbiddenResponse("Viewers cannot update watchlists.")
  }

  try {
    const body = await request.json()

    // Validate at least one field is provided
    if (!body.name && !body.description && !body.color) {
      return NextResponse.json(
        {
          error: "Validation error",
          message: "At least one field (name, description, color) must be provided.",
        },
        { status: 400 }
      )
    }

    // Validate name if provided
    if (body.name !== undefined && (typeof body.name !== "string" || body.name.trim() === "")) {
      return NextResponse.json(
        {
          error: "Validation error",
          message: "Watchlist name must be a non-empty string.",
        },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    if (!supabase) {
      // Demo mode - just return success with updated data
      return NextResponse.json({
        data: {
          id: watchlistId,
          user_id: authResult.user?.id,
          name: body.name || "High Priority",
          description: body.description || "Properties ready for bidding",
          color: body.color || "#3b82f6",
          updated_at: new Date().toISOString(),
        },
        message: "Watchlist updated (demo mode)",
        source: "mock",
      })
    }

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (body.name !== undefined) {
      updateData.name = body.name.trim()
    }
    if (body.description !== undefined) {
      updateData.description = body.description
    }
    if (body.color !== undefined) {
      updateData.color = body.color
    }

    // Update watchlist in Supabase
    const { data, error } = await supabase
      .from("watchlists")
      .update(updateData)
      .eq("id", watchlistId)
      .eq("user_id", authResult.user?.id)
      .select()
      .single()

    if (error) {
      console.error("[API Watchlist Detail] Update error:", error)

      // Handle unique constraint violation
      if (error.code === "23505") {
        return NextResponse.json(
          {
            error: "Duplicate watchlist",
            message: "A watchlist with this name already exists.",
          },
          { status: 409 }
        )
      }

      // Handle not found (no rows matched)
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Watchlist not found" },
          { status: 404 }
        )
      }

      return NextResponse.json(
        {
          error: "Database error",
          message: error.message,
        },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: "Watchlist not found or permission denied" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      data,
      message: "Watchlist updated successfully",
      source: "database",
    })
  } catch (error) {
    console.error("[API Watchlist Detail] Server error:", error)
    return NextResponse.json(
      {
        error: "Server error",
        message: "An unexpected error occurred",
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/watchlist/[id]
 * Delete a watchlist and all its items - requires authentication and CSRF validation
 * Note: Items are automatically deleted due to ON DELETE CASCADE constraint
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const watchlistId = params.id

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

  // Only admin and analyst can delete watchlists (viewers can read only)
  if (authResult.user?.role === "viewer") {
    return forbiddenResponse("Viewers cannot delete watchlists.")
  }

  try {
    const supabase = createServerClient()

    if (!supabase) {
      // Demo mode - just return success
      return NextResponse.json({
        message: "Watchlist deleted (demo mode)",
        source: "mock",
      })
    }

    // Delete watchlist from Supabase (items will cascade delete)
    const { error } = await supabase
      .from("watchlists")
      .delete()
      .eq("id", watchlistId)
      .eq("user_id", authResult.user?.id)

    if (error) {
      console.error("[API Watchlist Detail] Delete error:", error)

      // Handle not found
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Watchlist not found" },
          { status: 404 }
        )
      }

      return NextResponse.json(
        {
          error: "Database error",
          message: error.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: "Watchlist deleted successfully",
      source: "database",
    })
  } catch (error) {
    console.error("[API Watchlist Detail] Server error:", error)
    return NextResponse.json(
      {
        error: "Server error",
        message: "An unexpected error occurred",
      },
      { status: 500 }
    )
  }
}

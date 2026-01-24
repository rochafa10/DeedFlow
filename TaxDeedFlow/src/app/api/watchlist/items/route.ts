import { NextRequest, NextResponse } from "next/server"
import { validateApiAuth, unauthorizedResponse, forbiddenResponse } from "@/lib/auth/api-auth"
import { validateCsrf, csrfErrorResponse } from "@/lib/auth/csrf"
import { createServerClient } from "@/lib/supabase/client"

/**
 * GET /api/watchlist/items
 * Returns a list of watchlist items
 * Optional query params: watchlist_id
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()

    if (!supabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      )
    }

    // Get optional watchlist_id filter from query params
    const { searchParams } = new URL(request.url)
    const watchlistId = searchParams.get("watchlist_id")

    // Build query
    let query = supabase
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
          address,
          total_due,
          county_id
        )
      `, { count: "exact" })
      .order("created_at", { ascending: false })

    // Apply watchlist_id filter if provided
    if (watchlistId) {
      query = query.eq("watchlist_id", watchlistId)
    }

    const { data, error, count } = await query

    if (error) {
      console.error("[API Watchlist Items] Database error:", error)
      return NextResponse.json(
        {
          error: "Database error",
          message: error.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: data ?? [],
      count: count ?? 0,
      source: "database",
    })
  } catch (error) {
    console.error("[API Watchlist Items] Server error:", error)
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
 * POST /api/watchlist/items
 * Add a property to a watchlist - requires authentication and CSRF validation
 */
export async function POST(request: NextRequest) {
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

  // Only admin and analyst can create watchlist items
  if (authResult.user?.role === "viewer") {
    return forbiddenResponse("Viewers cannot add items to watchlists.")
  }

  try {
    const body = await request.json()

    // Validate required fields
    if (!body.watchlist_id || !body.property_id) {
      return NextResponse.json(
        {
          error: "Validation error",
          message: "watchlist_id and property_id are required",
        },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    if (!supabase) {
      // Demo mode - just return success with mock ID
      return NextResponse.json({
        data: {
          id: `item-${Date.now()}`,
          ...body,
          created_at: new Date().toISOString(),
        },
        message: "Watchlist item created (demo mode)",
        source: "mock",
      }, { status: 201 })
    }

    // Check if item already exists
    const { data: existing } = await supabase
      .from("watchlist_items")
      .select("id")
      .eq("watchlist_id", body.watchlist_id)
      .eq("property_id", body.property_id)
      .single()

    if (existing) {
      return NextResponse.json(
        {
          error: "Conflict",
          message: "Property is already in this watchlist",
        },
        { status: 409 }
      )
    }

    // Insert the new watchlist item
    const { data, error } = await supabase
      .from("watchlist_items")
      .insert([body])
      .select()
      .single()

    if (error) {
      console.error("[API Watchlist Items] Insert error:", error)
      return NextResponse.json(
        {
          error: "Database error",
          message: error.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data,
      message: "Property added to watchlist successfully",
      source: "database",
    }, { status: 201 })
  } catch (error) {
    console.error("[API Watchlist Items] Server error:", error)
    return NextResponse.json(
      {
        error: "Server error",
        message: "An unexpected error occurred",
      },
      { status: 500 }
    )
  }
}

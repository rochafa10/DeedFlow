import { NextRequest, NextResponse } from "next/server"
import { validateApiAuth, unauthorizedResponse, forbiddenResponse } from "@/lib/auth/api-auth"
import { validateCsrf, csrfErrorResponse } from "@/lib/auth/csrf"
import { createServerClient } from "@/lib/supabase/client"

/**
 * GET /api/watchlist
 * Returns a list of watchlists for the authenticated user
 */
export async function GET(request: NextRequest) {
  // Validate authentication
  const authResult = await validateApiAuth(request)

  if (!authResult.authenticated) {
    return unauthorizedResponse(authResult.error)
  }

  try {
    const supabase = createServerClient()

    if (!supabase) {
      // Demo mode - return mock watchlists
      return NextResponse.json({
        data: [
          {
            watchlist_id: "watchlist-1",
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
          {
            watchlist_id: "watchlist-2",
            user_id: authResult.user?.id,
            name: "Research Needed",
            description: "Properties requiring further investigation",
            color: "#f59e0b",
            item_count: 8,
            urgent_count: 0,
            high_count: 2,
            medium_count: 4,
            low_count: 2,
            next_auction_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
        count: 2,
        source: "mock",
      })
    }

    // Fetch watchlists from Supabase using the summary view
    const { data, error, count } = await supabase
      .from("vw_watchlist_summary")
      .select("*", { count: "exact" })
      .eq("user_id", authResult.user?.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[API Watchlist] Database error:", error)
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
    console.error("[API Watchlist] Server error:", error)
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
 * POST /api/watchlist
 * Create a new watchlist - requires authentication and CSRF validation
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

  // Only admin and analyst can create watchlists (viewers can read only)
  if (authResult.user?.role === "viewer") {
    return forbiddenResponse("Viewers cannot create watchlists.")
  }

  try {
    const body = await request.json()

    // Validate required fields
    if (!body.name || typeof body.name !== "string") {
      return NextResponse.json(
        {
          error: "Validation error",
          message: "Watchlist name is required.",
        },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    if (!supabase) {
      // Demo mode - just return success with mock ID
      return NextResponse.json({
        data: {
          id: `watchlist-${Date.now()}`,
          user_id: authResult.user?.id,
          name: body.name,
          description: body.description || null,
          color: body.color || "#3b82f6",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        message: "Watchlist created (demo mode)",
        source: "mock",
      }, { status: 201 })
    }

    // Insert new watchlist into Supabase
    const { data, error } = await supabase
      .from("watchlists")
      .insert([
        {
          user_id: authResult.user?.id,
          name: body.name,
          description: body.description || null,
          color: body.color || "#3b82f6",
        },
      ])
      .select()
      .single()

    if (error) {
      console.error("[API Watchlist] Insert error:", error)

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
      message: "Watchlist created successfully",
      source: "database",
    }, { status: 201 })
  } catch (error) {
    console.error("[API Watchlist] Server error:", error)
    return NextResponse.json(
      {
        error: "Server error",
        message: "An unexpected error occurred",
      },
      { status: 500 }
    )
  }
}

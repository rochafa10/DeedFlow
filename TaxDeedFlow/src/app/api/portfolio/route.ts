import { NextRequest, NextResponse } from "next/server"
import { validateApiAuth, unauthorizedResponse, forbiddenResponse } from "@/lib/auth/api-auth"
import { validateCsrf, csrfErrorResponse } from "@/lib/auth/csrf"
import { createServerClient } from "@/lib/supabase/client"

/**
 * GET /api/portfolio
 * Returns a list of portfolio purchases
 */
export async function GET() {
  try {
    const supabase = createServerClient()

    if (!supabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      )
    }

    // Fetch portfolio purchases from Supabase with property information
    const { data, error, count } = await supabase
      .from("portfolio_purchases")
      .select(`
        *,
        properties (
          id,
          parcel_id,
          address,
          counties (
            county_name,
            state_code
          )
        )
      `, { count: "exact" })
      .is("deleted_at", null)
      .order("purchase_date", { ascending: false })
      .limit(100)

    if (error) {
      console.error("[API Portfolio] Database error:", error)
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
    console.error("[API Portfolio] Server error:", error)
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
 * POST /api/portfolio
 * Create a new portfolio purchase - requires authentication and CSRF validation
 */
export async function POST(request: NextRequest) {
  // CSRF Protection: Validate request origin
  const csrfResult = await validateCsrf(request)
  if (!csrfResult.valid) {
    console.log("[API Portfolio] CSRF validation failed:", csrfResult.error)
    return csrfErrorResponse(csrfResult.error)
  }

  // Validate authentication
  const authResult = await validateApiAuth(request)

  if (!authResult.authenticated) {
    return unauthorizedResponse(authResult.error)
  }

  // Only admin and analyst can create portfolio purchases
  if (authResult.user?.role === "viewer") {
    return forbiddenResponse("Viewers cannot create portfolio purchases.")
  }

  try {
    const body = await request.json()

    const supabase = createServerClient()

    if (!supabase) {
      // Demo mode - just return success with mock ID
      return NextResponse.json({
        data: {
          id: `purchase-${Date.now()}`,
          ...body,
          user_id: authResult.user!.id,
          created_at: new Date().toISOString(),
        },
        message: "Portfolio purchase created (demo mode)",
        source: "mock",
      })
    }

    // Insert with user_id from authenticated session
    const { data, error } = await supabase
      .from("portfolio_purchases")
      .insert([{
        ...body,
        user_id: authResult.user!.id,
      }])
      .select(`
        *,
        properties (
          id,
          parcel_id,
          address,
          counties (
            county_name,
            state_code
          )
        )
      `)
      .single()

    if (error) {
      console.error("[API Portfolio] Insert error:", error)
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
      message: "Portfolio purchase created successfully",
      source: "database",
    })
  } catch (error) {
    console.error("[API Portfolio] Server error:", error)
    return NextResponse.json(
      {
        error: "Server error",
        message: "An unexpected error occurred",
      },
      { status: 500 }
    )
  }
}

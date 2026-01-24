import { NextRequest, NextResponse } from "next/server"
import { validateApiAuth, unauthorizedResponse, forbiddenResponse } from "@/lib/auth/api-auth"
import { validateCsrf, csrfErrorResponse } from "@/lib/auth/csrf"
import { createServerClient } from "@/lib/supabase/client"

/**
 * GET /api/properties
 * Returns a list of properties
 *
 * Note: Properties are PUBLIC DATA (tax sales are public records).
 * Organization scoping happens at the watchlist/deal/assignment level.
 * This endpoint is accessible to all users for browsing public auction data.
 *
 * Query parameters:
 * - limit: number (default: 100, max: 500)
 * - offset: number (default: 0)
 * - county_id: string (filter by county UUID)
 * - sale_status: string (filter by status: upcoming, sold, unsold, withdrawn)
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

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const limit = Math.min(Number(searchParams.get("limit")) || 100, 500)
    const offset = Number(searchParams.get("offset")) || 0
    const countyId = searchParams.get("county_id")
    const saleStatus = searchParams.get("sale_status")

    // Build query
    let query = supabase
      .from("properties")
      .select(`
        *,
        counties (
          county_name,
          state_code
        )
      `, { count: "exact" })
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (countyId) {
      query = query.eq("county_id", countyId)
    }
    if (saleStatus) {
      query = query.eq("sale_status", saleStatus)
    }

    const { data, error, count } = await query

    if (error) {
      console.error("[API Properties] Database error:", error)
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
      total: count ?? 0,
      source: "database",
    })
  } catch (error) {
    console.error("[API Properties] Server error:", error)
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
 * POST /api/properties
 * Create a new property - requires authentication and CSRF validation
 *
 * Note: While properties are public data, creation is restricted to
 * authenticated users for data quality and audit purposes.
 */
export async function POST(request: NextRequest) {
  // CSRF Protection: Validate request origin
  const csrfResult = await validateCsrf(request)
  if (!csrfResult.valid) {
    console.log("[API Properties] CSRF validation failed:", csrfResult.error)
    return csrfErrorResponse(csrfResult.error)
  }

  // Validate authentication
  const authResult = await validateApiAuth(request)

  if (!authResult.authenticated) {
    return unauthorizedResponse(authResult.error)
  }

  // Only admin and analyst can create properties
  if (authResult.user?.role === "viewer") {
    return forbiddenResponse("Viewers cannot create properties.")
  }

  try {
    const body = await request.json()

    const supabase = createServerClient()

    if (!supabase) {
      // Demo mode - just return success with mock ID
      return NextResponse.json({
        data: {
          id: `prop-${Date.now()}`,
          ...body,
          created_at: new Date().toISOString(),
        },
        message: "Property created (demo mode)",
        source: "mock",
      })
    }

    const { data, error } = await supabase
      .from("properties")
      .insert([body])
      .select()
      .single()

    if (error) {
      console.error("[API Properties] Insert error:", error)
      return NextResponse.json(
        {
          error: "Database error",
          message: error.message,
        },
        { status: 500 }
      )
    }

    // Log property creation with user context for audit purposes
    console.log("[API Properties] Property created:", {
      property_id: data.id,
      created_by: authResult.user?.email,
      user_role: authResult.user?.role,
    })

    return NextResponse.json({
      data,
      message: "Property created successfully",
      source: "database",
    })
  } catch (error) {
    console.error("[API Properties] Server error:", error)
    return NextResponse.json(
      {
        error: "Server error",
        message: "An unexpected error occurred",
      },
      { status: 500 }
    )
  }
}

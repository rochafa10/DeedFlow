import { NextRequest, NextResponse } from "next/server"
import { validateApiAuth, unauthorizedResponse } from "@/lib/auth/api-auth"
import { validateCsrf, csrfErrorResponse } from "@/lib/auth/csrf"
import { createServerClient } from "@/lib/supabase/client"

/**
 * GET /api/recently-viewed
 * Returns a list of recently viewed properties for the authenticated user
 */
export async function GET(request: NextRequest) {
  // Validate authentication
  const authResult = await validateApiAuth(request)

  if (!authResult.authenticated) {
    return unauthorizedResponse(authResult.error)
  }

  const userId = authResult.user?.id

  if (!userId) {
    return unauthorizedResponse("User ID not found in authentication token")
  }

  try {
    const supabase = createServerClient()

    if (!supabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      )
    }

    // Get limit from query params (default to 20)
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "20", 10)

    // Fetch recently viewed properties using the helper function
    const { data, error } = await supabase
      .rpc("get_recently_viewed_properties", {
        p_user_id: userId,
        p_limit: limit,
      })

    if (error) {
      console.error("[API Recently Viewed] Database error:", error)
      return NextResponse.json(
        {
          error: "Database error",
          message: error.message,
        },
        { status: 500 }
      )
    }

    // Transform database format to API format (snake_case to camelCase)
    const transformedProperties = (data || []).map((property: {
      viewed_property_id: string
      property_id: string
      parcel_id: string
      property_address: string | null
      city: string | null
      state_code: string
      total_due: number | null
      sale_date: string | null
      viewed_at: string
    }) => ({
      id: property.viewed_property_id,
      userId: userId,
      propertyId: property.property_id,
      parcelId: property.parcel_id,
      propertyAddress: property.property_address,
      city: property.city,
      stateCode: property.state_code,
      totalDue: property.total_due,
      saleDate: property.sale_date,
      viewedAt: property.viewed_at,
    }))

    return NextResponse.json({
      data: transformedProperties,
      count: transformedProperties.length,
      source: "database",
    })
  } catch (error) {
    console.error("[API Recently Viewed] Server error:", error)
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
 * POST /api/recently-viewed
 * Track a property view - requires authentication and CSRF validation
 */
export async function POST(request: NextRequest) {
  // CSRF Protection: Validate request origin
  const csrfResult = await validateCsrf(request)
  if (!csrfResult.valid) {
    console.log("[API Recently Viewed] CSRF validation failed:", csrfResult.error)
    return csrfErrorResponse(csrfResult.error)
  }

  // Validate authentication
  const authResult = await validateApiAuth(request)

  if (!authResult.authenticated) {
    return unauthorizedResponse(authResult.error)
  }

  // All authenticated users can track property views
  const userId = authResult.user?.id

  if (!userId) {
    return unauthorizedResponse("User ID not found in authentication token")
  }

  try {
    const body = await request.json()

    // Validate required fields
    if (!body.propertyId || typeof body.propertyId !== "string") {
      return NextResponse.json(
        {
          error: "Validation error",
          message: "Property ID is required and must be a string",
        },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    if (!supabase) {
      // Demo mode - just return success with mock ID
      return NextResponse.json(
        {
          data: {
            id: `view-${Date.now()}`,
            userId: userId,
            propertyId: body.propertyId,
            viewedAt: new Date().toISOString(),
          },
          message: "Property view tracked (demo mode)",
          source: "mock",
        },
        { status: 201 }
      )
    }

    // Use the upsert helper function to track the view
    const { data: viewRecordId, error } = await supabase
      .rpc("upsert_recently_viewed_property", {
        p_user_id: userId,
        p_property_id: body.propertyId,
      })

    if (error) {
      console.error("[API Recently Viewed] Insert error:", error)
      return NextResponse.json(
        {
          error: "Database error",
          message: error.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        data: {
          id: viewRecordId,
          userId: userId,
          propertyId: body.propertyId,
          viewedAt: new Date().toISOString(),
        },
        message: "Property view tracked successfully",
        source: "database",
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("[API Recently Viewed] Server error:", error)
    return NextResponse.json(
      {
        error: "Server error",
        message: "An unexpected error occurred",
      },
      { status: 500 }
    )
  }
}

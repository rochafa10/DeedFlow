import { NextRequest, NextResponse } from "next/server"
import { validateApiAuth, unauthorizedResponse, forbiddenResponse } from "@/lib/auth/api-auth"
import { createServerClient } from "@/lib/supabase/client"

// Mock properties data for development
const MOCK_PROPERTIES = [
  {
    id: "prop-001",
    parcel_id: "12-34-567-890",
    address: "123 Main St",
    city: "Pittsburgh",
    state: "PA",
    county: "Allegheny",
    total_due: 5234.56,
    status: "pending",
    created_at: "2025-12-01T10:00:00Z",
  },
  {
    id: "prop-002",
    parcel_id: "23-45-678-901",
    address: "456 Oak Ave",
    city: "Greensburg",
    state: "PA",
    county: "Westmoreland",
    total_due: 8765.43,
    status: "pending",
    created_at: "2025-12-15T14:30:00Z",
  },
  {
    id: "prop-003",
    parcel_id: "34-56-789-012",
    address: "789 Pine Rd",
    city: "Johnstown",
    state: "PA",
    county: "Cambria",
    total_due: 3210.99,
    status: "validated",
    created_at: "2026-01-05T09:15:00Z",
  },
]

/**
 * GET /api/properties
 * Returns a list of properties - requires authentication
 */
export async function GET(request: NextRequest) {
  // Validate authentication
  const authResult = await validateApiAuth(request)

  if (!authResult.authenticated) {
    return unauthorizedResponse(authResult.error)
  }

  try {
    const supabase = createServerClient()

    // If Supabase is not configured, return mock data
    if (!supabase) {
      console.log("[API Properties] Supabase not configured, returning mock data")
      return NextResponse.json({
        data: MOCK_PROPERTIES,
        count: MOCK_PROPERTIES.length,
        source: "mock",
        user: authResult.user,
      })
    }

    // Fetch properties from Supabase
    const { data, error, count } = await supabase
      .from("properties")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(100)

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
      source: "database",
      user: authResult.user,
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
 * Create a new property - requires authentication
 */
export async function POST(request: NextRequest) {
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

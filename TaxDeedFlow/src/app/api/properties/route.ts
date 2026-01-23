import { NextRequest, NextResponse } from "next/server"
import { validateApiAuth, unauthorizedResponse, forbiddenResponse } from "@/lib/auth/api-auth"
import { validateCsrf, csrfErrorResponse } from "@/lib/auth/csrf"
import { createServerClient } from "@/lib/supabase/client"

/**
 * GET /api/properties
 * Returns a list of properties
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

    // Fetch properties from Supabase with county information
    const { data, error, count } = await supabase
      .from("properties")
      .select(`
        *,
        counties (
          county_name,
          state_code
        )
      `, { count: "exact" })
      .order("updated_at", { ascending: false })
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
 * NOTE: This route serves as the TEST CASE for Supabase Auth migration (Phase 2, subtask 2-2)
 * It uses validateApiAuth() which tries Supabase Auth first, then falls back to demo tokens.
 * Once verified, all other API routes will follow this pattern.
 */
export async function POST(request: NextRequest) {
  // CSRF Protection: Validate request origin
  const csrfResult = await validateCsrf(request)
  if (!csrfResult.valid) {
    return csrfErrorResponse(csrfResult.error)
  }

  // Validate authentication (uses Supabase Auth as primary method)
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

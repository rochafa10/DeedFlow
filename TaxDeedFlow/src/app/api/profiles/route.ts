import { NextRequest, NextResponse } from "next/server"
import { validateApiAuth, unauthorizedResponse, forbiddenResponse } from "@/lib/auth/api-auth"
import { validateCsrf, csrfErrorResponse } from "@/lib/auth/csrf"
import { createServerClient } from "@/lib/supabase/client"

/**
 * GET /api/profiles
 * Returns all investment profiles for the authenticated user
 */
export async function GET(request: NextRequest) {
  // Validate authentication - profiles are user-specific
  const authResult = await validateApiAuth(request)

  if (!authResult.authenticated) {
    return unauthorizedResponse(authResult.error)
  }

  try {
    const supabase = createServerClient()

    if (!supabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      )
    }

    // Fetch investment profiles for authenticated user
    const { data, error, count } = await supabase
      .from("investment_profiles")
      .select("*", { count: "exact" })
      .eq("user_id", authResult.user?.id)
      .is("deleted_at", null)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[API Profiles] Database error:", error)
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
    console.error("[API Profiles] Server error:", error)
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
 * POST /api/profiles
 * Create a new investment profile - requires authentication and CSRF validation
 */
export async function POST(request: NextRequest) {
  // CSRF Protection: Validate request origin
  const csrfResult = await validateCsrf(request)
  if (!csrfResult.valid) {
    console.log("[API Profiles] CSRF validation failed:", csrfResult.error)
    return csrfErrorResponse(csrfResult.error)
  }

  // Validate authentication
  const authResult = await validateApiAuth(request)

  if (!authResult.authenticated) {
    return unauthorizedResponse(authResult.error)
  }

  // Only admin and analyst can create profiles (viewers cannot)
  if (authResult.user?.role === "viewer") {
    return forbiddenResponse("Viewers cannot create investment profiles.")
  }

  try {
    const body = await request.json()

    const supabase = createServerClient()

    if (!supabase) {
      // Demo mode - just return success with mock ID
      return NextResponse.json({
        data: {
          id: `profile-${Date.now()}`,
          user_id: authResult.user?.id,
          ...body,
          created_at: new Date().toISOString(),
        },
        message: "Profile created (demo mode)",
        source: "mock",
      }, { status: 201 })
    }

    const { data, error } = await supabase
      .from("investment_profiles")
      .insert([{
        user_id: authResult.user?.id,
        ...body,
      }])
      .select()
      .single()

    if (error) {
      console.error("[API Profiles] Insert error:", error)
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
      message: "Profile created successfully",
      source: "database",
    }, { status: 201 })
  } catch (error) {
    console.error("[API Profiles] Server error:", error)
    return NextResponse.json(
      {
        error: "Server error",
        message: "An unexpected error occurred",
      },
      { status: 500 }
    )
  }
}

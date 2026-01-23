import { NextRequest, NextResponse } from "next/server"
import { validateApiAuth, unauthorizedResponse, forbiddenResponse } from "@/lib/auth/api-auth"
import { validateCsrf, csrfErrorResponse } from "@/lib/auth/csrf"
import { createServerClient } from "@/lib/supabase/client"

/**
 * GET /api/profiles/[id]
 * Returns a single investment profile
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const profileId = params.id

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

    // Fetch profile - RLS ensures user can only see their own
    const { data: profile, error: profileError } = await supabase
      .from("investment_profiles")
      .select("*")
      .eq("id", profileId)
      .eq("user_id", authResult.user?.id)
      .is("deleted_at", null)
      .single()

    if (profileError) {
      if (profileError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Profile not found" },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { error: "Database error", message: profileError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: profile,
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
 * PUT /api/profiles/[id]
 * Updates an investment profile - requires authentication and CSRF validation
 * User can only update their own profiles
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const profileId = params.id

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

  // Only admin and analyst can update profiles (viewers cannot)
  if (authResult.user?.role === "viewer") {
    return forbiddenResponse("Viewers cannot update investment profiles.")
  }

  try {
    const body = await request.json()

    const supabase = createServerClient()

    if (!supabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      )
    }

    // First verify the profile exists and belongs to the user
    const { data: existingProfile, error: checkError } = await supabase
      .from("investment_profiles")
      .select("id, user_id")
      .eq("id", profileId)
      .is("deleted_at", null)
      .single()

    if (checkError) {
      if (checkError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Profile not found" },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { error: "Database error", message: checkError.message },
        { status: 500 }
      )
    }

    // Verify ownership
    if (existingProfile.user_id !== authResult.user?.id) {
      return forbiddenResponse("You can only update your own profiles.")
    }

    // Update the profile
    const { data, error } = await supabase
      .from("investment_profiles")
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profileId)
      .eq("user_id", authResult.user?.id)
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
      message: "Profile updated successfully",
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
 * DELETE /api/profiles/[id]
 * Soft-deletes an investment profile (sets deleted_at)
 * Requires authentication and CSRF validation
 * User can only delete their own profiles
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const profileId = params.id

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

  // Only admin and analyst can delete profiles (viewers cannot)
  if (authResult.user?.role === "viewer") {
    return forbiddenResponse("Viewers cannot delete investment profiles.")
  }

  try {
    const supabase = createServerClient()

    if (!supabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      )
    }

    // First verify the profile exists and belongs to the user
    const { data: existingProfile, error: checkError } = await supabase
      .from("investment_profiles")
      .select("id, user_id, is_default")
      .eq("id", profileId)
      .is("deleted_at", null)
      .single()

    if (checkError) {
      if (checkError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Profile not found" },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { error: "Database error", message: checkError.message },
        { status: 500 }
      )
    }

    // Verify ownership
    if (existingProfile.user_id !== authResult.user?.id) {
      return forbiddenResponse("You can only delete your own profiles.")
    }

    // Prevent deletion of default profile
    if (existingProfile.is_default) {
      return NextResponse.json(
        { error: "Cannot delete default profile. Set another profile as default first." },
        { status: 400 }
      )
    }

    // Soft delete: set deleted_at timestamp
    const { error } = await supabase
      .from("investment_profiles")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", profileId)
      .eq("user_id", authResult.user?.id)

    if (error) {
      return NextResponse.json(
        { error: "Database error", message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: "Profile deleted successfully",
      source: "database",
    })
  } catch (error) {
    return NextResponse.json(
      { error: "Server error", message: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}

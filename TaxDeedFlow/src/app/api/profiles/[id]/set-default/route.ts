import { NextRequest, NextResponse } from "next/server"
import { validateApiAuth, unauthorizedResponse, forbiddenResponse } from "@/lib/auth/api-auth"
import { validateCsrf, csrfErrorResponse } from "@/lib/auth/csrf"
import { createServerClient } from "@/lib/supabase/client"

/**
 * POST /api/profiles/[id]/set-default
 * Sets a profile as the default profile for the authenticated user
 * Requires authentication and CSRF validation
 * Automatically unsets all other profiles for that user
 */
export async function POST(
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

  // Only admin and analyst can set default profile (viewers cannot)
  if (authResult.user?.role === "viewer") {
    return forbiddenResponse("Viewers cannot set default investment profiles.")
  }

  try {
    const supabase = createServerClient()

    if (!supabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      )
    }

    // Call the database function to set the default profile
    // This function handles all the logic:
    // 1. Checks if profile exists and belongs to user
    // 2. Unsets all other defaults for this user
    // 3. Sets the specified profile as default
    const { data, error } = await supabase
      .rpc("set_default_profile", {
        p_profile_id: profileId,
        p_user_id: authResult.user?.id,
      })

    if (error) {
      return NextResponse.json(
        { error: "Database error", message: error.message },
        { status: 500 }
      )
    }

    // Function returns FALSE if profile not found or not owned by user
    if (data === false) {
      return NextResponse.json(
        { error: "Profile not found or you do not have permission to modify it" },
        { status: 404 }
      )
    }

    // Fetch the updated profile to return in response
    const { data: profile, error: fetchError } = await supabase
      .from("investment_profiles")
      .select("*")
      .eq("id", profileId)
      .eq("user_id", authResult.user?.id)
      .is("deleted_at", null)
      .single()

    if (fetchError) {
      // Profile was set as default but we couldn't fetch it
      // Still return success since the operation completed
      return NextResponse.json({
        message: "Profile set as default successfully",
        source: "database",
      })
    }

    return NextResponse.json({
      data: profile,
      message: "Profile set as default successfully",
      source: "database",
    })
  } catch (error) {
    return NextResponse.json(
      { error: "Server error", message: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/client"

/**
 * DELETE /api/developer/keys/[id]
 * Revokes an API key for the authenticated user
 *
 * Returns:
 * {
 *   message: string
 * }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient()
    const { id } = params

    if (!supabase) {
      return NextResponse.json(
        {
          error: "Service Unavailable",
          message: "Database not configured",
        },
        { status: 503 }
      )
    }

    // Get authenticated user from session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          message: "You must be logged in to revoke API keys",
        },
        { status: 401 }
      )
    }

    // Verify the API key belongs to the authenticated user
    const { data: apiKey, error: fetchError } = await supabase
      .from("api_keys")
      .select("id, user_id, name")
      .eq("id", id)
      .single()

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return NextResponse.json(
          {
            error: "Not Found",
            message: "API key not found",
          },
          { status: 404 }
        )
      }
      console.error("[API] Error fetching API key:", fetchError)
      return NextResponse.json(
        {
          error: "Server Error",
          message: "Failed to fetch API key",
          details: fetchError.message,
        },
        { status: 500 }
      )
    }

    // Verify ownership
    if (apiKey.user_id !== user.id) {
      return NextResponse.json(
        {
          error: "Forbidden",
          message: "You do not have permission to revoke this API key",
        },
        { status: 403 }
      )
    }

    // Call the database function to revoke the API key
    const { data: revoked, error: revokeError } = await supabase.rpc(
      "revoke_api_key",
      {
        p_key_id: id,
        p_revoked_reason: "Manually revoked by user",
      }
    )

    if (revokeError) {
      console.error("[API] Error revoking API key:", revokeError)
      return NextResponse.json(
        {
          error: "Server Error",
          message: "Failed to revoke API key",
          details: revokeError.message,
        },
        { status: 500 }
      )
    }

    // revoke_api_key returns BOOLEAN - true if revoked, false if already revoked or not found
    if (!revoked) {
      return NextResponse.json(
        {
          error: "Conflict",
          message: "API key is already revoked or does not exist",
        },
        { status: 409 }
      )
    }

    return NextResponse.json(
      {
        message: "API key revoked successfully",
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("[API] Unexpected error revoking API key:", error)
    return NextResponse.json(
      {
        error: "Server Error",
        message: "An unexpected error occurred",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/client"
import type { DeleteWebhookResponse } from "@/types/api"

/**
 * DELETE /api/developer/webhooks/[id]
 * Deletes a webhook subscription for the authenticated user
 *
 * Returns:
 * {
 *   success: boolean,
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
          message: "You must be logged in to delete webhook subscriptions",
        },
        { status: 401 }
      )
    }

    // Fetch the webhook subscription and verify ownership
    const { data: webhook, error: fetchError } = await supabase
      .from("webhook_subscriptions")
      .select("id, api_key_id, api_keys!inner(user_id)")
      .eq("id", id)
      .single()

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return NextResponse.json(
          {
            error: "Not Found",
            message: "Webhook subscription not found",
          },
          { status: 404 }
        )
      }
      console.error("[API] Error fetching webhook subscription:", fetchError)
      return NextResponse.json(
        {
          error: "Server Error",
          message: "Failed to fetch webhook subscription",
          details: fetchError.message,
        },
        { status: 500 }
      )
    }

    // Verify ownership - the API key must belong to the authenticated user
    // @ts-expect-error - Supabase returns nested api_keys object from the join
    if (webhook.api_keys.user_id !== user.id) {
      return NextResponse.json(
        {
          error: "Forbidden",
          message: "You do not have permission to delete this webhook subscription",
        },
        { status: 403 }
      )
    }

    // Delete the webhook subscription
    const { error: deleteError } = await supabase
      .from("webhook_subscriptions")
      .delete()
      .eq("id", id)

    if (deleteError) {
      console.error("[API] Error deleting webhook subscription:", deleteError)
      return NextResponse.json(
        {
          error: "Server Error",
          message: "Failed to delete webhook subscription",
          details: deleteError.message,
        },
        { status: 500 }
      )
    }

    const response: DeleteWebhookResponse = {
      success: true,
      message: "Webhook subscription deleted successfully",
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error("[API] Unexpected error deleting webhook subscription:", error)
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

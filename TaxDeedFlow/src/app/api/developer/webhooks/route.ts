import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/client"
import type { CreateWebhookRequest, CreateWebhookResponse, ListWebhooksResponse, WebhookEvent } from "@/types/api"
import { randomBytes } from "crypto"

/**
 * GET /api/developer/webhooks
 * Lists all webhook subscriptions for the authenticated user
 *
 * Returns:
 * {
 *   data: Array<WebhookSubscription>,
 *   count: number
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()

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
          message: "You must be logged in to view webhook subscriptions",
        },
        { status: 401 }
      )
    }

    // First, get all API keys for the user
    const { data: apiKeys, error: keysError } = await supabase
      .from("api_keys")
      .select("id")
      .eq("user_id", user.id)
      .is("revoked_at", null)

    if (keysError) {
      console.error("[API] Error fetching API keys:", keysError)
      return NextResponse.json(
        {
          error: "Server Error",
          message: "Failed to fetch API keys",
          details: keysError.message,
        },
        { status: 500 }
      )
    }

    if (!apiKeys || apiKeys.length === 0) {
      // No API keys, so no webhooks
      return NextResponse.json(
        {
          data: [],
          count: 0,
        },
        { status: 200 }
      )
    }

    const apiKeyIds = apiKeys.map((key) => key.id)

    // Query webhook subscriptions for the user's API keys
    const { data: webhooks, error: queryError } = await supabase
      .from("webhook_subscriptions")
      .select("*")
      .in("api_key_id", apiKeyIds)
      .order("created_at", { ascending: false })

    if (queryError) {
      console.error("[API] Error fetching webhook subscriptions:", queryError)
      return NextResponse.json(
        {
          error: "Server Error",
          message: "Failed to fetch webhook subscriptions",
          details: queryError.message,
        },
        { status: 500 }
      )
    }

    const response: ListWebhooksResponse = {
      data: webhooks || [],
      count: webhooks?.length || 0,
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error("[API] Unexpected error fetching webhook subscriptions:", error)
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

/**
 * POST /api/developer/webhooks
 * Creates a new webhook subscription for the authenticated user
 *
 * Request body:
 * {
 *   url: string,
 *   events: WebhookEvent[]
 * }
 *
 * Returns:
 * {
 *   data: WebhookSubscription,
 *   message: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()

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
          message: "You must be logged in to create webhook subscriptions",
        },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body: CreateWebhookRequest = await request.json()

    if (!body.url || !body.url.trim()) {
      return NextResponse.json(
        {
          error: "Validation Error",
          message: "Webhook URL is required",
        },
        { status: 400 }
      )
    }

    // Validate URL format
    try {
      const url = new URL(body.url)
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        return NextResponse.json(
          {
            error: "Validation Error",
            message: "Webhook URL must use http:// or https:// protocol",
          },
          { status: 400 }
        )
      }
    } catch (urlError) {
      return NextResponse.json(
        {
          error: "Validation Error",
          message: "Invalid webhook URL format",
        },
        { status: 400 }
      )
    }

    if (!body.events || !Array.isArray(body.events) || body.events.length === 0) {
      return NextResponse.json(
        {
          error: "Validation Error",
          message: "At least one event is required",
        },
        { status: 400 }
      )
    }

    // Validate event types
    const validEvents: WebhookEvent[] = [
      "property.created",
      "property.updated",
      "property.deleted",
      "county.created",
      "county.updated",
      "auction.created",
      "auction.updated",
      "risk_score.calculated",
    ]

    const invalidEvents = body.events.filter((e) => !validEvents.includes(e))

    if (invalidEvents.length > 0) {
      return NextResponse.json(
        {
          error: "Validation Error",
          message: `Invalid events: ${invalidEvents.join(", ")}. Valid events are: ${validEvents.join(", ")}`,
        },
        { status: 400 }
      )
    }

    // Get the user's first active API key
    const { data: apiKeys, error: keysError } = await supabase
      .from("api_keys")
      .select("id")
      .eq("user_id", user.id)
      .is("revoked_at", null)
      .order("created_at", { ascending: false })
      .limit(1)

    if (keysError) {
      console.error("[API] Error fetching API keys:", keysError)
      return NextResponse.json(
        {
          error: "Server Error",
          message: "Failed to fetch API keys",
          details: keysError.message,
        },
        { status: 500 }
      )
    }

    if (!apiKeys || apiKeys.length === 0) {
      return NextResponse.json(
        {
          error: "Validation Error",
          message: "You must create an API key before creating webhook subscriptions",
        },
        { status: 400 }
      )
    }

    const apiKeyId = apiKeys[0].id

    // Generate a random secret for webhook signature verification
    const secret = randomBytes(32).toString("hex")

    // Create the webhook subscription
    const { data: webhook, error: createError } = await supabase
      .from("webhook_subscriptions")
      .insert({
        api_key_id: apiKeyId,
        url: body.url.trim(),
        events: body.events,
        secret: secret,
        active: true,
      })
      .select()
      .single()

    if (createError) {
      console.error("[API] Error creating webhook subscription:", createError)
      return NextResponse.json(
        {
          error: "Server Error",
          message: "Failed to create webhook subscription",
          details: createError.message,
        },
        { status: 500 }
      )
    }

    const response: CreateWebhookResponse = {
      data: webhook,
      message: "Webhook subscription created successfully. Use the secret to verify webhook signatures.",
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error("[API] Unexpected error creating webhook subscription:", error)
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

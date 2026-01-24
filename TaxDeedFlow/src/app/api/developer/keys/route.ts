import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/client"
import type { CreateApiKeyRequest, CreateApiKeyResponse } from "@/types/api"

/**
 * GET /api/developer/keys
 * Lists all API keys for the authenticated user
 *
 * Returns:
 * {
 *   data: Array<{
 *     id: string,
 *     user_id: string,
 *     name: string,
 *     permissions: string[],
 *     rate_limit_tier: string,
 *     last_used_at: string | null,
 *     request_count: number,
 *     revoked_at: string | null,
 *     created_at: string,
 *     updated_at: string
 *   }>,
 *   count: number
 * }
 *
 * Note: The hashed API key is NOT returned for security reasons
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
          message: "You must be logged in to view API keys",
        },
        { status: 401 }
      )
    }

    // Query API keys for the authenticated user
    // Note: We explicitly exclude 'key_hash' for security
    const { data: apiKeys, error: queryError } = await supabase
      .from("developer_api_keys")
      .select(
        "id, user_id, name, permissions, rate_limit_tier, last_used_at, request_count, revoked_at, created_at, updated_at"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (queryError) {
      console.error("[API] Error fetching API keys:", queryError)
      return NextResponse.json(
        {
          error: "Server Error",
          message: "Failed to fetch API keys",
          details: queryError.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        data: apiKeys || [],
        count: apiKeys?.length || 0,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("[API] Unexpected error fetching API keys:", error)
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
 * POST /api/developer/keys
 * Creates a new API key for the authenticated user
 *
 * Request body:
 * {
 *   name: string,
 *   permissions: string[],
 *   rate_limit_tier?: 'free' | 'pro' | 'enterprise' | 'unlimited'
 * }
 *
 * Returns:
 * {
 *   data: {
 *     id: string,
 *     user_id: string,
 *     name: string,
 *     api_key: string, // Plaintext key - only shown once!
 *     permissions: string[],
 *     rate_limit_tier: string,
 *     created_at: string,
 *     ...
 *   },
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
          message: "You must be logged in to create API keys",
        },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body: CreateApiKeyRequest = await request.json()

    if (!body.name || !body.name.trim()) {
      return NextResponse.json(
        {
          error: "Validation Error",
          message: "API key name is required",
        },
        { status: 400 }
      )
    }

    if (!body.permissions || !Array.isArray(body.permissions) || body.permissions.length === 0) {
      return NextResponse.json(
        {
          error: "Validation Error",
          message: "At least one permission is required",
        },
        { status: 400 }
      )
    }

    // Validate permissions (must be one of: read, write, delete, admin)
    const validPermissions = ["read", "write", "delete", "admin"]
    const invalidPermissions = body.permissions.filter(
      (p) => !validPermissions.includes(p)
    )

    if (invalidPermissions.length > 0) {
      return NextResponse.json(
        {
          error: "Validation Error",
          message: `Invalid permissions: ${invalidPermissions.join(", ")}. Valid permissions are: ${validPermissions.join(", ")}`,
        },
        { status: 400 }
      )
    }

    // Validate rate limit tier if provided
    const rateLimitTier = body.rate_limit_tier || "free"
    const validTiers = ["free", "pro", "enterprise", "unlimited"]

    if (!validTiers.includes(rateLimitTier)) {
      return NextResponse.json(
        {
          error: "Validation Error",
          message: `Invalid rate limit tier: ${rateLimitTier}. Valid tiers are: ${validTiers.join(", ")}`,
        },
        { status: 400 }
      )
    }

    // Call the database function to create the API key
    const { data: apiKeyData, error: createError } = await supabase.rpc(
      "create_api_key",
      {
        p_user_id: user.id,
        p_name: body.name.trim(),
        p_permissions: body.permissions,
        p_rate_limit_tier: rateLimitTier,
      }
    )

    if (createError) {
      console.error("[API] Error creating API key:", createError)
      return NextResponse.json(
        {
          error: "Server Error",
          message: "Failed to create API key",
          details: createError.message,
        },
        { status: 500 }
      )
    }

    if (!apiKeyData || apiKeyData.length === 0) {
      return NextResponse.json(
        {
          error: "Server Error",
          message: "Failed to create API key - no data returned",
        },
        { status: 500 }
      )
    }

    // The RPC function returns an array with one record
    const newKey = apiKeyData[0]

    const response: CreateApiKeyResponse = {
      data: {
        id: newKey.id,
        user_id: newKey.user_id,
        name: newKey.name,
        api_key: newKey.api_key, // Plaintext key - only shown once!
        permissions: newKey.permissions,
        rate_limit_tier: newKey.rate_limit_tier,
        last_used_at: null,
        request_count: 0,
        revoked_at: null,
        created_at: newKey.created_at,
        updated_at: newKey.created_at,
      },
      message: "API key created successfully. Make sure to copy it now - you won't be able to see it again!",
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error("[API] Unexpected error creating API key:", error)
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

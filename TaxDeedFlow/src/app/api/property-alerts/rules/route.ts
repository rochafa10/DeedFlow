import { NextRequest, NextResponse } from "next/server"
import { validateApiAuth, unauthorizedResponse, forbiddenResponse } from "@/lib/auth/api-auth"
import { validateCsrf, csrfErrorResponse } from "@/lib/auth/csrf"
import { createServerClient } from "@/lib/supabase/client"

/**
 * GET /api/property-alerts/rules
 * Returns a list of alert rules for the authenticated user
 */
export async function GET(request: NextRequest) {
  // Validate authentication
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

    const userId = authResult.user?.id

    if (!userId) {
      return unauthorizedResponse("User ID not found")
    }

    // Call the database function to get user's alert rules
    const { data, error } = await supabase
      .rpc("get_user_alert_rules", {
        p_user_id: userId,
        p_enabled_only: false
      })

    if (error) {
      console.error("[API Property Alerts Rules] Database error:", error)
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
      count: data?.length ?? 0,
      source: "database",
    })
  } catch (error) {
    console.error("[API Property Alerts Rules] Server error:", error)
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
 * POST /api/property-alerts/rules
 * Create a new alert rule - requires authentication and CSRF validation
 */
export async function POST(request: NextRequest) {
  // CSRF Protection: Validate request origin
  const csrfResult = await validateCsrf(request)
  if (!csrfResult.valid) {
    console.log("[API Property Alerts Rules] CSRF validation failed:", csrfResult.error)
    return csrfErrorResponse(csrfResult.error)
  }

  // Validate authentication
  const authResult = await validateApiAuth(request)

  if (!authResult.authenticated) {
    return unauthorizedResponse(authResult.error)
  }

  // Only admin and analyst can create alert rules
  if (authResult.user?.role === "viewer") {
    return forbiddenResponse("Viewers cannot create alert rules.")
  }

  try {
    const body = await request.json()

    const supabase = createServerClient()

    if (!supabase) {
      // Demo mode - just return success with mock ID
      return NextResponse.json({
        data: {
          id: `rule-${Date.now()}`,
          ...body,
          created_at: new Date().toISOString(),
        },
        message: "Alert rule created (demo mode)",
        source: "mock",
      })
    }

    const userId = authResult.user?.id

    if (!userId) {
      return unauthorizedResponse("User ID not found")
    }

    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        {
          error: "Validation error",
          message: "Alert rule name is required",
        },
        { status: 400 }
      )
    }

    // Call the database function to upsert alert rule
    const { data, error } = await supabase
      .rpc("upsert_alert_rule", {
        p_user_id: userId,
        p_name: body.name,
        p_enabled: body.enabled ?? true,
        p_score_threshold: body.score_threshold ?? null,
        p_county_ids: body.county_ids ?? [],
        p_property_types: body.property_types ?? [],
        p_max_bid: body.max_bid ?? null,
        p_min_acres: body.min_acres ?? null,
        p_max_acres: body.max_acres ?? null,
        p_notification_frequency: body.notification_frequency ?? "daily",
        p_rule_id: null, // Always create new for POST
      })

    if (error) {
      console.error("[API Property Alerts Rules] Insert error:", error)
      return NextResponse.json(
        {
          error: "Database error",
          message: error.message,
        },
        { status: 500 }
      )
    }

    // Get the created rule details
    const { data: ruleData, error: fetchError } = await supabase
      .from("alert_rules")
      .select("*")
      .eq("id", data)
      .single()

    if (fetchError) {
      console.error("[API Property Alerts Rules] Fetch error:", fetchError)
      // Still return success since the rule was created
      return NextResponse.json({
        data: { id: data },
        message: "Alert rule created successfully",
        source: "database",
      })
    }

    return NextResponse.json({
      data: ruleData,
      message: "Alert rule created successfully",
      source: "database",
    })
  } catch (error) {
    console.error("[API Property Alerts Rules] Server error:", error)
    return NextResponse.json(
      {
        error: "Server error",
        message: "An unexpected error occurred",
      },
      { status: 500 }
    )
  }
}

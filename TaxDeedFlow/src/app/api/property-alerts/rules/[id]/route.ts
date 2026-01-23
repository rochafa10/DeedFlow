import { NextRequest, NextResponse } from "next/server"
import { validateApiAuth, unauthorizedResponse, forbiddenResponse } from "@/lib/auth/api-auth"
import { validateCsrf, csrfErrorResponse } from "@/lib/auth/csrf"
import { createServerClient } from "@/lib/supabase/client"

/**
 * GET /api/property-alerts/rules/[id]
 * Returns a single alert rule by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const ruleId = params.id

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

    // Fetch the alert rule - ensure it belongs to the user
    const { data: rule, error: ruleError } = await supabase
      .from("alert_rules")
      .select("*")
      .eq("id", ruleId)
      .eq("user_id", userId)
      .single()

    if (ruleError) {
      if (ruleError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Alert rule not found" },
          { status: 404 }
        )
      }
      console.error("[API Property Alert Rule Detail] Database error:", ruleError)
      return NextResponse.json(
        { error: "Database error", message: ruleError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: rule,
      source: "database",
    })
  } catch (error) {
    console.error("[API Property Alert Rule Detail] Server error:", error)
    return NextResponse.json(
      { error: "Server error", message: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/property-alerts/rules/[id]
 * Updates an existing alert rule - requires authentication, CSRF validation, and rule ownership
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const ruleId = params.id

  // CSRF Protection: Validate request origin
  const csrfResult = await validateCsrf(request)
  if (!csrfResult.valid) {
    console.log("[API Property Alert Rule Detail] CSRF validation failed:", csrfResult.error)
    return csrfErrorResponse(csrfResult.error)
  }

  // Validate authentication
  const authResult = await validateApiAuth(request)

  if (!authResult.authenticated) {
    return unauthorizedResponse(authResult.error)
  }

  // Only admin and analyst can update alert rules
  if (authResult.user?.role === "viewer") {
    return forbiddenResponse("Viewers cannot update alert rules.")
  }

  try {
    const body = await request.json()

    const supabase = createServerClient()

    if (!supabase) {
      // Demo mode - just return success with updated data
      return NextResponse.json({
        data: {
          id: ruleId,
          ...body,
          updated_at: new Date().toISOString(),
        },
        message: "Alert rule updated (demo mode)",
        source: "mock",
      })
    }

    const userId = authResult.user?.id

    if (!userId) {
      return unauthorizedResponse("User ID not found")
    }

    // First, verify the rule exists and belongs to the user
    const { data: existingRule, error: checkError } = await supabase
      .from("alert_rules")
      .select("id")
      .eq("id", ruleId)
      .eq("user_id", userId)
      .single()

    if (checkError || !existingRule) {
      return NextResponse.json(
        { error: "Alert rule not found or access denied" },
        { status: 404 }
      )
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

    // Call the database function to update the alert rule
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
        p_rule_id: ruleId, // Provide rule ID for update
      })

    if (error) {
      console.error("[API Property Alert Rule Detail] Update error:", error)
      return NextResponse.json(
        {
          error: "Database error",
          message: error.message,
        },
        { status: 500 }
      )
    }

    // Get the updated rule details
    const { data: ruleData, error: fetchError } = await supabase
      .from("alert_rules")
      .select("*")
      .eq("id", ruleId)
      .single()

    if (fetchError) {
      console.error("[API Property Alert Rule Detail] Fetch error:", fetchError)
      // Still return success since the rule was updated
      return NextResponse.json({
        data: { id: ruleId },
        message: "Alert rule updated successfully",
        source: "database",
      })
    }

    return NextResponse.json({
      data: ruleData,
      message: "Alert rule updated successfully",
      source: "database",
    })
  } catch (error) {
    console.error("[API Property Alert Rule Detail] Server error:", error)
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
 * DELETE /api/property-alerts/rules/[id]
 * Deletes an alert rule - requires authentication, CSRF validation, and rule ownership
 * Cascade deletes associated property alerts
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const ruleId = params.id

  // CSRF Protection: Validate request origin
  const csrfResult = await validateCsrf(request)
  if (!csrfResult.valid) {
    console.log("[API Property Alert Rule Detail] CSRF validation failed:", csrfResult.error)
    return csrfErrorResponse(csrfResult.error)
  }

  // Validate authentication
  const authResult = await validateApiAuth(request)

  if (!authResult.authenticated) {
    return unauthorizedResponse(authResult.error)
  }

  // Only admin and analyst can delete alert rules
  if (authResult.user?.role === "viewer") {
    return forbiddenResponse("Viewers cannot delete alert rules.")
  }

  try {
    const supabase = createServerClient()

    if (!supabase) {
      // Demo mode - just return success
      return NextResponse.json({
        message: "Alert rule deleted (demo mode)",
        source: "mock",
      })
    }

    const userId = authResult.user?.id

    if (!userId) {
      return unauthorizedResponse("User ID not found")
    }

    // Call the database function to delete the alert rule
    // This will cascade delete associated property alerts
    const { data: deleted, error } = await supabase
      .rpc("delete_alert_rule", {
        p_rule_id: ruleId,
        p_user_id: userId,
      })

    if (error) {
      console.error("[API Property Alert Rule Detail] Delete error:", error)
      return NextResponse.json(
        {
          error: "Database error",
          message: error.message,
        },
        { status: 500 }
      )
    }

    if (!deleted) {
      return NextResponse.json(
        { error: "Alert rule not found or access denied" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      message: "Alert rule deleted successfully",
      source: "database",
    })
  } catch (error) {
    console.error("[API Property Alert Rule Detail] Server error:", error)
    return NextResponse.json(
      {
        error: "Server error",
        message: "An unexpected error occurred",
      },
      { status: 500 }
    )
  }
}

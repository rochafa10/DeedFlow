/**
 * Property Alert Scan Trigger API Endpoint
 *
 * Manually triggers a scan of properties against active alert rules
 * Admin-only endpoint - typically called by n8n workflow but available for manual testing
 *
 * @route POST /api/property-alerts/scan
 * @body propertyIds - Optional array of property IDs to scan (default: all properties)
 * @body ruleIds - Optional array of rule IDs to check (default: all enabled rules)
 */

import { NextRequest, NextResponse } from "next/server"
import { validateApiAuth, unauthorizedResponse, forbiddenResponse } from "@/lib/auth/api-auth"
import { validateCsrf, csrfErrorResponse } from "@/lib/auth/csrf"
import { createServerClient } from "@/lib/supabase/client"

/**
 * POST /api/property-alerts/scan
 * Trigger property scan for alerts - admin only
 */
export async function POST(request: NextRequest) {
  // CSRF Protection: Validate request origin
  const csrfResult = await validateCsrf(request)
  if (!csrfResult.valid) {
    console.log("[API Property Alerts Scan] CSRF validation failed:", csrfResult.error)
    return csrfErrorResponse(csrfResult.error)
  }

  // Validate authentication
  const authResult = await validateApiAuth(request)

  if (!authResult.authenticated) {
    return unauthorizedResponse(authResult.error)
  }

  // Admin only - viewers and analysts cannot trigger scans
  if (authResult.user?.role !== "admin") {
    return forbiddenResponse("Only administrators can trigger alert scans.")
  }

  try {
    const body = await request.json().catch(() => ({}))
    const { propertyIds, ruleIds } = body

    const supabase = createServerClient()

    if (!supabase) {
      // Demo mode - return mock success
      return NextResponse.json({
        success: true,
        alertsCreated: 0,
        rulesChecked: 0,
        propertiesScanned: 0,
        message: "Alert scan completed (demo mode)",
        source: "mock",
      })
    }

    // Call the database function to scan properties
    const { data, error } = await supabase.rpc("scan_properties_for_alerts", {
      p_property_ids: propertyIds || null,
      p_rule_ids: ruleIds || null,
    })

    if (error) {
      console.error("[API Property Alerts Scan] Database error:", error)
      return NextResponse.json(
        {
          error: "Database error",
          message: error.message,
        },
        { status: 500 }
      )
    }

    // The function returns a single row with stats
    const result = Array.isArray(data) ? data[0] : data

    return NextResponse.json({
      success: true,
      alertsCreated: result?.alerts_created ?? 0,
      rulesChecked: result?.rules_checked ?? 0,
      propertiesScanned: result?.properties_scanned ?? 0,
      message: `Scan complete: ${result?.alerts_created ?? 0} new alert(s) created from ${result?.properties_scanned ?? 0} properties checked against ${result?.rules_checked ?? 0} rule(s)`,
      source: "database",
    })
  } catch (error) {
    console.error("[API Property Alerts Scan] Server error:", error)
    return NextResponse.json(
      {
        error: "Server error",
        message: "An unexpected error occurred",
      },
      { status: 500 }
    )
  }
}

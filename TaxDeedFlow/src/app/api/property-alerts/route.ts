/**
 * Property Alerts Inbox API Endpoint
 *
 * Manages property alerts for the authenticated user
 * Fetches alerts from the property_alerts table joined with properties, counties, and alert_rules
 *
 * @route GET /api/property-alerts
 * @query read - Filter by read status (true/false/all)
 * @query archived - Filter by archived status (true/false)
 * @query limit - Max number of alerts to return (default: 50)
 * @query offset - Offset for pagination (default: 0)
 * @query count_only - If true, only return unread count
 */

import { NextRequest, NextResponse } from "next/server"
import { validateApiAuth, unauthorizedResponse } from "@/lib/auth/api-auth"
import { validateCsrf, csrfErrorResponse } from "@/lib/auth/csrf"
import { createServerClient } from "@/lib/supabase/client"

export interface PropertyAlert {
  id: string
  alertRuleId: string
  alertRuleName: string
  propertyId: string
  property: {
    parcel_number: string | null
    property_address: string | null
    county: string
    state: string
    total_due: number | null
    total_score: number | null
    acres: number | null
    property_type: string | null
  }
  matchScore: number
  matchReasons: Record<string, any>
  read: boolean
  archived: boolean
  readAt: string | null
  createdAt: string
}

export async function GET(request: NextRequest) {
  // Validate authentication
  const authResult = await validateApiAuth(request)

  if (!authResult.authenticated) {
    return unauthorizedResponse(authResult.error)
  }

  try {
    const { searchParams } = new URL(request.url)
    const readFilter = searchParams.get("read")
    const archivedFilter = searchParams.get("archived")
    const limitParam = searchParams.get("limit")
    const offsetParam = searchParams.get("offset")
    const countOnly = searchParams.get("count_only") === "true"
    const limit = limitParam ? parseInt(limitParam, 10) : 50
    const offset = offsetParam ? parseInt(offsetParam, 10) : 0

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

    // If only count is requested, use the dedicated function
    if (countOnly) {
      const { data: countData, error: countError } = await supabase.rpc(
        "get_unread_alert_count",
        {
          p_user_id: userId,
        }
      )

      if (countError) {
        console.error("[API Property Alerts] Count error:", countError)
        return NextResponse.json(
          {
            error: "Database error",
            message: countError.message,
          },
          { status: 500 }
        )
      }

      return NextResponse.json({
        count: countData ?? 0,
      })
    }

    // Determine read status parameter
    let readStatus: boolean | null = null
    if (readFilter === "true") {
      readStatus = true
    } else if (readFilter === "false") {
      readStatus = false
    }

    // Determine archived status parameter
    const archived = archivedFilter === "true"

    // Get property alerts using the database function
    const { data: alertsData, error: alertsError } = await supabase.rpc(
      "get_user_property_alerts",
      {
        p_user_id: userId,
        p_read_status: readStatus,
        p_archived: archived,
        p_limit: limit,
        p_offset: offset,
      }
    )

    if (alertsError) {
      console.error("[API Property Alerts] Database error:", alertsError)
      return NextResponse.json(
        {
          error: "Database error",
          message: alertsError.message,
        },
        { status: 500 }
      )
    }

    // Get property IDs from alerts
    const propertyIds = (alertsData || []).map((alert: any) => alert.property_id)

    // If no alerts, return empty array
    if (propertyIds.length === 0) {
      return NextResponse.json({
        alerts: [],
        count: 0,
        hasData: false,
        dataSource: "empty",
      })
    }

    // Fetch full property details with county information
    const { data: propertiesData, error: propertiesError } = await supabase
      .from("properties")
      .select(
        `
        id,
        parcel_number,
        property_address,
        total_due,
        total_score,
        acres,
        property_type,
        counties (
          county_name,
          state_code
        )
      `
      )
      .in("id", propertyIds)

    if (propertiesError) {
      console.error("[API Property Alerts] Properties error:", propertiesError)
      return NextResponse.json(
        {
          error: "Database error",
          message: propertiesError.message,
        },
        { status: 500 }
      )
    }

    // Create a map of properties by ID for fast lookup
    const propertiesMap = new Map(
      (propertiesData || []).map((prop: any) => [prop.id, prop])
    )

    // Transform data to match frontend format
    const alerts: PropertyAlert[] = (alertsData || []).map((alert: any) => {
      const property = propertiesMap.get(alert.property_id)

      return {
        id: alert.id,
        alertRuleId: alert.alert_rule_id,
        alertRuleName: alert.alert_rule_name,
        propertyId: alert.property_id,
        property: {
          parcel_number: property?.parcel_number || null,
          property_address: property?.property_address || null,
          county: property?.counties?.county_name || "Unknown",
          state: property?.counties?.state_code || "PA",
          total_due: property?.total_due || null,
          total_score: property?.total_score || null,
          acres: property?.acres || null,
          property_type: property?.property_type || null,
        },
        matchScore: alert.match_score,
        matchReasons: alert.match_reasons || {},
        read: alert.read || false,
        archived: alert.archived || false,
        readAt: alert.read_at,
        createdAt: alert.created_at,
      }
    })

    return NextResponse.json({
      alerts,
      count: alerts.length,
      hasData: alerts.length > 0,
      dataSource: alerts.length > 0 ? "live" : "empty",
    })
  } catch (error) {
    console.error("[API Property Alerts] Server error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * Mark specific alerts as read
 * @route POST /api/property-alerts
 */
export async function POST(request: NextRequest) {
  // CSRF Protection: Validate request origin
  const csrfResult = await validateCsrf(request)
  if (!csrfResult.valid) {
    console.log("[API Property Alerts] CSRF validation failed:", csrfResult.error)
    return csrfErrorResponse(csrfResult.error)
  }

  // Validate authentication
  const authResult = await validateApiAuth(request)

  if (!authResult.authenticated) {
    return unauthorizedResponse(authResult.error)
  }

  try {
    const body = await request.json()
    const { alertIds, read } = body

    if (!alertIds || !Array.isArray(alertIds) || alertIds.length === 0) {
      return NextResponse.json(
        { error: "Alert IDs are required and must be a non-empty array" },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    if (!supabase) {
      // Demo mode
      return NextResponse.json({
        success: true,
        count: alertIds.length,
        message: "Alerts marked as read (demo mode)",
        source: "mock",
      })
    }

    const userId = authResult.user?.id

    if (!userId) {
      return unauthorizedResponse("User ID not found")
    }

    // Use the database function to mark alerts as read
    const { data, error } = await supabase.rpc("mark_alerts_read", {
      p_alert_ids: alertIds,
      p_user_id: userId,
    })

    if (error) {
      console.error("[API Property Alerts] Mark read error:", error)
      return NextResponse.json(
        {
          error: "Database error",
          message: error.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      count: data ?? 0,
      message: `${data ?? 0} alert(s) marked as read`,
    })
  } catch (error) {
    console.error("[API Property Alerts] POST error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * Mark all alerts as read
 * @route PATCH /api/property-alerts
 */
export async function PATCH(request: NextRequest) {
  // CSRF Protection: Validate request origin
  const csrfResult = await validateCsrf(request)
  if (!csrfResult.valid) {
    console.log("[API Property Alerts] CSRF validation failed:", csrfResult.error)
    return csrfErrorResponse(csrfResult.error)
  }

  // Validate authentication
  const authResult = await validateApiAuth(request)

  if (!authResult.authenticated) {
    return unauthorizedResponse(authResult.error)
  }

  try {
    const supabase = createServerClient()

    if (!supabase) {
      // Demo mode
      return NextResponse.json({
        success: true,
        count: 0,
        message: "All alerts marked as read (demo mode)",
        source: "mock",
      })
    }

    const userId = authResult.user?.id

    if (!userId) {
      return unauthorizedResponse("User ID not found")
    }

    // Use the database function to mark all alerts as read
    const { data, error } = await supabase.rpc("mark_all_alerts_read", {
      p_user_id: userId,
    })

    if (error) {
      console.error("[API Property Alerts] Mark all read error:", error)
      return NextResponse.json(
        {
          error: "Database error",
          message: error.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      count: data ?? 0,
      message: `${data ?? 0} alert(s) marked as read`,
    })
  } catch (error) {
    console.error("[API Property Alerts] PATCH error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

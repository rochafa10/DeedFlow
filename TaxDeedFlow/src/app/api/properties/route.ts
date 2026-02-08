import { NextRequest, NextResponse } from "next/server"
import { validateApiAuth, unauthorizedResponse, forbiddenResponse } from "@/lib/auth/api-auth"
import { validateCsrf, csrfErrorResponse } from "@/lib/auth/csrf"
import { createServerClient } from "@/lib/supabase/client"

/**
 * GET /api/properties
 * Returns a list of properties
 *
 * Note: Properties are PUBLIC DATA (tax sales are public records).
 * Organization scoping happens at the watchlist/deal/assignment level.
 * This endpoint is accessible to all users for browsing public auction data.
 *
 * Query parameters:
 * - limit: number (default: 100, max: 500)
 * - offset: number (default: 0)
 * - county_id: string (filter by county UUID)
 * - sale_id: string (filter by upcoming_sale UUID - shows properties for a specific auction)
 * - sale_status: string (filter by status: upcoming, sold, unsold, withdrawn)
 * - auction_status: string (filter by auction status: active, expired, unknown, all)
 *   - If not specified, defaults to 'active' (hides expired properties)
 *   - Use 'all' to show all properties regardless of auction status
 * - date_range: string (filter by sale date range: thisWeek, 7days, 30days, 90days, 6months, all)
 * - sale_type: string (filter by sale type: upset, judicial, repository, all)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()

    if (!supabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const limit = Math.min(Number(searchParams.get("limit")) || 100, 500)
    const offset = Number(searchParams.get("offset")) || 0
    const countyId = searchParams.get("county_id")
    const saleId = searchParams.get("sale_id")
    const saleStatus = searchParams.get("sale_status")
    const auctionStatus = searchParams.get("auction_status")
    const dateRange = searchParams.get("date_range")
    const saleType = searchParams.get("sale_type")

    // Build query with LEFT JOINs to counties and regrid_data
    // regrid_data provides enriched property information from Regrid.com
    let query = supabase
      .from("properties")
      .select(`
        *,
        counties (
          county_name,
          state_code
        ),
        regrid_data (
          property_type,
          land_use,
          zoning,
          lot_size_sqft,
          lot_size_acres,
          building_sqft,
          year_built,
          bedrooms,
          bathrooms,
          assessed_value,
          market_value,
          latitude,
          longitude,
          additional_fields,
          last_sale_price,
          last_sale_date,
          land_value,
          improvement_value,
          assessed_land_value,
          assessed_improvement_value,
          opportunity_zone,
          school_district,
          census_tract,
          number_of_stories,
          building_count,
          building_footprint_sqft,
          lot_type,
          terrain,
          deed_acres,
          lot_dimensions,
          owner_name
        )
      `, { count: "exact" })
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (countyId) {
      query = query.eq("county_id", countyId)
    }
    if (saleId) {
      query = query.eq("sale_id", saleId)
    }
    if (saleStatus) {
      query = query.eq("sale_status", saleStatus)
    }

    // Apply sale_type filter (upset, judicial, repository)
    if (saleType && saleType !== "all") {
      query = query.eq("sale_type", saleType)
    }

    // Apply auction_status filter
    // Default to 'active' if no auction_status specified (hides expired properties)
    // Use 'all' to bypass the filter and show all properties
    if (auctionStatus && auctionStatus !== "all") {
      query = query.eq("auction_status", auctionStatus)
    } else if (!auctionStatus) {
      // Default: only show active properties to prevent showing expired auctions
      query = query.eq("auction_status", "active")
    }

    // Apply date range filter on sale_date
    // This filters properties to only those with sale_date within the specified range
    if (dateRange && dateRange !== "all") {
      const today = new Date()
      today.setHours(0, 0, 0, 0) // Start of today

      let endDate: Date | null = null

      switch (dateRange) {
        case "thisWeek": {
          // Get the start of the current week (Sunday)
          const startOfWeek = new Date(today)
          startOfWeek.setDate(today.getDate() - today.getDay())
          // Get the end of the current week (Saturday)
          endDate = new Date(startOfWeek)
          endDate.setDate(startOfWeek.getDate() + 6)
          endDate.setHours(23, 59, 59, 999)
          // Filter: sale_date >= startOfWeek AND sale_date <= endOfWeek
          query = query
            .gte("sale_date", startOfWeek.toISOString())
            .lte("sale_date", endDate.toISOString())
          break
        }
        case "7days":
          endDate = new Date(today)
          endDate.setDate(today.getDate() + 7)
          query = query
            .gte("sale_date", today.toISOString())
            .lte("sale_date", endDate.toISOString())
          break
        case "30days":
          endDate = new Date(today)
          endDate.setDate(today.getDate() + 30)
          query = query
            .gte("sale_date", today.toISOString())
            .lte("sale_date", endDate.toISOString())
          break
        case "90days":
          endDate = new Date(today)
          endDate.setDate(today.getDate() + 90)
          query = query
            .gte("sale_date", today.toISOString())
            .lte("sale_date", endDate.toISOString())
          break
        case "6months":
          endDate = new Date(today)
          endDate.setDate(today.getDate() + 180)
          query = query
            .gte("sale_date", today.toISOString())
            .lte("sale_date", endDate.toISOString())
          break
      }
    }

    const { data, error, count } = await query

    if (error) {
      console.error("[API Properties] Database error:", error)
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
      count: count ?? 0,
      total: count ?? 0,
      source: "database",
    })
  } catch (error) {
    console.error("[API Properties] Server error:", error)
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
 * POST /api/properties
 * Create a new property - requires authentication and CSRF validation
 *
 * Note: While properties are public data, creation is restricted to
 * authenticated users for data quality and audit purposes.
 */
export async function POST(request: NextRequest) {
  // CSRF Protection: Validate request origin
  const csrfResult = await validateCsrf(request)
  if (!csrfResult.valid) {
    console.log("[API Properties] CSRF validation failed:", csrfResult.error)
    return csrfErrorResponse(csrfResult.error)
  }

  // Validate authentication
  const authResult = await validateApiAuth(request)

  if (!authResult.authenticated) {
    return unauthorizedResponse(authResult.error)
  }

  // Only admin and analyst can create properties
  if (authResult.user?.role === "viewer") {
    return forbiddenResponse("Viewers cannot create properties.")
  }

  try {
    const body = await request.json()

    const supabase = createServerClient()

    if (!supabase) {
      // Demo mode - just return success with mock ID
      return NextResponse.json({
        data: {
          id: `prop-${Date.now()}`,
          ...body,
          created_at: new Date().toISOString(),
        },
        message: "Property created (demo mode)",
        source: "mock",
      })
    }

    const { data, error } = await supabase
      .from("properties")
      .insert([body])
      .select()
      .single()

    if (error) {
      console.error("[API Properties] Insert error:", error)
      return NextResponse.json(
        {
          error: "Database error",
          message: error.message,
        },
        { status: 500 }
      )
    }

    // Log property creation with user context for audit purposes
    console.log("[API Properties] Property created:", {
      property_id: data.id,
      created_by: authResult.user?.email,
      user_role: authResult.user?.role,
    })

    return NextResponse.json({
      data,
      message: "Property created successfully",
      source: "database",
    })
  } catch (error) {
    console.error("[API Properties] Server error:", error)
    return NextResponse.json(
      {
        error: "Server error",
        message: "An unexpected error occurred",
      },
      { status: 500 }
    )
  }
}

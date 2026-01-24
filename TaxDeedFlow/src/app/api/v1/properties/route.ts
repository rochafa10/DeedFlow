import { NextRequest, NextResponse } from "next/server"
import { validateApiKeyWithRateLimit, hasPermission } from "@/lib/api/api-key-auth"
import { createServerClient } from "@/lib/supabase/client"
import type { GetPropertiesParams, GetPropertiesResponse } from "@/types/api"

/**
 * GET /api/v1/properties
 * Public API endpoint for retrieving properties with filtering and pagination
 * Requires API key authentication via x-api-key header
 */
export async function GET(request: NextRequest) {
  // Validate API key and enforce rate limiting
  const authResult = await validateApiKeyWithRateLimit(request, "/api/v1/properties")

  if (!authResult.success) {
    return authResult.response
  }

  // Check read permission
  if (!hasPermission(authResult.apiKey, "read")) {
    return NextResponse.json(
      {
        error: "Forbidden",
        message: "Your API key does not have read permission",
      },
      { status: 403 }
    )
  }

  try {
    const supabase = createServerClient()

    if (!supabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      )
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const params: GetPropertiesParams = {
      county_id: searchParams.get("county_id") || undefined,
      state_code: searchParams.get("state_code") || undefined,
      min_total_due: searchParams.get("min_total_due")
        ? parseFloat(searchParams.get("min_total_due")!)
        : undefined,
      max_total_due: searchParams.get("max_total_due")
        ? parseFloat(searchParams.get("max_total_due")!)
        : undefined,
      min_investability_score: searchParams.get("min_investability_score")
        ? parseFloat(searchParams.get("min_investability_score")!)
        : undefined,
      property_type: searchParams.get("property_type") || undefined,
      has_regrid_data: searchParams.get("has_regrid_data")
        ? searchParams.get("has_regrid_data") === "true"
        : undefined,
      visual_validation_status: searchParams.get("visual_validation_status") as
        | "approved"
        | "rejected"
        | "caution"
        | "pending"
        | undefined,
      limit: searchParams.get("limit")
        ? parseInt(searchParams.get("limit")!)
        : 100,
      offset: searchParams.get("offset")
        ? parseInt(searchParams.get("offset")!)
        : 0,
      sort_by: (searchParams.get("sort_by") as GetPropertiesParams["sort_by"]) ||
        "updated_at",
      sort_order: (searchParams.get("sort_order") as "asc" | "desc") || "desc",
    }

    // Validate limit (max 1000)
    if (params.limit && params.limit > 1000) {
      return NextResponse.json(
        {
          error: "Bad Request",
          message: "Limit cannot exceed 1000",
        },
        { status: 400 }
      )
    }

    // Build Supabase query
    let query = supabase
      .from("properties")
      .select(
        `
        *,
        counties (
          county_name,
          state_code
        )
      `,
        { count: "exact" }
      )

    // Apply filters
    if (params.county_id) {
      query = query.eq("county_id", params.county_id)
    }

    if (params.state_code) {
      // Filter via counties join
      query = query.eq("counties.state_code", params.state_code)
    }

    if (params.min_total_due !== undefined) {
      query = query.gte("total_due", params.min_total_due)
    }

    if (params.max_total_due !== undefined) {
      query = query.lte("total_due", params.max_total_due)
    }

    if (params.min_investability_score !== undefined) {
      query = query.gte("investability_score", params.min_investability_score)
    }

    if (params.property_type) {
      query = query.eq("property_type", params.property_type)
    }

    if (params.has_regrid_data !== undefined) {
      query = query.eq("has_regrid_data", params.has_regrid_data)
    }

    if (params.visual_validation_status) {
      query = query.eq("visual_validation_status", params.visual_validation_status)
    }

    // Apply sorting
    if (params.sort_by) {
      query = query.order(params.sort_by, {
        ascending: params.sort_order === "asc",
      })
    }

    // Apply pagination
    query = query.range(params.offset!, params.offset! + params.limit! - 1)

    // Execute query
    const { data, error, count } = await query

    if (error) {
      console.error("[API v1 Properties] Database error:", error)
      return NextResponse.json(
        {
          error: "Database error",
          message: error.message,
        },
        { status: 500 }
      )
    }

    // Format response
    const response: GetPropertiesResponse = {
      data: (data || []).map((property) => ({
        id: property.id,
        county_id: property.county_id,
        parcel_id: property.parcel_id,
        address: property.address,
        total_due: property.total_due,
        sale_date: property.sale_date,
        investability_score: property.investability_score,
        has_regrid_data: property.has_regrid_data || false,
        has_screenshot: property.has_screenshot || false,
        visual_validation_status: property.visual_validation_status,
        created_at: property.created_at,
        updated_at: property.updated_at,
        county: property.counties
          ? {
              county_name: property.counties.county_name,
              state_code: property.counties.state_code,
            }
          : undefined,
      })),
      count: count || 0,
      pagination: {
        limit: params.limit!,
        offset: params.offset!,
        has_more: (count || 0) > params.offset! + params.limit!,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("[API v1 Properties] Server error:", error)
    return NextResponse.json(
      {
        error: "Server error",
        message: "An unexpected error occurred",
      },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from "next/server"
import { validateApiKeyWithRateLimit, hasPermission } from "@/lib/api/api-key-auth"
import { createServerClient } from "@/lib/supabase/client"

/**
 * GET /api/v1/properties/[id]
 * Returns a single property with all related data
 * Requires API key authentication with "read" permission
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const propertyId = params.id

  try {
    // Validate API key and enforce rate limiting
    const authResult = await validateApiKeyWithRateLimit(request, "/api/v1/properties/[id]")

    if (!authResult.success) {
      return authResult.response
    }

    // Check for read permission
    if (!hasPermission(authResult.apiKey, "read")) {
      return NextResponse.json(
        {
          error: "Forbidden",
          message: "Your API key does not have read permission",
        },
        { status: 403 }
      )
    }

    const supabase = createServerClient()

    if (!supabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      )
    }

    // Fetch property with related data
    const { data: property, error: propertyError } = await supabase
      .from("properties")
      .select(`
        *,
        counties (
          id,
          county_name,
          state_code,
          state_name
        ),
        documents (
          id,
          title,
          document_type,
          url
        )
      `)
      .eq("id", propertyId)
      .single()

    if (propertyError) {
      if (propertyError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Property not found" },
          { status: 404 }
        )
      }
      console.error("[API v1 Property] Database error:", propertyError)
      return NextResponse.json(
        { error: "Database error", message: propertyError.message },
        { status: 500 }
      )
    }

    // Fetch regrid data if available
    let regridData = null
    if (property.has_regrid_data || property.has_screenshot) {
      const { data: regrid } = await supabase
        .from("regrid_data")
        .select("*")
        .eq("property_id", propertyId)
        .single()
      regridData = regrid
    }

    // Fetch visual validation data if available
    let validationData = null
    if (property.visual_validation_status) {
      const { data: validation } = await supabase
        .from("property_visual_validation")
        .select("*")
        .eq("property_id", propertyId)
        .single()
      validationData = validation
    }

    // Build API response with clean, developer-friendly format
    const response = {
      id: property.id,
      parcel_id: property.parcel_id,
      property_address: property.property_address,
      owner_name: property.owner_name,
      total_due: property.total_due,
      tax_year: property.tax_year,
      sale_date: property.sale_date,
      sale_type: property.sale_type,
      auction_status: property.auction_status,
      visual_validation_status: property.visual_validation_status,
      investability_score: property.investability_score,
      has_regrid_data: property.has_regrid_data,
      has_screenshot: property.has_screenshot,
      created_at: property.created_at,
      updated_at: property.updated_at,

      // Related data
      county: property.counties ? {
        id: property.counties.id,
        name: property.counties.county_name,
        state_code: property.counties.state_code,
        state_name: property.counties.state_name,
      } : null,

      documents: (property.documents || []).map((doc: {
        id: string
        title: string
        document_type: string
        url: string
      }) => ({
        id: doc.id,
        title: doc.title,
        type: doc.document_type,
        url: doc.url,
      })),

      regrid_data: regridData ? {
        property_type: regridData.property_type,
        property_class: regridData.property_class,
        lot_size_acres: regridData.lot_size_acres,
        lot_size_sqft: regridData.lot_size_sqft,
        building_sqft: regridData.building_sqft,
        year_built: regridData.year_built,
        bedrooms: regridData.bedrooms,
        bathrooms: regridData.bathrooms,
        assessed_value: regridData.assessed_value,
        market_value: regridData.market_value,
        zoning: regridData.zoning,
        latitude: regridData.latitude,
        longitude: regridData.longitude,
        screenshot_url: regridData.screenshot_url,
        screenshot_timestamp: regridData.screenshot_timestamp,
      } : null,

      validation: validationData ? {
        status: validationData.validation_status,
        confidence_score: validationData.confidence_score,
        validated_at: validationData.validated_at,
        validated_by: validationData.validated_by,
        findings: validationData.findings,
        red_flags: validationData.red_flags,
        structure_present: validationData.structure_present,
        road_access: validationData.road_access,
        land_use_observed: validationData.land_use_observed,
        lot_shape: validationData.lot_shape,
        notes: validationData.notes,
      } : null,
    }

    return NextResponse.json({
      success: true,
      data: response,
    })
  } catch (error) {
    console.error("[API v1 Property] Server error:", error)
    return NextResponse.json(
      { error: "Server error", message: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}

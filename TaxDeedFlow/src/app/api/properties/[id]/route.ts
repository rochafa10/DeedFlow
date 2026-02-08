import { NextRequest, NextResponse } from "next/server"
import { validateApiAuth, unauthorizedResponse, forbiddenResponse } from "@/lib/auth/api-auth"
import { createServerClient } from "@/lib/supabase/client"

/**
 * GET /api/properties/[id]
 * Returns a single property with all related data
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const propertyId = params.id

  try {
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
      console.error("[API Property] Database error:", propertyError)
      return NextResponse.json(
        { error: "Database error", message: propertyError.message },
        { status: 500 }
      )
    }

    // Fetch regrid data if available (check both has_regrid_data and has_screenshot flags)
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

    // Fetch notes if user is authenticated
    let propertyNotes: Array<{ id: string; note_type: string; note_text: string; created_at: string; user_id: string }> = []

    // Try to get authenticated user (optional - won't fail if not authenticated)
    const authResult = await validateApiAuth(request)
    if (authResult.authenticated && authResult.user) {
      const userId = authResult.user.id

      // Fetch user's notes for this property
      const { data: notes, error: notesError } = await supabase
        .from("property_notes")
        .select("*")
        .eq("property_id", propertyId)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      if (!notesError && notes) {
        propertyNotes = notes
      }
    }

    // Transform to frontend-friendly format
    const transformedProperty = {
      id: property.id,
      parcelId: property.parcel_id,
      address: property.property_address || "Address not available",
      city: "", // Extract from address if needed
      county: property.counties?.county_name || "Unknown",
      state: property.counties?.state_code || "PA",
      zipCode: "", // Extract from address if needed
      totalDue: property.total_due || 0,
      status: property.visual_validation_status || property.auction_status || "parsed",
      propertyType: property.is_vacant_lot
        ? "Vacant Lot"
        : property.is_likely_mobile_home
          ? "Mobile Home"
          : (regridData?.property_type || "Unknown"),
      lotSize: regridData?.lot_size_acres
        ? `${regridData.lot_size_acres} acres`
        : (regridData?.lot_size_sqft ? `${regridData.lot_size_sqft} sqft` : "Unknown"),
      saleType: property.sale_type || "Tax Deed",
      validation: property.visual_validation_status?.toLowerCase() || null,
      yearBuilt: regridData?.year_built || null,
      bedrooms: regridData?.bedrooms || null,
      bathrooms: regridData?.bathrooms || null,
      squareFeet: regridData?.building_sqft || null,
      assessedValue: regridData?.assessed_value || null,
      taxYear: property.tax_year || new Date().getFullYear(),
      saleDate: property.sale_date
        ? new Date(property.sale_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        : "TBD",
      minimumBid: property.total_due || 0,
      latitude: regridData?.latitude || null,
      longitude: regridData?.longitude || null,
      ownerName: property.owner_name || regridData?.raw_data?.owner_name || null,
      isVacantLot: property.is_vacant_lot || false,
      isLikelyMobileHome: property.is_likely_mobile_home || false,

      // Regrid data
      regridData: regridData ? {
        lotSizeAcres: regridData.lot_size_acres,
        lotSizeSqFt: regridData.lot_size_sqft,
        propertyClass: regridData.property_class,
        zoning: regridData.zoning,
        assessedLandValue: regridData.assessed_value,
        assessedImprovementValue: regridData?.assessed_improvement_value ?? null,
        marketValue: regridData.market_value,
        lastSaleDate: null,
        lastSalePrice: null,
        ownerName: regridData.raw_data?.owner_name || property.owner_name,
        ownerAddress: null,
        screenshotUrl: regridData.screenshot_url,
        scrapeMethod: regridData.additional_fields?._scrape_method || 'unknown',
        dataQualityScore: regridData.data_quality_score ?? null,
      } : null,

      // Validation data
      validationData: validationData ? {
        status: validationData.validation_status?.toLowerCase(),
        confidenceScore: validationData.confidence_score,
        validatedAt: validationData.validated_at,
        validatedBy: validationData.validated_by || "Visual Validator Agent",
        findings: validationData.findings || [],
        imagesAnalyzed: validationData.images_analyzed?.length || 0,
        recommendation: validationData.notes,
        redFlags: validationData.red_flags || [],
        structurePresent: validationData.structure_present,
        roadAccess: validationData.road_access,
        landUseObserved: validationData.land_use_observed,
        lotShape: validationData.lot_shape,
      } : null,

      // Images
      images: regridData?.screenshot_url ? [
        {
          url: regridData.screenshot_url,
          caption: "Regrid Aerial View",
          source: "Regrid",
        }
      ] : [],

      // Notes
      propertyNotes: (propertyNotes || []).map((note: { id: string; note_type: string; note_text: string; created_at: string; user_id: string }) => ({
        id: note.id,
        type: note.note_type || "general",
        text: note.note_text,
        createdAt: note.created_at,
        createdBy: note.user_id,
      })),

      // Watchlist (TODO: implement when watchlist tables exist)
      isInWatchlist: false,
      watchlistData: null,

      // Versioning for optimistic concurrency
      version: 1,
      lastModifiedAt: property.updated_at,
      lastModifiedBy: "System",

      // Raw data for debugging
      _raw: {
        property,
        regridData,
        validationData,
      },
    }

    return NextResponse.json({
      data: transformedProperty,
      source: "database",
    })
  } catch (error) {
    console.error("[API Property] Server error:", error)
    return NextResponse.json(
      { error: "Server error", message: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/properties/[id]
 * Deletes a property - requires admin role
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Validate authentication
  const authResult = await validateApiAuth(request)

  if (!authResult.authenticated) {
    return unauthorizedResponse(authResult.error)
  }

  // Only admin can delete properties
  if (authResult.user?.role !== "admin") {
    return forbiddenResponse("Only administrators can delete properties.")
  }

  const propertyId = params.id

  try {
    const supabase = createServerClient()

    if (!supabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      )
    }

    // Delete the property (cascades to related tables)
    const { error } = await supabase
      .from("properties")
      .delete()
      .eq("id", propertyId)

    if (error) {
      console.error("[API Property] Delete error:", error)
      return NextResponse.json(
        { error: "Database error", message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Property deleted successfully",
    })
  } catch (error) {
    console.error("[API Property] Server error:", error)
    return NextResponse.json(
      { error: "Server error", message: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}

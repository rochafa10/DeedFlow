import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/client"
import { logger } from "@/lib/logger"

const apiLogger = logger.withContext("Property Report API")

/**
 * Property Report Response Types
 * These types define the structure of the report API response
 */
interface PropertyDetails {
  parcelId: string
  address: string
  city: string | null
  county: string
  state: string
  ownerName: string | null
  propertyType: string | null
  lotSize: string | null
  yearBuilt: number | null
  bedrooms: number | null
  bathrooms: number | null
  squareFootage: number | null
  zoning: string | null
  landUse: string | null
  assessedValue: number | null
  marketValue: number | null
  coordinates: {
    lat: number | null
    lng: number | null
  }
}

interface AuctionInfo {
  saleType: string | null
  saleDate: string | null
  totalDue: number | null
  minimumBid: number | null
  auctionStatus: string | null
  taxYear: number | null
}

interface PropertyImages {
  regridScreenshot: string | null
}

interface PropertyReportResponse {
  propertyDetails: PropertyDetails
  auctionInfo: AuctionInfo
  images: PropertyImages
  metadata: {
    propertyId: string
    countyId: string
    hasRegridData: boolean
    dataQualityScore: number | null
    lastUpdated: string | null
  }
}

/**
 * Database row types for type safety
 */
interface CountyRow {
  id: string
  county_name: string
  state_code: string
  state_name: string | null
}

interface PropertyRow {
  id: string
  county_id: string
  parcel_id: string
  property_address: string | null
  city: string | null
  state_code: string | null
  zip_code: string | null
  owner_name: string | null
  property_type: string | null
  assessed_value: number | null
  total_due: number | null
  minimum_bid: number | null
  sale_type: string | null
  sale_date: string | null
  auction_status: string | null
  tax_year: number | null
  has_regrid_data: boolean | null
  has_screenshot: boolean | null
  updated_at: string | null
  counties: CountyRow | null
}

interface RegridDataRow {
  id: string
  property_id: string
  property_type: string | null
  property_class: string | null
  land_use: string | null
  zoning: string | null
  lot_size_sqft: number | null
  lot_size_acres: number | null
  building_sqft: number | null
  year_built: number | null
  bedrooms: number | null
  bathrooms: number | null
  assessed_value: number | null
  market_value: number | null
  screenshot_url: string | null
  data_quality_score: number | null
  latitude: number | null
  longitude: number | null
}

/**
 * GET /api/properties/[id]/report
 *
 * Returns a comprehensive property report with all data needed for
 * investment analysis. Fetches from properties table joined with
 * counties and regrid_data tables.
 *
 * @param request - Next.js request object
 * @param params - URL parameters containing property ID
 * @returns JSON response with property report data or error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const propertyId = params.id

  // Validate property ID format (UUID)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(propertyId)) {
    return NextResponse.json(
      {
        error: "Invalid property ID",
        message: "Property ID must be a valid UUID"
      },
      { status: 400 }
    )
  }

  try {
    const supabase = createServerClient()

    if (!supabase) {
      return NextResponse.json(
        {
          error: "Database not configured",
          message: "Supabase connection is not available"
        },
        { status: 500 }
      )
    }

    // Fetch property with county information
    const { data: property, error: propertyError } = await supabase
      .from("properties")
      .select(`
        id,
        county_id,
        parcel_id,
        property_address,
        city,
        state_code,
        zip_code,
        owner_name,
        property_type,
        assessed_value,
        total_due,
        minimum_bid,
        sale_type,
        sale_date,
        auction_status,
        tax_year,
        has_regrid_data,
        has_screenshot,
        updated_at,
        counties (
          id,
          county_name,
          state_code,
          state_name
        )
      `)
      .eq("id", propertyId)
      .single()

    if (propertyError) {
      // Handle "not found" error specifically
      if (propertyError.code === "PGRST116") {
        return NextResponse.json(
          {
            error: "Property not found",
            message: `No property exists with ID: ${propertyId}`
          },
          { status: 404 }
        )
      }

      apiLogger.error("Database error", { error: propertyError.message })
      return NextResponse.json(
        {
          error: "Database error",
          message: propertyError.message
        },
        { status: 500 }
      )
    }

    // Type assertion for property data
    const typedProperty = property as unknown as PropertyRow

    // Fetch regrid data if available
    let regridData: RegridDataRow | null = null
    if (typedProperty.has_regrid_data || typedProperty.has_screenshot) {
      const { data: regrid, error: regridError } = await supabase
        .from("regrid_data")
        .select(`
          id,
          property_id,
          property_type,
          property_class,
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
          screenshot_url,
          data_quality_score,
          latitude,
          longitude
        `)
        .eq("property_id", propertyId)
        .single()

      if (!regridError && regrid) {
        regridData = regrid as RegridDataRow
      }
    }

    // Format lot size string from regrid data
    const formatLotSize = (): string | null => {
      if (regridData?.lot_size_acres && regridData.lot_size_acres > 0) {
        return `${Number(regridData.lot_size_acres).toFixed(2)} acres`
      }
      if (regridData?.lot_size_sqft && regridData.lot_size_sqft > 0) {
        return `${Number(regridData.lot_size_sqft).toLocaleString()} sqft`
      }
      return null
    }

    // Format sale date for display
    const formatSaleDate = (dateStr: string | null): string | null => {
      if (!dateStr) return null
      try {
        const date = new Date(dateStr)
        return date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric"
        })
      } catch {
        return dateStr
      }
    }

    // Build the report response
    const report: PropertyReportResponse = {
      propertyDetails: {
        parcelId: typedProperty.parcel_id,
        address: typedProperty.property_address || "Address not available",
        city: typedProperty.city,
        county: typedProperty.counties?.county_name || "Unknown County",
        state: typedProperty.counties?.state_code || typedProperty.state_code || "PA",
        ownerName: typedProperty.owner_name,
        propertyType: regridData?.property_type || typedProperty.property_type,
        lotSize: formatLotSize(),
        yearBuilt: regridData?.year_built || null,
        bedrooms: regridData?.bedrooms || null,
        bathrooms: regridData?.bathrooms ? Number(regridData.bathrooms) : null,
        squareFootage: regridData?.building_sqft ? Number(regridData.building_sqft) : null,
        zoning: regridData?.zoning || null,
        landUse: regridData?.land_use || null,
        assessedValue: regridData?.assessed_value
          ? Number(regridData.assessed_value)
          : (typedProperty.assessed_value ? Number(typedProperty.assessed_value) : null),
        marketValue: regridData?.market_value ? Number(regridData.market_value) : null,
        coordinates: {
          lat: regridData?.latitude ? Number(regridData.latitude) : null,
          lng: regridData?.longitude ? Number(regridData.longitude) : null
        }
      },
      auctionInfo: {
        saleType: typedProperty.sale_type,
        saleDate: formatSaleDate(typedProperty.sale_date),
        totalDue: typedProperty.total_due ? Number(typedProperty.total_due) : null,
        minimumBid: typedProperty.minimum_bid
          ? Number(typedProperty.minimum_bid)
          : (typedProperty.total_due ? Number(typedProperty.total_due) : null),
        auctionStatus: typedProperty.auction_status,
        taxYear: typedProperty.tax_year
      },
      images: {
        regridScreenshot: regridData?.screenshot_url || null
      },
      metadata: {
        propertyId: typedProperty.id,
        countyId: typedProperty.county_id,
        hasRegridData: !!regridData,
        dataQualityScore: regridData?.data_quality_score
          ? Number(regridData.data_quality_score)
          : null,
        lastUpdated: typedProperty.updated_at
      }
    }

    return NextResponse.json({
      data: report,
      source: "database",
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    apiLogger.error("Server error", { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json(
      {
        error: "Server error",
        message: "An unexpected error occurred while generating the property report"
      },
      { status: 500 }
    )
  }
}

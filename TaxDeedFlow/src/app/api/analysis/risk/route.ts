import { NextRequest, NextResponse } from "next/server"
import { aggregateRiskData, type RiskAggregationInput, type RiskAggregationOptions } from "@/lib/analysis/risk"
import { createServerClient } from "@/lib/supabase/client"

/**
 * POST /api/analysis/risk
 *
 * Performs comprehensive risk analysis for a property including:
 * - Flood risk (FEMA flood zones)
 * - Earthquake risk (USGS seismic data)
 * - Wildfire risk (NASA FIRMS)
 * - Hurricane risk (wind zones, storm surge)
 * - Sinkhole risk (karst geology)
 * - Environmental risk (EPA Envirofacts)
 * - Radon risk (EPA radon zones)
 * - Slope/landslide risk
 *
 * Request body:
 * {
 *   propertyId?: string,           // If provided, will fetch coordinates from database
 *   coordinates?: { lat: number, lng: number },
 *   state: string,                  // Two-letter state code (required)
 *   county?: string,
 *   propertyValue?: number,         // Estimated property value for insurance calculations
 *   buildingSqft?: number,          // Building square footage
 *   options?: {
 *     skip?: {
 *       flood?: boolean,
 *       earthquake?: boolean,
 *       wildfire?: boolean,
 *       hurricane?: boolean,
 *       sinkhole?: boolean,
 *       environmental?: boolean,
 *       radon?: boolean,
 *       slope?: boolean
 *     },
 *     useCache?: boolean,
 *     timeout?: number
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      propertyId,
      coordinates,
      state,
      county,
      propertyValue,
      buildingSqft,
      options = {}
    } = body

    // Validate required fields
    if (!state) {
      return NextResponse.json(
        { error: "State code is required" },
        { status: 400 }
      )
    }

    // Get coordinates either from request or from database
    let finalCoordinates = coordinates

    if (!finalCoordinates && propertyId) {
      const supabase = createServerClient()

      if (!supabase) {
        return NextResponse.json(
          { error: "Database not configured" },
          { status: 500 }
        )
      }

      // Fetch property coordinates from regrid_data
      const { data: regridData, error: regridError } = await supabase
        .from("regrid_data")
        .select("latitude, longitude")
        .eq("property_id", propertyId)
        .single()

      if (regridError) {
        console.error("[Risk API] Error fetching coordinates:", regridError)
        return NextResponse.json(
          { error: "Could not find coordinates for property", details: regridError.message },
          { status: 404 }
        )
      }

      if (!regridData?.latitude || !regridData?.longitude) {
        return NextResponse.json(
          { error: "Property does not have coordinates available" },
          { status: 400 }
        )
      }

      finalCoordinates = {
        lat: regridData.latitude,
        lng: regridData.longitude
      }
    }

    if (!finalCoordinates || typeof finalCoordinates.lat !== 'number' || typeof finalCoordinates.lng !== 'number') {
      return NextResponse.json(
        { error: "Valid coordinates are required (either provide coordinates directly or a valid propertyId)" },
        { status: 400 }
      )
    }

    // Validate coordinate ranges
    if (finalCoordinates.lat < -90 || finalCoordinates.lat > 90) {
      return NextResponse.json(
        { error: "Latitude must be between -90 and 90" },
        { status: 400 }
      )
    }

    if (finalCoordinates.lng < -180 || finalCoordinates.lng > 180) {
      return NextResponse.json(
        { error: "Longitude must be between -180 and 180" },
        { status: 400 }
      )
    }

    // Build aggregation input
    const input: RiskAggregationInput = {
      coordinates: finalCoordinates,
      state: state.toUpperCase(),
      county: county || undefined,
      propertyValue: propertyValue || 150000,
      buildingSqft: buildingSqft || 1500
    }

    // Build aggregation options
    const aggregationOptions: RiskAggregationOptions = {
      skip: options.skip || {},
      useCache: options.useCache !== false, // Default to true
      timeout: options.timeout || 10000
    }

    // Perform risk analysis
    const riskAssessment = await aggregateRiskData(input, aggregationOptions)

    // Return the complete risk assessment
    return NextResponse.json({
      success: true,
      data: riskAssessment,
      metadata: {
        coordinates: finalCoordinates,
        state: state.toUpperCase(),
        county: county || null,
        propertyValue: input.propertyValue,
        buildingSqft: input.buildingSqft,
        analyzedAt: riskAssessment.assessedAt,
        options: {
          skipped: options.skip || {},
          timeout: aggregationOptions.timeout,
          useCache: aggregationOptions.useCache
        }
      }
    })
  } catch (error) {
    console.error("[Risk API] Error:", error)

    const message = error instanceof Error ? error.message : "Unknown error occurred"

    return NextResponse.json(
      {
        success: false,
        error: "Risk analysis failed",
        message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/analysis/risk
 *
 * Quick risk lookup using query parameters.
 *
 * Query params:
 * - lat: number (required)
 * - lng: number (required)
 * - state: string (required)
 * - county?: string
 * - propertyValue?: number
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    const lat = parseFloat(searchParams.get("lat") || "")
    const lng = parseFloat(searchParams.get("lng") || "")
    const state = searchParams.get("state")
    const county = searchParams.get("county")
    const propertyValue = parseFloat(searchParams.get("propertyValue") || "150000")

    // Validate required fields
    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { error: "Valid lat and lng query parameters are required" },
        { status: 400 }
      )
    }

    if (!state) {
      return NextResponse.json(
        { error: "State query parameter is required" },
        { status: 400 }
      )
    }

    // Validate coordinate ranges
    if (lat < -90 || lat > 90) {
      return NextResponse.json(
        { error: "Latitude must be between -90 and 90" },
        { status: 400 }
      )
    }

    if (lng < -180 || lng > 180) {
      return NextResponse.json(
        { error: "Longitude must be between -180 and 180" },
        { status: 400 }
      )
    }

    // Build aggregation input
    const input: RiskAggregationInput = {
      coordinates: { lat, lng },
      state: state.toUpperCase(),
      county: county || undefined,
      propertyValue: isNaN(propertyValue) ? 150000 : propertyValue
    }

    // Perform risk analysis with default options
    const riskAssessment = await aggregateRiskData(input)

    // Return the complete risk assessment
    return NextResponse.json({
      success: true,
      data: riskAssessment,
      metadata: {
        coordinates: { lat, lng },
        state: state.toUpperCase(),
        county: county || null,
        propertyValue: input.propertyValue,
        analyzedAt: riskAssessment.assessedAt
      }
    })
  } catch (error) {
    console.error("[Risk API] GET Error:", error)

    const message = error instanceof Error ? error.message : "Unknown error occurred"

    return NextResponse.json(
      {
        success: false,
        error: "Risk analysis failed",
        message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

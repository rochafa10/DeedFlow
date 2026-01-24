import { NextRequest, NextResponse } from "next/server"
import { validateApiKeyWithRateLimit, hasPermission } from "@/lib/api/api-key-auth"
import { aggregateRiskData, type RiskAggregationInput, type RiskAggregationOptions } from "@/lib/analysis/risk"
import { createServerClient } from "@/lib/supabase/client"

/**
 * POST /api/v1/risk-analysis
 * Public API endpoint for comprehensive property risk analysis
 * Requires API key authentication via x-api-key header
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
  // Validate API key and enforce rate limiting
  const authResult = await validateApiKeyWithRateLimit(request, "/api/v1/risk-analysis")

  if (!authResult.success) {
    return authResult.response
  }

  // Check read permission (risk analysis requires read access)
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
        {
          error: "Bad Request",
          message: "State code is required",
        },
        { status: 400 }
      )
    }

    // Get coordinates either from request or from database
    let finalCoordinates = coordinates

    if (!finalCoordinates && propertyId) {
      const supabase = createServerClient()

      if (!supabase) {
        return NextResponse.json(
          {
            error: "Server Error",
            message: "Database not configured",
          },
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
        return NextResponse.json(
          {
            error: "Not Found",
            message: "Could not find coordinates for property",
            details: regridError.message,
          },
          { status: 404 }
        )
      }

      if (!regridData?.latitude || !regridData?.longitude) {
        return NextResponse.json(
          {
            error: "Bad Request",
            message: "Property does not have coordinates available",
          },
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
        {
          error: "Bad Request",
          message: "Valid coordinates are required (either provide coordinates directly or a valid propertyId)",
        },
        { status: 400 }
      )
    }

    // Validate coordinate ranges
    if (finalCoordinates.lat < -90 || finalCoordinates.lat > 90) {
      return NextResponse.json(
        {
          error: "Bad Request",
          message: "Latitude must be between -90 and 90",
        },
        { status: 400 }
      )
    }

    if (finalCoordinates.lng < -180 || finalCoordinates.lng > 180) {
      return NextResponse.json(
        {
          error: "Bad Request",
          message: "Longitude must be between -180 and 180",
        },
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
    const message = error instanceof Error ? error.message : "Unknown error occurred"

    return NextResponse.json(
      {
        error: "Server Error",
        message: "Risk analysis failed",
        details: message,
      },
      { status: 500 }
    )
  }
}

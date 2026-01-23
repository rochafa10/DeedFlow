import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/client"

/**
 * GET /api/analytics/price-predictions
 * Returns price predictions for a property based on historical auction data
 * Query params:
 *  - property_id: UUID (required)
 *  - months_back: number (optional, default: 12)
 */
export async function GET(request: Request) {
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
    const propertyId = searchParams.get("property_id")
    const monthsBack = parseInt(searchParams.get("months_back") || "12", 10)

    if (!propertyId) {
      return NextResponse.json(
        { error: "property_id parameter is required" },
        { status: 400 }
      )
    }

    // Get property details
    const { data: propertyData, error: propertyError } = await supabase
      .from("properties")
      .select(`
        id,
        parcel_id,
        property_address,
        city,
        county_id,
        total_due,
        regrid_data (
          property_type,
          land_use,
          lot_size_sqft,
          building_sqft,
          assessed_value
        ),
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
      console.error("[API Price Predictions] Property error:", propertyError)
      return NextResponse.json(
        { error: "Property not found", message: propertyError.message },
        { status: 404 }
      )
    }

    // Extract property details for prediction
    const countyId = propertyData.county_id
    const propertyType = propertyData.regrid_data?.property_type || "residential"
    const openingBid = propertyData.total_due || 0
    const assessedValue = propertyData.regrid_data?.assessed_value || null
    const lotSizeSqft = propertyData.regrid_data?.lot_size_sqft || null
    const buildingSqft = propertyData.regrid_data?.building_sqft || null

    // Get price prediction
    const { data: predictionData, error: predictionError } = await supabase.rpc(
      "get_price_prediction",
      {
        p_county_id: countyId,
        p_property_type: propertyType,
        p_opening_bid: openingBid,
        p_assessed_value: assessedValue,
        p_lot_size_sqft: lotSizeSqft,
        p_building_sqft: buildingSqft,
        p_months_back: monthsBack,
      }
    )

    if (predictionError) {
      console.error("[API Price Predictions] Prediction query error:", predictionError)
      return NextResponse.json(
        { error: "Database error", message: predictionError.message },
        { status: 500 }
      )
    }

    // Transform prediction data to frontend format
    const prediction = predictionData && predictionData.length > 0
      ? {
          predictedPrice: predictionData[0].predicted_price,
          predictionLow: predictionData[0].prediction_low,
          predictionHigh: predictionData[0].prediction_high,
          confidenceScore: predictionData[0].confidence_score,
          comparableSalesCount: predictionData[0].comparable_sales_count,
          avgBidRatio: predictionData[0].avg_bid_ratio,
          medianBidRatio: predictionData[0].median_bid_ratio,
          stddevBidRatio: predictionData[0].stddev_bid_ratio,
        }
      : null

    // Calculate confidence level text
    const confidenceLevel = prediction
      ? prediction.confidenceScore >= 0.85
        ? "high"
        : prediction.confidenceScore >= 0.65
        ? "medium"
        : prediction.confidenceScore >= 0.50
        ? "low"
        : "very_low"
      : "insufficient_data"

    // Calculate prediction range percentage
    const predictionRange = prediction && prediction.predictedPrice > 0
      ? {
          lowPercentage: Math.round(
            ((prediction.predictionLow - prediction.predictedPrice) /
            prediction.predictedPrice) * 100
          ),
          highPercentage: Math.round(
            ((prediction.predictionHigh - prediction.predictedPrice) /
            prediction.predictedPrice) * 100
          ),
        }
      : null

    return NextResponse.json({
      data: {
        property: {
          id: propertyData.id,
          parcelId: propertyData.parcel_id,
          address: propertyData.property_address,
          city: propertyData.city,
          propertyType,
          openingBid,
          assessedValue,
        },
        county: propertyData.counties
          ? {
              id: propertyData.counties.id,
              name: propertyData.counties.county_name,
              state: propertyData.counties.state_code,
              stateName: propertyData.counties.state_name,
            }
          : null,
        prediction,
        confidenceLevel,
        predictionRange,
        filters: {
          monthsBack,
        },
      },
      source: "database",
    })
  } catch (error) {
    console.error("[API Price Predictions] Server error:", error)
    return NextResponse.json(
      { error: "Server error", message: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}

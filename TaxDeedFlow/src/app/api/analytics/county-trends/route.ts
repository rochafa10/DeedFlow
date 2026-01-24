import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/client"

/**
 * GET /api/analytics/county-trends
 * Returns county-specific auction trends, seasonal patterns, and market velocity
 * Query params:
 *  - county_id: UUID (required)
 *  - months_back: number (optional, default: 12)
 *  - property_type: string (optional)
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
    const countyId = searchParams.get("county_id")
    const monthsBack = parseInt(searchParams.get("months_back") || "12", 10)
    const propertyType = searchParams.get("property_type")

    if (!countyId) {
      return NextResponse.json(
        { error: "county_id parameter is required" },
        { status: 400 }
      )
    }

    // Get county information
    const { data: countyData, error: countyError } = await supabase
      .from("counties")
      .select("id, county_name, state_code, state_name")
      .eq("id", countyId)
      .single()

    if (countyError) {
      console.error("[API County Trends] County error:", countyError)
      return NextResponse.json(
        { error: "County not found", message: countyError.message },
        { status: 404 }
      )
    }

    // Get county trends (monthly data with growth rates)
    const { data: trendsData, error: trendsError } = await supabase.rpc(
      "get_county_trends",
      {
        p_county_id: countyId,
        p_months_back: monthsBack,
      }
    )

    if (trendsError) {
      console.error("[API County Trends] Trends query error:", trendsError)
      return NextResponse.json(
        { error: "Database error", message: trendsError.message },
        { status: 500 }
      )
    }

    // Get seasonal patterns
    const { data: seasonalData, error: seasonalError } = await supabase.rpc(
      "get_seasonal_patterns",
      {
        p_county_id: countyId,
        p_state_code: null,
        p_years_back: 3,
      }
    )

    if (seasonalError) {
      console.error("[API County Trends] Seasonal query error:", seasonalError)
    }

    // Get market velocity
    const { data: velocityData, error: velocityError } = await supabase.rpc(
      "get_market_velocity",
      {
        p_county_id: countyId,
        p_property_type: propertyType,
        p_months_back: 6,
      }
    )

    if (velocityError) {
      console.error("[API County Trends] Velocity query error:", velocityError)
    }

    // Transform trends data to frontend format
    const transformedTrends = (trendsData || []).map((trend: any) => ({
      monthDate: trend.month_date,
      auctionsCount: trend.auctions_count,
      soldCount: trend.sold_count,
      saleRatePct: trend.sale_rate_pct,
      avgSalePrice: trend.avg_sale_price,
      totalVolume: trend.total_volume,
      avgBidRatio: trend.avg_bid_ratio,
      monthOverMonthPriceChangePct: trend.month_over_month_price_change_pct,
      monthOverMonthVolumeChangePct: trend.month_over_month_volume_change_pct,
    }))

    // Transform seasonal data to frontend format
    const transformedSeasonal = (seasonalData || []).map((season: any) => ({
      monthNumber: season.month_number,
      monthName: season.month_name?.trim(),
      avgAuctionsCount: season.avg_auctions_count,
      avgSoldCount: season.avg_sold_count,
      avgSaleRatePct: season.avg_sale_rate_pct,
      avgSalePrice: season.avg_sale_price,
      avgBidRatio: season.avg_bid_ratio,
      totalDataPoints: season.total_data_points,
    }))

    // Transform velocity data (single row result)
    const velocity = velocityData && velocityData.length > 0
      ? {
          avgDaysToSell: velocityData[0].avg_days_to_sell,
          saleThroughRate: velocityData[0].sale_through_rate,
          avgBiddersPerProperty: velocityData[0].avg_bidders_per_property,
          competitionLevel: velocityData[0].competition_level,
          marketHeatScore: velocityData[0].market_heat_score,
        }
      : null

    // Calculate summary statistics from trends
    const latestTrend = transformedTrends[0]
    const previousTrend = transformedTrends[1]

    const summary = latestTrend
      ? {
          latestMonth: latestTrend.monthDate,
          latestAuctionsCount: latestTrend.auctionsCount,
          latestSaleRatePct: latestTrend.saleRatePct,
          latestAvgPrice: latestTrend.avgSalePrice,
          priceChangePct: latestTrend.monthOverMonthPriceChangePct,
          volumeChangePct: latestTrend.monthOverMonthVolumeChangePct,
          trend: latestTrend.monthOverMonthPriceChangePct && latestTrend.monthOverMonthPriceChangePct > 0
            ? "up"
            : latestTrend.monthOverMonthPriceChangePct && latestTrend.monthOverMonthPriceChangePct < 0
            ? "down"
            : "stable",
        }
      : null

    return NextResponse.json({
      data: {
        county: {
          id: countyData.id,
          name: countyData.county_name,
          state: countyData.state_code,
          stateName: countyData.state_name,
        },
        trends: transformedTrends,
        seasonal: transformedSeasonal,
        velocity,
        summary,
        filters: {
          monthsBack,
          propertyType,
        },
      },
      source: "database",
    })
  } catch (error) {
    console.error("[API County Trends] Server error:", error)
    return NextResponse.json(
      { error: "Server error", message: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}

import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/client"

/**
 * GET /api/analytics/auction-history
 * Returns historical auction results by county with analytics
 * Query params:
 *  - county_id: UUID (required)
 *  - sale_status: string (optional, default: 'sold')
 *  - start_date: ISO date (optional)
 *  - end_date: ISO date (optional)
 *  - limit: number (optional, default: 100)
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
    const saleStatus = searchParams.get("sale_status") || "sold"
    const startDate = searchParams.get("start_date")
    const endDate = searchParams.get("end_date")
    const limit = parseInt(searchParams.get("limit") || "100", 10)

    if (!countyId) {
      return NextResponse.json(
        { error: "county_id parameter is required" },
        { status: 400 }
      )
    }

    // Get historical auction results
    const { data: historyData, error: historyError } = await supabase.rpc(
      "get_auction_history_by_county",
      {
        p_county_id: countyId,
        p_sale_status: saleStatus,
        p_start_date: startDate,
        p_end_date: endDate,
        p_limit: limit,
      }
    )

    if (historyError) {
      console.error("[API Auction History] History query error:", historyError)
      return NextResponse.json(
        { error: "Database error", message: historyError.message },
        { status: 500 }
      )
    }

    // Get county analytics summary
    const { data: analyticsData, error: analyticsError } = await supabase
      .from("vw_auction_analytics")
      .select("*")
      .eq("county_id", countyId)
      .single()

    if (analyticsError && analyticsError.code !== "PGRST116") {
      console.error("[API Auction History] Analytics error:", analyticsError)
    }

    // Get county information
    const { data: countyData, error: countyError } = await supabase
      .from("counties")
      .select("id, county_name, state_code, state_name")
      .eq("id", countyId)
      .single()

    if (countyError) {
      console.error("[API Auction History] County error:", countyError)
    }

    // Transform history data to frontend format
    const transformedHistory = (historyData || []).map((record: any) => ({
      id: record.result_id,
      parcelId: record.parcel_id,
      address: record.property_address,
      saleDate: record.sale_date,
      saleType: record.sale_type,
      openingBid: record.opening_bid,
      finalSalePrice: record.final_sale_price,
      bidRatio: record.bid_ratio,
      propertyType: record.property_type,
      numberOfBids: record.number_of_bids,
    }))

    // Transform analytics data
    const analytics = analyticsData
      ? {
          totalAuctions: analyticsData.total_auctions,
          totalSold: analyticsData.total_sold,
          totalUnsold: analyticsData.total_unsold,
          saleRatePct: analyticsData.sale_rate_pct,
          avgSalePrice: analyticsData.avg_sale_price,
          minSalePrice: analyticsData.min_sale_price,
          maxSalePrice: analyticsData.max_sale_price,
          medianSalePrice: analyticsData.median_sale_price,
          avgBidRatio: analyticsData.avg_bid_ratio,
          minBidRatio: analyticsData.min_bid_ratio,
          maxBidRatio: analyticsData.max_bid_ratio,
          medianBidRatio: analyticsData.median_bid_ratio,
          avgRecoveryRatio: analyticsData.avg_recovery_ratio,
          avgMarketRatio: analyticsData.avg_market_ratio,
          totalSalesVolume: analyticsData.total_sales_volume,
          avgBidsPerProperty: analyticsData.avg_bids_per_property,
          avgBiddersPerProperty: analyticsData.avg_bidders_per_property,
          earliestSale: analyticsData.earliest_sale,
          latestSale: analyticsData.latest_sale,
          mostCommonPropertyType: analyticsData.most_common_property_type,
          mostCommonPlatform: analyticsData.most_common_platform,
        }
      : null

    return NextResponse.json({
      data: {
        county: countyData
          ? {
              id: countyData.id,
              name: countyData.county_name,
              state: countyData.state_code,
              stateName: countyData.state_name,
            }
          : null,
        history: transformedHistory,
        analytics,
        filters: {
          saleStatus,
          startDate,
          endDate,
          limit,
        },
      },
      source: "database",
    })
  } catch (error) {
    console.error("[API Auction History] Server error:", error)
    return NextResponse.json(
      { error: "Server error", message: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}

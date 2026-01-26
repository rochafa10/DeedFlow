import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/client"

/**
 * GET /api/counties
 * Returns all counties with property counts, progress, and next auction dates
 *
 * Note: Counties are PUBLIC REFERENCE DATA (government jurisdictions).
 * Organization scoping happens at the watchlist/deal/assignment level.
 * This endpoint is accessible to all users for browsing auction jurisdictions.
 *
 * Query parameters:
 * - limit: number (default: all, max: 500)
 * - offset: number (default: 0)
 * - state_code: string (filter by state abbreviation, e.g., 'PA', 'FL')
 * - has_properties: boolean (only show counties with properties)
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
    const limit = searchParams.get("limit") ? Math.min(Number(searchParams.get("limit")), 500) : undefined
    const offset = Number(searchParams.get("offset")) || 0
    const stateCode = searchParams.get("state_code")
    const hasProperties = searchParams.get("has_properties") === "true"

    // Build query for counties
    let query = supabase
      .from("counties")
      .select(`
        id,
        county_name,
        state_code,
        state_name,
        last_researched_at,
        created_at
      `)
      .order("county_name", { ascending: true })

    // Apply filters
    if (stateCode) {
      query = query.eq("state_code", stateCode.toUpperCase())
    }

    // Apply pagination if limit specified
    if (limit !== undefined) {
      query = query.range(offset, offset + limit - 1)
    }

    // Get all counties with property counts and upcoming sales
    const { data: counties, error: countiesError } = await query

    if (countiesError) {
      console.error("[API Counties] Database error:", countiesError)
      return NextResponse.json(
        { error: "Database error", message: countiesError.message },
        { status: 500 }
      )
    }

    // Get property counts per county using SQL aggregation (avoids 1000 row limit)
    let propertyCountsData: { county_id: string; count?: number }[] | null = null

    const { data: rpcCounts, error: propCountError } = await supabase
      .rpc('get_property_counts_by_county')

    if (propCountError) {
      console.error("[API Counties] Property count error:", propCountError)
      // Fallback: try direct query with high limit
      const { data: fallbackCounts } = await supabase
        .from("properties")
        .select("county_id")
        .limit(50000)
      propertyCountsData = fallbackCounts
    } else {
      propertyCountsData = rpcCounts
    }

    // Get upcoming sales per county
    const { data: upcomingSales, error: salesError } = await supabase
      .from("upcoming_sales")
      .select(`
        county_id,
        sale_date,
        property_count
      `)
      .gte("sale_date", new Date().toISOString())
      .order("sale_date", { ascending: true })

    if (salesError) {
      console.error("[API Counties] Sales error:", salesError)
    }

    // Get documents count per county
    const { data: documents, error: docsError } = await supabase
      .from("documents")
      .select("county_id")
      .limit(10000)

    if (docsError) {
      console.error("[API Counties] Documents error:", docsError)
    }

    // Get regrid and validation counts per county for progress calculation
    // Use high limit to avoid Supabase default 1000 row limit
    const { data: progressData, error: progressError } = await supabase
      .from("properties")
      .select("county_id, has_regrid_data, visual_validation_status")
      .limit(50000)

    if (progressError) {
      console.error("[API Counties] Progress error:", progressError)
    }

    // Count properties per county
    const propertyCountMap = new Map<string, number>()
    if (propertyCountsData) {
      propertyCountsData.forEach((p: { county_id: string; count?: number }) => {
        if (p.count !== undefined) {
          // RPC format: { county_id, count }
          propertyCountMap.set(p.county_id, Number(p.count))
        } else {
          // Fallback format: { county_id } - increment count
          const count = propertyCountMap.get(p.county_id) || 0
          propertyCountMap.set(p.county_id, count + 1)
        }
      })
    }

    // Count documents per county
    const documentCountMap = new Map<string, number>()
    if (documents) {
      documents.forEach((d: { county_id: string }) => {
        const count = documentCountMap.get(d.county_id) || 0
        documentCountMap.set(d.county_id, count + 1)
      })
    }

    // Get earliest upcoming sale per county
    const nextSaleMap = new Map<string, { date: Date; propertyCount: number }>()
    if (upcomingSales) {
      upcomingSales.forEach((s: { county_id: string; sale_date: string; property_count: number | null }) => {
        if (!nextSaleMap.has(s.county_id)) {
          nextSaleMap.set(s.county_id, {
            date: new Date(s.sale_date),
            propertyCount: s.property_count || 0
          })
        }
      })
    }

    // Calculate progress per county (properties with regrid data / total)
    const progressMap = new Map<string, { total: number; regrid: number; validated: number }>()
    if (progressData) {
      progressData.forEach((p: { county_id: string; has_regrid_data: boolean; visual_validation_status: string | null }) => {
        const current = progressMap.get(p.county_id) || { total: 0, regrid: 0, validated: 0 }
        current.total++
        if (p.has_regrid_data) current.regrid++
        if (p.visual_validation_status) current.validated++
        progressMap.set(p.county_id, current)
      })
    }

    // Transform data to frontend format
    let transformedCounties = (counties || []).map((county) => {
      const propertyCount = propertyCountMap.get(county.id) || 0
      const documentCount = documentCountMap.get(county.id) || 0
      const nextSale = nextSaleMap.get(county.id)
      const progress = progressMap.get(county.id)

      // Calculate progress percentage (based on regrid completion)
      let progressPct = 0
      if (progress && progress.total > 0) {
        progressPct = Math.round((progress.regrid / progress.total) * 100)
      }

      // Calculate days until auction
      let daysUntilAuction: number | null = null
      let nextAuctionDate: string | null = null
      if (nextSale) {
        const diffTime = nextSale.date.getTime() - Date.now()
        daysUntilAuction = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        nextAuctionDate = nextSale.date.toLocaleDateString("en-US", {
          month: "short",
          day: "2-digit",
          year: "numeric"
        })
      }

      // Determine status based on property count and last_researched_at
      let status: "active" | "pending" | "archived" = "pending"
      if (propertyCount > 0 || county.last_researched_at) {
        status = "active"
      }

      return {
        id: county.id,
        name: county.county_name,
        state: county.state_code,
        stateName: county.state_name,
        status,
        propertyCount,
        progress: progressPct,
        nextAuctionDate,
        daysUntilAuction,
        documentsCount: documentCount,
        researchedAt: county.last_researched_at,
      }
    })

    // Apply has_properties filter if requested
    if (hasProperties) {
      transformedCounties = transformedCounties.filter(county => county.propertyCount > 0)
    }

    return NextResponse.json({
      data: transformedCounties,
      total: transformedCounties.length,
      source: "database",
    })
  } catch (error) {
    console.error("[API Counties] Server error:", error)
    return NextResponse.json(
      { error: "Server error", message: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}

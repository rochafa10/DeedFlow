import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/client"

/**
 * GET /api/counties
 * Returns all counties with property counts, progress, and next auction dates
 */
export async function GET() {
  try {
    const supabase = createServerClient()

    if (!supabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      )
    }

    // Get all counties with property counts and upcoming sales
    const { data: counties, error: countiesError } = await supabase
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

    if (countiesError) {
      console.error("[API Counties] Database error:", countiesError)
      return NextResponse.json(
        { error: "Database error", message: countiesError.message },
        { status: 500 }
      )
    }

    // Get property counts per county
    const { data: propertyCounts, error: propCountError } = await supabase
      .from("properties")
      .select("county_id")

    if (propCountError) {
      console.error("[API Counties] Property count error:", propCountError)
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

    if (docsError) {
      console.error("[API Counties] Documents error:", docsError)
    }

    // Get regrid and validation counts per county for progress calculation
    const { data: progressData, error: progressError } = await supabase
      .from("properties")
      .select("county_id, has_regrid_data, visual_validation_status")

    if (progressError) {
      console.error("[API Counties] Progress error:", progressError)
    }

    // Count properties per county
    const propertyCountMap = new Map<string, number>()
    if (propertyCounts) {
      propertyCounts.forEach((p: { county_id: string }) => {
        const count = propertyCountMap.get(p.county_id) || 0
        propertyCountMap.set(p.county_id, count + 1)
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
    const transformedCounties = (counties || []).map((county) => {
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

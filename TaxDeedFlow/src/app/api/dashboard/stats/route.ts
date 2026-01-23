import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/client"
import type { DashboardData } from "@/types/dashboard"

// Type for upcoming sales query with joined counties
interface UpcomingSaleWithCounty {
  id: string
  sale_date: string
  property_count: number | null
  counties: {
    county_name: string
    state_code: string
  } | null
}

// Type for county progress RPC result
interface CountyProgressRow {
  id: string
  county_name: string
  state_code: string
  total_properties: number
  regrid_count: number
  validated_count: number
  approved_count: number
  days_until_auction: number | null
}

// Type for bottleneck items
interface BottleneckItem {
  title: string
  count: number
  severity: "critical" | "warning"
  message: string
}

// Mock data for development when Supabase is not configured
const MOCK_DATA: DashboardData = {
  stats: {
    counties: { total: 12, trend: "+2 this week" },
    properties: { total: 7375, trend: "+842 new" },
    approved: { total: 156, percentage: "2.1%" },
    pending: { total: 7219, percentage: "97.9%" },
    auctions: { total: 3, urgency: "urgent" },
  },
  funnel: {
    parsed: 7375,
    enriched: 17,
    validated: 0,
    approved: 0,
  },
  upcomingAuctions: [
    {
      id: "1",
      county: "Westmoreland",
      state: "PA",
      date: "Jan 16, 2026",
      daysUntil: 7,
      propertyCount: 172,
    },
    {
      id: "2",
      county: "Blair",
      state: "PA",
      date: "Mar 11, 2026",
      daysUntil: 62,
      propertyCount: 252,
    },
    {
      id: "3",
      county: "Somerset",
      state: "PA",
      date: "Sep 08, 2026",
      daysUntil: 242,
      propertyCount: 2663,
    },
  ],
  bottlenecks: [
    {
      title: "Regrid Enrichment",
      count: 7358,
      severity: "critical",
      message: "Properties waiting for Regrid data",
    },
    {
      title: "Visual Validation",
      count: 17,
      severity: "warning",
      message: "Properties ready for validation",
    },
  ],
  recentActivity: [
    {
      id: "1",
      action: "Session completed",
      details: "Processed 150 properties",
      time: "10:32 AM",
      timestamp: new Date(),
    },
    {
      id: "2",
      action: "Batch job started",
      details: "Regrid scraping - Somerset",
      time: "10:15 AM",
      timestamp: new Date(),
    },
  ],
  countyProgress: [
    {
      id: "1",
      county: "Westmoreland",
      state: "PA",
      total: 172,
      regridCount: 0,
      regridPercentage: 0,
      validated: 0,
      approved: 0,
      daysUntilAuction: 7,
    },
  ],
}

export async function GET() {
  try {
    const supabase = createServerClient()

    // If Supabase is not configured, return mock data
    if (!supabase) {
      console.log("[API] Supabase not configured, returning mock data")
      return NextResponse.json({
        data: MOCK_DATA,
        source: "mock",
      })
    }

    // Fetch real data from Supabase
    const [
      countiesResult,
      propertiesResult,
      approvedResult,
      upcomingAuctionsResult,
      regridResult,
      validatedResult,
      countyProgressResult,
    ] = await Promise.all([
      // Count counties
      supabase.from("counties").select("*", { count: "exact", head: true }),

      // Count properties
      supabase.from("properties").select("*", { count: "exact", head: true }),

      // Count approved properties (validation_status = 'approved')
      supabase
        .from("property_visual_validation")
        .select("*", { count: "exact", head: true })
        .eq("validation_status", "approved"),

      // Get upcoming auctions (next 90 days)
      supabase
        .from("upcoming_sales")
        .select(`
          id,
          sale_date,
          property_count,
          counties!inner(county_name, state_code)
        `)
        .gte("sale_date", new Date().toISOString())
        .order("sale_date", { ascending: true })
        .limit(10),

      // Count enriched properties (has regrid_data)
      supabase.from("regrid_data").select("*", { count: "exact", head: true }),

      // Count validated properties
      supabase
        .from("property_visual_validation")
        .select("*", { count: "exact", head: true }),

      // Get county progress with property counts
      supabase.rpc("get_county_progress_for_dashboard"),
    ])

    // Calculate stats
    const totalCounties = countiesResult.count ?? 0
    const totalProperties = propertiesResult.count ?? 0
    const totalApproved = approvedResult.count ?? 0
    const totalEnriched = regridResult.count ?? 0
    const totalValidated = validatedResult.count ?? 0
    const totalPending = totalProperties - totalApproved

    // Calculate days until auction
    const upcomingAuctions = (upcomingAuctionsResult.data as UpcomingSaleWithCounty[] | null ?? []).map(
      (auction) => {
        const saleDate = new Date(auction.sale_date)
        const today = new Date()
        const diffTime = saleDate.getTime() - today.getTime()
        const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        return {
          id: auction.id,
          county: auction.counties?.county_name ?? "Unknown",
          state: auction.counties?.state_code ?? "??",
          date: saleDate.toLocaleDateString("en-US", {
            month: "short",
            day: "2-digit",
            year: "numeric",
          }),
          daysUntil,
          propertyCount: auction.property_count ?? 0,
        }
      }
    )

    // Count auctions in next 7 days
    const urgentAuctions = upcomingAuctions.filter((a) => a.daysUntil <= 7)

    const data: DashboardData = {
      stats: {
        counties: {
          total: totalCounties,
          trend: `${totalCounties} researched`,
        },
        properties: {
          total: totalProperties,
          trend: `In pipeline`,
        },
        approved: {
          total: totalApproved,
          percentage:
            totalProperties > 0
              ? `${((totalApproved / totalProperties) * 100).toFixed(1)}%`
              : "0%",
        },
        pending: {
          total: totalPending,
          percentage:
            totalProperties > 0
              ? `${((totalPending / totalProperties) * 100).toFixed(1)}%`
              : "0%",
        },
        auctions: {
          total: urgentAuctions.length > 0 ? urgentAuctions.length : upcomingAuctions.length,
          urgency: urgentAuctions.length > 0 ? "urgent" : "normal",
        },
      },
      funnel: {
        parsed: totalProperties,
        enriched: totalEnriched,
        validated: totalValidated,
        approved: totalApproved,
      },
      upcomingAuctions: upcomingAuctions.slice(0, 5),
      bottlenecks: calculateBottlenecks(
        totalProperties,
        totalEnriched,
        totalValidated
      ),
      recentActivity: [], // TODO: Implement activity feed from orchestration_sessions
      countyProgress: (countyProgressResult.data as CountyProgressRow[] | null ?? []).map((county) => ({
        id: county.id,
        county: county.county_name,
        state: county.state_code,
        total: county.total_properties,
        regridCount: county.regrid_count,
        regridPercentage: county.total_properties > 0
          ? Math.round((county.regrid_count / county.total_properties) * 100)
          : 0,
        validated: county.validated_count,
        approved: county.approved_count,
        daysUntilAuction: county.days_until_auction,
      })),
    }

    return NextResponse.json({
      data,
      source: "database",
    })
  } catch (error) {
    console.error("[API] Dashboard stats error:", error)

    // Return mock data on error
    return NextResponse.json({
      data: MOCK_DATA,
      source: "mock",
      error: "Failed to fetch from database",
    })
  }
}

function calculateBottlenecks(
  totalProperties: number,
  enriched: number,
  validated: number
): BottleneckItem[] {
  const bottlenecks: BottleneckItem[] = []

  const needsEnrichment = totalProperties - enriched
  if (needsEnrichment > 0) {
    bottlenecks.push({
      title: "Regrid Enrichment",
      count: needsEnrichment,
      severity: needsEnrichment > 1000 ? "critical" : "warning",
      message: "Properties waiting for Regrid data",
    })
  }

  const needsValidation = enriched - validated
  if (needsValidation > 0) {
    bottlenecks.push({
      title: "Visual Validation",
      count: needsValidation,
      severity: needsValidation > 100 ? "critical" : "warning",
      message: "Properties ready for validation",
    })
  }

  return bottlenecks
}

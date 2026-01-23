import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/client"
import { logger } from "@/lib/logger"

const apiLogger = logger.withContext("Properties With Regrid API")

/**
 * GET /api/properties/with-regrid
 *
 * Returns a list of properties that have regrid data available.
 * Used for property selectors in demo/report pages.
 *
 * @returns JSON array of properties with id, parcel_id, address, county, and total_due
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

    // Fetch properties with regrid data
    const { data, error } = await supabase
      .from("properties")
      .select(`
        id,
        parcel_id,
        property_address,
        total_due,
        sale_type,
        counties (
          county_name,
          state_code
        )
      `)
      .eq("has_regrid_data", true)
      .order("property_address", { ascending: true })
      .limit(100)

    if (error) {
      apiLogger.error("Database error", { error: error.message })
      return NextResponse.json(
        {
          error: "Database error",
          message: error.message,
        },
        { status: 500 }
      )
    }

    // Transform the data for easier consumption
    const properties = (data ?? []).map((p: Record<string, unknown>) => {
      const county = p.counties as { county_name: string; state_code: string } | null
      return {
        id: p.id,
        parcelId: p.parcel_id,
        address: p.property_address || "Address not available",
        county: county?.county_name || "Unknown",
        state: county?.state_code || "PA",
        totalDue: p.total_due ? Number(p.total_due) : null,
        saleType: p.sale_type,
      }
    })

    return NextResponse.json({
      data: properties,
      count: properties.length,
      source: "database",
    })
  } catch (error) {
    apiLogger.error("Server error", { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json(
      {
        error: "Server error",
        message: "An unexpected error occurred",
      },
      { status: 500 }
    )
  }
}

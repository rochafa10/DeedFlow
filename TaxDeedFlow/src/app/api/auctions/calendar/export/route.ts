import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/client"
import {
  generateAuctionCalendar,
  generateCalendarFilename,
  type AuctionEvent,
} from "@/lib/calendar/ics-generator"

/**
 * GET /api/auctions/calendar/export
 * Exports upcoming auctions as ICS calendar file
 *
 * Query params:
 * - county_id (optional): Filter by specific county UUID
 * - include_alarms (optional): Include calendar reminders (default: true)
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
    const searchParams = request.nextUrl.searchParams
    const countyId = searchParams.get("county_id")
    const includeAlarms = searchParams.get("include_alarms") !== "false"

    // Build query for upcoming sales with county info
    let query = supabase
      .from("upcoming_sales")
      .select(`
        id,
        sale_type,
        sale_date,
        registration_deadline,
        platform,
        deposit_required,
        property_count,
        location,
        status,
        counties (
          id,
          county_name,
          state_code
        )
      `)
      .gte("sale_date", new Date().toISOString())
      .order("sale_date", { ascending: true })

    // Apply county filter if provided
    if (countyId) {
      query = query.eq("county_id", countyId)
    }

    const { data: sales, error: salesError } = await query

    if (salesError) {
      console.error("[API Calendar Export] Database error:", salesError)
      return NextResponse.json(
        { error: "Database error", message: salesError.message },
        { status: 500 }
      )
    }

    // Handle no results
    if (!sales || sales.length === 0) {
      return NextResponse.json(
        { error: "No upcoming auctions found" },
        { status: 404 }
      )
    }

    // Transform sales to AuctionEvent format
    const auctionEvents: AuctionEvent[] = sales.map((sale: any) => ({
      id: sale.id,
      county: sale.counties?.county_name || "Unknown",
      state: sale.counties?.state_code || "??",
      date: sale.sale_date,
      type: sale.sale_type || "Tax Deed",
      platform: sale.platform || "Unknown",
      location: sale.location || "TBD",
      propertyCount: sale.property_count || 0,
      registrationDeadline: sale.registration_deadline,
      depositRequired: sale.deposit_required
        ? `$${Number(sale.deposit_required).toLocaleString()}`
        : undefined,
    }))

    // Generate ICS calendar content
    const icsContent = generateAuctionCalendar(auctionEvents, {
      includeAlarms,
      alarmMinutesBefore: [4320, 1440, 360], // 3 days, 1 day, 6 hours
    })

    if (!icsContent) {
      console.error("[API Calendar Export] Failed to generate ICS content")
      return NextResponse.json(
        { error: "Failed to generate calendar file" },
        { status: 500 }
      )
    }

    // Get county name for filename if filtering by county
    let countyName: string | undefined
    if (countyId && sales.length > 0) {
      const firstSale = sales[0] as any
      countyName = firstSale.counties?.county_name
    }

    const filename = generateCalendarFilename(countyName)

    // Return ICS file with appropriate headers
    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    })
  } catch (error) {
    console.error("[API Calendar Export] Server error:", error)
    return NextResponse.json(
      { error: "Server error", message: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}

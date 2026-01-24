import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/client"
import { logger } from "@/lib/logger"

/**
 * GET /api/auctions
 * Returns upcoming auctions with county info, property counts, and registration deadlines
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

    // Get all upcoming sales with county info
    const { data: sales, error: salesError } = await supabase
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

    if (salesError) {
      logger.error("[API Auctions] Database error:", { error: salesError.message, code: salesError.code })
      return NextResponse.json(
        { error: "Database error", message: salesError.message },
        { status: 500 }
      )
    }

    // Get auction alerts
    const { data: alerts, error: alertsError } = await supabase
      .from("auction_alerts")
      .select(`
        id,
        alert_type,
        severity,
        title,
        message,
        days_until_event,
        acknowledged,
        created_at,
        county_id,
        sale_id
      `)
      .eq("acknowledged", false)
      .order("created_at", { ascending: false })
      .limit(10)

    if (alertsError) {
      logger.error("[API Auctions] Alerts error:", { error: alertsError.message, code: alertsError.code })
    }

    // Transform sales to frontend format
    const transformedSales = (sales || []).map((sale: any) => {
      const saleDate = new Date(sale.sale_date)
      const today = new Date()
      const daysUntil = Math.ceil((saleDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      let registrationDaysUntil: number | null = null
      if (sale.registration_deadline) {
        const regDate = new Date(sale.registration_deadline)
        registrationDaysUntil = Math.ceil((regDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      }

      return {
        id: sale.id,
        county: sale.counties?.county_name || "Unknown",
        state: sale.counties?.state_code || "??",
        countyId: sale.counties?.id,
        date: sale.sale_date,
        type: sale.sale_type || "Tax Deed",
        platform: sale.platform || "Unknown",
        location: sale.location || "TBD",
        propertyCount: sale.property_count || 0,
        registrationDeadline: sale.registration_deadline,
        registrationDaysUntil,
        depositRequired: sale.deposit_required
          ? `$${Number(sale.deposit_required).toLocaleString()}`
          : "TBD",
        status: sale.status || "upcoming",
        daysUntil,
      }
    })

    // Transform alerts to frontend format
    const transformedAlerts = (alerts || []).map((alert: any) => ({
      id: alert.id,
      type: alert.severity || "info",
      title: alert.title,
      message: alert.message,
      date: alert.created_at,
      auctionId: alert.sale_id,
      daysUntilEvent: alert.days_until_event,
    }))

    // Calculate stats
    const thisMonth = new Date().getMonth()
    const thisYear = new Date().getFullYear()
    const auctionsThisMonth = transformedSales.filter((sale) => {
      const saleDate = new Date(sale.date)
      return saleDate.getMonth() === thisMonth && saleDate.getFullYear() === thisYear
    }).length

    return NextResponse.json({
      data: {
        auctions: transformedSales,
        alerts: transformedAlerts,
        stats: {
          totalUpcoming: transformedSales.length,
          thisMonth: auctionsThisMonth,
        }
      },
      source: "database",
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    logger.error("[API Auctions] Server error:", { message })
    return NextResponse.json(
      { error: "Server error", message: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}

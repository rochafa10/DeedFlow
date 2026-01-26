import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/client"
import { logger } from "@/lib/logger"

/**
 * POST /api/auction-research
 *
 * Queue an auction for property list research. This is used when an auction
 * has 0 properties and needs the Research Agent to find and parse the property list.
 *
 * Request Body:
 *   - saleId: UUID of the upcoming_sales record to queue for research
 *
 * Response:
 *   - message: Status message
 *   - queueId: UUID of the queue entry (existing or newly created)
 *   - county: County name for reference
 *   - saleDate: Sale date for reference
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { saleId } = body

    // Validate required field
    if (!saleId) {
      return NextResponse.json(
        { error: "Missing required field: saleId" },
        { status: 400 }
      )
    }

    const supabase = createServerClient()
    if (!supabase) {
      logger.warn("[API Auction Research] Database not configured")
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      )
    }

    // Get auction details including county info
    const { data: sale, error: saleError } = await supabase
      .from("upcoming_sales")
      .select(`
        id,
        county_id,
        sale_date,
        sale_type,
        property_count,
        counties (
          county_name,
          state_code
        )
      `)
      .eq("id", saleId)
      .single()

    if (saleError || !sale) {
      logger.error("[API Auction Research] Sale not found:", {
        saleId,
        error: saleError?.message
      })
      return NextResponse.json(
        { error: "Auction not found", details: saleError?.message },
        { status: 404 }
      )
    }

    // Check if this auction is already queued with pending status
    // Include sale_type in duplicate check to allow different sale types on same date
    const { data: existing, error: existingError } = await supabase
      .from("auction_research_queue")
      .select("id, status, created_at")
      .eq("county_id", sale.county_id)
      .eq("extracted_sale_date", sale.sale_date ? new Date(sale.sale_date).toISOString().split('T')[0] : null)
      .eq("extracted_sale_type", sale.sale_type || null)
      .eq("status", "pending")
      .maybeSingle()

    if (existingError) {
      logger.error("[API Auction Research] Error checking existing queue:", {
        error: existingError.message
      })
    }

    // If already queued, return the existing entry
    if (existing) {
      logger.info("[API Auction Research] Auction already queued:", {
        saleId,
        queueId: existing.id
      })
      return NextResponse.json({
        message: "Already queued for research",
        queueId: existing.id,
        status: existing.status,
        county: (sale.counties as unknown as { county_name: string; state_code: string } | null)?.county_name,
        saleDate: sale.sale_date
      })
    }

    // Add to research queue
    const { data: queueEntry, error: queueError } = await supabase
      .from("auction_research_queue")
      .insert({
        county_id: sale.county_id,
        extracted_sale_date: sale.sale_date ? new Date(sale.sale_date).toISOString().split('T')[0] : null,
        extracted_sale_type: sale.sale_type,
        status: "pending",
        property_count: 0
      })
      .select("id, status, created_at")
      .single()

    if (queueError) {
      logger.error("[API Auction Research] Failed to queue research:", {
        error: queueError.message,
        code: queueError.code,
        saleId
      })
      return NextResponse.json(
        { error: "Failed to queue research", details: queueError.message },
        { status: 500 }
      )
    }

    logger.info("[API Auction Research] Successfully queued auction for research:", {
      saleId,
      queueId: queueEntry.id,
      county: (sale.counties as unknown as { county_name: string; state_code: string } | null)?.county_name,
      saleType: sale.sale_type
    })

    return NextResponse.json({
      message: "Queued for property list research",
      queueId: queueEntry.id,
      status: queueEntry.status,
      county: (sale.counties as unknown as { county_name: string; state_code: string } | null)?.county_name,
      saleDate: sale.sale_date,
      saleType: sale.sale_type
    })

  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    logger.error("[API Auction Research] Server error:", { message })
    return NextResponse.json(
      { error: "Server error", message: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}

/**
 * GET /api/auction-research
 *
 * Get research queue status. Returns list of queue entries with county info.
 *
 * Query Parameters:
 *   - county_id: Optional UUID to filter by county
 *   - status: Optional status filter (pending, researching, resolved, failed)
 *   - limit: Optional limit (default 50)
 *
 * Response:
 *   - data: Array of queue entries with county details
 *   - total: Total count of matching entries
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const countyId = searchParams.get("county_id")
    const status = searchParams.get("status")
    const limit = parseInt(searchParams.get("limit") || "50", 10)

    const supabase = createServerClient()
    if (!supabase) {
      logger.warn("[API Auction Research] Database not configured")
      return NextResponse.json({ data: [], total: 0 })
    }

    // Build query with county join
    let query = supabase
      .from("auction_research_queue")
      .select(`
        id,
        county_id,
        property_count,
        source_document_id,
        extracted_sale_date,
        extracted_sale_type,
        status,
        resolution_notes,
        resolved_sale_id,
        assigned_agent,
        assigned_at,
        created_at,
        updated_at,
        counties (
          county_name,
          state_code
        )
      `, { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(limit)

    // Apply filters
    if (countyId) {
      query = query.eq("county_id", countyId)
    }

    if (status) {
      query = query.eq("status", status)
    }

    const { data, error, count } = await query

    if (error) {
      logger.error("[API Auction Research] Query error:", {
        error: error.message,
        code: error.code
      })
      return NextResponse.json({
        data: [],
        total: 0,
        error: error.message
      })
    }

    // Transform data to include county name at top level for convenience
    const transformedData = (data || []).map((entry: Record<string, unknown>) => {
      const counties = entry.counties as { county_name: string; state_code: string } | null
      return {
        ...entry,
        countyName: counties?.county_name || "Unknown",
        stateCode: counties?.state_code || "??",
        // Calculate priority based on property count
        priority: entry.property_count && (entry.property_count as number) >= 100
          ? "HIGH"
          : entry.property_count && (entry.property_count as number) >= 25
            ? "MEDIUM"
            : "LOW"
      }
    })

    return NextResponse.json({
      data: transformedData,
      total: count || 0
    })

  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    logger.error("[API Auction Research] Server error:", { message })
    return NextResponse.json({
      data: [],
      total: 0,
      error: "An unexpected error occurred"
    })
  }
}

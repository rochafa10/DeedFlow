import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/client"
import { getTitleService } from "@/lib/api/services"
import type { TitleSearchQuery } from "@/lib/api/services/title-service"

/**
 * POST /api/title-search
 * Performs comprehensive title search for a property and stores results in database
 *
 * Called by:
 * - Frontend property report page
 * - n8n workflow "TDF - Title Research Agent" via HTTP Request node
 * - Batch processing pipeline
 *
 * Request body (single property):
 * {
 *   propertyId: string,      // Required: Property UUID
 *   forceRefresh?: boolean   // Optional: Skip cache and force new search
 * }
 *
 * Request body (batch mode):
 * {
 *   propertyIds: string[],   // Required: Array of Property UUIDs
 *   batch: true,             // Required: Enable batch mode
 *   batchSize?: number       // Optional: Batch size (default: 20)
 * }
 *
 * Response (single):
 * {
 *   success: boolean,
 *   propertyId: string,
 *   titleSearchId?: string,
 *   data?: {
 *     totalLiens: number,
 *     survivingLiens: number,
 *     titleRiskScore: number,
 *     recommendation: string
 *   },
 *   error?: string
 * }
 *
 * Response (batch):
 * {
 *   success: boolean,
 *   batchJobId: string,
 *   totalProperties: number,
 *   message: string
 * }
 */
export async function POST(request: NextRequest) {
  // Simple API key validation for n8n workflow calls
  const authHeader = request.headers.get("x-api-key")
  const expectedKey = process.env.INTERNAL_API_KEY || "tdf-internal-scraper-key"

  if (authHeader !== expectedKey) {
    // Allow requests from n8n or the app itself
    const origin = request.headers.get("origin") || ""
    const referer = request.headers.get("referer") || ""
    const isInternal = origin.includes("n8n.lfb-investments.com") ||
                       referer.includes("n8n.lfb-investments.com") ||
                       origin.includes("localhost") || // Allow app requests
                       origin.includes("127.0.0.1") || // Allow local development
                       origin.includes("taxdeedflow") || // Allow production app
                       !origin // Direct API call (no browser origin)

    if (!isInternal && authHeader !== expectedKey) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Invalid API key" },
        { status: 401 }
      )
    }
  }

  try {
    const body = await request.json()
    const { propertyId, propertyIds, batch, batchSize = 20, forceRefresh = false } = body

    // Get database client
    const supabase = createServerClient()

    if (!supabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      )
    }

    // BATCH MODE: Create batch job for multiple properties
    if (batch && propertyIds && Array.isArray(propertyIds)) {
      console.log(`[Title Search] Creating batch job for ${propertyIds.length} properties`)

      // Validate propertyIds array
      if (propertyIds.length === 0) {
        return NextResponse.json(
          { error: "Validation error", message: "propertyIds array cannot be empty" },
          { status: 400 }
        )
      }

      // Get county_id from the first property (for batch job tracking)
      const { data: firstProperty, error: propertyError } = await supabase
        .from("properties")
        .select("county_id")
        .eq("id", propertyIds[0])
        .single()

      if (propertyError || !firstProperty?.county_id) {
        console.error(`[Title Search] Could not find county for property ${propertyIds[0]}`, propertyError)
        // Use a null county_id if we can't determine it
      }

      const countyId = firstProperty?.county_id || null
      const totalItems = propertyIds.length
      const totalBatches = Math.ceil(totalItems / batchSize)

      // Insert batch job into database
      const { data: batchJob, error: batchError } = await supabase
        .from("batch_jobs")
        .insert([
          {
            job_type: "title_research",
            county_id: countyId,
            batch_size: batchSize,
            status: "pending",
            total_items: totalItems,
            processed_items: 0,
            failed_items: 0,
            current_batch: 0,
            total_batches: totalBatches,
            error_count: 0,
          },
        ])
        .select()
        .single()

      if (batchError) {
        console.error("[Title Search] Failed to create batch job:", batchError)
        return NextResponse.json(
          {
            success: false,
            error: "Database error",
            message: batchError.message,
          },
          { status: 500 }
        )
      }

      console.log(`[Title Search] Batch job created: ${batchJob.id}`)

      return NextResponse.json(
        {
          success: true,
          batchJobId: batchJob.id,
          totalProperties: totalItems,
          totalBatches: totalBatches,
          batchSize: batchSize,
          message: `Batch title search job created for ${totalItems} properties`,
        },
        { status: 202 }
      )
    }

    // SINGLE PROPERTY MODE: Process immediately
    if (!propertyId) {
      return NextResponse.json(
        { error: "Validation error", message: "propertyId is required for single property searches" },
        { status: 400 }
      )
    }

    console.log(`[Title Search] Starting title search for property ${propertyId}`)

    // Fetch property details
    const { data: property, error: propertyError } = await supabase
      .from("properties")
      .select("id, parcel_id, address, city, county_name, state, zip_code")
      .eq("id", propertyId)
      .single()

    if (propertyError || !property) {
      console.error(`[Title Search] Property not found: ${propertyId}`, propertyError)
      return NextResponse.json(
        {
          success: false,
          error: "Property not found",
          message: `No property found with ID ${propertyId}`,
          propertyId
        },
        { status: 404 }
      )
    }

    // Check if we already have recent title search data (unless forceRefresh is true)
    if (!forceRefresh) {
      const { data: existingSearch } = await supabase
        .from("title_searches")
        .select("id, search_date, status, title_risk_score, title_recommendation")
        .eq("property_id", propertyId)
        .eq("status", "completed")
        .order("search_date", { ascending: false })
        .limit(1)
        .single()

      if (existingSearch) {
        const searchDate = new Date(existingSearch.search_date)
        const daysSinceSearch = Math.floor((Date.now() - searchDate.getTime()) / (1000 * 60 * 60 * 24))

        // Return cached results if less than 30 days old
        if (daysSinceSearch < 30) {
          console.log(`[Title Search] Using cached search from ${daysSinceSearch} days ago`)

          // Get liens for this search
          const { data: liens } = await supabase
            .from("liens")
            .select("*")
            .eq("title_search_id", existingSearch.id)

          return NextResponse.json({
            success: true,
            propertyId,
            titleSearchId: existingSearch.id,
            cached: true,
            cacheAge: daysSinceSearch,
            data: {
              titleRiskScore: existingSearch.title_risk_score,
              recommendation: existingSearch.title_recommendation,
              totalLiens: liens?.length || 0,
              survivingLiens: liens?.filter(l => l.survives_tax_sale).length || 0,
            }
          })
        }
      }
    }

    // Build title search query
    const titleQuery: TitleSearchQuery = {
      address: property.address || "",
      city: property.city || "",
      state: property.state || "",
      zip: property.zip_code,
      parcelId: property.parcel_id,
      county: property.county_name || "",
      yearsToSearch: 30,
    }

    // Validate we have enough data
    if (!titleQuery.address && !titleQuery.parcelId) {
      return NextResponse.json(
        {
          success: false,
          error: "Insufficient property data",
          message: "Property must have either an address or parcel ID",
          propertyId,
        },
        { status: 422 }
      )
    }

    if (!titleQuery.county || !titleQuery.state) {
      return NextResponse.json(
        {
          success: false,
          error: "Insufficient property data",
          message: "Property must have county and state information",
          propertyId,
        },
        { status: 422 }
      )
    }

    console.log(`[Title Search] Searching title for ${property.address}, ${property.city}, ${property.state}`)

    // Call Title Service
    const titleService = getTitleService()
    const titleResult = await titleService.searchTitleByAddress(titleQuery)

    if (!titleResult.data) {
      console.error(`[Title Search] No data returned from title service`)
      return NextResponse.json({
        success: false,
        error: "Title search failed",
        message: "Title service returned no data",
        propertyId,
      }, { status: 422 })
    }

    const titleData = titleResult.data

    console.log(`[Title Search] Found ${titleData.liens.length} liens, ${titleData.survivingLiens.length} surviving`)

    // Store in database using upsert_title_search function
    const { data: titleSearch, error: titleSearchError } = await supabase
      .rpc("upsert_title_search", {
        p_property_id: propertyId,
        p_status: "completed",
        p_searched_by: "TitleService",
        p_title_company_used: "Mock Provider (Phase 1)",
        p_county_recorder_searched: true,
        p_title_quality: titleData.titleReport.titleQuality,
        p_marketability_score: titleData.titleReport.marketabilityScore,
        p_insurable: titleData.titleReport.insurable,
        p_total_liens_found: titleData.liens.length,
        p_surviving_liens_count: titleData.survivingLiens.length,
        p_surviving_liens_total: titleData.titleReport.survivingLiensTotal,
        p_wiped_liens_total: titleData.titleReport.wipeableLiensTotal,
        p_chain_complete: titleData.chainOfTitle.isComplete,
        p_chain_years_back: titleData.chainOfTitle.yearsCovered,
        p_chain_issues_found: titleData.chainOfTitle.gaps?.length || 0,
        p_title_risk_score: titleData.titleReport.riskScore,
        p_title_recommendation: titleData.titleReport.recommendation,
        p_title_cure_cost: titleData.titleReport.estimatedClearingCost,
        p_quiet_title_needed: titleData.titleIssues.some(i => i.severity === 'critical'),
        p_attorney_review_needed: titleData.titleIssues.some(i => i.severity === 'critical' || i.severity === 'high'),
        p_search_notes: `Searched ${titleData.liens.length} liens, ${titleData.chainOfTitle.entries.length} ownership records`,
      })

    if (titleSearchError) {
      console.error("[Title Search] Failed to store title search:", titleSearchError)
      return NextResponse.json({
        success: false,
        error: "Database error",
        message: titleSearchError.message,
        propertyId,
      }, { status: 500 })
    }

    const titleSearchId = titleSearch

    // Store each lien using upsert_lien function
    let lienErrors = 0
    for (const lien of titleData.liens) {
      const { error: lienError } = await supabase
        .rpc("upsert_lien", {
          p_title_search_id: titleSearchId,
          p_property_id: propertyId,
          p_lien_type: lien.type,
          p_lien_holder: lien.holder,
          p_lien_amount: lien.currentBalance || lien.originalAmount,
          p_filing_date: lien.recordingDate.toISOString().split('T')[0],
          p_recording_reference: lien.recordingRef,
          p_lien_priority: lien.position,
          p_survives_tax_sale: lien.survivesSale,
          p_survivability_basis: "state_law",
          p_lien_status: lien.status,
          p_estimated_payoff: lien.currentBalance,
        })

      if (lienError) {
        console.error(`[Title Search] Failed to store lien ${lien.id}:`, lienError)
        lienErrors++
      }
    }

    if (lienErrors > 0) {
      console.warn(`[Title Search] ${lienErrors} liens failed to store`)
    }

    // Update property has_title_data flag
    await supabase
      .from("properties")
      .update({ has_title_data: true })
      .eq("id", propertyId)

    console.log(`[Title Search] Successfully completed title search for ${propertyId}`)

    return NextResponse.json({
      success: true,
      propertyId,
      titleSearchId,
      data: {
        totalLiens: titleData.liens.length,
        survivingLiens: titleData.survivingLiens.length,
        survivingLiensTotal: titleData.titleReport.survivingLiensTotal,
        wipeableLiensTotal: titleData.titleReport.wipeableLiensTotal,
        titleRiskScore: titleData.titleReport.riskScore,
        recommendation: titleData.titleReport.recommendation,
        titleQuality: titleData.titleReport.titleQuality,
        marketabilityScore: titleData.titleReport.marketabilityScore,
        chainComplete: titleData.chainOfTitle.isComplete,
        chainIssues: titleData.chainOfTitle.gaps?.length || 0,
        titleIssues: titleData.titleIssues.length,
      }
    })

  } catch (error) {
    console.error("[Title Search] Server error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Server error",
        message: error instanceof Error ? error.message : "An unexpected error occurred"
      },
      { status: 500 }
    )
  }
}

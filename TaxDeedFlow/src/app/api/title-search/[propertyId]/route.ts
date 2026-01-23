import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/client"

/**
 * GET /api/title-search/[propertyId]
 * Returns title search data for a single property including liens, deed chain, and title issues
 *
 * Called by:
 * - Frontend property report page
 * - Property details page
 * - Any component needing title search results
 *
 * Response:
 * {
 *   data: {
 *     titleSearch: {...},      // Main title search record
 *     liens: [...],            // Array of liens found
 *     deedChain: [...],        // Deed chain history
 *     titleIssues: [...],      // Title issues discovered
 *     summary: {...}           // Quick reference summary
 *   },
 *   source: "database"
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { propertyId: string } }
) {
  const propertyId = params.propertyId

  try {
    const supabase = createServerClient()

    if (!supabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      )
    }

    // Fetch title search record for this property
    const { data: titleSearch, error: titleSearchError } = await supabase
      .from("title_searches")
      .select(`
        *,
        properties (
          id,
          parcel_id,
          property_address,
          city,
          state_code,
          zip_code,
          total_due,
          sale_date,
          counties (
            county_name,
            state_name
          )
        )
      `)
      .eq("property_id", propertyId)
      .order("search_date", { ascending: false })
      .limit(1)
      .single()

    // If no title search found, return 404
    if (titleSearchError) {
      if (titleSearchError.code === "PGRST116") {
        return NextResponse.json(
          {
            error: "Title search not found",
            message: `No title search data found for property ${propertyId}. Please initiate a title search first.`
          },
          { status: 404 }
        )
      }
      console.error("[API Title Search] Database error:", titleSearchError)
      return NextResponse.json(
        { error: "Database error", message: titleSearchError.message },
        { status: 500 }
      )
    }

    // Fetch liens associated with this title search
    const { data: liens, error: liensError } = await supabase
      .from("liens")
      .select("*")
      .eq("title_search_id", titleSearch.id)
      .order("lien_priority", { ascending: true })

    if (liensError) {
      console.error("[API Title Search] Error fetching liens:", liensError)
    }

    // Fetch deed chain entries
    const { data: deedChain, error: deedChainError } = await supabase
      .from("deed_chain")
      .select("*")
      .eq("title_search_id", titleSearch.id)
      .order("transaction_date", { ascending: false })

    if (deedChainError) {
      console.error("[API Title Search] Error fetching deed chain:", deedChainError)
    }

    // Fetch title issues
    const { data: titleIssues, error: titleIssuesError } = await supabase
      .from("title_issues")
      .select("*")
      .eq("title_search_id", titleSearch.id)
      .order("severity", { ascending: false })

    if (titleIssuesError) {
      console.error("[API Title Search] Error fetching title issues:", titleIssuesError)
    }

    // Calculate summary statistics
    const survivingLiens = liens?.filter(l => l.survives_tax_sale) || []
    const wipeableLiens = liens?.filter(l => !l.survives_tax_sale) || []
    const criticalIssues = titleIssues?.filter(i => i.severity === 'critical') || []
    const severeIssues = titleIssues?.filter(i => i.severity === 'severe') || []

    // Transform data to frontend-friendly format
    const transformedData = {
      titleSearch: {
        id: titleSearch.id,
        propertyId: titleSearch.property_id,
        status: titleSearch.status,
        searchDate: titleSearch.search_date,
        completedAt: titleSearch.completed_at,
        searchedBy: titleSearch.searched_by,

        // Property Info
        property: {
          parcelId: titleSearch.properties?.parcel_id,
          address: titleSearch.properties?.property_address,
          city: titleSearch.properties?.city,
          state: titleSearch.properties?.state_code,
          zipCode: titleSearch.properties?.zip_code,
          county: titleSearch.properties?.counties?.county_name,
          stateName: titleSearch.properties?.counties?.state_name,
          totalDue: titleSearch.properties?.total_due,
          saleDate: titleSearch.properties?.sale_date,
        },

        // Title Quality
        titleQuality: titleSearch.title_quality,
        marketabilityScore: titleSearch.marketability_score,
        insurable: titleSearch.insurable,

        // Sources Searched
        sources: {
          countyRecorder: titleSearch.county_recorder_searched,
          pacer: titleSearch.pacer_searched,
          stateCourts: titleSearch.state_courts_searched,
          titleCompany: titleSearch.title_company_used,
        },

        // Lien Summary
        liensSummary: {
          totalLiensFound: titleSearch.total_liens_found || 0,
          survivingLiensCount: titleSearch.surviving_liens_count || 0,
          survivingLiensTotal: titleSearch.surviving_liens_total || 0,
          wipedLiensTotal: titleSearch.wiped_liens_total || 0,
        },

        // Deed Chain Summary
        chainOfTitle: {
          complete: titleSearch.chain_complete,
          yearsBack: titleSearch.chain_years_back,
          issuesFound: titleSearch.chain_issues_found || 0,
        },

        // Risk Assessment
        risk: {
          titleRiskScore: titleSearch.title_risk_score,
          recommendation: titleSearch.title_recommendation,
        },

        // Cost Estimates
        costs: {
          titleCureCost: titleSearch.title_cure_cost,
          titleInsuranceCost: titleSearch.title_insurance_cost,
          quietTitleNeeded: titleSearch.quiet_title_needed,
          quietTitleCost: titleSearch.quiet_title_cost,
        },

        // Flags
        attorneyReviewNeeded: titleSearch.attorney_review_needed,
        searchNotes: titleSearch.search_notes,
      },

      liens: liens?.map(lien => ({
        id: lien.id,
        type: lien.lien_type,
        holder: lien.lien_holder,
        amount: lien.lien_amount,
        filingDate: lien.filing_date,
        recordingDate: lien.recording_date,
        recordingReference: lien.recording_reference,
        recordingOffice: lien.recording_office,
        priority: lien.lien_priority,
        seniorToTaxLien: lien.senior_to_tax_lien,
        survivesTaxSale: lien.survives_tax_sale,
        survivabilityBasis: lien.survivability_basis,
        survivabilityConfidence: lien.survivability_confidence,
        status: lien.lien_status,
        estimatedPayoff: lien.estimated_payoff,
        contactInfo: lien.lien_holder_contact,
        notes: lien.notes,
      })) || [],

      deedChain: deedChain?.map(entry => ({
        id: entry.id,
        transactionDate: entry.transaction_date,
        grantor: entry.grantor,
        grantee: entry.grantee,
        instrumentType: entry.instrument_type,
        bookPage: entry.book_page,
        documentNumber: entry.document_number,
        consideration: entry.consideration,
        notes: entry.notes,
      })) || [],

      titleIssues: titleIssues?.map(issue => ({
        id: issue.id,
        type: issue.issue_type,
        description: issue.issue_description,
        source: issue.issue_source,
        severity: issue.severity,
        affectsMarketability: issue.affects_marketability,
        preventsSale: issue.prevents_sale,
        preventsFinancing: issue.prevents_financing,
        resolution: {
          required: issue.resolution_required,
          method: issue.resolution_method,
          cost: issue.resolution_cost,
          timeframe: issue.resolution_time,
          probability: issue.resolution_probability,
        },
        legal: {
          attorneyRequired: issue.attorney_required,
          litigationRisk: issue.litigation_risk,
        },
        impact: {
          onValue: issue.impact_on_value,
          dealBreaker: issue.deal_breaker,
        },
        status: issue.issue_status,
        resolutionDate: issue.resolution_date,
        notes: issue.resolution_notes,
      })) || [],

      summary: {
        hasData: true,
        searchCompleted: titleSearch.status === 'completed',
        searchDate: titleSearch.search_date,
        daysSinceSearch: Math.floor((Date.now() - new Date(titleSearch.search_date).getTime()) / (1000 * 60 * 60 * 24)),

        // Quick stats
        totalLiens: liens?.length || 0,
        survivingLiens: survivingLiens.length,
        wipeableLiens: wipeableLiens.length,
        survivingLiensTotal: titleSearch.surviving_liens_total || 0,
        wipeableLiensTotal: titleSearch.wiped_liens_total || 0,

        // Issues
        totalIssues: titleIssues?.length || 0,
        criticalIssues: criticalIssues.length,
        severeIssues: severeIssues.length,

        // Risk
        titleRiskScore: titleSearch.title_risk_score,
        recommendation: titleSearch.title_recommendation,
        titleQuality: titleSearch.title_quality,
        marketabilityScore: titleSearch.marketability_score,

        // Flags
        hasSurvivingLiens: survivingLiens.length > 0,
        hasCriticalIssues: criticalIssues.length > 0,
        needsAttorneyReview: titleSearch.attorney_review_needed,
        needsQuietTitle: titleSearch.quiet_title_needed,

        // Chain
        chainComplete: titleSearch.chain_complete,
        chainYearsBack: titleSearch.chain_years_back,
      },
    }

    return NextResponse.json({
      data: transformedData,
      source: "database",
    })
  } catch (error) {
    console.error("[API Title Search] Server error:", error)
    return NextResponse.json(
      { error: "Server error", message: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}

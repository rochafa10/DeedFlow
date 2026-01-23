import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/client"
import type { AuctionAlert, Document, OfficialLink } from "@/types/database"

/**
 * Property data returned from Supabase query
 */
interface PropertyQueryResult {
  id: string
  parcel_id?: string
  property_address?: string
  owner_name?: string
  total_due?: number
  sale_type?: string
  sale_date?: string
  has_regrid_data: boolean
  visual_validation_status?: string
  auction_status?: string
}

/**
 * GET /api/auctions/[saleId]
 * Returns detailed auction information including rules, properties, and alerts
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { saleId: string } }
) {
  try {
    const supabase = createServerClient()
    const { saleId } = params

    if (!supabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      )
    }

    // Fetch auction/sale details with county info
    const { data: sale, error: saleError } = await supabase
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
        created_at,
        updated_at,
        counties (
          id,
          county_name,
          state_code,
          state_name
        )
      `)
      .eq("id", saleId)
      .single()

    if (saleError) {
      if (saleError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Not found", message: "Auction not found" },
          { status: 404 }
        )
      }
      console.error("[API Auction Detail] Database error:", saleError)
      return NextResponse.json(
        { error: "Database error", message: saleError.message },
        { status: 500 }
      )
    }

    if (!sale) {
      return NextResponse.json(
        { error: "Not found", message: "Auction not found" },
        { status: 404 }
      )
    }

    // Type cast: Supabase returns single object for FK relations but types it as array
    const counties = sale.counties as unknown as { id: string; county_name: string; state_code: string; state_name: string } | null
    const countyId = counties?.id

    // Fetch related data in parallel
    const [
      rulesResult,
      alertsResult,
      propertiesResult,
      documentsResult,
      officialLinksResult,
    ] = await Promise.all([
      // Get auction rules for this county and sale type
      countyId ? supabase
        .from("auction_rules")
        .select("*")
        .eq("county_id", countyId)
        .eq("sale_type", sale.sale_type)
        .single() : Promise.resolve({ data: null, error: null }),

      // Get alerts for this auction
      supabase
        .from("auction_alerts")
        .select("*")
        .eq("sale_id", saleId)
        .order("created_at", { ascending: false })
        .limit(10),

      // Get properties for this auction (limited for performance)
      countyId ? supabase
        .from("properties")
        .select(`
          id,
          parcel_id,
          property_address,
          owner_name,
          total_due,
          sale_type,
          sale_date,
          has_regrid_data,
          visual_validation_status,
          auction_status
        `)
        .eq("county_id", countyId)
        .eq("auction_status", "active")
        .order("total_due", { ascending: false })
        .limit(50) : Promise.resolve({ data: [], error: null }),

      // Get documents for this county
      countyId ? supabase
        .from("documents")
        .select("*")
        .eq("county_id", countyId)
        .order("created_at", { ascending: false })
        .limit(20) : Promise.resolve({ data: [], error: null }),

      // Get official links for this county
      countyId ? supabase
        .from("official_links")
        .select("*")
        .eq("county_id", countyId) : Promise.resolve({ data: [], error: null }),
    ])

    const rules = rulesResult.data
    const alerts = alertsResult.data || []
    const properties = propertiesResult.data || []
    const documents = documentsResult.data || []
    const officialLinks = officialLinksResult.data || []

    // Calculate days until auction
    const saleDate = new Date(sale.sale_date)
    const today = new Date()
    const daysUntil = Math.ceil((saleDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    // Calculate registration days
    let registrationDaysUntil: number | null = null
    let registrationStatus = "unknown"
    if (sale.registration_deadline) {
      const regDate = new Date(sale.registration_deadline)
      registrationDaysUntil = Math.ceil((regDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      if (registrationDaysUntil < 0) {
        registrationStatus = "closed"
      } else if (registrationDaysUntil <= 3) {
        registrationStatus = "urgent"
      } else if (registrationDaysUntil <= 7) {
        registrationStatus = "soon"
      } else {
        registrationStatus = "open"
      }
    }

    // Calculate property stats
    const totalProperties = properties.length
    const approvedProperties = properties.filter((p: PropertyQueryResult) => p.visual_validation_status === "APPROVED").length
    const cautionProperties = properties.filter((p: PropertyQueryResult) => p.visual_validation_status === "CAUTION").length
    const totalTaxDue = properties.reduce((sum: number, p: PropertyQueryResult) => sum + (Number(p.total_due) || 0), 0)

    // Determine urgency
    let urgency = "scheduled"
    if (daysUntil <= 7) {
      urgency = "critical"
    } else if (daysUntil <= 14) {
      urgency = "warning"
    } else if (daysUntil <= 30) {
      urgency = "upcoming"
    }

    // Transform data to frontend format
    const auctionData = {
      id: sale.id,
      county: counties?.county_name || "Unknown",
      countyId: countyId,
      state: counties?.state_code || "??",
      stateName: counties?.state_name || "",
      date: sale.sale_date,
      type: sale.sale_type || "Tax Deed",
      platform: sale.platform || "Unknown",
      location: sale.location || "TBD",
      propertyCount: sale.property_count || totalProperties,
      registrationDeadline: sale.registration_deadline,
      registrationDaysUntil,
      registrationStatus,
      depositRequired: sale.deposit_required
        ? `$${Number(sale.deposit_required).toLocaleString()}`
        : null,
      depositAmount: sale.deposit_required ? Number(sale.deposit_required) : null,
      status: sale.status || "upcoming",
      daysUntil,
      urgency,
      notes: null, // notes column doesn't exist in upcoming_sales table

      // Auction rules
      rules: rules ? {
        registrationRequired: rules.registration_required,
        registrationDeadlineDays: rules.registration_deadline_days,
        registrationFormUrl: rules.registration_form_url,
        depositRefundable: rules.deposit_refundable,
        depositPaymentMethods: rules.deposit_payment_methods || [],
        minimumBidRule: rules.minimum_bid_rule,
        minimumBidAmount: rules.minimum_bid_amount,
        bidIncrement: rules.bid_increment,
        buyersPremiumPct: rules.buyers_premium_pct,
        paymentDeadlineHours: rules.payment_deadline_hours,
        paymentMethods: rules.payment_methods || [],
        financingAllowed: rules.financing_allowed,
        deedRecordingTimeline: rules.deed_recording_timeline,
        redemptionPeriodDays: rules.redemption_period_days,
        possessionTimeline: rules.possession_timeline,
        asIsSale: rules.as_is_sale,
        liensSurvive: rules.liens_survive || [],
        titleInsuranceAvailable: rules.title_insurance_available,
        rulesSourceUrl: rules.rules_source_url,
        lastVerifiedAt: rules.last_verified_at,
        rawRulesText: rules.raw_rules_text,
      } : null,

      // Property stats
      propertyStats: {
        total: totalProperties,
        approved: approvedProperties,
        caution: cautionProperties,
        rejected: totalProperties - approvedProperties - cautionProperties,
        totalTaxDue,
        avgTaxDue: totalProperties > 0 ? Math.round(totalTaxDue / totalProperties) : 0,
      },

      // Sample properties (first 20)
      properties: properties.slice(0, 20).map((p: PropertyQueryResult) => ({
        id: p.id,
        parcelId: p.parcel_id,
        address: p.property_address || "N/A",
        owner: p.owner_name,
        totalDue: p.total_due,
        hasRegridData: p.has_regrid_data,
        validationStatus: p.visual_validation_status,
      })),

      // Alerts
      alerts: alerts.map((a: AuctionAlert) => ({
        id: a.id,
        type: a.alert_type,
        severity: a.severity,
        title: a.title,
        message: a.message,
        daysUntilEvent: a.days_until_event,
        acknowledged: a.acknowledged,
        createdAt: a.created_at,
      })),

      // Documents (including extracted text for AI chat)
      documents: documents.map((d: Document) => ({
        id: d.id,
        type: d.document_type,
        title: d.title,
        url: d.file_url,
        format: d.file_format,
        propertyCount: d.properties_extracted,
        publicationDate: d.created_at,
        extractedText: null,
        textExtractedAt: null,
        year: null,
      })),

      // Contact info from official links
      contacts: officialLinks
        .filter((l: OfficialLink) => l.contact_phone || l.contact_email)
        .map((l: OfficialLink) => ({
          id: l.id,
          type: l.link_type,
          title: l.title,
          phone: l.contact_phone,
          email: l.contact_email,
          url: l.url,
        })),
    }

    return NextResponse.json({
      data: auctionData,
      source: "database",
    })
  } catch (error) {
    console.error("[API Auction Detail] Server error:", error)
    return NextResponse.json(
      { error: "Server error", message: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}

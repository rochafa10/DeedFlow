import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/client"

/**
 * GET /api/v1/counties/[id]
 * Returns detailed county information including documents, contacts, auctions, and properties
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient()
    const { id: countyId } = params

    if (!supabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      )
    }

    // Fetch county details
    const { data: county, error: countyError } = await supabase
      .from("counties")
      .select("*")
      .eq("id", countyId)
      .single()

    if (countyError) {
      if (countyError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Not found", message: "County not found" },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { error: "Database error", message: countyError.message },
        { status: 500 }
      )
    }

    if (!county) {
      return NextResponse.json(
        { error: "Not found", message: "County not found" },
        { status: 404 }
      )
    }

    // Fetch related data in parallel
    const [
      propertiesResult,
      documentsResult,
      upcomingSalesResult,
      officialLinksResult,
      vendorPortalsResult,
      additionalResourcesResult,
      importantNotesResult,
      batchJobsResult,
      researchLogResult,
    ] = await Promise.all([
      // Get properties with stats
      supabase
        .from("properties")
        .select("id, parcel_id, property_address, total_due, has_regrid_data, visual_validation_status, auction_status, sale_type, sale_date")
        .eq("county_id", countyId),

      // Get documents
      supabase
        .from("documents")
        .select("*")
        .eq("county_id", countyId)
        .order("created_at", { ascending: false }),

      // Get upcoming sales
      supabase
        .from("upcoming_sales")
        .select("*")
        .eq("county_id", countyId)
        .order("sale_date", { ascending: true }),

      // Get official links
      supabase
        .from("official_links")
        .select("*")
        .eq("county_id", countyId),

      // Get vendor portals
      supabase
        .from("vendor_portals")
        .select("*")
        .eq("county_id", countyId),

      // Get additional resources
      supabase
        .from("additional_resources")
        .select("*")
        .eq("county_id", countyId),

      // Get important notes
      supabase
        .from("important_notes")
        .select("*")
        .eq("county_id", countyId)
        .order("priority", { ascending: true }),

      // Get batch jobs
      supabase
        .from("batch_jobs")
        .select("*")
        .eq("county_id", countyId)
        .order("created_at", { ascending: false })
        .limit(10),

      // Get research log
      supabase
        .from("research_log")
        .select("*")
        .eq("county_id", countyId)
        .order("created_at", { ascending: false })
        .limit(10),
    ])

    const properties = propertiesResult.data || []
    const documents = documentsResult.data || []
    const upcomingSales = upcomingSalesResult.data || []
    const officialLinks = officialLinksResult.data || []
    const vendorPortals = vendorPortalsResult.data || []
    const additionalResources = additionalResourcesResult.data || []
    const importantNotes = importantNotesResult.data || []
    const batchJobs = batchJobsResult.data || []
    const researchLog = researchLogResult.data || []

    // Calculate property stats
    const totalProperties = properties.length
    const activeProperties = properties.filter((p: any) => p.auction_status === "active").length
    const withRegrid = properties.filter((p: any) => p.has_regrid_data).length
    const validated = properties.filter((p: any) => p.visual_validation_status).length
    const approved = properties.filter((p: any) => p.visual_validation_status === "APPROVED").length
    const caution = properties.filter((p: any) => p.visual_validation_status === "CAUTION").length
    const rejected = properties.filter((p: any) => p.visual_validation_status === "REJECT").length

    // Calculate progress
    const progress = totalProperties > 0 ? Math.round((withRegrid / totalProperties) * 100) : 0

    // Find next auction
    const today = new Date()
    const futureAuctions = upcomingSales.filter((s: any) => new Date(s.sale_date) > today)
    const nextAuction = futureAuctions[0]
    let daysUntilAuction: number | null = null
    let nextAuctionDate: string | null = null
    if (nextAuction) {
      const auctionDate = new Date(nextAuction.sale_date)
      daysUntilAuction = Math.ceil((auctionDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      nextAuctionDate = nextAuction.sale_date
    }

    // Determine status based on property count and last_researched_at
    let status: "active" | "pending" | "archived" = "pending"
    if (totalProperties > 0 || county.last_researched_at) {
      status = "active"
    }

    // Build response
    const countyData = {
      id: county.id,
      name: county.county_name,
      state: county.state_code,
      stateName: county.state_name,
      status,
      lastResearchedAt: county.last_researched_at,
      createdAt: county.created_at,

      // Stats
      propertyCount: totalProperties,
      activePropertyCount: activeProperties,
      progress,
      nextAuctionDate,
      daysUntilAuction,
      documentsCount: documents.length,

      // Pipeline stats
      pipelineStats: {
        total: totalProperties,
        parsed: totalProperties,
        withRegrid,
        validated,
        approved,
        caution,
        rejected,
        regridPct: totalProperties > 0 ? Math.round((withRegrid / totalProperties) * 100) : 0,
        validationPct: withRegrid > 0 ? Math.round((validated / withRegrid) * 100) : 0,
      },

      // Documents
      documents: documents.map((d: any) => ({
        id: d.id,
        type: d.document_type,
        title: d.title,
        url: d.url,
        format: d.file_format,
        propertyCount: d.property_count,
        parsingStatus: d.parsing_status,
        publicationDate: d.publication_date,
        year: d.year,
        createdAt: d.created_at,
      })),

      // Upcoming auctions
      upcomingAuctions: upcomingSales.map((s: any) => {
        const saleDate = new Date(s.sale_date)
        const days = Math.ceil((saleDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        return {
          id: s.id,
          type: s.sale_type,
          date: s.sale_date,
          daysUntil: days,
          platform: s.platform,
          location: s.location,
          propertyCount: s.property_count,
          depositRequired: s.deposit_required,
          registrationDeadline: s.registration_deadline,
          status: s.status,
        }
      }),

      // Contacts from official links
      contacts: officialLinks.map((l: any) => ({
        id: l.id,
        type: l.link_type,
        title: l.title,
        url: l.url,
        phone: l.phone,
        email: l.email,
      })),

      // Vendor portals
      vendorPortal: vendorPortals.length > 0 ? {
        id: vendorPortals[0].id,
        name: vendorPortals[0].vendor_name,
        url: vendorPortals[0].county_specific_url,
        registrationUrl: vendorPortals[0].registration_url,
        isPrimary: vendorPortals[0].is_primary,
      } : null,

      // Additional resources
      resources: additionalResources.map((r: any) => ({
        id: r.id,
        type: r.resource_type,
        title: r.title,
        url: r.url,
        description: r.description,
      })),

      // Important notes
      notes: importantNotes.map((n: any) => ({
        id: n.id,
        type: n.note_type,
        text: n.note_text,
        priority: n.priority,
        createdAt: n.created_at,
      })),

      // Recent activity (from batch jobs and research log)
      recentActivity: [
        ...batchJobs.map((j: any) => ({
          id: j.id,
          type: "batch_job",
          title: `${j.job_type} - ${j.status}`,
          description: `Processed ${j.processed_items || 0}/${j.total_items || 0} items`,
          timestamp: j.created_at,
        })),
        ...researchLog.map((r: any) => ({
          id: r.id,
          type: "research",
          title: "Research completed",
          description: `Quality score: ${r.data_quality_score || "N/A"}`,
          timestamp: r.created_at,
        })),
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10),

      // Sample properties (first 20)
      properties: properties.slice(0, 20).map((p: any) => ({
        id: p.id,
        parcelId: p.parcel_id,
        address: p.property_address || "N/A",
        totalDue: p.total_due,
        hasRegridData: p.has_regrid_data,
        validationStatus: p.visual_validation_status,
        auctionStatus: p.auction_status,
        saleType: p.sale_type,
        saleDate: p.sale_date,
      })),
    }

    return NextResponse.json({
      data: countyData,
      source: "database",
    })
  } catch (error) {
    return NextResponse.json(
      { error: "Server error", message: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}

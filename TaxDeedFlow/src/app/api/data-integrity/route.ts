import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/client"

/**
 * GET /api/data-integrity
 * Returns data integrity audit results, issues, and pipeline health stats
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

    // Fetch all data needed for integrity check in parallel
    const [
      propertiesResult,
      regridDataResult,
      validationDataResult,
      countiesResult,
      documentsResult,
      batchJobsResult,
    ] = await Promise.all([
      // Get all properties with counts
      supabase
        .from("properties")
        .select("id, county_id, parcel_id, property_address, total_due, has_regrid_data, has_screenshot, visual_validation_status, auction_status, sale_type, sale_date"),

      // Get regrid data records
      supabase
        .from("regrid_data")
        .select("id, property_id"),

      // Get visual validation records
      supabase
        .from("property_visual_validation")
        .select("id, property_id, validation_status"),

      // Get counties
      supabase
        .from("counties")
        .select("id, county_name, state_code"),

      // Get documents
      supabase
        .from("documents")
        .select("id, county_id, document_type, title"),

      // Get batch jobs
      supabase
        .from("batch_jobs")
        .select("id, job_type, status, processed_items, failed_items"),
    ])

    const properties = propertiesResult.data || []
    const regridData = regridDataResult.data || []
    const validationData = validationDataResult.data || []
    const counties = countiesResult.data || []
    const documents = documentsResult.data || []
    const batchJobs = batchJobsResult.data || []

    // Create lookup maps
    const regridPropertyIds = new Set(regridData.map((r: any) => r.property_id))
    const validationPropertyIds = new Set(validationData.map((v: any) => v.property_id))
    const countyMap = new Map(counties.map((c: any) => [c.id, c]))

    // Calculate issues
    const issues: any[] = []

    // 1. Properties missing Regrid data
    const propertiesMissingRegrid = properties.filter(
      (p: any) => !p.has_regrid_data && !regridPropertyIds.has(p.id)
    )
    if (propertiesMissingRegrid.length > 0) {
      issues.push({
        id: "issue-missing-regrid",
        severity: propertiesMissingRegrid.length > 1000 ? "critical" : "warning",
        category: "Missing Data",
        title: "Properties missing Regrid data",
        description: "Properties that need Regrid enrichment for land data and screenshots",
        affectedCount: propertiesMissingRegrid.length,
        table: "properties",
        field: "has_regrid_data",
        fixable: false,
        action: "Run Regrid scraping batch job",
        agent: "REGRID_SCRAPER",
      })
    }

    // 2. Properties missing address
    const propertiesMissingAddress = properties.filter(
      (p: any) => !p.property_address || p.property_address.trim() === ""
    )
    if (propertiesMissingAddress.length > 0) {
      issues.push({
        id: "issue-missing-address",
        severity: propertiesMissingAddress.length > 1000 ? "warning" : "info",
        category: "Missing Data",
        title: "Properties missing address",
        description: "Properties without a valid street address - may need manual review or Regrid enrichment",
        affectedCount: propertiesMissingAddress.length,
        table: "properties",
        field: "property_address",
        fixable: false,
        action: "Review source documents or enrich via Regrid",
        agent: "PARSER_AGENT",
      })
    }

    // 3. Properties missing amount due
    const propertiesMissingAmount = properties.filter(
      (p: any) => p.total_due === null || p.total_due === undefined
    )
    if (propertiesMissingAmount.length > 0) {
      issues.push({
        id: "issue-missing-amount",
        severity: "warning",
        category: "Missing Data",
        title: "Properties missing amount due",
        description: "Properties without tax amount information",
        affectedCount: propertiesMissingAmount.length,
        table: "properties",
        field: "total_due",
        fixable: false,
        action: "Review source documents",
        agent: "PARSER_AGENT",
      })
    }

    // 4. Regrid flag mismatch (has_regrid_data=true but no regrid_data record)
    const flagMismatch = properties.filter(
      (p: any) => p.has_regrid_data && !regridPropertyIds.has(p.id)
    )
    if (flagMismatch.length > 0) {
      issues.push({
        id: "issue-regrid-flag-mismatch",
        severity: "critical",
        category: "Consistency",
        title: "Regrid flag mismatch",
        description: "Properties marked as having Regrid data but no corresponding record exists",
        affectedCount: flagMismatch.length,
        table: "properties",
        field: "has_regrid_data",
        fixable: true,
        action: "Run fix_regrid_flags() function",
        agent: "DATA_INTEGRITY_AGENT",
      })
    }

    // 5. Properties needing validation
    const propertiesNeedingValidation = properties.filter(
      (p: any) => p.has_regrid_data && !validationPropertyIds.has(p.id)
    )
    if (propertiesNeedingValidation.length > 0) {
      issues.push({
        id: "issue-needs-validation",
        severity: propertiesNeedingValidation.length > 100 ? "warning" : "info",
        category: "Pipeline Gap",
        title: "Properties awaiting visual validation",
        description: "Properties with Regrid data ready for visual validation",
        affectedCount: propertiesNeedingValidation.length,
        table: "property_visual_validation",
        field: "validation_status",
        fixable: false,
        action: "Run visual validation",
        agent: "VISUAL_VALIDATOR",
      })
    }

    // 6. Unknown auction status
    const unknownAuctionStatus = properties.filter(
      (p: any) => p.auction_status === "unknown" || !p.auction_status
    )
    if (unknownAuctionStatus.length > 0) {
      issues.push({
        id: "issue-unknown-auction-status",
        severity: "info",
        category: "Missing Data",
        title: "Properties with unknown auction status",
        description: "Properties missing sale_type or sale_date preventing status determination",
        affectedCount: unknownAuctionStatus.length,
        table: "properties",
        field: "auction_status",
        fixable: true,
        action: "Update property auction status",
        agent: "DATA_INTEGRITY_AGENT",
      })
    }

    // 7. Expired properties still marked active
    const expiredButActive = properties.filter(
      (p: any) =>
        p.sale_date &&
        new Date(p.sale_date) < new Date() &&
        p.auction_status === "active" &&
        !["repository", "sealed_bid", "private_sale"].includes(p.sale_type)
    )
    if (expiredButActive.length > 0) {
      issues.push({
        id: "issue-expired-still-active",
        severity: "warning",
        category: "Consistency",
        title: "Expired properties marked as active",
        description: "Properties with past sale dates still marked as active",
        affectedCount: expiredButActive.length,
        table: "properties",
        field: "auction_status",
        fixable: true,
        action: "Update auction status to expired",
        agent: "DATA_INTEGRITY_AGENT",
      })
    }

    // Calculate summary stats
    const totalProperties = properties.length
    const withRegrid = properties.filter((p: any) => p.has_regrid_data).length
    const withValidation = validationData.length
    const approved = validationData.filter((v: any) => v.validation_status === "APPROVED").length
    const rejected = validationData.filter((v: any) => v.validation_status === "REJECT").length
    const caution = validationData.filter((v: any) => v.validation_status === "CAUTION").length

    // Calculate by county
    const countyStats = counties.map((county: any) => {
      const countyProperties = properties.filter((p: any) => p.county_id === county.id)
      const countyWithRegrid = countyProperties.filter((p: any) => p.has_regrid_data).length
      const countyValidated = countyProperties.filter((p: any) =>
        validationPropertyIds.has(p.id)
      ).length

      return {
        id: county.id,
        countyName: county.county_name,
        stateCode: county.state_code,
        totalProperties: countyProperties.length,
        withRegrid: countyWithRegrid,
        validated: countyValidated,
        completionPct: countyProperties.length > 0
          ? Math.round((countyWithRegrid / countyProperties.length) * 100)
          : 0,
      }
    }).filter((c: any) => c.totalProperties > 0)
      .sort((a: any, b: any) => b.totalProperties - a.totalProperties)

    // Calculate severity counts
    const criticalCount = issues.filter((i) => i.severity === "critical").length
    const warningCount = issues.filter((i) => i.severity === "warning").length
    const infoCount = issues.filter((i) => i.severity === "info").length

    // Recent batch job activity
    const recentJobs = batchJobs.slice(0, 10).map((job: any) => ({
      id: job.id,
      type: job.job_type,
      status: job.status,
      processed: job.processed_items,
      failed: job.failed_items,
    }))

    return NextResponse.json({
      data: {
        // Summary counts
        summary: {
          totalIssues: issues.length,
          criticalCount,
          warningCount,
          infoCount,
          lastAuditAt: new Date().toISOString(),
        },

        // All issues
        issues: issues.sort((a, b) => {
          const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 }
          return (severityOrder[a.severity] || 3) - (severityOrder[b.severity] || 3)
        }),

        // Pipeline stats
        pipelineStats: {
          totalProperties,
          withRegrid,
          withValidation,
          approved,
          rejected,
          caution,
          regridPct: totalProperties > 0 ? Math.round((withRegrid / totalProperties) * 100) : 0,
          validationPct: withRegrid > 0 ? Math.round((withValidation / withRegrid) * 100) : 0,
          approvalRate: withValidation > 0 ? Math.round((approved / withValidation) * 100) : 0,
        },

        // County breakdown
        countyStats,

        // Recent jobs
        recentJobs,

        // Quick actions available
        quickActions: [
          {
            id: "fix-regrid-flags",
            label: "Fix Regrid Flag Mismatches",
            description: "Update has_regrid_data flags to match actual regrid_data records",
            enabled: flagMismatch.length > 0,
          },
          {
            id: "fix-screenshot-flags",
            label: "Fix Screenshot Flag Mismatches",
            description: "Update has_screenshot flags to match actual screenshot records",
            enabled: true,
          },
          {
            id: "update-auction-status",
            label: "Update Auction Status",
            description: "Mark expired auctions and update property status",
            enabled: expiredButActive.length > 0 || unknownAuctionStatus.length > 0,
          },
          {
            id: "clean-orphans",
            label: "Clean Orphaned Records",
            description: "Remove records with invalid foreign key references",
            enabled: true,
          },
        ],
      },
      source: "database",
    })
  } catch (error) {
    console.error("[API Data Integrity] Server error:", error)
    return NextResponse.json(
      { error: "Server error", message: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}

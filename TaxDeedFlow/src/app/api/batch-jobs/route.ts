import { NextRequest, NextResponse } from "next/server"
import { validateApiAuth, unauthorizedResponse, forbiddenResponse } from "@/lib/auth/api-auth"
import { validateCsrf, csrfErrorResponse } from "@/lib/auth/csrf"
import { createServerClient } from "@/lib/supabase/client"
import { logger } from "@/lib/logger"

/**
 * GET /api/batch-jobs
 * Returns batch jobs with county info
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

    // Get query params for filtering
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") // 'active', 'completed', 'failed', or null for all
    const limit = parseInt(searchParams.get("limit") || "100")

    // Fetch batch jobs with county info
    let query = supabase
      .from("batch_jobs")
      .select(`
        id,
        job_type,
        county_id,
        status,
        batch_size,
        total_items,
        processed_items,
        failed_items,
        current_batch,
        total_batches,
        last_error,
        error_count,
        started_at,
        paused_at,
        completed_at,
        created_at,
        counties (
          id,
          county_name,
          state_code
        )
      `)
      .order("created_at", { ascending: false })
      .limit(limit)

    // Apply status filter
    if (status === "active") {
      query = query.in("status", ["pending", "in_progress", "paused"])
    } else if (status === "completed") {
      query = query.eq("status", "completed")
    } else if (status === "failed") {
      query = query.eq("status", "failed")
    }

    const { data: jobs, error: jobsError } = await query

    if (jobsError) {
      logger.error("[API Batch Jobs] Database error:", { error: jobsError.message, code: jobsError.code })
      return NextResponse.json(
        { error: "Database error", message: jobsError.message },
        { status: 500 }
      )
    }

    // Transform to frontend format
    const transformedJobs = (jobs || []).map((job: any) => {
      const progress = job.total_items > 0
        ? Math.round((job.processed_items / job.total_items) * 100)
        : 0

      // Use database values if available, otherwise calculate
      const totalBatches = job.total_batches || (job.batch_size > 0
        ? Math.ceil(job.total_items / job.batch_size)
        : 1)

      const currentBatch = job.current_batch || (job.batch_size > 0
        ? Math.ceil(job.processed_items / job.batch_size)
        : 1)

      // Calculate duration
      let duration = null
      if (job.started_at) {
        const startTime = new Date(job.started_at).getTime()
        const endTime = job.completed_at
          ? new Date(job.completed_at).getTime()
          : Date.now()
        const durationMs = endTime - startTime
        const hours = Math.floor(durationMs / (1000 * 60 * 60))
        const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))
        duration = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
      }

      // Calculate success rate
      const totalProcessed = job.processed_items + (job.failed_items || 0)
      const successRate = totalProcessed > 0
        ? Math.round((job.processed_items / totalProcessed) * 100)
        : 100

      // Map status
      let mappedStatus = job.status
      if (job.status === "in_progress") mappedStatus = "running"

      return {
        id: job.id,
        name: `${formatJobType(job.job_type)} - ${job.counties?.county_name || "Unknown"}`,
        type: job.job_type,
        county: job.counties?.county_name || "Unknown",
        countyId: job.county_id,
        state: job.counties?.state_code || "??",
        status: mappedStatus,
        progress,
        totalItems: job.total_items || 0,
        processedItems: job.processed_items || 0,
        failedItems: job.failed_items || 0,
        startedAt: job.started_at,
        pausedAt: job.paused_at,
        completedAt: job.completed_at,
        createdAt: job.created_at,
        batchSize: job.batch_size || 50,
        currentBatch,
        totalBatches,
        duration,
        successRate,
        errorLog: job.last_error,
        errorCount: job.error_count || 0,
        estimatedCompletion: null, // Could calculate based on processing rate
      }
    })

    // Split into active and history
    const activeJobs = transformedJobs.filter(
      (j: any) => ["running", "paused", "pending", "in_progress"].includes(j.status)
    )
    const jobHistory = transformedJobs.filter(
      (j: any) => ["completed", "failed"].includes(j.status)
    )

    // Calculate stats
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const completedToday = jobHistory.filter((j: any) => {
      if (!j.completedAt) return false
      const completedDate = new Date(j.completedAt)
      completedDate.setHours(0, 0, 0, 0)
      return completedDate.getTime() === today.getTime()
    }).length

    const totalSuccessRate = jobHistory.length > 0
      ? Math.round(jobHistory.reduce((sum: number, j: any) => sum + j.successRate, 0) / jobHistory.length)
      : 100

    return NextResponse.json({
      data: {
        activeJobs,
        jobHistory,
        stats: {
          running: activeJobs.filter((j: any) => j.status === "running").length,
          paused: activeJobs.filter((j: any) => j.status === "paused").length,
          completedToday,
          successRate: totalSuccessRate,
        },
      },
      source: "database",
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    logger.error("[API Batch Jobs] Server error:", { message })
    return NextResponse.json(
      { error: "Server error", message: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}

// Helper function to format job type
function formatJobType(type: string): string {
  const labels: Record<string, string> = {
    regrid_scraping: "Regrid Scraping",
    visual_validation: "Visual Validation",
    pdf_parsing: "PDF Parsing",
    county_research: "County Research",
    title_research: "Title Research",
    property_condition: "Property Condition",
    environmental_research: "Environmental Research",
    bid_strategy: "Bid Strategy",
  }
  return labels[type] || type
}

/**
 * POST /api/batch-jobs
 * Create a new batch job - requires authentication, CSRF validation, AND non-viewer role
 */
export async function POST(request: NextRequest) {
  // CSRF Protection: Validate request origin
  const csrfResult = await validateCsrf(request)
  if (!csrfResult.valid) {
    logger.log("[API Batch Jobs] CSRF validation failed:", csrfResult.error)
    return csrfErrorResponse(csrfResult.error)
  }

  // Validate authentication
  const authResult = await validateApiAuth(request)

  if (!authResult.authenticated) {
    return unauthorizedResponse(authResult.error)
  }

  // Only admin and analyst can create batch jobs
  // Viewers are NOT allowed to create batch jobs
  if (authResult.user?.role === "viewer") {
    return forbiddenResponse("Viewers do not have permission to create batch jobs. Only admins and analysts can create batch jobs.")
  }

  try {
    const body = await request.json()

    // Validate required fields
    if (!body.job_type || !body.county_id) {
      return NextResponse.json(
        {
          error: "Validation error",
          message: "job_type and county_id are required fields",
        },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    if (!supabase) {
      // Demo mode - just return success with mock ID
      const newJob = {
        id: `batch-${Date.now()}`,
        job_type: body.job_type,
        county_id: body.county_id,
        batch_size: body.batch_size || 50,
        status: "pending",
        total_items: body.total_items || 0,
        processed_items: 0,
        failed_items: 0,
        created_at: new Date().toISOString(),
      }

      return NextResponse.json({
        data: newJob,
        message: "Batch job created (demo mode)",
        source: "mock",
      })
    }

    // Calculate total_items based on job_type
    let totalItems = body.total_items || 0

    if (!totalItems || totalItems === 0) {
      totalItems = await calculateTotalItems(supabase, body.job_type, body.county_id)
    }

    const batchSize = body.batch_size || 50
    const totalBatches = Math.ceil(totalItems / batchSize)

    const { data, error } = await supabase
      .from("batch_jobs")
      .insert([
        {
          job_type: body.job_type,
          county_id: body.county_id,
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

    if (error) {
      logger.error("[API Batch Jobs] Insert error:", { error: error.message, code: error.code })
      return NextResponse.json(
        {
          error: "Database error",
          message: error.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data,
      message: "Batch job created successfully",
      source: "database",
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    logger.error("[API Batch Jobs] Server error:", { message: errorMessage })
    return NextResponse.json(
      {
        error: "Server error",
        message: "An unexpected error occurred",
      },
      { status: 500 }
    )
  }
}

/**
 * Calculate total items for a batch job based on job type and county
 */
async function calculateTotalItems(
  supabase: any,
  jobType: string,
  countyId: string
): Promise<number> {
  try {
    let query;

    switch (jobType) {
      case "regrid_scraping":
        // Count properties that don't have Regrid data yet
        query = supabase
          .from("properties")
          .select("id", { count: "exact", head: true })
          .eq("county_id", countyId)
          .eq("has_regrid_data", false)
          .eq("auction_status", "active")
        break

      case "visual_validation":
        // Count properties that have Regrid data but no visual validation
        query = supabase
          .from("properties")
          .select("id", { count: "exact", head: true })
          .eq("county_id", countyId)
          .eq("has_regrid_data", true)
          .is("visual_validation_status", null)
          .eq("auction_status", "active")
        break

      case "pdf_parsing":
        // Count documents that need parsing
        query = supabase
          .from("documents")
          .select("id", { count: "exact", head: true })
          .eq("county_id", countyId)
          .eq("document_type", "property_list")
          .in("parsing_status", ["pending", "failed"])
        break

      case "title_research":
      case "property_condition":
      case "environmental_research":
      case "bid_strategy":
        // Count approved properties that need this analysis
        query = supabase
          .from("properties")
          .select("id", { count: "exact", head: true })
          .eq("county_id", countyId)
          .eq("visual_validation_status", "APPROVED")
          .eq("auction_status", "active")
        break

      default:
        // Default: count all active properties in county
        query = supabase
          .from("properties")
          .select("id", { count: "exact", head: true })
          .eq("county_id", countyId)
          .eq("auction_status", "active")
    }

    const { count, error } = await query

    if (error) {
      logger.error("[API Batch Jobs] Count error:", { error: error.message, code: error.code })
      return 0
    }

    return count || 0
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    logger.error("[API Batch Jobs] Calculate total items error:", { message: errorMessage })
    return 0
  }
}

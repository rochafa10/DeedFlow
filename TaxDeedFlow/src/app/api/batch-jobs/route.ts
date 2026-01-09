import { NextRequest, NextResponse } from "next/server"
import { validateApiAuth, unauthorizedResponse, forbiddenResponse } from "@/lib/auth/api-auth"
import { createServerClient } from "@/lib/supabase/client"

// Mock batch jobs data for development
const MOCK_BATCH_JOBS = [
  {
    id: "batch-001",
    job_type: "regrid_scraping",
    county_id: "county-001",
    county_name: "Westmoreland",
    status: "in_progress",
    total_items: 172,
    processed_items: 45,
    started_at: "2026-01-09T10:00:00Z",
    created_by: "demo@taxdeedflow.com",
  },
  {
    id: "batch-002",
    job_type: "visual_validation",
    county_id: "county-002",
    county_name: "Blair",
    status: "completed",
    total_items: 100,
    processed_items: 100,
    started_at: "2026-01-08T14:00:00Z",
    completed_at: "2026-01-08T16:30:00Z",
    created_by: "analyst@taxdeedflow.com",
  },
]

/**
 * GET /api/batch-jobs
 * Returns a list of batch jobs - requires authentication
 */
export async function GET(request: NextRequest) {
  // Validate authentication
  const authResult = await validateApiAuth(request)

  if (!authResult.authenticated) {
    return unauthorizedResponse(authResult.error)
  }

  try {
    const supabase = createServerClient()

    // If Supabase is not configured, return mock data
    if (!supabase) {
      console.log("[API Batch Jobs] Supabase not configured, returning mock data")
      return NextResponse.json({
        data: MOCK_BATCH_JOBS,
        count: MOCK_BATCH_JOBS.length,
        source: "mock",
        user: authResult.user,
      })
    }

    // Fetch batch jobs from Supabase
    const { data, error, count } = await supabase
      .from("batch_jobs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) {
      console.error("[API Batch Jobs] Database error:", error)
      return NextResponse.json(
        {
          error: "Database error",
          message: error.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: data ?? [],
      count: count ?? 0,
      source: "database",
      user: authResult.user,
    })
  } catch (error) {
    console.error("[API Batch Jobs] Server error:", error)
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
 * POST /api/batch-jobs
 * Create a new batch job - requires authentication AND non-viewer role
 */
export async function POST(request: NextRequest) {
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
        ...body,
        status: "pending",
        total_items: body.total_items || 0,
        processed_items: 0,
        created_at: new Date().toISOString(),
        created_by: authResult.user?.email,
      }

      return NextResponse.json({
        data: newJob,
        message: "Batch job created (demo mode)",
        source: "mock",
      })
    }

    const { data, error } = await supabase
      .from("batch_jobs")
      .insert([
        {
          ...body,
          status: "pending",
          processed_items: 0,
          created_by: authResult.user?.email,
        },
      ])
      .select()
      .single()

    if (error) {
      console.error("[API Batch Jobs] Insert error:", error)
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
    console.error("[API Batch Jobs] Server error:", error)
    return NextResponse.json(
      {
        error: "Server error",
        message: "An unexpected error occurred",
      },
      { status: 500 }
    )
  }
}

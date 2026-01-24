import { NextRequest, NextResponse } from "next/server"
import { validateApiAuth, unauthorizedResponse, forbiddenResponse } from "@/lib/auth/api-auth"
import { validateCsrf, csrfErrorResponse } from "@/lib/auth/csrf"
import { createServerClient } from "@/lib/supabase/client"
import { logger } from "@/lib/logger"

/**
 * GET /api/batch-jobs/[id]
 * Get a single batch job by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient()
    const { id } = params

    if (!supabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      )
    }

    const { data: job, error } = await supabase
      .from("batch_jobs")
      .select(`
        *,
        counties (
          id,
          county_name,
          state_code
        )
      `)
      .eq("id", id)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Not found", message: "Batch job not found" },
          { status: 404 }
        )
      }
      logger.error("[API Batch Job] Database error:", error)
      return NextResponse.json(
        { error: "Database error", message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: job,
      source: "database",
    })
  } catch (error) {
    logger.error("[API Batch Job] Server error:", error)
    return NextResponse.json(
      { error: "Server error", message: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/batch-jobs/[id]
 * Update a batch job (status, progress, etc.)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // CSRF Protection
  const csrfResult = await validateCsrf(request)
  if (!csrfResult.valid) {
    logger.log("[API Batch Job] CSRF validation failed:", csrfResult.error)
    return csrfErrorResponse(csrfResult.error)
  }

  // Validate authentication
  const authResult = await validateApiAuth(request)

  if (!authResult.authenticated) {
    return unauthorizedResponse(authResult.error)
  }

  // Only admin and analyst can modify batch jobs
  if (authResult.user?.role === "viewer") {
    return forbiddenResponse("Viewers cannot modify batch jobs")
  }

  try {
    const supabase = createServerClient()
    const { id } = params
    const body = await request.json()

    if (!supabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      )
    }

    // Build update object - only include fields that are provided
    const updateData: Record<string, any> = {}

    if (body.status !== undefined) {
      updateData.status = body.status

      // Set timestamps based on status changes
      if (body.status === "in_progress" || body.status === "running") {
        updateData.status = "in_progress"
        if (!body.started_at) {
          updateData.started_at = new Date().toISOString()
        }
        updateData.paused_at = null
      } else if (body.status === "paused") {
        updateData.paused_at = new Date().toISOString()
      } else if (body.status === "completed") {
        updateData.completed_at = new Date().toISOString()
      }
    }

    if (body.processed_items !== undefined) {
      updateData.processed_items = body.processed_items
    }

    if (body.failed_items !== undefined) {
      updateData.failed_items = body.failed_items
    }

    if (body.current_batch !== undefined) {
      updateData.current_batch = body.current_batch
    }

    if (body.last_error !== undefined) {
      updateData.last_error = body.last_error
    }

    if (body.error_count !== undefined) {
      updateData.error_count = body.error_count
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "Validation error", message: "No valid fields to update" },
        { status: 400 }
      )
    }

    const { data: job, error } = await supabase
      .from("batch_jobs")
      .update(updateData)
      .eq("id", id)
      .select(`
        *,
        counties (
          id,
          county_name,
          state_code
        )
      `)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Not found", message: "Batch job not found" },
          { status: 404 }
        )
      }
      logger.error("[API Batch Job] Update error:", error)
      return NextResponse.json(
        { error: "Database error", message: error.message },
        { status: 500 }
      )
    }

    // Trigger n8n workflow when job starts running
    let n8nTriggered = false
    let n8nError = null
    if (updateData.status === "in_progress" && job?.job_type === "regrid_scraping") {
      try {
        const n8nResponse = await fetch("https://n8n.lfb-investments.com/webhook/regrid-scraper", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ job_id: id, action: "start" }),
        })
        n8nTriggered = n8nResponse.ok
        if (!n8nResponse.ok) {
          n8nError = `n8n returned ${n8nResponse.status}`
          logger.error("[API Batch Job] n8n trigger failed:", n8nError)
        }
      } catch (err) {
        n8nError = err instanceof Error ? err.message : "Unknown error"
        logger.error("[API Batch Job] n8n trigger error:", n8nError)
      }
    }

    return NextResponse.json({
      data: job,
      message: "Batch job updated successfully",
      source: "database",
      n8n_triggered: n8nTriggered,
      n8n_error: n8nError,
    })
  } catch (error) {
    logger.error("[API Batch Job] Server error:", error)
    return NextResponse.json(
      { error: "Server error", message: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/batch-jobs/[id]
 * Delete a batch job
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // CSRF Protection
  const csrfResult = await validateCsrf(request)
  if (!csrfResult.valid) {
    return csrfErrorResponse(csrfResult.error)
  }

  // Validate authentication
  const authResult = await validateApiAuth(request)

  if (!authResult.authenticated) {
    return unauthorizedResponse(authResult.error)
  }

  // Only admin can delete batch jobs
  if (authResult.user?.role !== "admin") {
    return forbiddenResponse("Only admins can delete batch jobs")
  }

  try {
    const supabase = createServerClient()
    const { id } = params

    if (!supabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      )
    }

    const { error } = await supabase
      .from("batch_jobs")
      .delete()
      .eq("id", id)

    if (error) {
      logger.error("[API Batch Job] Delete error:", error)
      return NextResponse.json(
        { error: "Database error", message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: "Batch job deleted successfully",
    })
  } catch (error) {
    logger.error("[API Batch Job] Server error:", error)
    return NextResponse.json(
      { error: "Server error", message: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}

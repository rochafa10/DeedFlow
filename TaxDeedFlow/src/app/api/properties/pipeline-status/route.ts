/**
 * Properties Pipeline Status API
 *
 * GET /api/properties/pipeline-status - Batch lookup of pipeline status for property IDs
 *
 * Returns which properties are currently in the deal pipeline and what stage they are in.
 * Used by the Properties page to show pipeline badges on property cards.
 *
 * @author Claude Code Agent
 * @date 2026-02-07
 */

import { NextRequest, NextResponse } from "next/server"
import { validateApiAuth, unauthorizedResponse } from "@/lib/auth/api-auth"
import { createServerClient } from "@/lib/supabase/client"

/** UUID v4 format regex */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Maximum number of property IDs allowed per request */
const MAX_PROPERTY_IDS = 200

/**
 * Validate and parse the property_ids query parameter.
 *
 * Expects a comma-separated list of UUIDs.
 * Returns either the parsed array or an error message.
 */
function parsePropertyIds(raw: string | null): {
  valid: boolean
  ids?: string[]
  error?: string
} {
  if (!raw || raw.trim().length === 0) {
    return { valid: false, error: "property_ids query parameter is required" }
  }

  const ids = raw
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0)

  if (ids.length === 0) {
    return { valid: false, error: "property_ids must contain at least one ID" }
  }

  if (ids.length > MAX_PROPERTY_IDS) {
    return {
      valid: false,
      error: `Too many property IDs. Maximum is ${MAX_PROPERTY_IDS}, received ${ids.length}`,
    }
  }

  // Validate each ID is a proper UUID
  for (const id of ids) {
    if (!UUID_REGEX.test(id)) {
      return { valid: false, error: `Invalid UUID format: ${id}` }
    }
  }

  return { valid: true, ids }
}

/**
 * GET /api/properties/pipeline-status
 *
 * Batch lookup of pipeline status for a list of property IDs.
 *
 * Query parameters:
 *   - property_ids: string (comma-separated UUIDs, required)
 *
 * Response:
 * {
 *   data: {
 *     "uuid-1": { deal_id, stage_name, stage_color, deal_status, deal_priority } | null,
 *     "uuid-2": null,
 *     ...
 *   }
 * }
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

    // Authentication is required
    const authResult = await validateApiAuth(request)
    if (!authResult.authenticated || !authResult.user) {
      return unauthorizedResponse(authResult.error)
    }

    // Parse and validate property_ids from query string
    const { searchParams } = new URL(request.url)
    const rawIds = searchParams.get("property_ids")
    const parsed = parsePropertyIds(rawIds)

    if (!parsed.valid || !parsed.ids) {
      return NextResponse.json(
        { error: "Validation error", message: parsed.error },
        { status: 400 }
      )
    }

    const propertyIds = parsed.ids

    // Query deals joined with pipeline_stages for the given property IDs.
    // Only include active deals so we surface the current live pipeline status.
    const { data: deals, error: dealsError } = await supabase
      .from("deals")
      .select(`
        property_id,
        id,
        status,
        priority,
        pipeline_stages!deals_current_stage_id_fkey (
          name,
          color
        )
      `)
      .in("property_id", propertyIds)
      .eq("status", "active")

    if (dealsError) {
      console.error("[API Properties Pipeline Status] Database error:", dealsError)

      // If the foreign key name is wrong, fall back to a two-query approach
      if (dealsError.message?.includes("relationship") || dealsError.message?.includes("fkey")) {
        return await fallbackQuery(supabase, propertyIds)
      }

      return NextResponse.json(
        { error: "Database error", message: dealsError.message },
        { status: 500 }
      )
    }

    // Build the response map: property_id -> status object | null
    const statusMap: Record<string, {
      deal_id: string
      stage_name: string
      stage_color: string
      deal_status: string
      deal_priority: string
    } | null> = {}

    // Initialize all requested IDs with null
    for (const id of propertyIds) {
      statusMap[id] = null
    }

    // Fill in results from the query
    for (const deal of deals || []) {
      if (!deal.property_id) continue

      // The pipeline_stages join may return as an object or array depending on Supabase version
      const stageData = deal.pipeline_stages as any
      const stageName = stageData?.name ?? "Unknown"
      const stageColor = stageData?.color ?? "#6B7280"

      statusMap[deal.property_id] = {
        deal_id: deal.id,
        stage_name: stageName,
        stage_color: stageColor,
        deal_status: deal.status,
        deal_priority: deal.priority || "medium",
      }
    }

    return NextResponse.json({ data: statusMap })
  } catch (error) {
    console.error("[API Properties Pipeline Status] Server error:", error)
    return NextResponse.json(
      { error: "Server error", message: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}

/**
 * Fallback approach if the foreign key join does not resolve automatically.
 * Performs two separate queries: one for deals, one for pipeline_stages,
 * and manually joins them.
 */
async function fallbackQuery(
  supabase: ReturnType<typeof createServerClient> & object,
  propertyIds: string[]
): Promise<NextResponse> {
  // Query active deals for the requested property IDs
  const { data: deals, error: dealsError } = await supabase
    .from("deals")
    .select("id, property_id, current_stage_id, status, priority")
    .in("property_id", propertyIds)
    .eq("status", "active")

  if (dealsError) {
    console.error("[API Properties Pipeline Status] Fallback deals error:", dealsError)
    return NextResponse.json(
      { error: "Database error", message: dealsError.message },
      { status: 500 }
    )
  }

  // Collect stage IDs to look up
  const stageIds = Array.from(new Set((deals || []).map((d: any) => d.current_stage_id).filter(Boolean)))

  // Query pipeline stages
  let stagesMap: Record<string, { name: string; color: string }> = {}
  if (stageIds.length > 0) {
    const { data: stages, error: stagesError } = await supabase
      .from("pipeline_stages")
      .select("id, name, color")
      .in("id", stageIds)

    if (!stagesError && stages) {
      for (const stage of stages) {
        stagesMap[stage.id] = { name: stage.name, color: stage.color }
      }
    }
  }

  // Build response map
  const statusMap: Record<string, {
    deal_id: string
    stage_name: string
    stage_color: string
    deal_status: string
    deal_priority: string
  } | null> = {}

  for (const id of propertyIds) {
    statusMap[id] = null
  }

  for (const deal of deals || []) {
    if (!deal.property_id) continue
    const stage = stagesMap[deal.current_stage_id] || { name: "Unknown", color: "#6B7280" }

    statusMap[deal.property_id] = {
      deal_id: deal.id,
      stage_name: stage.name,
      stage_color: stage.color,
      deal_status: deal.status,
      deal_priority: deal.priority || "medium",
    }
  }

  return NextResponse.json({ data: statusMap })
}

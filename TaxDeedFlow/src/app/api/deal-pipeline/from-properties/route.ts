/**
 * Deal Pipeline - Bulk Create from Properties API
 *
 * POST /api/deal-pipeline/from-properties - Create deals from selected properties
 *
 * Called when a user selects properties on the Properties page and clicks
 * "Add to Pipeline". Creates one deal per property, skipping any that
 * already have an active deal in the pipeline.
 *
 * @author Claude Code Agent
 * @date 2026-02-07
 */

import { NextRequest, NextResponse } from "next/server"
import { validateApiAuth, unauthorizedResponse, forbiddenResponse } from "@/lib/auth/api-auth"
import { validateCsrf, csrfErrorResponse } from "@/lib/auth/csrf"
import { createServerClient } from "@/lib/supabase/client"

/** UUID v4 format regex */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Maximum number of properties that can be added in a single request */
const MAX_PROPERTIES_PER_REQUEST = 100

/** Valid priority values */
const VALID_PRIORITIES = ["low", "medium", "high", "urgent"] as const

/**
 * Validate the request body for bulk deal creation from properties.
 */
function validateRequest(body: unknown): {
  valid: boolean
  data?: {
    property_ids: string[]
    organization_id: string
    stage_id: string
    priority: string
  }
  error?: string
} {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body is required" }
  }

  const request = body as Record<string, unknown>

  // property_ids: required, non-empty array of UUIDs
  if (!request.property_ids || !Array.isArray(request.property_ids)) {
    return { valid: false, error: "property_ids is required and must be an array" }
  }

  if (request.property_ids.length === 0) {
    return { valid: false, error: "property_ids must contain at least one ID" }
  }

  if (request.property_ids.length > MAX_PROPERTIES_PER_REQUEST) {
    return {
      valid: false,
      error: `Too many properties. Maximum is ${MAX_PROPERTIES_PER_REQUEST}, received ${request.property_ids.length}`,
    }
  }

  const propertyIds: string[] = []
  for (const id of request.property_ids) {
    if (typeof id !== "string" || !UUID_REGEX.test(id)) {
      return { valid: false, error: `Invalid property_id UUID format: ${id}` }
    }
    propertyIds.push(id)
  }

  // Deduplicate property IDs
  const uniquePropertyIds = Array.from(new Set(propertyIds))

  // organization_id: required, must be a non-empty string
  // NOTE: The live database uses TEXT (not UUID) for organization_id,
  // with a default value of 'default'. We accept any non-empty string.
  if (!request.organization_id || typeof request.organization_id !== "string") {
    return { valid: false, error: "organization_id is required" }
  }

  const organizationId = request.organization_id.trim()
  if (organizationId.length === 0) {
    return { valid: false, error: "organization_id must not be empty" }
  }

  // stage_id: required, must be a valid UUID
  if (!request.stage_id || typeof request.stage_id !== "string") {
    return { valid: false, error: "stage_id is required" }
  }

  if (!UUID_REGEX.test(request.stage_id)) {
    return { valid: false, error: "stage_id must be a valid UUID" }
  }

  // priority: optional, defaults to "medium"
  let priority = "medium"
  if (request.priority !== undefined && request.priority !== null) {
    if (typeof request.priority !== "string" || !VALID_PRIORITIES.includes(request.priority as any)) {
      return {
        valid: false,
        error: `priority must be one of: ${VALID_PRIORITIES.join(", ")}`,
      }
    }
    priority = request.priority
  }

  return {
    valid: true,
    data: {
      property_ids: uniquePropertyIds,
      organization_id: organizationId,
      stage_id: request.stage_id,
      priority,
    },
  }
}

/**
 * POST /api/deal-pipeline/from-properties
 *
 * Bulk create deals from properties.
 *
 * Request body:
 * {
 *   property_ids: string[],      // Array of property UUIDs
 *   organization_id: string,     // Organization ID (TEXT, e.g. "default")
 *   stage_id: string,            // UUID of the pipeline stage to place deals in
 *   priority?: string            // "low" | "medium" | "high" | "urgent" (default: "medium")
 * }
 *
 * Response:
 * {
 *   data: {
 *     created: number,
 *     skipped: number,
 *     deal_ids: string[],
 *     errors?: Array<{ property_id: string; error: string }>
 *   }
 * }
 */
export async function POST(request: NextRequest) {
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

    const userId = authResult.user.id

    // Check role - viewers cannot create deals
    if (authResult.user?.role === "viewer") {
      return forbiddenResponse("Viewers cannot create deals")
    }

    // Validate CSRF token
    const csrfResult = await validateCsrf(request)
    if (!csrfResult.valid) {
      return csrfErrorResponse(csrfResult.error)
    }

    // Parse and validate request body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: "Validation error", message: "Invalid JSON in request body" },
        { status: 400 }
      )
    }

    const validation = validateRequest(body)
    if (!validation.valid || !validation.data) {
      return NextResponse.json(
        { error: "Validation error", message: validation.error },
        { status: 400 }
      )
    }

    const { property_ids, organization_id, stage_id, priority } = validation.data

    // Verify the target stage exists and belongs to the organization
    const { data: stageData, error: stageError } = await supabase
      .from("pipeline_stages")
      .select("id, name")
      .eq("id", stage_id)
      .eq("organization_id", organization_id)
      .eq("is_active", true)
      .single()

    if (stageError || !stageData) {
      return NextResponse.json(
        {
          error: "Invalid stage",
          message: "The specified stage does not exist, is inactive, or does not belong to the organization",
        },
        { status: 400 }
      )
    }

    // Find which properties already have active deals to skip them
    const { data: existingDeals, error: existingError } = await supabase
      .from("deals")
      .select("property_id")
      .in("property_id", property_ids)
      .eq("status", "active")

    if (existingError) {
      console.error("[API From Properties] Error checking existing deals:", existingError)
      return NextResponse.json(
        { error: "Database error", message: existingError.message },
        { status: 500 }
      )
    }

    const existingPropertyIds = new Set(
      (existingDeals || []).map((d: any) => d.property_id).filter(Boolean)
    )

    // Split into properties to create vs skip
    const toCreate = property_ids.filter((id) => !existingPropertyIds.has(id))
    const skippedCount = property_ids.length - toCreate.length

    // Attempt to create a deal for each eligible property
    const createdDealIds: string[] = []
    const errors: Array<{ property_id: string; error: string }> = []

    for (const propertyId of toCreate) {
      try {
        // Try using the create_deal_from_property RPC if it exists
        const { data: dealId, error: rpcError } = await supabase.rpc(
          "create_deal_from_property",
          {
            p_property_id: propertyId,
            p_organization_id: organization_id,
            p_stage_id: stage_id,
            p_created_by: userId,
            p_priority: priority,
          }
        )

        if (rpcError) {
          // If the RPC function doesn't exist, fall back to direct insert
          if (
            rpcError.message?.includes("function") &&
            rpcError.message?.includes("does not exist")
          ) {
            const fallbackResult = await createDealDirectly(
              supabase,
              propertyId,
              organization_id,
              stage_id,
              userId,
              priority
            )

            if (fallbackResult.error) {
              errors.push({ property_id: propertyId, error: fallbackResult.error })
            } else if (fallbackResult.deal_id) {
              createdDealIds.push(fallbackResult.deal_id)
            }
          } else {
            console.error(`[API From Properties] RPC error for property ${propertyId}:`, rpcError)
            errors.push({ property_id: propertyId, error: rpcError.message })
          }
        } else if (dealId) {
          createdDealIds.push(dealId)
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error"
        console.error(`[API From Properties] Error creating deal for property ${propertyId}:`, err)
        errors.push({ property_id: propertyId, error: message })
      }
    }

    // Log activity for each created deal
    for (const dealId of createdDealIds) {
      try {
        await supabase.rpc("create_deal_activity", {
          p_deal_id: dealId,
          p_user_id: userId,
          p_activity_type: "note",
          p_title: "Deal created from Properties page",
          p_description: `Deal created via bulk add to pipeline (stage: ${stageData.name})`,
          p_metadata: null,
        })
      } catch {
        // Activity logging is best-effort; do not fail the request
      }
    }

    const response: {
      data: {
        created: number
        skipped: number
        deal_ids: string[]
        errors?: Array<{ property_id: string; error: string }>
      }
    } = {
      data: {
        created: createdDealIds.length,
        skipped: skippedCount,
        deal_ids: createdDealIds,
      },
    }

    // Only include errors array if there were failures
    if (errors.length > 0) {
      response.data.errors = errors
    }

    // Use 201 if at least one deal was created, 200 if all were skipped
    const statusCode = createdDealIds.length > 0 ? 201 : 200

    return NextResponse.json(response, { status: statusCode })
  } catch (error) {
    console.error("[API From Properties] Server error:", error)
    return NextResponse.json(
      { error: "Server error", message: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}

/**
 * Fallback: create a deal via direct INSERT if the RPC function is not available.
 *
 * Looks up the property to build a reasonable title, then inserts into the deals table.
 */
async function createDealDirectly(
  supabase: NonNullable<ReturnType<typeof createServerClient>>,
  propertyId: string,
  organizationId: string,
  stageId: string,
  userId: string,
  priority: string
): Promise<{ deal_id?: string; error?: string }> {
  // Look up the property to build a title
  const { data: property } = await supabase
    .from("properties")
    .select("parcel_id, property_address, county_id")
    .eq("id", propertyId)
    .single()

  const title = property?.property_address
    ? property.property_address
    : property?.parcel_id
      ? `Parcel ${property.parcel_id}`
      : `Property Deal`

  const now = new Date().toISOString()

  const { data: inserted, error: insertError } = await supabase
    .from("deals")
    .insert({
      organization_id: organizationId,
      property_id: propertyId,
      title,
      current_stage_id: stageId,
      priority,
      status: "active",
      created_by: userId,
      stage_entered_at: now,
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single()

  if (insertError) {
    console.error("[API From Properties] Direct insert error:", insertError)
    return { error: insertError.message }
  }

  return { deal_id: inserted?.id }
}

/**
 * Deal Pipeline API - Individual Deal Endpoints
 *
 * GET /api/deal-pipeline/[id] - Get a single deal with full details
 * PATCH /api/deal-pipeline/[id] - Update a deal
 * DELETE /api/deal-pipeline/[id] - Delete a deal (soft delete)
 *
 * @author Claude Code Agent
 * @date 2026-01-23
 */

import { NextRequest, NextResponse } from "next/server"
import { validateApiAuth, unauthorizedResponse, forbiddenResponse } from "@/lib/auth/api-auth"
import { validateCsrf, csrfErrorResponse } from "@/lib/auth/csrf"
import { createServerClient } from "@/lib/supabase/client"
import type { UpdateDealRequest } from "@/types/deal-pipeline"

/**
 * Validate the update deal request body
 */
function validateUpdateRequest(body: unknown): {
  valid: boolean
  data?: Partial<UpdateDealRequest>
  error?: string
} {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body is required" }
  }

  const request = body as Record<string, unknown>

  // Basic UUID format check
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  // Validate title if provided
  if (request.title !== undefined && request.title !== null) {
    if (typeof request.title !== "string") {
      return { valid: false, error: "title must be a string" }
    }
    if (request.title.trim().length < 2) {
      return { valid: false, error: "title must be at least 2 characters" }
    }
    if (request.title.trim().length > 200) {
      return { valid: false, error: "title must be at most 200 characters" }
    }
  }

  // Validate assigned_to if provided
  if (request.assigned_to !== undefined && request.assigned_to !== null) {
    if (typeof request.assigned_to !== "string") {
      return { valid: false, error: "assigned_to must be a string" }
    }
    if (!uuidRegex.test(request.assigned_to)) {
      return { valid: false, error: "assigned_to must be a valid UUID" }
    }
  }

  // Validate priority if provided
  if (request.priority !== undefined && request.priority !== null) {
    const validPriorities = ["low", "medium", "high", "urgent"]
    if (!validPriorities.includes(String(request.priority))) {
      return { valid: false, error: "priority must be one of: low, medium, high, urgent" }
    }
  }

  // Validate status if provided
  if (request.status !== undefined && request.status !== null) {
    const validStatuses = ["active", "won", "lost", "abandoned"]
    if (!validStatuses.includes(String(request.status))) {
      return { valid: false, error: "status must be one of: active, won, lost, abandoned" }
    }
  }

  // Validate dates if provided
  if (request.auction_date !== undefined && request.auction_date !== null) {
    const date = new Date(String(request.auction_date))
    if (isNaN(date.getTime())) {
      return { valid: false, error: "auction_date must be a valid date" }
    }
  }

  if (request.registration_deadline !== undefined && request.registration_deadline !== null) {
    const date = new Date(String(request.registration_deadline))
    if (isNaN(date.getTime())) {
      return { valid: false, error: "registration_deadline must be a valid date" }
    }
  }

  const updateData: Partial<UpdateDealRequest> = {}

  if (request.title !== undefined) updateData.title = String(request.title).trim()
  if (request.description !== undefined) updateData.description = request.description ? String(request.description).trim() : undefined
  if (request.target_bid_amount !== undefined) updateData.target_bid_amount = request.target_bid_amount ? Number(request.target_bid_amount) : undefined
  if (request.max_bid_amount !== undefined) updateData.max_bid_amount = request.max_bid_amount ? Number(request.max_bid_amount) : undefined
  if (request.actual_bid_amount !== undefined) updateData.actual_bid_amount = request.actual_bid_amount ? Number(request.actual_bid_amount) : undefined
  if (request.purchase_price !== undefined) updateData.purchase_price = request.purchase_price ? Number(request.purchase_price) : undefined
  if (request.estimated_value !== undefined) updateData.estimated_value = request.estimated_value ? Number(request.estimated_value) : undefined
  if (request.estimated_profit !== undefined) updateData.estimated_profit = request.estimated_profit ? Number(request.estimated_profit) : undefined
  if (request.priority !== undefined) updateData.priority = request.priority as "low" | "medium" | "high" | "urgent"
  if (request.status !== undefined) updateData.status = request.status as "active" | "won" | "lost" | "abandoned"
  if (request.assigned_to !== undefined) updateData.assigned_to = request.assigned_to ? String(request.assigned_to) : undefined
  if (request.auction_date !== undefined) updateData.auction_date = request.auction_date ? String(request.auction_date) : undefined
  if (request.registration_deadline !== undefined) updateData.registration_deadline = request.registration_deadline ? String(request.registration_deadline) : undefined
  if (request.tags !== undefined && Array.isArray(request.tags)) updateData.tags = request.tags.map(String)
  if (request.custom_fields !== undefined && typeof request.custom_fields === "object") updateData.custom_fields = request.custom_fields as Record<string, unknown>

  return {
    valid: true,
    data: updateData,
  }
}

/**
 * GET /api/deal-pipeline/[id]
 * Get a single deal with full details
 *
 * Query parameters:
 * - include_activities: boolean (default: false) - Include deal activities
 * - include_assignments: boolean (default: false) - Include team assignments
 *
 * Response:
 * {
 *   data: DealWithMetrics,
 *   activities?: DealActivity[],
 *   assignments?: DealAssignment[]
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const dealId = params.id

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const includeActivities = searchParams.get("include_activities") === "true"
    const includeAssignments = searchParams.get("include_assignments") === "true"

    // Fetch deal from view
    const { data: deal, error: dealError } = await supabase
      .from("vw_deals_complete")
      .select("*")
      .eq("id", dealId)
      .single()

    if (dealError || !deal) {
      return NextResponse.json(
        { error: "Deal not found", message: "The specified deal does not exist" },
        { status: 404 }
      )
    }

    // Verify user has access to this deal's organization
    const { data: memberData, error: memberError } = await supabase
      .from("organization_members")
      .select("id, role")
      .eq("organization_id", deal.organization_id)
      .eq("user_id", userId)
      .eq("status", "active")
      .single()

    if (memberError || !memberData) {
      return forbiddenResponse("You do not have access to this deal")
    }

    // Transform deal data
    const roi_percentage = deal.purchase_price && deal.estimated_profit
      ? Math.round((deal.estimated_profit / deal.purchase_price) * 100)
      : undefined

    const stageEnteredAt = deal.stage_entered_at ? new Date(deal.stage_entered_at).getTime() : Date.now()
    const days_in_stage = Math.floor((Date.now() - stageEnteredAt) / (1000 * 60 * 60 * 24))

    let days_until_auction: number | undefined
    if (deal.auction_date) {
      const auctionTime = new Date(deal.auction_date).getTime()
      days_until_auction = Math.floor((auctionTime - Date.now()) / (1000 * 60 * 60 * 24))
    }

    let days_until_registration_deadline: number | undefined
    if (deal.registration_deadline) {
      const deadlineTime = new Date(deal.registration_deadline).getTime()
      days_until_registration_deadline = Math.floor((deadlineTime - Date.now()) / (1000 * 60 * 60 * 24))
    }

    const is_overdue = (
      (deal.auction_date && new Date(deal.auction_date).getTime() < Date.now()) ||
      (deal.registration_deadline && new Date(deal.registration_deadline).getTime() < Date.now())
    ) || false

    const transformedDeal = {
      id: deal.id,
      organization_id: deal.organization_id,
      property_id: deal.property_id,
      title: deal.title,
      description: deal.description,
      current_stage_id: deal.current_stage_id,
      current_stage_name: deal.current_stage_name || "Unknown",
      current_stage_color: deal.current_stage_color,
      priority: deal.priority || "medium",
      status: deal.status || "active",
      assigned_to: deal.assigned_to,
      created_by: deal.created_by,
      auction_date: deal.auction_date,
      registration_deadline: deal.registration_deadline,
      won_at: deal.won_at,
      lost_at: deal.lost_at,
      tags: deal.tags || [],
      created_at: deal.created_at,
      updated_at: deal.updated_at,
      target_bid_amount: deal.target_bid_amount,
      max_bid_amount: deal.max_bid_amount,
      actual_bid_amount: deal.actual_bid_amount,
      purchase_price: deal.purchase_price,
      estimated_value: deal.estimated_value,
      estimated_profit: deal.estimated_profit,
      roi_percentage,
      days_in_stage,
      days_until_auction,
      days_until_registration_deadline,
      active_team_members: deal.active_team_members || 0,
      activity_count: deal.activity_count || 0,
      is_overdue,
    }

    const response: any = {
      data: transformedDeal,
    }

    // Fetch activities if requested
    if (includeActivities) {
      const { data: activities, error: activitiesError } = await supabase
        .from("vw_recent_deal_activities")
        .select("*")
        .eq("deal_id", dealId)
        .order("created_at", { ascending: false })
        .limit(100)

      if (!activitiesError && activities) {
        response.activities = activities
      }
    }

    // Fetch assignments if requested
    if (includeAssignments) {
      const { data: assignments, error: assignmentsError } = await supabase
        .from("deal_assignments")
        .select(`
          id,
          deal_id,
          user_id,
          role,
          assigned_at,
          assigned_by,
          is_active
        `)
        .eq("deal_id", dealId)
        .eq("is_active", true)

      if (!assignmentsError && assignments) {
        response.assignments = assignments
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("[API Deal Pipeline] Server error:", error)
    return NextResponse.json(
      { error: "Server error", message: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/deal-pipeline/[id]
 * Update a deal - requires authentication, CSRF validation, AND non-viewer role
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const dealId = params.id

    // Check role - viewers cannot update deals
    if (authResult.user?.role === "viewer") {
      return forbiddenResponse("Viewers cannot update deals")
    }

    // Validate CSRF token
    const csrfResult = await validateCsrf(request)
    if (!csrfResult.valid) {
      return csrfErrorResponse(csrfResult.error)
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = validateUpdateRequest(body)

    if (!validation.valid) {
      return NextResponse.json(
        { error: "Validation error", message: validation.error },
        { status: 400 }
      )
    }

    const updateData = validation.data!

    // Fetch existing deal to verify access
    const { data: existingDeal, error: fetchError } = await supabase
      .from("deals")
      .select("id, organization_id, title, current_stage_id, status")
      .eq("id", dealId)
      .single()

    if (fetchError || !existingDeal) {
      return NextResponse.json(
        { error: "Deal not found", message: "The specified deal does not exist" },
        { status: 404 }
      )
    }

    // Verify user has access to this organization
    const { data: memberData, error: memberError } = await supabase
      .from("organization_members")
      .select("id, role")
      .eq("organization_id", existingDeal.organization_id)
      .eq("user_id", userId)
      .eq("status", "active")
      .single()

    if (memberError || !memberData) {
      return forbiddenResponse("You do not have access to this deal")
    }

    // Build update object
    const updates: any = {
      updated_at: new Date().toISOString(),
    }

    if (updateData.title !== undefined) updates.title = updateData.title
    if (updateData.description !== undefined) updates.description = updateData.description
    if (updateData.target_bid_amount !== undefined) updates.target_bid_amount = updateData.target_bid_amount
    if (updateData.max_bid_amount !== undefined) updates.max_bid_amount = updateData.max_bid_amount
    if (updateData.actual_bid_amount !== undefined) updates.actual_bid_amount = updateData.actual_bid_amount
    if (updateData.purchase_price !== undefined) updates.purchase_price = updateData.purchase_price
    if (updateData.estimated_value !== undefined) updates.estimated_value = updateData.estimated_value
    if (updateData.estimated_profit !== undefined) updates.estimated_profit = updateData.estimated_profit
    if (updateData.priority !== undefined) updates.priority = updateData.priority
    if (updateData.assigned_to !== undefined) updates.assigned_to = updateData.assigned_to
    if (updateData.auction_date !== undefined) updates.auction_date = updateData.auction_date
    if (updateData.registration_deadline !== undefined) updates.registration_deadline = updateData.registration_deadline
    if (updateData.tags !== undefined) updates.tags = updateData.tags
    if (updateData.custom_fields !== undefined) updates.custom_fields = updateData.custom_fields

    // Handle status changes
    if (updateData.status !== undefined) {
      updates.status = updateData.status

      if (updateData.status === "won" && existingDeal.status !== "won") {
        updates.won_at = new Date().toISOString()
      }
      if (updateData.status === "lost" && existingDeal.status !== "lost") {
        updates.lost_at = new Date().toISOString()
      }
    }

    // Update the deal
    const { error: updateError } = await supabase
      .from("deals")
      .update(updates)
      .eq("id", dealId)

    if (updateError) {
      console.error("[API Deal Pipeline] Update error:", updateError)
      return NextResponse.json(
        { error: "Failed to update deal", message: updateError.message },
        { status: 500 }
      )
    }

    // Create activity for status change
    if (updateData.status !== undefined && updateData.status !== existingDeal.status) {
      await supabase.rpc("create_deal_activity", {
        p_deal_id: dealId,
        p_user_id: userId,
        p_activity_type: "status_change",
        p_title: `Status changed to ${updateData.status}`,
        p_description: `Deal status changed from ${existingDeal.status} to ${updateData.status}`,
        p_metadata: null,
      })
    }

    // Handle assignment change
    if (updateData.assigned_to !== undefined) {
      await supabase.rpc("upsert_deal_assignment", {
        p_deal_id: dealId,
        p_user_id: updateData.assigned_to,
        p_role: "lead",
      })

      await supabase.rpc("create_deal_activity", {
        p_deal_id: dealId,
        p_user_id: userId,
        p_activity_type: "assignment",
        p_title: "Deal reassigned",
        p_description: `Deal assigned to a new team member`,
        p_metadata: null,
      })
    }

    return NextResponse.json({
      deal_id: dealId,
      title: updateData.title || existingDeal.title,
      current_stage_id: existingDeal.current_stage_id,
      message: "Deal updated successfully",
    })
  } catch (error) {
    console.error("[API Deal Pipeline] Server error:", error)
    return NextResponse.json(
      { error: "Server error", message: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/deal-pipeline/[id]
 * Delete a deal (soft delete) - requires authentication, CSRF validation, AND admin role
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const dealId = params.id

    // Check role - only admins can delete deals
    if (authResult.user?.role !== "admin") {
      return forbiddenResponse("Only admins can delete deals")
    }

    // Validate CSRF token
    const csrfResult = await validateCsrf(request)
    if (!csrfResult.valid) {
      return csrfErrorResponse(csrfResult.error)
    }

    // Fetch existing deal to verify access
    const { data: existingDeal, error: fetchError } = await supabase
      .from("deals")
      .select("id, organization_id, title")
      .eq("id", dealId)
      .single()

    if (fetchError || !existingDeal) {
      return NextResponse.json(
        { error: "Deal not found", message: "The specified deal does not exist" },
        { status: 404 }
      )
    }

    // Verify user has admin access to this organization
    const { data: memberData, error: memberError } = await supabase
      .from("organization_members")
      .select("id, role")
      .eq("organization_id", existingDeal.organization_id)
      .eq("user_id", userId)
      .eq("role", "admin")
      .eq("status", "active")
      .single()

    if (memberError || !memberData) {
      return forbiddenResponse("You do not have admin access to this deal")
    }

    // Soft delete by setting status to abandoned
    const { error: deleteError } = await supabase
      .from("deals")
      .update({
        status: "abandoned",
        updated_at: new Date().toISOString(),
      })
      .eq("id", dealId)

    if (deleteError) {
      console.error("[API Deal Pipeline] Delete error:", deleteError)
      return NextResponse.json(
        { error: "Failed to delete deal", message: deleteError.message },
        { status: 500 }
      )
    }

    // Create activity for deletion
    await supabase.rpc("create_deal_activity", {
      p_deal_id: dealId,
      p_user_id: userId,
      p_activity_type: "status_change",
      p_title: "Deal deleted",
      p_description: `Deal "${existingDeal.title}" was deleted (abandoned)`,
      p_metadata: null,
    })

    return NextResponse.json({
      deal_id: dealId,
      message: "Deal deleted successfully",
    })
  } catch (error) {
    console.error("[API Deal Pipeline] Server error:", error)
    return NextResponse.json(
      { error: "Server error", message: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}

/**
 * Deal Pipeline API - List and Create Endpoints
 *
 * GET /api/deal-pipeline - List deals with pipeline information
 * POST /api/deal-pipeline - Create a new deal
 *
 * Deals track properties through customizable pipeline stages from research to closing.
 * Supports team collaboration, financial tracking, and activity logging.
 *
 * @author Claude Code Agent
 * @date 2026-01-23
 */

import { NextRequest, NextResponse } from "next/server"
import { validateApiAuth, unauthorizedResponse, forbiddenResponse } from "@/lib/auth/api-auth"
import { validateCsrf, csrfErrorResponse } from "@/lib/auth/csrf"
import { createServerClient } from "@/lib/supabase/client"
import type { CreateDealRequest, DealFilters } from "@/types/deal-pipeline"

/**
 * Validate the create deal request body
 */
function validateCreateRequest(body: unknown): {
  valid: boolean
  data?: CreateDealRequest
  error?: string
} {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body is required" }
  }

  const request = body as Record<string, unknown>

  // Organization ID is required
  if (!request.organization_id || typeof request.organization_id !== "string") {
    return { valid: false, error: "organization_id is required" }
  }

  // Basic UUID format check
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(request.organization_id)) {
    return { valid: false, error: "organization_id must be a valid UUID" }
  }

  // Title is required
  if (!request.title || typeof request.title !== "string") {
    return { valid: false, error: "title is required and must be a string" }
  }

  if (request.title.trim().length < 2) {
    return { valid: false, error: "title must be at least 2 characters" }
  }

  if (request.title.trim().length > 200) {
    return { valid: false, error: "title must be at most 200 characters" }
  }

  // Current stage ID is required
  if (!request.current_stage_id || typeof request.current_stage_id !== "string") {
    return { valid: false, error: "current_stage_id is required" }
  }

  if (!uuidRegex.test(request.current_stage_id)) {
    return { valid: false, error: "current_stage_id must be a valid UUID" }
  }

  // Validate property_id if provided
  if (request.property_id !== undefined && request.property_id !== null) {
    if (typeof request.property_id !== "string") {
      return { valid: false, error: "property_id must be a string" }
    }
    if (!uuidRegex.test(request.property_id)) {
      return { valid: false, error: "property_id must be a valid UUID" }
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

  return {
    valid: true,
    data: {
      organization_id: request.organization_id,
      property_id: request.property_id ? String(request.property_id) : undefined,
      title: request.title.trim(),
      description: request.description ? String(request.description).trim() : undefined,
      current_stage_id: request.current_stage_id,
      target_bid_amount: request.target_bid_amount ? Number(request.target_bid_amount) : undefined,
      max_bid_amount: request.max_bid_amount ? Number(request.max_bid_amount) : undefined,
      estimated_value: request.estimated_value ? Number(request.estimated_value) : undefined,
      estimated_profit: request.estimated_profit ? Number(request.estimated_profit) : undefined,
      priority: request.priority ? (request.priority as "low" | "medium" | "high" | "urgent") : undefined,
      assigned_to: request.assigned_to ? String(request.assigned_to) : undefined,
      auction_date: request.auction_date ? String(request.auction_date) : undefined,
      registration_deadline: request.registration_deadline ? String(request.registration_deadline) : undefined,
      tags: request.tags && Array.isArray(request.tags) ? request.tags.map(String) : undefined,
      custom_fields: request.custom_fields && typeof request.custom_fields === "object" ? (request.custom_fields as Record<string, unknown>) : undefined,
    },
  }
}

/**
 * GET /api/deal-pipeline
 * List deals with pipeline information
 *
 * Query parameters:
 * - organization_id: string (filter by organization)
 * - stage_id: string (filter by current stage)
 * - status: string (filter by status: active, won, lost, abandoned)
 * - priority: string (filter by priority: low, medium, high, urgent)
 * - assigned_to: string (filter by assigned user)
 * - property_id: string (filter by property)
 * - include_stats: boolean (default: false) - Include pipeline statistics
 * - limit: number (default: 100, max: 500)
 *
 * Response:
 * {
 *   data: {
 *     deals: DealWithMetrics[],
 *     stats?: PipelineStats
 *   },
 *   source: "database"
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

    // Get query params for filtering
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get("organization_id")
    const stageId = searchParams.get("stage_id")
    const status = searchParams.get("status")
    const priority = searchParams.get("priority")
    const assignedTo = searchParams.get("assigned_to")
    const propertyId = searchParams.get("property_id")
    const includeStats = searchParams.get("include_stats") === "true"
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 500)

    // Fetch deals with complete information using the view
    let query = supabase
      .from("vw_deals_complete")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit)

    // Apply filters
    if (organizationId) {
      query = query.eq("organization_id", organizationId)
    }

    if (stageId) {
      query = query.eq("current_stage_id", stageId)
    }

    if (status) {
      query = query.eq("status", status)
    }

    if (priority) {
      query = query.eq("priority", priority)
    }

    if (assignedTo) {
      query = query.eq("assigned_to", assignedTo)
    }

    if (propertyId) {
      query = query.eq("property_id", propertyId)
    }

    const { data: deals, error: dealsError } = await query

    if (dealsError) {
      console.error("[API Deal Pipeline] Database error:", dealsError)
      return NextResponse.json(
        { error: "Database error", message: dealsError.message },
        { status: 500 }
      )
    }

    // Transform to frontend format
    const transformedDeals = (deals || []).map((deal: any) => {
      // Calculate ROI percentage
      const roi_percentage = deal.purchase_price && deal.estimated_profit
        ? Math.round((deal.estimated_profit / deal.purchase_price) * 100)
        : undefined

      // Calculate days in stage
      const stageEnteredAt = deal.stage_entered_at ? new Date(deal.stage_entered_at).getTime() : Date.now()
      const days_in_stage = Math.floor((Date.now() - stageEnteredAt) / (1000 * 60 * 60 * 24))

      // Calculate days until auction
      let days_until_auction: number | undefined
      if (deal.auction_date) {
        const auctionTime = new Date(deal.auction_date).getTime()
        days_until_auction = Math.floor((auctionTime - Date.now()) / (1000 * 60 * 60 * 24))
      }

      // Calculate days until registration deadline
      let days_until_registration_deadline: number | undefined
      if (deal.registration_deadline) {
        const deadlineTime = new Date(deal.registration_deadline).getTime()
        days_until_registration_deadline = Math.floor((deadlineTime - Date.now()) / (1000 * 60 * 60 * 24))
      }

      // Check if overdue
      const is_overdue = (
        (deal.auction_date && new Date(deal.auction_date).getTime() < Date.now()) ||
        (deal.registration_deadline && new Date(deal.registration_deadline).getTime() < Date.now())
      ) || false

      return {
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
    })

    // Fetch stats if requested
    let stats = undefined
    if (includeStats && organizationId) {
      // Get pipeline overview for the organization
      const { data: pipelineData, error: pipelineError } = await supabase
        .from("vw_pipeline_overview")
        .select("*")
        .eq("organization_id", organizationId)
        .single()

      if (!pipelineError && pipelineData) {
        stats = {
          organization_id: organizationId,
          total_active_deals: pipelineData.total_deals || 0,
          deals_by_status: {
            active: transformedDeals.filter((d: any) => d.status === "active").length,
            won: transformedDeals.filter((d: any) => d.status === "won").length,
            lost: transformedDeals.filter((d: any) => d.status === "lost").length,
            abandoned: transformedDeals.filter((d: any) => d.status === "abandoned").length,
          },
          deals_by_priority: {
            low: transformedDeals.filter((d: any) => d.priority === "low").length,
            medium: transformedDeals.filter((d: any) => d.priority === "medium").length,
            high: transformedDeals.filter((d: any) => d.priority === "high").length,
            urgent: transformedDeals.filter((d: any) => d.priority === "urgent").length,
          },
          total_estimated_value: pipelineData.total_estimated_value || 0,
          total_estimated_profit: pipelineData.total_estimated_profit || 0,
          total_actual_bids: pipelineData.total_actual_bids || 0,
          total_purchase_price: pipelineData.total_purchase_price || 0,
          avg_roi_percentage: pipelineData.avg_roi_percentage || 0,
          win_rate: pipelineData.win_rate || 0,
          total_won: pipelineData.total_won || 0,
          total_lost: pipelineData.total_lost || 0,
          avg_time_to_close_days: pipelineData.avg_time_to_close_days || 0,
          deals_overdue: transformedDeals.filter((d: any) => d.is_overdue).length,
        }
      }
    }

    return NextResponse.json({
      data: {
        deals: transformedDeals,
        stats,
      },
      source: "database",
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
 * POST /api/deal-pipeline
 * Create a new deal - requires authentication, CSRF validation, AND non-viewer role
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
    const body = await request.json()
    const validation = validateCreateRequest(body)

    if (!validation.valid) {
      return NextResponse.json(
        { error: "Validation error", message: validation.error },
        { status: 400 }
      )
    }

    const dealData = validation.data!

    // Verify the user has access to the organization
    const { data: memberData, error: memberError } = await supabase
      .from("organization_members")
      .select("id, role")
      .eq("organization_id", dealData.organization_id)
      .eq("user_id", userId)
      .eq("status", "active")
      .single()

    if (memberError || !memberData) {
      return forbiddenResponse("You do not have access to this organization")
    }

    // Verify the stage belongs to the organization
    const { data: stageData, error: stageError } = await supabase
      .from("pipeline_stages")
      .select("id")
      .eq("id", dealData.current_stage_id)
      .eq("organization_id", dealData.organization_id)
      .eq("is_active", true)
      .single()

    if (stageError || !stageData) {
      return NextResponse.json(
        { error: "Invalid stage", message: "The specified stage does not exist or is inactive" },
        { status: 400 }
      )
    }

    // Verify property exists if provided
    if (dealData.property_id) {
      const { data: propertyData, error: propertyError } = await supabase
        .from("properties")
        .select("id")
        .eq("id", dealData.property_id)
        .single()

      if (propertyError || !propertyData) {
        return NextResponse.json(
          { error: "Invalid property", message: "The specified property does not exist" },
          { status: 400 }
        )
      }
    }

    // Use the upsert_deal function to create the deal
    const { data: dealId, error: createError } = await supabase
      .rpc("upsert_deal", {
        p_organization_id: dealData.organization_id,
        p_property_id: dealData.property_id || null,
        p_title: dealData.title,
        p_description: dealData.description || null,
        p_current_stage_id: dealData.current_stage_id,
        p_priority: dealData.priority || "medium",
        p_status: "active",
        p_assigned_to: dealData.assigned_to || null,
        p_created_by: userId,
        p_target_bid_amount: dealData.target_bid_amount || null,
        p_max_bid_amount: dealData.max_bid_amount || null,
        p_estimated_value: dealData.estimated_value || null,
        p_estimated_profit: dealData.estimated_profit || null,
        p_auction_date: dealData.auction_date || null,
        p_registration_deadline: dealData.registration_deadline || null,
        p_tags: dealData.tags || null,
        p_custom_fields: dealData.custom_fields || null,
      })

    if (createError) {
      console.error("[API Deal Pipeline] Create error:", createError)
      return NextResponse.json(
        { error: "Failed to create deal", message: createError.message },
        { status: 500 }
      )
    }

    // Create initial activity
    await supabase.rpc("create_deal_activity", {
      p_deal_id: dealId,
      p_user_id: userId,
      p_activity_type: "note",
      p_title: "Deal created",
      p_description: `Deal "${dealData.title}" was created`,
      p_metadata: null,
    })

    // Assign user if specified
    if (dealData.assigned_to) {
      await supabase.rpc("upsert_deal_assignment", {
        p_deal_id: dealId,
        p_user_id: dealData.assigned_to,
        p_role: "lead",
      })
    }

    return NextResponse.json(
      {
        deal_id: dealId,
        title: dealData.title,
        current_stage_id: dealData.current_stage_id,
        message: "Deal created successfully",
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("[API Deal Pipeline] Server error:", error)
    return NextResponse.json(
      { error: "Server error", message: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}

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

  // Organization ID is required (TEXT field in DB, can be UUID or string like 'default')
  if (!request.organization_id || typeof request.organization_id !== "string") {
    return { valid: false, error: "organization_id is required" }
  }

  if (request.organization_id.trim().length === 0) {
    return { valid: false, error: "organization_id must not be empty" }
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

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
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
 * - search: string (search in title and description)
 * - include_stats: boolean (default: false) - Include pipeline statistics
 * - limit: number (default: 100, max: 500)
 *
 * Response:
 * {
 *   data: {
 *     deals: DealWithMetrics[],
 *     stages: PipelineStageWithMetrics[],
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
    const search = searchParams.get("search")
    const stateCode = searchParams.get("state_code")
    const countyId = searchParams.get("county_id")
    const saleType = searchParams.get("sale_type")
    const dateRange = searchParams.get("date_range")
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

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
    }

    if (stateCode) {
      query = query.eq("state_code", stateCode)
    }

    if (countyId) {
      query = query.eq("county_id", countyId)
    }

    if (saleType) {
      query = query.eq("sale_type", saleType)
    }

    if (dateRange && dateRange !== "all") {
      const rangeDays: Record<string, number> = { "7days": 7, "30days": 30, "90days": 90, "6months": 180 }
      const days = rangeDays[dateRange]
      if (days) {
        const now = new Date().toISOString()
        const cutoff = new Date(Date.now() + days * 86400000).toISOString()
        query = query.gte("auction_date", now).lte("auction_date", cutoff)
      }
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

      // Calculate days in stage (prefer view-computed value, fall back to local calc)
      const days_in_stage = deal.days_in_stage != null
        ? Number(deal.days_in_stage)
        : Math.floor((Date.now() - (deal.stage_entered_at ? new Date(deal.stage_entered_at).getTime() : Date.now())) / (1000 * 60 * 60 * 24))

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

      // Check if overdue (prefer view-computed value)
      const is_overdue = deal.is_overdue != null
        ? Boolean(deal.is_overdue)
        : Boolean(
            (deal.auction_date && new Date(deal.auction_date).getTime() < Date.now()) ||
            (deal.registration_deadline && new Date(deal.registration_deadline).getTime() < Date.now())
          )

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
        county_id: deal.county_id,
        county_name: deal.county_name,
        state_code: deal.state_code,
        sale_type: deal.sale_type,
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

    // Fetch pipeline stages with computed metrics
    // Use a raw query to get stages with deal counts and financial aggregates
    const stagesQuery = organizationId
      ? supabase.rpc("get_pipeline_stages_with_metrics", { p_organization_id: organizationId })
      : null

    // Fall back to a simpler approach: query stages table + compute metrics from deals
    let stages: any[] = []

    if (stagesQuery) {
      const { data: stagesData, error: stagesError } = await stagesQuery

      if (!stagesError && stagesData) {
        stages = stagesData
      }
    }

    // If RPC not available or no org filter, build stages from pipeline_stages + deals data
    if (stages.length === 0) {
      let stagesTableQuery = supabase
        .from("pipeline_stages")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })

      if (organizationId) {
        stagesTableQuery = stagesTableQuery.eq("organization_id", organizationId)
      }

      const { data: rawStages, error: rawStagesError } = await stagesTableQuery

      if (!rawStagesError && rawStages) {
        // Build metrics from the deals we already fetched
        const dealsByStage = new Map<string, any[]>()
        for (const deal of transformedDeals) {
          if (!dealsByStage.has(deal.current_stage_id)) {
            dealsByStage.set(deal.current_stage_id, [])
          }
          dealsByStage.get(deal.current_stage_id)!.push(deal)
        }

        stages = rawStages.map((stage: any) => {
          const stageDeals = dealsByStage.get(stage.id) || []
          const activeDeals = stageDeals.filter((d: any) => d.status === "active")

          return {
            id: stage.id,
            organization_id: stage.organization_id,
            name: stage.name,
            description: stage.description,
            color: stage.color,
            sort_order: stage.sort_order,
            is_terminal: stage.is_terminal || false,
            is_active: stage.is_active,
            created_at: stage.created_at,
            updated_at: stage.updated_at,
            deal_count: activeDeals.length,
            urgent_deals: activeDeals.filter((d: any) => d.priority === "urgent").length,
            high_priority_deals: activeDeals.filter((d: any) => d.priority === "high").length,
            total_estimated_value: activeDeals.reduce((s: number, d: any) => s + (d.estimated_value || 0), 0),
            total_estimated_profit: activeDeals.reduce((s: number, d: any) => s + (d.estimated_profit || 0), 0),
            avg_estimated_profit: activeDeals.length > 0
              ? Math.round(activeDeals.reduce((s: number, d: any) => s + (d.estimated_profit || 0), 0) / activeDeals.length)
              : 0,
            avg_days_in_stage: activeDeals.length > 0
              ? Math.round(activeDeals.reduce((s: number, d: any) => s + (d.days_in_stage || 0), 0) / activeDeals.length)
              : 0,
          }
        })
      }
    }

    // Fetch stats if requested
    let stats = undefined
    if (includeStats) {
      if (organizationId) {
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

      // If no org filter or vw_pipeline_overview query failed, compute stats from deals
      if (!stats) {
        stats = {
          organization_id: organizationId || "",
          total_active_deals: transformedDeals.filter((d: any) => d.status === "active").length,
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
          total_estimated_value: transformedDeals.reduce((s: number, d: any) => s + (d.estimated_value || 0), 0),
          total_estimated_profit: transformedDeals.reduce((s: number, d: any) => s + (d.estimated_profit || 0), 0),
          total_actual_bids: transformedDeals.reduce((s: number, d: any) => s + (d.actual_bid_amount || 0), 0),
          total_purchase_price: transformedDeals.reduce((s: number, d: any) => s + (d.purchase_price || 0), 0),
          avg_roi_percentage: 0,
          win_rate: 0,
          total_won: transformedDeals.filter((d: any) => d.status === "won").length,
          total_lost: transformedDeals.filter((d: any) => d.status === "lost").length,
          avg_time_to_close_days: 0,
          deals_overdue: transformedDeals.filter((d: any) => d.is_overdue).length,
        }
      }
    }

    // Fetch filter options from counties table
    const { data: countiesData } = await supabase
      .from("counties")
      .select("id, county_name, state_code")
      .order("state_code")
      .order("county_name")

    const stateSet = new Set<string>()
    for (const c of countiesData || []) {
      if (c.state_code) stateSet.add(c.state_code)
    }
    const filterStates = Array.from(stateSet).sort()
    const filterCounties = (countiesData || []).map((c: any) => ({ id: c.id, name: c.county_name, state: c.state_code }))
    const filterSaleTypes = ["upset", "judicial", "repository", "tax_certificate", "tax_deed", "sheriff_sale"]

    return NextResponse.json({
      data: {
        deals: transformedDeals,
        stages,
        stats,
        filterOptions: {
          states: filterStates,
          counties: filterCounties,
          saleTypes: filterSaleTypes,
        },
      },
      source: "database",
    })
  } catch (error) {
    console.error("[API Deal Pipeline GET] Server error:", error)
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
    // Note: organization_members may not be populated for demo/default orgs
    const { data: memberData } = await supabase
      .from("organization_members")
      .select("id, role")
      .eq("organization_id", dealData.organization_id)
      .eq("user_id", userId)
      .eq("status", "active")
      .single()

    // If membership check fails, try with 'default' org as fallback
    if (!memberData) {
      const { data: defaultMember } = await supabase
        .from("organization_members")
        .select("id")
        .eq("organization_id", "default")
        .eq("user_id", userId)
        .eq("status", "active")
        .single()

      // If neither org has membership, allow if user is authenticated (demo mode)
      if (!defaultMember) {
        console.warn("[API Deal Pipeline] No org membership found, allowing authenticated user:", userId)
      }
    }

    // Verify the stage exists and is active
    // Try matching the requested org first, then fall back to 'default' org
    let stageData: { id: string } | null = null
    const { data: stageMatch } = await supabase
      .from("pipeline_stages")
      .select("id")
      .eq("id", dealData.current_stage_id)
      .eq("organization_id", dealData.organization_id)
      .eq("is_active", true)
      .single()

    stageData = stageMatch

    if (!stageData) {
      // Fallback: check if stage exists under 'default' org
      const { data: defaultStage } = await supabase
        .from("pipeline_stages")
        .select("id")
        .eq("id", dealData.current_stage_id)
        .eq("organization_id", "default")
        .eq("is_active", true)
        .single()

      stageData = defaultStage

      // Use 'default' as the org for the deal if stage belongs to default
      if (stageData) {
        dealData.organization_id = "default"
      }
    }

    if (!stageData) {
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
    console.error("[API Deal Pipeline POST] Server error:", error)
    const errMsg = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: "Server error", message: errMsg },
      { status: 500 }
    )
  }
}

/**
 * Watchlists API - List and Create Endpoints
 *
 * GET /api/watchlists - List watchlists for the authenticated user
 * POST /api/watchlists - Create a new watchlist
 *
 * Watchlists allow users to save collections of properties for tracking and collaboration.
 * They can be personal or shared within an organization.
 *
 * @author Claude Code Agent
 * @date 2026-01-23
 */

import { NextRequest, NextResponse } from "next/server"
import { validateApiAuth, unauthorizedResponse, forbiddenResponse } from "@/lib/auth/api-auth"
import { validateCsrf, csrfErrorResponse } from "@/lib/auth/csrf"
import { createServerClient } from "@/lib/supabase/client"
import { logWatchlistAudit } from "@/lib/auth/audit-log"
import type { CreateWatchlistRequest, WatchlistVisibility } from "@/types/watchlist"

/**
 * Validate the create watchlist request body
 */
function validateCreateRequest(body: unknown): {
  valid: boolean
  data?: CreateWatchlistRequest
  error?: string
} {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body is required" }
  }

  const request = body as Record<string, unknown>

  // Name is required
  if (!request.name || typeof request.name !== "string") {
    return { valid: false, error: "name is required and must be a string" }
  }

  if (request.name.trim().length < 2) {
    return { valid: false, error: "name must be at least 2 characters" }
  }

  if (request.name.trim().length > 100) {
    return { valid: false, error: "name must be at most 100 characters" }
  }

  // Validate visibility if provided
  if (request.visibility !== undefined) {
    const validVisibilities: WatchlistVisibility[] = ["private", "shared", "public"]
    if (!validVisibilities.includes(request.visibility as WatchlistVisibility)) {
      return {
        valid: false,
        error: "visibility must be one of: private, shared, public"
      }
    }
  }

  // Validate color if provided (hex format)
  if (request.color !== undefined && request.color !== null) {
    if (typeof request.color !== "string") {
      return { valid: false, error: "color must be a string" }
    }
    const hexRegex = /^#[0-9A-Fa-f]{6}$/
    if (!hexRegex.test(request.color)) {
      return { valid: false, error: "color must be a valid hex color (e.g., #FF5733)" }
    }
  }

  // Validate organization_id format if provided
  if (request.organization_id !== undefined && request.organization_id !== null) {
    if (typeof request.organization_id !== "string") {
      return { valid: false, error: "organization_id must be a string" }
    }
    // Basic UUID format check
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(request.organization_id)) {
      return { valid: false, error: "organization_id must be a valid UUID" }
    }
  }

  return {
    valid: true,
    data: {
      name: request.name.trim(),
      description: request.description ? String(request.description).trim() : undefined,
      organization_id: request.organization_id ? String(request.organization_id) : undefined,
      is_shared: request.is_shared === true,
      visibility: (request.visibility as WatchlistVisibility) || "private",
      color: request.color ? String(request.color) : undefined,
      icon: request.icon ? String(request.icon) : undefined,
      settings: request.settings ? (request.settings as Record<string, unknown>) : undefined,
    },
  }
}

/**
 * GET /api/watchlists
 * List watchlists for the authenticated user
 *
 * Query parameters:
 * - limit: number (default: 50, max: 100)
 * - offset: number (default: 0)
 * - organization_id: string (filter by organization)
 * - visibility: string (filter by visibility)
 * - include_deleted: boolean (default: false)
 * - include_stats: boolean (default: false) - Include property counts
 *
 * Response:
 * {
 *   data: Watchlist[],
 *   count: number,
 *   total: number
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

    // Authentication is required for watchlists
    const authResult = await validateApiAuth(request)
    if (!authResult.authenticated || !authResult.user) {
      return unauthorizedResponse(authResult.error)
    }

    const userId = authResult.user.id

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 100)
    const offset = Number(searchParams.get("offset")) || 0
    const organizationId = searchParams.get("organization_id")
    const visibility = searchParams.get("visibility")
    const includeDeleted = searchParams.get("include_deleted") === "true"
    const includeStats = searchParams.get("include_stats") === "true"

    // Build the query
    let query = supabase
      .from("watchlists")
      .select("*", { count: "exact" })

    // Filter by organization if provided
    if (organizationId) {
      query = query.eq("organization_id", organizationId)
    }

    // Filter by visibility if provided
    if (visibility) {
      query = query.eq("visibility", visibility)
    }

    // Exclude deleted watchlists by default
    if (!includeDeleted) {
      query = query.is("deleted_at", null)
    }

    // Filter by user access (created_by or via collaborators)
    // RLS policies will handle access control, but we can optimize the query
    query = query.or(`created_by.eq.${userId},watchlist_collaborators.user_id.eq.${userId}`)

    // Apply pagination
    query = query
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error("[API Watchlists] Database error:", error)
      return NextResponse.json(
        {
          error: "Database error",
          message: error.message,
        },
        { status: 500 }
      )
    }

    // Optionally include statistics
    let watchlistsWithStats = data || []
    if (includeStats && data && data.length > 0) {
      const watchlistIds = data.map(w => w.id)

      // Get property counts for each watchlist
      const { data: propertyCounts } = await supabase
        .from("watchlist_properties")
        .select("watchlist_id")
        .in("watchlist_id", watchlistIds)

      // Count properties per watchlist
      const countsByWatchlist = (propertyCounts || []).reduce((acc, item) => {
        acc[item.watchlist_id] = (acc[item.watchlist_id] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      // Add counts to watchlists
      watchlistsWithStats = data.map(watchlist => ({
        ...watchlist,
        property_count: countsByWatchlist[watchlist.id] || 0,
      }))
    }

    return NextResponse.json({
      data: watchlistsWithStats,
      count: data?.length || 0,
      total: count || 0,
      source: "database",
    })
  } catch (error) {
    console.error("[API Watchlists] Server error:", error)
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
 * POST /api/watchlists
 * Create a new watchlist - requires authentication and CSRF validation
 *
 * Request body (CreateWatchlistRequest):
 * {
 *   name: string (required),
 *   description?: string,
 *   organization_id?: string,
 *   is_shared?: boolean,
 *   visibility?: 'private' | 'shared' | 'public',
 *   color?: string (hex format),
 *   icon?: string,
 *   settings?: WatchlistSettings
 * }
 *
 * Response:
 * {
 *   data: Watchlist,
 *   message: string
 * }
 */
export async function POST(request: NextRequest) {
  // CSRF Protection: Validate request origin
  const csrfResult = await validateCsrf(request)
  if (!csrfResult.valid) {
    console.log("[API Watchlists] CSRF validation failed:", csrfResult.error)
    return csrfErrorResponse(csrfResult.error)
  }

  // Validate authentication
  const authResult = await validateApiAuth(request)

  if (!authResult.authenticated || !authResult.user) {
    return unauthorizedResponse(authResult.error)
  }

  // Viewers cannot create watchlists (team feature)
  if (authResult.user?.role === "viewer") {
    return forbiddenResponse("Viewers cannot create watchlists.")
  }

  const userId = authResult.user.id

  try {
    const body = await request.json()

    // Validate request body
    const validation = validateCreateRequest(body)
    if (!validation.valid || !validation.data) {
      return NextResponse.json(
        {
          error: "Validation error",
          message: validation.error,
        },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    if (!supabase) {
      // Demo mode - just return success with mock ID
      return NextResponse.json({
        data: {
          id: `watchlist-${Date.now()}`,
          ...validation.data,
          created_by: userId,
          is_shared: validation.data.is_shared || false,
          visibility: validation.data.visibility || "private",
          sort_order: 0,
          settings: validation.data.settings || {
            notifications: {
              price_changes: false,
              status_updates: false,
              auction_reminders: false,
            },
            auto_filters: {
              min_value: null,
              max_value: null,
              property_types: [],
            },
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null,
        },
        message: "Watchlist created (demo mode)",
        source: "mock",
      })
    }

    // Insert the watchlist
    const { data, error } = await supabase
      .from("watchlists")
      .insert([
        {
          name: validation.data.name,
          description: validation.data.description || null,
          organization_id: validation.data.organization_id || null,
          created_by: userId,
          is_shared: validation.data.is_shared || false,
          visibility: validation.data.visibility || "private",
          color: validation.data.color || null,
          icon: validation.data.icon || null,
          sort_order: 0,
          settings: validation.data.settings || {
            notifications: {
              price_changes: false,
              status_updates: false,
              auction_reminders: false,
            },
            auto_filters: {
              min_value: null,
              max_value: null,
              property_types: [],
            },
          },
        },
      ])
      .select()
      .single()

    if (error) {
      console.error("[API Watchlists] Insert error:", error)

      // Handle duplicate name within organization
      if (error.code === "23505") {
        return NextResponse.json(
          {
            error: "Duplicate error",
            message: "A watchlist with this name already exists",
          },
          { status: 409 }
        )
      }

      return NextResponse.json(
        {
          error: "Database error",
          message: error.message,
        },
        { status: 500 }
      )
    }

    // Create audit log entry
    await logWatchlistAudit(request, "watchlist.created", {
      user_id: userId,
      organization_id: validation.data.organization_id,
      watchlist_id: data.id,
      description: `Created watchlist "${validation.data.name}" with visibility ${validation.data.visibility || "private"}`,
      new_values: {
        name: validation.data.name,
        description: validation.data.description,
        organization_id: validation.data.organization_id,
        visibility: validation.data.visibility || "private",
        is_shared: validation.data.is_shared || false,
      },
      metadata: {
        color: validation.data.color,
        icon: validation.data.icon,
      },
    })

    return NextResponse.json({
      data,
      message: "Watchlist created successfully",
      source: "database",
    }, { status: 201 })
  } catch (error) {
    console.error("[API Watchlists] Server error:", error)
    return NextResponse.json(
      {
        error: "Server error",
        message: "An unexpected error occurred",
      },
      { status: 500 }
    )
  }
}

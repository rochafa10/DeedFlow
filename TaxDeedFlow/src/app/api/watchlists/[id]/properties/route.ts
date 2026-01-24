/**
 * Watchlist Properties API - Manage Properties in a Watchlist
 *
 * GET /api/watchlists/[id]/properties - List properties in a watchlist
 * POST /api/watchlists/[id]/properties - Add a property to a watchlist
 * DELETE /api/watchlists/[id]/properties - Remove a property from a watchlist
 *
 * These endpoints manage the many-to-many relationship between watchlists
 * and properties with additional metadata (notes, priority, tags).
 *
 * @author Claude Code Agent
 * @date 2026-01-23
 */

import { NextRequest, NextResponse } from "next/server"
import { validateApiAuth, unauthorizedResponse, forbiddenResponse } from "@/lib/auth/api-auth"
import { validateCsrf, csrfErrorResponse } from "@/lib/auth/csrf"
import { createServerClient } from "@/lib/supabase/client"
import type { AddToWatchlistRequest, WatchlistPermission } from "@/types/watchlist"

/**
 * Validate the add to watchlist request body
 */
function validateAddPropertyRequest(body: unknown): {
  valid: boolean
  data?: AddToWatchlistRequest
  error?: string
} {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body is required" }
  }

  const request = body as Record<string, unknown>

  // property_id is required
  if (!request.property_id || typeof request.property_id !== "string") {
    return { valid: false, error: "property_id is required and must be a string" }
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(request.property_id)) {
    return { valid: false, error: "property_id must be a valid UUID" }
  }

  // Validate priority if provided
  if (request.priority !== undefined) {
    const priority = Number(request.priority)
    if (isNaN(priority) || priority < 0 || priority > 100) {
      return { valid: false, error: "priority must be a number between 0 and 100" }
    }
  }

  // Validate tags if provided
  if (request.tags !== undefined) {
    if (!Array.isArray(request.tags)) {
      return { valid: false, error: "tags must be an array" }
    }
    if (!request.tags.every((tag) => typeof tag === "string")) {
      return { valid: false, error: "all tags must be strings" }
    }
  }

  return {
    valid: true,
    data: {
      property_id: request.property_id,
      notes: request.notes ? String(request.notes).trim() : undefined,
      priority: request.priority !== undefined ? Number(request.priority) : 0,
      is_favorite: request.is_favorite === true,
      tags: Array.isArray(request.tags) ? request.tags : undefined,
      custom_data: request.custom_data ? (request.custom_data as Record<string, unknown>) : undefined,
    },
  }
}

/**
 * Check if user has permission to access a watchlist
 */
async function checkWatchlistPermission(
  supabase: ReturnType<typeof createServerClient>,
  watchlistId: string,
  userId: string,
  requiredPermission: 'view' | 'edit' | 'admin'
): Promise<{ allowed: boolean; permission: WatchlistPermission | 'owner' | null; error?: string }> {
  if (!supabase) {
    return { allowed: false, permission: null, error: "Database not configured" }
  }

  // Get the watchlist
  const { data: watchlist, error } = await supabase
    .from("watchlists")
    .select("id, created_by, visibility, is_shared, deleted_at")
    .eq("id", watchlistId)
    .single()

  if (error || !watchlist) {
    return { allowed: false, permission: null, error: "Watchlist not found" }
  }

  // Check if deleted
  if (watchlist.deleted_at) {
    return { allowed: false, permission: null, error: "Watchlist has been deleted" }
  }

  // Owner has full access
  if (watchlist.created_by === userId) {
    return { allowed: true, permission: 'owner' }
  }

  // Check if public (view only)
  if (watchlist.visibility === 'public' && requiredPermission === 'view') {
    return { allowed: true, permission: 'view' }
  }

  // Check collaborator permissions
  const { data: collaborator } = await supabase
    .from("watchlist_collaborators")
    .select("permission")
    .eq("watchlist_id", watchlistId)
    .eq("user_id", userId)
    .single()

  if (collaborator) {
    const permission = collaborator.permission as WatchlistPermission

    // Check if permission is sufficient
    const permissionLevels = { view: 1, edit: 2, admin: 3 }
    const hasPermission = permissionLevels[permission] >= permissionLevels[requiredPermission]

    return {
      allowed: hasPermission,
      permission,
      error: hasPermission ? undefined : "Insufficient permissions"
    }
  }

  return { allowed: false, permission: null, error: "Access denied" }
}

/**
 * GET /api/watchlists/[id]/properties
 * List properties in a watchlist with details
 *
 * Query parameters:
 * - limit: number (default: 50, max: 100)
 * - offset: number (default: 0)
 * - favorites_only: boolean (default: false)
 * - sort_by: 'priority' | 'added_at' | 'last_viewed_at' (default: 'priority')
 * - sort_order: 'asc' | 'desc' (default: 'desc')
 *
 * Response:
 * {
 *   data: WatchlistProperty[],
 *   count: number,
 *   total: number
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
    const watchlistId = params.id

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(watchlistId)) {
      return NextResponse.json(
        { error: "Invalid watchlist ID format" },
        { status: 400 }
      )
    }

    // Check permissions (need at least view)
    const permissionCheck = await checkWatchlistPermission(supabase, watchlistId, userId, 'view')
    if (!permissionCheck.allowed) {
      return forbiddenResponse(permissionCheck.error || "Access denied")
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 100)
    const offset = Number(searchParams.get("offset")) || 0
    const favoritesOnly = searchParams.get("favorites_only") === "true"
    const sortBy = searchParams.get("sort_by") || "priority"
    const sortOrder = searchParams.get("sort_order") || "desc"

    // Build the query
    let query = supabase
      .from("watchlist_properties")
      .select(`
        *,
        properties (
          id,
          parcel_number,
          address,
          city,
          state,
          zip_code,
          total_due,
          assessed_value,
          status,
          county_id
        )
      `, { count: "exact" })
      .eq("watchlist_id", watchlistId)

    // Filter favorites if requested
    if (favoritesOnly) {
      query = query.eq("is_favorite", true)
    }

    // Apply sorting
    const ascending = sortOrder === "asc"
    if (sortBy === "priority") {
      query = query.order("priority", { ascending })
    } else if (sortBy === "added_at") {
      query = query.order("added_at", { ascending })
    } else if (sortBy === "last_viewed_at") {
      query = query.order("last_viewed_at", { ascending, nullsFirst: !ascending })
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error("[API Watchlist Properties] Database error:", error)
      return NextResponse.json(
        {
          error: "Database error",
          message: error.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: data || [],
      count: data?.length || 0,
      total: count || 0,
      source: "database",
    })
  } catch (error) {
    console.error("[API Watchlist Properties] Server error:", error)
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
 * POST /api/watchlists/[id]/properties
 * Add a property to a watchlist - requires authentication and CSRF validation
 * User must have 'edit' or 'admin' permission
 *
 * Request body (AddToWatchlistRequest):
 * {
 *   property_id: string (required),
 *   notes?: string,
 *   priority?: number (0-100),
 *   is_favorite?: boolean,
 *   tags?: string[],
 *   custom_data?: Record<string, unknown>
 * }
 *
 * Response:
 * {
 *   data: WatchlistProperty,
 *   message: string,
 *   already_exists: boolean
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // CSRF Protection
  const csrfResult = await validateCsrf(request)
  if (!csrfResult.valid) {
    console.log("[API Watchlist Add Property] CSRF validation failed:", csrfResult.error)
    return csrfErrorResponse(csrfResult.error)
  }

  // Validate authentication
  const authResult = await validateApiAuth(request)

  if (!authResult.authenticated || !authResult.user) {
    return unauthorizedResponse(authResult.error)
  }

  const userId = authResult.user.id
  const watchlistId = params.id

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(watchlistId)) {
    return NextResponse.json(
      { error: "Invalid watchlist ID format" },
      { status: 400 }
    )
  }

  try {
    const body = await request.json()

    // Validate request body
    const validation = validateAddPropertyRequest(body)
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
      // Demo mode
      return NextResponse.json({
        data: {
          id: `watchlist-property-${Date.now()}`,
          watchlist_id: watchlistId,
          ...validation.data,
          added_by: userId,
          added_at: new Date().toISOString(),
          last_viewed_at: null,
          view_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        message: "Property added to watchlist (demo mode)",
        already_exists: false,
        source: "mock",
      })
    }

    // Check permissions (need edit)
    const permissionCheck = await checkWatchlistPermission(supabase, watchlistId, userId, 'edit')
    if (!permissionCheck.allowed) {
      return forbiddenResponse(permissionCheck.error || "Insufficient permissions to add properties to this watchlist")
    }

    // Check if property already exists in this watchlist
    const { data: existing } = await supabase
      .from("watchlist_properties")
      .select("id")
      .eq("watchlist_id", watchlistId)
      .eq("property_id", validation.data.property_id)
      .single()

    if (existing) {
      return NextResponse.json({
        data: existing,
        message: "Property already exists in this watchlist",
        already_exists: true,
        source: "database",
      })
    }

    // Check if property exists
    const { data: property } = await supabase
      .from("properties")
      .select("id")
      .eq("id", validation.data.property_id)
      .single()

    if (!property) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      )
    }

    // Add the property to the watchlist
    const { data, error } = await supabase
      .from("watchlist_properties")
      .insert([
        {
          watchlist_id: watchlistId,
          property_id: validation.data.property_id,
          notes: validation.data.notes || null,
          priority: validation.data.priority || 0,
          is_favorite: validation.data.is_favorite || false,
          tags: validation.data.tags || null,
          custom_data: validation.data.custom_data || {},
          added_by: userId,
          added_at: new Date().toISOString(),
          last_viewed_at: null,
          view_count: 0,
        },
      ])
      .select()
      .single()

    if (error) {
      console.error("[API Watchlist Add Property] Insert error:", error)

      // Handle duplicate (race condition)
      if (error.code === "23505") {
        return NextResponse.json({
          message: "Property already exists in this watchlist",
          already_exists: true,
          source: "database",
        })
      }

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
      message: "Property added to watchlist successfully",
      already_exists: false,
      source: "database",
    }, { status: 201 })
  } catch (error) {
    console.error("[API Watchlist Add Property] Server error:", error)
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
 * DELETE /api/watchlists/[id]/properties
 * Remove a property from a watchlist - requires authentication and CSRF validation
 * User must have 'edit' or 'admin' permission
 *
 * Query parameters:
 * - property_id: string (required) - The property to remove
 *
 * Response:
 * {
 *   message: string
 * }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // CSRF Protection
  const csrfResult = await validateCsrf(request)
  if (!csrfResult.valid) {
    console.log("[API Watchlist Remove Property] CSRF validation failed:", csrfResult.error)
    return csrfErrorResponse(csrfResult.error)
  }

  // Validate authentication
  const authResult = await validateApiAuth(request)

  if (!authResult.authenticated || !authResult.user) {
    return unauthorizedResponse(authResult.error)
  }

  const userId = authResult.user.id
  const watchlistId = params.id

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(watchlistId)) {
    return NextResponse.json(
      { error: "Invalid watchlist ID format" },
      { status: 400 }
    )
  }

  try {
    // Get property_id from query parameters
    const { searchParams } = new URL(request.url)
    const propertyId = searchParams.get("property_id")

    if (!propertyId) {
      return NextResponse.json(
        { error: "property_id query parameter is required" },
        { status: 400 }
      )
    }

    if (!uuidRegex.test(propertyId)) {
      return NextResponse.json(
        { error: "property_id must be a valid UUID" },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    if (!supabase) {
      // Demo mode
      return NextResponse.json({
        message: "Property removed from watchlist (demo mode)",
        source: "mock",
      })
    }

    // Check permissions (need edit)
    const permissionCheck = await checkWatchlistPermission(supabase, watchlistId, userId, 'edit')
    if (!permissionCheck.allowed) {
      return forbiddenResponse(permissionCheck.error || "Insufficient permissions to remove properties from this watchlist")
    }

    // Remove the property from the watchlist
    const { error } = await supabase
      .from("watchlist_properties")
      .delete()
      .eq("watchlist_id", watchlistId)
      .eq("property_id", propertyId)

    if (error) {
      console.error("[API Watchlist Remove Property] Delete error:", error)
      return NextResponse.json(
        {
          error: "Database error",
          message: error.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: "Property removed from watchlist successfully",
      source: "database",
    })
  } catch (error) {
    console.error("[API Watchlist Remove Property] Server error:", error)
    return NextResponse.json(
      {
        error: "Server error",
        message: "An unexpected error occurred",
      },
      { status: 500 }
    )
  }
}

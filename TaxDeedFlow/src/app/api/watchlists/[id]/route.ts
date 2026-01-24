/**
 * Watchlist API - Single Watchlist Operations
 *
 * GET /api/watchlists/[id] - Get a single watchlist
 * PATCH /api/watchlists/[id] - Update a watchlist
 * DELETE /api/watchlists/[id] - Soft delete a watchlist
 *
 * These endpoints manage individual watchlist records with access control
 * based on ownership and collaborator permissions.
 *
 * @author Claude Code Agent
 * @date 2026-01-23
 */

import { NextRequest, NextResponse } from "next/server"
import { validateApiAuth, unauthorizedResponse, forbiddenResponse } from "@/lib/auth/api-auth"
import { validateCsrf, csrfErrorResponse } from "@/lib/auth/csrf"
import { createServerClient } from "@/lib/supabase/client"
import type { UpdateWatchlistRequest, WatchlistVisibility, WatchlistPermission } from "@/types/watchlist"

/**
 * Validate the update watchlist request body
 */
function validateUpdateRequest(body: unknown): {
  valid: boolean
  data?: UpdateWatchlistRequest
  error?: string
} {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body is required" }
  }

  const request = body as Record<string, unknown>

  // At least one field must be provided
  const hasUpdate = Object.keys(request).length > 0

  if (!hasUpdate) {
    return { valid: false, error: "At least one field must be provided for update" }
  }

  // Validate name if provided
  if (request.name !== undefined) {
    if (typeof request.name !== "string") {
      return { valid: false, error: "name must be a string" }
    }
    if (request.name.trim().length < 2) {
      return { valid: false, error: "name must be at least 2 characters" }
    }
    if (request.name.trim().length > 100) {
      return { valid: false, error: "name must be at most 100 characters" }
    }
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

  const updateData: UpdateWatchlistRequest = {}

  if (request.name !== undefined) {
    updateData.name = String(request.name).trim()
  }
  if (request.description !== undefined) {
    updateData.description = request.description ? String(request.description).trim() : undefined
  }
  if (request.is_shared !== undefined) {
    updateData.is_shared = Boolean(request.is_shared)
  }
  if (request.visibility !== undefined) {
    updateData.visibility = request.visibility as WatchlistVisibility
  }
  if (request.color !== undefined) {
    updateData.color = request.color ? String(request.color) : undefined
  }
  if (request.icon !== undefined) {
    updateData.icon = request.icon ? String(request.icon) : undefined
  }
  if (request.sort_order !== undefined) {
    updateData.sort_order = Number(request.sort_order)
  }
  if (request.settings !== undefined) {
    updateData.settings = request.settings as Record<string, unknown>
  }

  return {
    valid: true,
    data: updateData,
  }
}

/**
 * Check if user has permission to access/modify a watchlist
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
 * GET /api/watchlists/[id]
 * Get a single watchlist with optional property details
 *
 * Query parameters:
 * - include_properties: boolean (default: false) - Include property list
 * - include_collaborators: boolean (default: false) - Include collaborators
 *
 * Response:
 * {
 *   data: Watchlist & { properties?: Property[], collaborators?: Collaborator[] }
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

    // Check permissions
    const permissionCheck = await checkWatchlistPermission(supabase, watchlistId, userId, 'view')
    if (!permissionCheck.allowed) {
      return forbiddenResponse(permissionCheck.error || "Access denied")
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const includeProperties = searchParams.get("include_properties") === "true"
    const includeCollaborators = searchParams.get("include_collaborators") === "true"

    // Get the watchlist
    const { data: watchlist, error } = await supabase
      .from("watchlists")
      .select("*")
      .eq("id", watchlistId)
      .single()

    if (error || !watchlist) {
      console.error("[API Watchlist Detail] Database error:", error)
      return NextResponse.json(
        { error: "Watchlist not found" },
        { status: 404 }
      )
    }

    // Build response object
    const response: Record<string, unknown> = { ...watchlist }

    // Optionally include properties
    if (includeProperties) {
      const { data: properties } = await supabase
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
            status
          )
        `)
        .eq("watchlist_id", watchlistId)
        .order("priority", { ascending: false })

      response.properties = properties || []
    }

    // Optionally include collaborators
    if (includeCollaborators) {
      const { data: collaborators } = await supabase
        .from("watchlist_collaborators")
        .select("*")
        .eq("watchlist_id", watchlistId)
        .order("invited_at", { ascending: false })

      response.collaborators = collaborators || []
    }

    return NextResponse.json({
      data: response,
      user_permission: permissionCheck.permission,
      source: "database",
    })
  } catch (error) {
    console.error("[API Watchlist Detail] Server error:", error)
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
 * PATCH /api/watchlists/[id]
 * Update a watchlist - requires authentication and CSRF validation
 * User must be owner or have 'edit' or 'admin' permission
 *
 * Request body (UpdateWatchlistRequest):
 * {
 *   name?: string,
 *   description?: string,
 *   is_shared?: boolean,
 *   visibility?: 'private' | 'shared' | 'public',
 *   color?: string,
 *   icon?: string,
 *   sort_order?: number,
 *   settings?: WatchlistSettings
 * }
 *
 * Response:
 * {
 *   data: Watchlist,
 *   message: string
 * }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // CSRF Protection
  const csrfResult = await validateCsrf(request)
  if (!csrfResult.valid) {
    console.log("[API Watchlist Update] CSRF validation failed:", csrfResult.error)
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
    const validation = validateUpdateRequest(body)
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
          id: watchlistId,
          ...validation.data,
          updated_at: new Date().toISOString(),
        },
        message: "Watchlist updated (demo mode)",
        source: "mock",
      })
    }

    // Check permissions (need edit or admin)
    const permissionCheck = await checkWatchlistPermission(supabase, watchlistId, userId, 'edit')
    if (!permissionCheck.allowed) {
      return forbiddenResponse(permissionCheck.error || "Insufficient permissions to update this watchlist")
    }

    // Update the watchlist
    const { data, error } = await supabase
      .from("watchlists")
      .update({
        ...validation.data,
        updated_at: new Date().toISOString(),
      })
      .eq("id", watchlistId)
      .select()
      .single()

    if (error) {
      console.error("[API Watchlist Update] Update error:", error)
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
      message: "Watchlist updated successfully",
      source: "database",
    })
  } catch (error) {
    console.error("[API Watchlist Update] Server error:", error)
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
 * DELETE /api/watchlists/[id]
 * Soft delete a watchlist - requires authentication and CSRF validation
 * User must be owner or have 'admin' permission
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
    console.log("[API Watchlist Delete] CSRF validation failed:", csrfResult.error)
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
    const supabase = createServerClient()

    if (!supabase) {
      // Demo mode
      return NextResponse.json({
        message: "Watchlist deleted (demo mode)",
        source: "mock",
      })
    }

    // Check permissions (need admin or owner)
    const permissionCheck = await checkWatchlistPermission(supabase, watchlistId, userId, 'admin')
    if (!permissionCheck.allowed && permissionCheck.permission !== 'owner') {
      return forbiddenResponse(permissionCheck.error || "Insufficient permissions to delete this watchlist")
    }

    // Soft delete the watchlist
    const { error } = await supabase
      .from("watchlists")
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", watchlistId)

    if (error) {
      console.error("[API Watchlist Delete] Delete error:", error)
      return NextResponse.json(
        {
          error: "Database error",
          message: error.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: "Watchlist deleted successfully",
      source: "database",
    })
  } catch (error) {
    console.error("[API Watchlist Delete] Server error:", error)
    return NextResponse.json(
      {
        error: "Server error",
        message: "An unexpected error occurred",
      },
      { status: 500 }
    )
  }
}

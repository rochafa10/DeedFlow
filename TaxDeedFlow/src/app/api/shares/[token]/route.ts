/**
 * Share Token API - Validate/Manage Individual Share Endpoint
 *
 * GET /api/shares/[token] - Validate share token and get report access
 * DELETE /api/shares/[token] - Deactivate (soft delete) a share
 *
 * The GET endpoint is PUBLIC - it doesn't require authentication
 * because share links are meant to be accessible without login.
 *
 * The DELETE endpoint requires authentication and appropriate permissions.
 *
 * @author Claude Code Agent
 * @date 2026-01-17
 */

import { NextRequest, NextResponse } from "next/server"
import { validateApiAuth, unauthorizedResponse, forbiddenResponse } from "@/lib/auth/api-auth"
import { validateCsrf, csrfErrorResponse } from "@/lib/auth/csrf"
import { createServerClient } from "@/lib/supabase/client"
import type { ShareValidationResult, ReportShare } from "@/types/sharing"
import { logger } from "@/lib/logger"

/**
 * Validate UUID format
 */
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

/**
 * GET /api/shares/[token]
 * Validate a share token and increment view count
 *
 * This endpoint is PUBLIC - no authentication required.
 * It validates the token and returns the report_id if valid.
 *
 * Response (valid token):
 * {
 *   is_valid: true,
 *   report_id: string,
 *   error_message: null
 * }
 *
 * Response (invalid token):
 * {
 *   is_valid: false,
 *   report_id: null,
 *   error_message: string
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  // Validate token format (should be a UUID)
  if (!token || !isValidUUID(token)) {
    const response: ShareValidationResult = {
      is_valid: false,
      report_id: null,
      error_message: "Invalid share token format",
    }
    return NextResponse.json(response, { status: 400 })
  }

  try {
    const supabase = createServerClient()

    if (!supabase) {
      // Demo mode - return mock valid response
      const response: ShareValidationResult = {
        is_valid: true,
        report_id: crypto.randomUUID(),
        error_message: null,
      }
      return NextResponse.json({
        ...response,
        source: "mock",
        message: "Share validated (demo mode)",
      })
    }

    // Call the Supabase function to validate and increment view count
    // This function handles all validation logic:
    // - Checks if token exists
    // - Checks if share is active (is_active = true)
    // - Checks if share has expired
    // - Checks max_views limit
    // - Increments view_count and updates last_viewed_at
    const { data, error } = await supabase.rpc("validate_and_increment_share_view", {
      p_share_token: token,
    })

    if (error) {
      logger.error("[API Shares] Database error validating token:", error)
      // Return a generic invalid response rather than exposing DB errors
      const response: ShareValidationResult = {
        is_valid: false,
        report_id: null,
        error_message: "Unable to validate share token",
      }
      return NextResponse.json(response, { status: 500 })
    }

    // The RPC function returns the validation result
    const validationResult = data as ShareValidationResult

    if (!validationResult) {
      logger.error("[API Shares] Invalid response from validate_and_increment_share_view")
      const response: ShareValidationResult = {
        is_valid: false,
        report_id: null,
        error_message: "Share token not found or expired",
      }
      return NextResponse.json(response, { status: 404 })
    }

    // Log access for analytics (only log successful validations)
    if (validationResult.is_valid) {
      logger.log("[API Shares] Share token validated:", {
        token: token.substring(0, 8) + "...",
        report_id: validationResult.report_id,
        ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
      })
    }

    // Return appropriate status code based on validation result
    const statusCode = validationResult.is_valid ? 200 : 403

    return NextResponse.json(
      {
        ...validationResult,
        source: "database",
      },
      { status: statusCode }
    )
  } catch (error) {
    logger.error("[API Shares] Server error validating token:", error)
    const response: ShareValidationResult = {
      is_valid: false,
      report_id: null,
      error_message: "An unexpected error occurred",
    }
    return NextResponse.json(response, { status: 500 })
  }
}

/**
 * DELETE /api/shares/[token]
 * Deactivate (soft delete) a share link
 *
 * This endpoint requires authentication.
 * Only the share creator or an admin can deactivate a share.
 *
 * Response:
 * {
 *   success: true,
 *   message: "Share link deactivated successfully"
 * }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  // CSRF Protection
  const csrfResult = await validateCsrf(request)
  if (!csrfResult.valid) {
    logger.log("[API Shares] CSRF validation failed:", csrfResult.error)
    return csrfErrorResponse(csrfResult.error)
  }

  // Validate authentication
  const authResult = await validateApiAuth(request)

  if (!authResult.authenticated) {
    return unauthorizedResponse(authResult.error)
  }

  const { token } = await params

  // Validate token format
  if (!token || !isValidUUID(token)) {
    return NextResponse.json(
      {
        error: "Validation error",
        message: "Invalid share token format",
      },
      { status: 400 }
    )
  }

  try {
    const supabase = createServerClient()

    if (!supabase) {
      // Demo mode
      return NextResponse.json({
        success: true,
        message: "Share link deactivated (demo mode)",
        source: "mock",
      })
    }

    // First, fetch the share to check ownership
    const { data: share, error: fetchError } = await supabase
      .from("report_shares")
      .select("id, created_by, is_active")
      .eq("share_token", token)
      .single()

    if (fetchError || !share) {
      logger.error("[API Shares] Share not found for deactivation:", token)
      return NextResponse.json(
        {
          error: "Not found",
          message: "Share link not found",
        },
        { status: 404 }
      )
    }

    // Check if share is already deactivated
    if (share.is_active === false) {
      return NextResponse.json(
        {
          error: "Already deactivated",
          message: "This share link is already deactivated",
        },
        { status: 409 }
      )
    }

    // Authorization check: only creator or admin can deactivate
    const isOwner = share.created_by === authResult.user?.id
    const isAdmin = authResult.user?.role === "admin"

    if (!isOwner && !isAdmin) {
      return forbiddenResponse("You do not have permission to deactivate this share link.")
    }

    // Call the Supabase function to deactivate the share
    const { data, error } = await supabase.rpc("deactivate_share", {
      p_share_token: token,
    })

    if (error) {
      // Log detailed error server-side only - do not expose to client
      logger.error("[API Shares] Database error deactivating share:", {
        token: token.substring(0, 8) + "...",
        error_code: error.code,
        error_message: error.message,
        error_details: error.details,
      })
      return NextResponse.json(
        {
          error: "Server error",
          message: "Unable to deactivate share link. Please try again later.",
        },
        { status: 500 }
      )
    }

    // Check if deactivation was successful
    if (data === false) {
      return NextResponse.json(
        {
          error: "Failed",
          message: "Unable to deactivate share link",
        },
        { status: 500 }
      )
    }

    logger.log("[API Shares] Share deactivated:", {
      token: token.substring(0, 8) + "...",
      deactivated_by: authResult.user?.email,
    })

    return NextResponse.json({
      success: true,
      message: "Share link deactivated successfully",
      source: "database",
    })
  } catch (error) {
    logger.error("[API Shares] Server error deactivating share:", error)
    return NextResponse.json(
      {
        error: "Server error",
        message: "An unexpected error occurred while deactivating the share link",
      },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/shares/[token]
 * Update share settings (extend expiration, update max_views, etc.)
 *
 * This endpoint requires authentication.
 * Only the share creator or an admin can update a share.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  // CSRF Protection
  const csrfResult = await validateCsrf(request)
  if (!csrfResult.valid) {
    logger.log("[API Shares] CSRF validation failed:", csrfResult.error)
    return csrfErrorResponse(csrfResult.error)
  }

  // Validate authentication
  const authResult = await validateApiAuth(request)

  if (!authResult.authenticated) {
    return unauthorizedResponse(authResult.error)
  }

  // Only admin and analyst can update shares
  if (authResult.user?.role === "viewer") {
    return forbiddenResponse("Viewers cannot update share links.")
  }

  const { token } = await params

  // Validate token format
  if (!token || !isValidUUID(token)) {
    return NextResponse.json(
      {
        error: "Validation error",
        message: "Invalid share token format",
      },
      { status: 400 }
    )
  }

  try {
    const body = await request.json()
    const supabase = createServerClient()

    if (!supabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      )
    }

    // Fetch the share to check ownership
    const { data: share, error: fetchError } = await supabase
      .from("report_shares")
      .select("*")
      .eq("share_token", token)
      .single()

    if (fetchError || !share) {
      return NextResponse.json(
        {
          error: "Not found",
          message: "Share link not found",
        },
        { status: 404 }
      )
    }

    // Authorization check
    const isOwner = share.created_by === authResult.user?.id
    const isAdmin = authResult.user?.role === "admin"

    if (!isOwner && !isAdmin) {
      return forbiddenResponse("You do not have permission to update this share link.")
    }

    // Build update object
    const updates: Partial<ReportShare> = {}

    // Extend expiration if requested
    if (body.extends_days !== undefined) {
      const days = Number(body.extends_days)
      if (isNaN(days) || days < 1 || days > 365) {
        return NextResponse.json(
          {
            error: "Validation error",
            message: "extends_days must be between 1 and 365",
          },
          { status: 400 }
        )
      }
      const newExpiration = new Date()
      newExpiration.setDate(newExpiration.getDate() + days)
      updates.expires_at = newExpiration.toISOString()
    }

    // Update max_views if requested
    if (body.max_views !== undefined) {
      if (body.max_views !== null) {
        const maxViews = Number(body.max_views)
        if (isNaN(maxViews) || maxViews < 1) {
          return NextResponse.json(
            {
              error: "Validation error",
              message: "max_views must be a positive integer or null",
            },
            { status: 400 }
          )
        }
        updates.max_views = maxViews
      } else {
        updates.max_views = null
      }
    }

    // Update is_active if requested
    if (body.is_active !== undefined) {
      updates.is_active = Boolean(body.is_active)
    }

    // Check if there's anything to update
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        {
          error: "Validation error",
          message: "No valid update fields provided",
        },
        { status: 400 }
      )
    }

    // Add updated_at timestamp
    updates.updated_at = new Date().toISOString()

    // Perform the update
    const { data: updatedShare, error: updateError } = await supabase
      .from("report_shares")
      .update(updates)
      .eq("share_token", token)
      .select()
      .single()

    if (updateError) {
      // Log detailed error server-side only - do not expose to client
      logger.error("[API Shares] Database error updating share:", {
        token: token.substring(0, 8) + "...",
        error_code: updateError.code,
        error_message: updateError.message,
        error_details: updateError.details,
      })
      return NextResponse.json(
        {
          error: "Server error",
          message: "Unable to update share link. Please try again later.",
        },
        { status: 500 }
      )
    }

    logger.log("[API Shares] Share updated:", {
      token: token.substring(0, 8) + "...",
      updates: Object.keys(updates),
      updated_by: authResult.user?.email,
    })

    return NextResponse.json({
      data: updatedShare,
      message: "Share link updated successfully",
      source: "database",
    })
  } catch (error) {
    logger.error("[API Shares] Server error updating share:", error)
    return NextResponse.json(
      {
        error: "Server error",
        message: "An unexpected error occurred while updating the share link",
      },
      { status: 500 }
    )
  }
}

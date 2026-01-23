/**
 * Share Token API - Create Share Endpoint
 *
 * POST /api/shares - Create a new share token for a report
 *
 * This endpoint generates a shareable link with configurable expiration.
 * The share token can be used to access the report without authentication.
 *
 * @author Claude Code Agent
 * @date 2026-01-17
 */

import { NextRequest, NextResponse } from "next/server"
import { validateApiAuth, unauthorizedResponse, forbiddenResponse } from "@/lib/auth/api-auth"
import { validateCsrf, csrfErrorResponse } from "@/lib/auth/csrf"
import { createServerClient } from "@/lib/supabase/client"
import type { CreateShareRequest, ShareLinkResponse } from "@/types/sharing"
import { logger } from "@/lib/logger"

const apiLogger = logger.withContext("Shares API")

// Default expiration in days if not specified
const DEFAULT_EXPIRATION_DAYS = 30

// Maximum allowed expiration in days
const MAX_EXPIRATION_DAYS = 365

// Minimum allowed expiration in days
const MIN_EXPIRATION_DAYS = 1

/**
 * Generate the full share URL from a token
 * Uses the app's base URL from environment or request headers
 */
function generateShareUrl(token: string, request: NextRequest): string {
  // Try to get base URL from environment
  const envBaseUrl = process.env.NEXT_PUBLIC_APP_URL

  if (envBaseUrl) {
    return `${envBaseUrl}/share/${token}`
  }

  // Fallback: construct from request headers
  const protocol = request.headers.get("x-forwarded-proto") || "https"
  const host = request.headers.get("host") || "localhost:3000"

  return `${protocol}://${host}/share/${token}`
}

/**
 * Validate the create share request body
 */
function validateCreateRequest(body: unknown): {
  valid: boolean
  data?: CreateShareRequest
  error?: string
} {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body is required" }
  }

  const request = body as Record<string, unknown>

  // Report ID is required
  if (!request.report_id || typeof request.report_id !== "string") {
    return { valid: false, error: "report_id is required and must be a string" }
  }

  // Validate UUID format for report_id
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(request.report_id)) {
    return { valid: false, error: "report_id must be a valid UUID" }
  }

  // Validate expires_days if provided
  if (request.expires_days !== undefined) {
    const days = Number(request.expires_days)
    if (isNaN(days) || !Number.isInteger(days)) {
      return { valid: false, error: "expires_days must be an integer" }
    }
    if (days < MIN_EXPIRATION_DAYS || days > MAX_EXPIRATION_DAYS) {
      return {
        valid: false,
        error: `expires_days must be between ${MIN_EXPIRATION_DAYS} and ${MAX_EXPIRATION_DAYS}`,
      }
    }
  }

  // Validate max_views if provided
  if (request.max_views !== undefined && request.max_views !== null) {
    const maxViews = Number(request.max_views)
    if (isNaN(maxViews) || !Number.isInteger(maxViews) || maxViews < 1) {
      return { valid: false, error: "max_views must be a positive integer" }
    }
  }

  return {
    valid: true,
    data: {
      report_id: request.report_id as string,
      expires_days: request.expires_days !== undefined
        ? Number(request.expires_days)
        : DEFAULT_EXPIRATION_DAYS,
      created_by: request.created_by as string | undefined,
      max_views: request.max_views !== undefined && request.max_views !== null
        ? Number(request.max_views)
        : undefined,
      password: request.password as string | undefined,
      require_email: request.require_email as boolean | undefined,
    },
  }
}

/**
 * POST /api/shares
 * Create a new share token for a report
 *
 * Request body:
 * {
 *   report_id: string (required) - UUID of the report to share
 *   expires_days?: number - Days until expiration (default: 30, max: 365)
 *   max_views?: number - Maximum views allowed (optional, null = unlimited)
 *   password?: string - Password to protect the share (optional)
 *   require_email?: boolean - Require email before viewing (optional)
 * }
 *
 * Response:
 * {
 *   share_url: string - Complete shareable URL
 *   share_token: string - The generated token (UUID)
 *   expires_at: string - ISO 8601 expiration timestamp
 *   share_id: string - ID of the created share record
 * }
 */
export async function POST(request: NextRequest) {
  // CSRF Protection: Validate request origin
  const csrfResult = await validateCsrf(request)
  if (!csrfResult.valid) {
    apiLogger.debug("CSRF validation failed", { error: csrfResult.error })
    return csrfErrorResponse(csrfResult.error)
  }

  // Validate authentication
  const authResult = await validateApiAuth(request)

  if (!authResult.authenticated) {
    return unauthorizedResponse(authResult.error)
  }

  // Only admin and analyst can create shares
  if (authResult.user?.role === "viewer") {
    return forbiddenResponse("Viewers cannot create share links.")
  }

  try {
    // Parse and validate request body
    const body = await request.json()
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

    const { report_id, expires_days, max_views } = validation.data

    // Get Supabase client
    const supabase = createServerClient()

    if (!supabase) {
      // Demo mode - return mock response
      const mockToken = crypto.randomUUID()
      const mockExpiresAt = new Date()
      mockExpiresAt.setDate(mockExpiresAt.getDate() + (expires_days || DEFAULT_EXPIRATION_DAYS))

      const response: ShareLinkResponse = {
        share_url: generateShareUrl(mockToken, request),
        share_token: mockToken,
        expires_at: mockExpiresAt.toISOString(),
        share_id: crypto.randomUUID(),
      }

      return NextResponse.json({
        ...response,
        message: "Share link created (demo mode)",
        source: "mock",
      })
    }

    // First, verify the report exists
    const { data: reportExists, error: reportError } = await supabase
      .from("property_reports")
      .select("id")
      .eq("id", report_id)
      .single()

    if (reportError || !reportExists) {
      apiLogger.error("Report not found", { reportId: report_id })
      return NextResponse.json(
        {
          error: "Not found",
          message: "The specified report does not exist",
        },
        { status: 404 }
      )
    }

    // Call the Supabase function to create the share
    // The function handles token generation and expiration calculation
    const { data, error } = await supabase.rpc("create_report_share", {
      p_report_id: report_id,
      p_created_by: authResult.user?.id || null,
      p_expires_days: expires_days || DEFAULT_EXPIRATION_DAYS,
      p_max_views: max_views || null,
    })

    if (error) {
      apiLogger.error("Database error creating share", { error: error.message })
      return NextResponse.json(
        {
          error: "Database error",
          message: error.message,
        },
        { status: 500 }
      )
    }

    // The RPC function returns the share record
    // Extract the token and construct the response
    const shareRecord = data as {
      id: string
      share_token: string
      expires_at: string
    }

    if (!shareRecord || !shareRecord.share_token) {
      apiLogger.error("Invalid response from create_report_share")
      return NextResponse.json(
        {
          error: "Server error",
          message: "Failed to create share link",
        },
        { status: 500 }
      )
    }

    const response: ShareLinkResponse = {
      share_url: generateShareUrl(shareRecord.share_token, request),
      share_token: shareRecord.share_token,
      expires_at: shareRecord.expires_at,
      share_id: shareRecord.id,
    }

    apiLogger.info("Share created successfully", {
      shareId: response.share_id,
      reportId: report_id,
      expiresAt: response.expires_at,
      createdBy: authResult.user?.email,
    })

    return NextResponse.json({
      ...response,
      message: "Share link created successfully",
      source: "database",
    })
  } catch (error) {
    apiLogger.error("Server error", { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json(
      {
        error: "Server error",
        message: "An unexpected error occurred while creating the share link",
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/shares
 * List share links for the authenticated user's reports
 * (Optional endpoint for managing shares)
 */
export async function GET(request: NextRequest) {
  // Validate authentication
  const authResult = await validateApiAuth(request)

  if (!authResult.authenticated) {
    return unauthorizedResponse(authResult.error)
  }

  try {
    const supabase = createServerClient()

    if (!supabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const reportId = searchParams.get("report_id")
    const limit = parseInt(searchParams.get("limit") || "50", 10)
    const offset = parseInt(searchParams.get("offset") || "0", 10)

    // Build query
    let query = supabase
      .from("report_shares")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (reportId) {
      query = query.eq("report_id", reportId)
    }

    // Note: searchParams.get() returns string | null, not boolean
    // Only apply filter if the parameter was explicitly provided
    const isActiveParam = searchParams.get("is_active")
    if (isActiveParam !== null) {
      query = query.eq("is_active", isActiveParam === "true")
    }

    // Only show shares created by the user (unless admin)
    if (authResult.user?.role !== "admin") {
      query = query.eq("created_by", authResult.user?.id)
    }

    const { data, error, count } = await query

    if (error) {
      apiLogger.error("Database error listing shares", { error: error.message })
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
      total: count || 0,
      has_more: (count || 0) > offset + limit,
      source: "database",
    })
  } catch (error) {
    apiLogger.error("Server error", { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json(
      {
        error: "Server error",
        message: "An unexpected error occurred",
      },
      { status: 500 }
    )
  }
}

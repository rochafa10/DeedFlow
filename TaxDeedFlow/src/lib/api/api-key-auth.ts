/**
 * API Key Authentication Helpers
 *
 * Provides reusable authentication functions for API endpoints:
 * - API key validation against database
 * - Internal request validation (n8n, localhost, app)
 * - Rate limiting integration
 * - Standard error responses
 */

import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/client"
import { rateLimiter, type RateLimitTier, formatRateLimitHeaders } from "./rate-limiter"
import { isRateLimitError } from "./errors"

/**
 * API key validation result
 */
export interface ApiKeyValidationResult {
  /** Whether the API key is valid */
  valid: boolean
  /** API key record from database (if valid) */
  apiKey?: {
    id: string
    user_id: string
    name: string
    permissions: string[]
    rate_limit_tier: RateLimitTier
    last_used_at: string | null
    revoked_at: string | null
  }
  /** Error message (if invalid) */
  error?: string
}

/**
 * Validate API key from request header
 *
 * Checks x-api-key header against database and validates:
 * - Key exists and matches hash
 * - Key has not been revoked
 * - Updates last_used_at timestamp
 *
 * @param request - NextRequest object
 * @returns Validation result with API key details or error
 */
export async function validateApiKey(
  request: NextRequest
): Promise<ApiKeyValidationResult> {
  // Get API key from header
  const apiKey = request.headers.get("x-api-key")

  if (!apiKey) {
    return {
      valid: false,
      error: "Missing API key. Include x-api-key header in your request.",
    }
  }

  // Check if this is the internal API key (for n8n and internal services)
  const internalKey = process.env.INTERNAL_API_KEY || "tdf-internal-scraper-key"
  if (apiKey === internalKey) {
    // Internal key - return special result with unlimited tier
    return {
      valid: true,
      apiKey: {
        id: "internal",
        user_id: "system",
        name: "Internal API Key",
        permissions: ["read", "write", "admin"],
        rate_limit_tier: "unlimited" as RateLimitTier,
        last_used_at: null,
        revoked_at: null,
      },
    }
  }

  // Validate against database
  const supabase = createServerClient()

  if (!supabase) {
    return {
      valid: false,
      error: "Database not configured",
    }
  }

  try {
    // Call the validate_api_key function from database
    const { data, error } = await supabase.rpc("validate_api_key", {
      key_hash: apiKey,
    })

    if (error) {
      console.error("[API Key Auth] Database error:", error)
      return {
        valid: false,
        error: "Failed to validate API key",
      }
    }

    if (!data || data.length === 0) {
      return {
        valid: false,
        error: "Invalid API key",
      }
    }

    const keyRecord = data[0]

    // Check if key is revoked
    if (keyRecord.revoked_at) {
      return {
        valid: false,
        error: "API key has been revoked",
      }
    }

    return {
      valid: true,
      apiKey: {
        id: keyRecord.id,
        user_id: keyRecord.user_id,
        name: keyRecord.name,
        permissions: keyRecord.permissions || [],
        rate_limit_tier: keyRecord.rate_limit_tier as RateLimitTier,
        last_used_at: keyRecord.last_used_at,
        revoked_at: keyRecord.revoked_at,
      },
    }
  } catch (error) {
    console.error("[API Key Auth] Validation error:", error)
    return {
      valid: false,
      error: "Failed to validate API key",
    }
  }
}

/**
 * Check if request is from an internal/trusted source
 *
 * Allows requests from:
 * - n8n workflow automation (n8n.lfb-investments.com)
 * - Localhost development (localhost, 127.0.0.1)
 * - Production app (taxdeedflow domain)
 * - Direct API calls (no origin header)
 *
 * @param request - NextRequest object
 * @returns True if request is from internal source
 */
export function isInternalRequest(request: NextRequest): boolean {
  const origin = request.headers.get("origin") || ""
  const referer = request.headers.get("referer") || ""

  // Check for internal sources
  const isInternal =
    origin.includes("n8n.lfb-investments.com") ||
    referer.includes("n8n.lfb-investments.com") ||
    origin.includes("localhost") ||
    origin.includes("127.0.0.1") ||
    origin.includes("taxdeedflow") ||
    !origin // Direct API call (no browser origin)

  return isInternal
}

/**
 * Validate API key and enforce rate limiting
 *
 * Combines API key validation with rate limiting enforcement.
 * Returns NextResponse error if validation or rate limiting fails.
 *
 * @param request - NextRequest object
 * @param endpoint - API endpoint being accessed
 * @returns Validation result if successful, NextResponse error if failed
 */
export async function validateApiKeyWithRateLimit(
  request: NextRequest,
  endpoint: string
): Promise<
  | { success: true; apiKey: ApiKeyValidationResult["apiKey"] }
  | { success: false; response: NextResponse }
> {
  // First validate API key
  const validation = await validateApiKey(request)

  if (!validation.valid) {
    return {
      success: false,
      response: unauthorizedResponse(validation.error),
    }
  }

  // Check rate limiting (skip for internal keys)
  if (validation.apiKey && validation.apiKey.id !== "internal") {
    try {
      const requestId = crypto.randomUUID()
      await rateLimiter.enforceRateLimit(
        validation.apiKey.id,
        validation.apiKey.rate_limit_tier,
        endpoint,
        requestId
      )
    } catch (error) {
      if (isRateLimitError(error)) {
        return {
          success: false,
          response: rateLimitResponse(error.message, {
            limit: error.limit,
            remaining: error.remaining,
            resetTime: error.resetTime,
            retryAfter: error.retryAfter,
          }),
        }
      }

      // Unexpected error
      console.error("[API Key Auth] Rate limit error:", error)
      return {
        success: false,
        response: NextResponse.json(
          {
            error: "Internal server error",
            message: "Failed to check rate limit",
          },
          { status: 500 }
        ),
      }
    }
  }

  return {
    success: true,
    apiKey: validation.apiKey,
  }
}

/**
 * Simple API key validation for route handlers
 *
 * Validates API key OR checks if request is from internal source.
 * Use this for endpoints that should allow both API key access and internal access.
 *
 * @param request - NextRequest object
 * @returns True if request is authorized
 */
export async function validateSimpleApiKey(request: NextRequest): Promise<boolean> {
  // Check for internal API key
  const authHeader = request.headers.get("x-api-key")
  const expectedKey = process.env.INTERNAL_API_KEY || "tdf-internal-scraper-key"

  if (authHeader === expectedKey) {
    return true
  }

  // Check if request is from internal source
  if (isInternalRequest(request)) {
    return true
  }

  // Check if valid API key
  const validation = await validateApiKey(request)
  return validation.valid
}

/**
 * Create a 401 Unauthorized response
 *
 * @param message - Error message to include
 * @returns NextResponse with 401 status
 */
export function unauthorizedResponse(message?: string): NextResponse {
  return NextResponse.json(
    {
      error: "Unauthorized",
      message: message || "Invalid API key. Include a valid x-api-key header.",
      status: 401,
    },
    { status: 401 }
  )
}

/**
 * Create a 403 Forbidden response
 *
 * @param message - Error message to include
 * @returns NextResponse with 403 status
 */
export function forbiddenResponse(message?: string): NextResponse {
  return NextResponse.json(
    {
      error: "Forbidden",
      message: message || "You do not have permission to access this resource.",
      status: 403,
    },
    { status: 403 }
  )
}

/**
 * Create a 429 Rate Limit Exceeded response
 *
 * @param message - Error message to include
 * @param rateLimitInfo - Rate limit metadata
 * @returns NextResponse with 429 status and rate limit headers
 */
export function rateLimitResponse(
  message?: string,
  rateLimitInfo?: {
    limit: number
    remaining: number
    resetTime: Date
    retryAfter: number
  }
): NextResponse {
  const response = NextResponse.json(
    {
      error: "Rate Limit Exceeded",
      message: message || "Too many requests. Please try again later.",
      status: 429,
      ...(rateLimitInfo && {
        limit: rateLimitInfo.limit,
        remaining: rateLimitInfo.remaining,
        resetTime: rateLimitInfo.resetTime.toISOString(),
        retryAfter: Math.ceil(rateLimitInfo.retryAfter / 1000),
      }),
    },
    { status: 429 }
  )

  // Add rate limit headers
  if (rateLimitInfo) {
    const headers = formatRateLimitHeaders({
      allowed: false,
      limit: rateLimitInfo.limit,
      remaining: rateLimitInfo.remaining,
      resetTime: rateLimitInfo.resetTime,
      retryAfter: rateLimitInfo.retryAfter,
    })

    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
  }

  return response
}

/**
 * Check if API key has specific permission
 *
 * @param apiKey - API key record from validation
 * @param permission - Permission to check (e.g., "read", "write")
 * @returns True if API key has the permission
 */
export function hasPermission(
  apiKey: ApiKeyValidationResult["apiKey"],
  permission: string
): boolean {
  if (!apiKey) return false

  // Internal keys have all permissions
  if (apiKey.id === "internal") return true

  // Check if permission is in the permissions array
  return apiKey.permissions.includes(permission) || apiKey.permissions.includes("admin")
}

/**
 * Get rate limit status for an API key
 *
 * Returns current rate limit status without consuming a request.
 * Useful for status endpoints and headers.
 *
 * @param apiKeyId - UUID of the API key
 * @param tier - Rate limit tier
 * @returns Rate limit status
 */
export function getRateLimitStatus(apiKeyId: string, tier: RateLimitTier) {
  return rateLimiter.getRateLimitStatus(apiKeyId, tier)
}

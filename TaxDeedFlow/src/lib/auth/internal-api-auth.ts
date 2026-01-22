import { NextRequest } from "next/server"

/**
 * Internal API Authentication
 *
 * Validates requests to internal API routes (used by n8n workflows and the app itself).
 *
 * SECURITY: This module fixes the vulnerability where missing origin headers were treated
 * as trusted. Now requires EITHER a valid API key OR a valid origin from allowed domains.
 *
 * Allowed authentication methods:
 * 1. Valid x-api-key header (for n8n workflows and server-to-server calls)
 * 2. Valid Origin/Referer from allowed domains (for app-initiated requests)
 *
 * CRITICAL: Requests with BOTH missing origin AND missing API key are REJECTED.
 */

export interface InternalApiAuthResult {
  valid: boolean
  error?: string
  method?: "api_key" | "origin"
}

// Allowed origins for internal API access
const ALLOWED_ORIGINS = [
  "localhost",
  "127.0.0.1",
  "n8n.lfb-investments.com",
  "taxdeedflow.com",
  "taxdeedflow.vercel.app",
]

/**
 * Validates authentication for internal API routes
 *
 * Accepts requests with EITHER:
 * - Valid x-api-key header matching INTERNAL_API_KEY env var
 * - Origin/Referer header from allowed domains
 *
 * REJECTS requests with:
 * - Missing origin AND missing API key (the exploit case)
 * - Invalid API key
 * - Origin from untrusted domain
 *
 * @param request - The incoming Next.js request
 * @returns Authentication result with valid flag and optional error message
 */
export async function validateInternalApiAuth(
  request: NextRequest
): Promise<InternalApiAuthResult> {
  // Method 1: Check for valid API key
  const apiKey = request.headers.get("x-api-key")
  const expectedKey = process.env.INTERNAL_API_KEY || "tdf-internal-scraper-key"

  if (apiKey) {
    if (apiKey === expectedKey) {
      return {
        valid: true,
        method: "api_key",
      }
    } else {
      // Invalid API key provided
      return {
        valid: false,
        error: "Invalid API key provided.",
      }
    }
  }

  // Method 2: Check origin/referer headers
  const origin = request.headers.get("origin") || ""
  const referer = request.headers.get("referer") || ""

  // SECURITY FIX: If BOTH origin and referer are missing, this is suspicious
  // Previously, missing origin was treated as "internal" - this was the vulnerability
  if (!origin && !referer) {
    return {
      valid: false,
      error: "Authentication required. Missing both origin and API key.",
    }
  }

  // Check if origin or referer matches allowed domains
  const originToCheck = origin || referer
  const isAllowedOrigin = ALLOWED_ORIGINS.some((allowed) =>
    originToCheck.toLowerCase().includes(allowed.toLowerCase())
  )

  if (isAllowedOrigin) {
    return {
      valid: true,
      method: "origin",
    }
  }

  // Origin/referer present but not from allowed domain
  return {
    valid: false,
    error: "Access denied. Request origin not authorized.",
  }
}

/**
 * Helper to check if a request has a valid API key
 * Used for routes that only accept API key authentication
 */
export function hasValidApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get("x-api-key")
  const expectedKey = process.env.INTERNAL_API_KEY || "tdf-internal-scraper-key"
  return apiKey === expectedKey
}

/**
 * Helper to check if a request is from an allowed origin
 * Used for routes that only accept origin-based authentication
 */
export function hasValidOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin") || ""
  const referer = request.headers.get("referer") || ""

  if (!origin && !referer) {
    return false
  }

  const originToCheck = origin || referer
  return ALLOWED_ORIGINS.some((allowed) =>
    originToCheck.toLowerCase().includes(allowed.toLowerCase())
  )
}

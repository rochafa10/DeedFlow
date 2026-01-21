import { NextRequest, NextResponse } from "next/server"

// CSRF Token configuration
const CSRF_TOKEN_KEY = "taxdeedflow_csrf_token"
const CSRF_HEADER_NAME = "X-CSRF-Token"

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCsrfToken(): string {
  // Use crypto API for secure random token generation
  const array = new Uint8Array(32)
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(array)
  } else {
    // Fallback for environments without crypto
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256)
    }
  }
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("")
}

/**
 * Validate CSRF token from request
 *
 * For state-changing operations (POST, PUT, DELETE, PATCH):
 * - Check Origin header matches expected origin
 * - Check Referer header if Origin is not present
 * - Block requests from cross-origin sources
 */
export async function validateCsrf(request: NextRequest): Promise<{ valid: boolean; error?: string }> {
  const method = request.method.toUpperCase()

  // Only validate CSRF for state-changing methods
  if (!["POST", "PUT", "DELETE", "PATCH"].includes(method)) {
    return { valid: true }
  }

  // Get the expected origin from the request
  const url = new URL(request.url)
  const expectedOrigin = `${url.protocol}//${url.host}`

  // Check Origin header (most reliable)
  const origin = request.headers.get("Origin")
  if (origin) {
    if (origin !== expectedOrigin) {
      console.log(`[CSRF] Origin mismatch. Expected: ${expectedOrigin}, Got: ${origin}`)
      return {
        valid: false,
        error: "Cross-origin request blocked. Invalid origin."
      }
    }
    return { valid: true }
  }

  // Fallback: Check Referer header
  const referer = request.headers.get("Referer")
  if (referer) {
    try {
      const refererUrl = new URL(referer)
      const refererOrigin = `${refererUrl.protocol}//${refererUrl.host}`
      if (refererOrigin !== expectedOrigin) {
        console.log(`[CSRF] Referer mismatch. Expected: ${expectedOrigin}, Got: ${refererOrigin}`)
        return {
          valid: false,
          error: "Cross-origin request blocked. Invalid referer."
        }
      }
      return { valid: true }
    } catch {
      console.log("[CSRF] Invalid referer URL format")
      return {
        valid: false,
        error: "Cross-origin request blocked. Invalid referer format."
      }
    }
  }

  // If neither Origin nor Referer is present, check for CSRF token header
  const csrfToken = request.headers.get(CSRF_HEADER_NAME)
  if (!csrfToken) {
    console.log("[CSRF] No Origin, Referer, or CSRF token provided")
    return {
      valid: false,
      error: "CSRF validation failed. Missing security headers."
    }
  }

  // For demo purposes, accept any non-empty CSRF token
  // In production, this would validate against a server-side stored token
  if (csrfToken.length < 16) {
    return {
      valid: false,
      error: "Invalid CSRF token format."
    }
  }

  return { valid: true }
}

/**
 * Create a 403 Forbidden response for CSRF failures
 */
export function csrfErrorResponse(message?: string): NextResponse {
  return NextResponse.json(
    {
      error: "Forbidden",
      message: message || "CSRF validation failed. This request has been blocked for security reasons.",
      status: 403,
    },
    { status: 403 }
  )
}

/**
 * Helper to get CSRF token storage key (for client-side use)
 */
export const getCsrfStorageKey = () => CSRF_TOKEN_KEY

/**
 * Helper to get CSRF header name (for client-side use)
 */
export const getCsrfHeaderName = () => CSRF_HEADER_NAME

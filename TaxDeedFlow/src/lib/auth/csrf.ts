import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/client"
import { createHash } from "crypto"

// CSRF Token configuration
const CSRF_TOKEN_KEY = "taxdeedflow_csrf_token"
const CSRF_HEADER_NAME = "X-CSRF-Token"
const CSRF_TOKEN_EXPIRY_MINUTES = 30 // Tokens expire after 30 minutes
const CLEANUP_INTERVAL_MINUTES = 5 // Run cleanup every 5 minutes

// Track last cleanup time to avoid excessive database calls
let lastCleanupTime = 0

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
 * Hash a CSRF token using SHA-256
 * Tokens are always hashed before storage - never store plaintext tokens
 */
function hashCsrfToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

/**
 * Store a CSRF token in the database
 * Tokens are hashed before storage and set to expire after CSRF_TOKEN_EXPIRY_MINUTES
 *
 * @param token - The plaintext CSRF token to store
 * @param sessionId - Optional session identifier to track which session this token belongs to
 * @returns Object with success status and optional error message
 */
export async function storeCsrfToken(
  token: string,
  sessionId?: string
): Promise<{ success: boolean; error?: string }> {
  const serverClient = createServerClient()

  if (!serverClient) {
    console.warn("[CSRF] Supabase not configured, skipping token storage")
    return {
      success: false,
      error: "Database not configured",
    }
  }

  try {
    // Hash the token before storage
    const tokenHash = hashCsrfToken(token)

    // Calculate expiration time
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + CSRF_TOKEN_EXPIRY_MINUTES)

    // Store the hashed token in the database
    const { error } = await serverClient.from("csrf_tokens").insert({
      token_hash: tokenHash,
      user_session_id: sessionId || null,
      expires_at: expiresAt.toISOString(),
    })

    if (error) {
      console.error("[CSRF] Failed to store token:", error.message)
      return {
        success: false,
        error: "Failed to store CSRF token",
      }
    }

    return { success: true }
  } catch (error) {
    console.error("[CSRF] Exception storing token:", error)
    return {
      success: false,
      error: "Failed to store CSRF token",
    }
  }
}

/**
 * Validate a CSRF token against stored server-side tokens
 * Tokens are single-use: successfully validated tokens are deleted immediately
 *
 * @param token - The plaintext CSRF token to validate
 * @returns Object with validation result and optional error message
 */
export async function validateStoredCsrfToken(
  token: string
): Promise<{ valid: boolean; error?: string }> {
  const serverClient = createServerClient()

  if (!serverClient) {
    console.warn("[CSRF] Supabase not configured, skipping server-side validation")
    // Fall back to basic length validation if database is not configured
    if (token.length < 16) {
      return {
        valid: false,
        error: "Invalid CSRF token format.",
      }
    }
    return { valid: true }
  }

  try {
    // Hash the provided token to compare with stored hash
    const tokenHash = hashCsrfToken(token)

    // Look up the token in the database
    const { data, error } = await serverClient
      .from("csrf_tokens")
      .select("id, expires_at")
      .eq("token_hash", tokenHash)
      .single()

    if (error || !data) {
      console.log("[CSRF] Token not found in database")
      return {
        valid: false,
        error: "Invalid or expired CSRF token.",
      }
    }

    // Check if token has expired
    const now = new Date()
    const expiresAt = new Date(data.expires_at)

    if (expiresAt < now) {
      console.log("[CSRF] Token has expired")
      // Clean up expired token
      await serverClient.from("csrf_tokens").delete().eq("id", data.id)
      return {
        valid: false,
        error: "CSRF token has expired.",
      }
    }

    // Token is valid - delete it immediately (single-use tokens)
    const { error: deleteError } = await serverClient
      .from("csrf_tokens")
      .delete()
      .eq("id", data.id)

    if (deleteError) {
      console.error("[CSRF] Failed to delete used token:", deleteError.message)
      // Token was valid, so still return success even if deletion failed
    }

    return { valid: true }
  } catch (error) {
    console.error("[CSRF] Exception validating token:", error)
    return {
      valid: false,
      error: "CSRF token validation failed.",
    }
  }
}

/**
 * Clean up expired CSRF tokens from the database
 * This function should be called periodically to prevent table bloat
 *
 * @returns Number of tokens deleted, or -1 if cleanup failed
 */
export async function cleanupExpiredCsrfTokens(): Promise<number> {
  const serverClient = createServerClient()

  if (!serverClient) {
    console.warn("[CSRF] Supabase not configured, skipping token cleanup")
    return -1
  }

  try {
    // Call the database function to clean up expired tokens
    const { data, error } = await serverClient.rpc("cleanup_expired_csrf_tokens")

    if (error) {
      console.error("[CSRF] Failed to cleanup expired tokens:", error.message)
      return -1
    }

    const deletedCount = data as number
    if (deletedCount > 0) {
      console.log(`[CSRF] Cleaned up ${deletedCount} expired tokens`)
    }

    return deletedCount
  } catch (error) {
    console.error("[CSRF] Exception during token cleanup:", error)
    return -1
  }
}

/**
 * Run cleanup if enough time has passed since last cleanup
 * This is called opportunistically during validation to avoid table bloat
 * without requiring a separate cron job
 */
function runCleanupIfNeeded(): void {
  const now = Date.now()
  const timeSinceLastCleanup = now - lastCleanupTime
  const cleanupIntervalMs = CLEANUP_INTERVAL_MINUTES * 60 * 1000

  // Only run cleanup if enough time has passed
  if (timeSinceLastCleanup < cleanupIntervalMs) {
    return
  }

  // Update last cleanup time immediately to prevent concurrent cleanup calls
  lastCleanupTime = now

  // Run cleanup asynchronously without blocking the validation
  cleanupExpiredCsrfTokens().catch((error) => {
    console.error("[CSRF] Async cleanup failed:", error)
    // Reset lastCleanupTime on failure so cleanup can retry sooner
    lastCleanupTime = now - cleanupIntervalMs + 60000 // Retry in 1 minute
  })
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

  // Opportunistically run cleanup to prevent token table bloat
  // This runs asynchronously and doesn't block validation
  runCleanupIfNeeded()

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

  // Validate the CSRF token against server-side stored tokens
  // Tokens are single-use and must match a valid stored token hash
  const validationResult = await validateStoredCsrfToken(csrfToken)

  if (!validationResult.valid) {
    console.log("[CSRF] Token validation failed:", validationResult.error)
    return {
      valid: false,
      error: validationResult.error || "Invalid CSRF token."
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

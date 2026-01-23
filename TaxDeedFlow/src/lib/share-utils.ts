/**
 * Share Utilities - Client-side functions for managing share links
 *
 * Provides convenient functions for creating, validating, and managing
 * shareable report links from the client side.
 *
 * @author Claude Code Agent
 * @date 2026-01-17
 */

import type {
  ShareLinkResponse,
  ShareValidationResult,
  CreateShareRequest,
  ReportShare,
  ShareListResponse,
} from "@/types/sharing"
import { logger } from "@/lib/logger"

// Create context logger for share operations
const shareLogger = logger.withContext('Share Utils')

// ============================================
// Configuration
// ============================================

/**
 * Get the base URL for API calls
 * Uses environment variable or falls back to relative path
 */
function getApiBaseUrl(): string {
  // In browser, use relative path
  if (typeof window !== "undefined") {
    return ""
  }
  // In server-side, use environment variable
  return process.env.NEXT_PUBLIC_APP_URL || ""
}

/**
 * Get authentication headers for API requests
 * Retrieves the user token and CSRF token from localStorage if available
 */
function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }

  // Only access localStorage in browser environment
  if (typeof window !== "undefined") {
    try {
      // Add user authentication token
      const userToken = localStorage.getItem("taxdeedflow_user")
      if (userToken) {
        headers["X-User-Token"] = userToken
      }

      // Add CSRF token for state-changing requests (POST, PUT, DELETE, PATCH)
      const csrfToken = localStorage.getItem("taxdeedflow_csrf_token")
      if (csrfToken) {
        headers["X-CSRF-Token"] = csrfToken
      }
    } catch {
      // localStorage not available or error reading
      shareLogger.warn('Unable to access localStorage for auth')
    }
  }

  return headers
}

// ============================================
// API Response Types
// ============================================

interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
  source?: string
}

interface CreateShareApiResponse extends ShareLinkResponse {
  message?: string
  source?: string
}

interface ValidateShareApiResponse extends ShareValidationResult {
  source?: string
  message?: string
}

// ============================================
// Core Functions
// ============================================

/**
 * Create a shareable link for a report
 *
 * @param reportId - UUID of the report to share
 * @param expiresInDays - Number of days until the link expires (default: 30, max: 365)
 * @param options - Additional options (max_views, password, require_email)
 * @returns Promise resolving to ShareLinkResponse with share_url, share_token, expires_at
 *
 * @example
 * ```typescript
 * const response = await createShareLink("report-uuid-123");
 * console.log(response.share_url); // Full shareable URL
 * ```
 *
 * @example
 * ```typescript
 * // With custom expiration and max views
 * const response = await createShareLink("report-uuid-123", 7, { max_views: 10 });
 * ```
 */
export async function createShareLink(
  reportId: string,
  expiresInDays?: number,
  options?: {
    max_views?: number
    password?: string
    require_email?: boolean
  }
): Promise<ShareLinkResponse> {
  const baseUrl = getApiBaseUrl()

  const requestBody: CreateShareRequest = {
    report_id: reportId,
    expires_days: expiresInDays,
    ...options,
  }

  const response = await fetch(`${baseUrl}/api/shares`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({})) as ApiResponse<never>
    throw new Error(
      errorData.message || errorData.error || `Failed to create share link (${response.status})`
    )
  }

  const data = await response.json() as CreateShareApiResponse

  return {
    share_url: data.share_url,
    share_token: data.share_token,
    expires_at: data.expires_at,
    share_id: data.share_id,
  }
}

/**
 * Validate a share token and check if it's still valid
 *
 * This function calls the API which will also increment the view count.
 * For checking validity without incrementing views, use `checkShareTokenValid`.
 *
 * @param token - The share token (UUID) to validate
 * @returns Promise resolving to validation result with is_valid, report_id, and optional error
 *
 * @example
 * ```typescript
 * const result = await validateShareToken("token-uuid-123");
 * if (result.isValid && result.reportId) {
 *   // Redirect to report or fetch report data
 *   console.log("Report ID:", result.reportId);
 * } else {
 *   console.log("Error:", result.error);
 * }
 * ```
 */
export async function validateShareToken(token: string): Promise<{
  isValid: boolean
  reportId?: string
  error?: string
}> {
  // Validate token format client-side first
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!token || !uuidRegex.test(token)) {
    return {
      isValid: false,
      error: "Invalid share token format",
    }
  }

  const baseUrl = getApiBaseUrl()

  try {
    const response = await fetch(`${baseUrl}/api/shares/${token}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      // No auth headers - this endpoint is public
    })

    const data = await response.json() as ValidateShareApiResponse

    return {
      isValid: data.is_valid,
      reportId: data.report_id || undefined,
      error: data.error_message || undefined,
    }
  } catch (error) {
    shareLogger.error('Error validating share token', {
      error: error instanceof Error ? error.message : String(error),
      token: token.substring(0, 8) + '...'
    })
    return {
      isValid: false,
      error: "Unable to validate share token. Please try again.",
    }
  }
}

/**
 * Copy a share URL to the clipboard
 *
 * Uses the modern Clipboard API with fallback for older browsers.
 * Shows appropriate user feedback via console (UI feedback should be handled by caller).
 *
 * @param shareUrl - The full share URL to copy
 * @returns Promise resolving to true if successful, false otherwise
 *
 * @example
 * ```typescript
 * const success = await copyShareLinkToClipboard(shareUrl);
 * if (success) {
 *   toast.success("Link copied to clipboard!");
 * } else {
 *   toast.error("Failed to copy link");
 * }
 * ```
 */
export async function copyShareLinkToClipboard(shareUrl: string): Promise<boolean> {
  // Validate input
  if (!shareUrl || typeof shareUrl !== "string") {
    shareLogger.error('Invalid share URL provided', {
      shareUrl: typeof shareUrl
    })
    return false
  }

  // Ensure we're in a browser environment
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    shareLogger.error('Clipboard API not available in this environment')
    return false
  }

  try {
    // Modern Clipboard API (preferred)
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(shareUrl)
      shareLogger.debug('Share URL copied to clipboard')
      return true
    }

    // Fallback for older browsers using execCommand
    const textArea = document.createElement("textarea")
    textArea.value = shareUrl
    textArea.style.position = "fixed"
    textArea.style.left = "-999999px"
    textArea.style.top = "-999999px"
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()

    const success = document.execCommand("copy")
    document.body.removeChild(textArea)

    if (success) {
      shareLogger.debug('Share URL copied to clipboard (fallback method)')
      return true
    }

    shareLogger.error('execCommand copy failed')
    return false
  } catch (error) {
    shareLogger.error('Failed to copy to clipboard', {
      error: error instanceof Error ? error.message : String(error)
    })
    return false
  }
}

// ============================================
// Additional Utility Functions
// ============================================

/**
 * Deactivate (soft delete) a share link
 *
 * Requires authentication. Only the share creator or admin can deactivate.
 *
 * @param token - The share token to deactivate
 * @returns Promise resolving to true if successful
 *
 * @example
 * ```typescript
 * const success = await deactivateShareLink("token-uuid-123");
 * if (success) {
 *   console.log("Share link deactivated");
 * }
 * ```
 */
export async function deactivateShareLink(token: string): Promise<boolean> {
  const baseUrl = getApiBaseUrl()

  try {
    const response = await fetch(`${baseUrl}/api/shares/${token}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as ApiResponse<never>
      throw new Error(errorData.message || errorData.error || "Failed to deactivate share link")
    }

    return true
  } catch (error) {
    shareLogger.error('Error deactivating share link', {
      error: error instanceof Error ? error.message : String(error),
      token: token.substring(0, 8) + '...'
    })
    throw error
  }
}

/**
 * List share links for a report or user
 *
 * Requires authentication.
 *
 * @param options - Filter options (report_id, is_active, limit, offset)
 * @returns Promise resolving to ShareListResponse
 *
 * @example
 * ```typescript
 * const shares = await listShareLinks({ report_id: "report-uuid-123" });
 * console.log(`Found ${shares.total} share links`);
 * ```
 */
export async function listShareLinks(options?: {
  report_id?: string
  is_active?: boolean
  limit?: number
  offset?: number
}): Promise<ShareListResponse> {
  const baseUrl = getApiBaseUrl()

  // Build query string
  const params = new URLSearchParams()
  if (options?.report_id) params.set("report_id", options.report_id)
  if (options?.is_active !== undefined) params.set("is_active", String(options.is_active))
  if (options?.limit) params.set("limit", String(options.limit))
  if (options?.offset) params.set("offset", String(options.offset))

  const queryString = params.toString()
  const url = `${baseUrl}/api/shares${queryString ? `?${queryString}` : ""}`

  const response = await fetch(url, {
    method: "GET",
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({})) as ApiResponse<never>
    throw new Error(errorData.message || errorData.error || "Failed to list share links")
  }

  const data = await response.json() as ApiResponse<ReportShare[]> & {
    total: number
    has_more: boolean
  }

  return {
    shares: data.data || [],
    total: data.total || 0,
    has_more: data.has_more || false,
  }
}

/**
 * Extend the expiration of a share link
 *
 * Requires authentication.
 *
 * @param token - The share token to extend
 * @param additionalDays - Number of days to add from today
 * @returns Promise resolving to updated ReportShare
 *
 * @example
 * ```typescript
 * const updated = await extendShareExpiration("token-uuid-123", 30);
 * console.log("New expiration:", updated.expires_at);
 * ```
 */
export async function extendShareExpiration(
  token: string,
  additionalDays: number
): Promise<ReportShare> {
  const baseUrl = getApiBaseUrl()

  const response = await fetch(`${baseUrl}/api/shares/${token}`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify({ extends_days: additionalDays }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({})) as ApiResponse<never>
    throw new Error(errorData.message || errorData.error || "Failed to extend share expiration")
  }

  const data = await response.json() as ApiResponse<ReportShare>

  if (!data.data) {
    throw new Error("Invalid response from server")
  }

  return data.data
}

/**
 * Update share link settings
 *
 * Requires authentication.
 *
 * @param token - The share token to update
 * @param updates - Settings to update (extends_days, max_views, is_active)
 * @returns Promise resolving to updated ReportShare
 */
export async function updateShareLink(
  token: string,
  updates: {
    extends_days?: number
    max_views?: number | null
    is_active?: boolean
  }
): Promise<ReportShare> {
  const baseUrl = getApiBaseUrl()

  const response = await fetch(`${baseUrl}/api/shares/${token}`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(updates),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({})) as ApiResponse<never>
    throw new Error(errorData.message || errorData.error || "Failed to update share link")
  }

  const data = await response.json() as ApiResponse<ReportShare>

  if (!data.data) {
    throw new Error("Invalid response from server")
  }

  return data.data
}

// ============================================
// Helper Functions
// ============================================

/**
 * Generate a share URL from a token
 *
 * @param token - The share token
 * @returns Full share URL
 */
export function getShareUrl(token: string): string {
  const baseUrl = typeof window !== "undefined"
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

  return `${baseUrl}/share/${token}`
}

/**
 * Extract share token from a share URL
 *
 * @param url - The full share URL
 * @returns The extracted token or null if invalid
 */
export function extractShareToken(url: string): string | null {
  try {
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split("/")
    const shareIndex = pathParts.indexOf("share")

    if (shareIndex !== -1 && pathParts[shareIndex + 1]) {
      const token = pathParts[shareIndex + 1]
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (uuidRegex.test(token)) {
        return token
      }
    }

    return null
  } catch {
    return null
  }
}

/**
 * Check if a share URL is valid format (doesn't call API)
 *
 * @param url - The URL to check
 * @returns true if the URL has valid share format
 */
export function isValidShareUrl(url: string): boolean {
  const token = extractShareToken(url)
  return token !== null
}

/**
 * Calculate days until share expiration
 *
 * @param expiresAt - ISO 8601 expiration timestamp
 * @returns Number of days until expiration (negative if expired)
 */
export function getDaysUntilExpiration(expiresAt: string): number {
  const expiration = new Date(expiresAt)
  const now = new Date()
  const diffMs = expiration.getTime() - now.getTime()
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}

/**
 * Check if a share is expired based on expiration date
 *
 * @param expiresAt - ISO 8601 expiration timestamp
 * @returns true if the share has expired
 */
export function isShareExpired(expiresAt: string): boolean {
  return getDaysUntilExpiration(expiresAt) < 0
}

/**
 * Format expiration date for display
 *
 * @param expiresAt - ISO 8601 expiration timestamp
 * @returns Formatted string like "Expires in 5 days" or "Expired 2 days ago"
 */
export function formatShareExpiration(expiresAt: string): string {
  const days = getDaysUntilExpiration(expiresAt)

  if (days === 0) {
    return "Expires today"
  } else if (days === 1) {
    return "Expires tomorrow"
  } else if (days > 1) {
    return `Expires in ${days} days`
  } else if (days === -1) {
    return "Expired yesterday"
  } else {
    return `Expired ${Math.abs(days)} days ago`
  }
}

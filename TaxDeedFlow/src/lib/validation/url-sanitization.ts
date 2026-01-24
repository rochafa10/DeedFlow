/**
 * URL Sanitization Utility Functions
 *
 * Provides security-focused URL sanitization functions to prevent path traversal,
 * URL injection, and other security vulnerabilities when constructing URLs from
 * user-provided input.
 *
 * All functions use encodeURIComponent() for proper URL encoding and include
 * additional validation to detect and block malicious patterns.
 *
 * @module lib/validation/url-sanitization
 */

// ============================================
// Constants and Patterns
// ============================================

/**
 * Path traversal patterns that should be blocked
 * Includes: ../, ./, encoded versions, and backslash variants
 */
const PATH_TRAVERSAL_PATTERN = /\.\.[\/\\]|\.\/|\.\.%2[fF]|%2[eE]%2[eE]|%5[cC]/

/**
 * Characters that should be removed from URL segments
 * Includes: null bytes, control characters, and dangerous URL characters
 */
const DANGEROUS_CHARS = /[\x00-\x1f\x7f<>{}[\]\\^`|"]/g

/**
 * Maximum length for URL segments to prevent DoS attacks
 */
const MAX_URL_SEGMENT_LENGTH = 200

// ============================================
// Core Sanitization Functions
// ============================================

/**
 * Sanitize a general URL segment
 *
 * Applies comprehensive sanitization including:
 * - Path traversal detection and blocking
 * - Dangerous character removal
 * - Length validation
 * - Proper URL encoding
 *
 * @param value - The URL segment to sanitize
 * @param maxLength - Maximum allowed length (default: 200)
 * @returns Sanitized and URL-encoded string
 * @throws Error if path traversal is detected or value is too long
 *
 * @example
 * sanitizeUrlSegment("My County") // Returns "My%20County"
 * sanitizeUrlSegment("../../../etc/passwd") // Throws Error
 */
export function sanitizeUrlSegment(
  value: string,
  maxLength: number = MAX_URL_SEGMENT_LENGTH
): string {
  // Handle null/undefined
  if (!value || typeof value !== "string") {
    throw new Error("URL segment must be a non-empty string")
  }

  // Trim whitespace
  const trimmed = value.trim()

  if (trimmed.length === 0) {
    throw new Error("URL segment cannot be empty after trimming")
  }

  // Check length before processing
  if (trimmed.length > maxLength) {
    throw new Error(`URL segment exceeds maximum length of ${maxLength} characters`)
  }

  // Check for path traversal attempts BEFORE encoding
  // This prevents encoded path traversal attacks
  if (PATH_TRAVERSAL_PATTERN.test(trimmed) || PATH_TRAVERSAL_PATTERN.test(value)) {
    throw new Error("Path traversal detected in URL segment")
  }

  // Remove dangerous characters
  const cleaned = trimmed.replace(DANGEROUS_CHARS, "")

  // Verify we still have content after cleaning
  if (cleaned.length === 0) {
    throw new Error("URL segment contains only invalid characters")
  }

  // Apply URL encoding
  // encodeURIComponent encodes all characters except: A-Z a-z 0-9 - _ . ! ~ * ' ( )
  const encoded = encodeURIComponent(cleaned)

  // Final check for path traversal in encoded value
  if (PATH_TRAVERSAL_PATTERN.test(encoded)) {
    throw new Error("Path traversal detected in encoded URL segment")
  }

  return encoded
}

/**
 * Sanitize a parcel ID for use in URLs
 *
 * Parcel IDs can contain alphanumeric characters, hyphens, underscores,
 * spaces, and periods. All other characters are removed or encoded.
 *
 * @param parcelId - The parcel ID to sanitize
 * @returns Sanitized and URL-encoded parcel ID
 * @throws Error if parcel ID is invalid or contains path traversal
 *
 * @example
 * sanitizeParcelId("123-456-789") // Returns "123-456-789"
 * sanitizeParcelId("ABC 123 DEF") // Returns "ABC%20123%20DEF"
 * sanitizeParcelId("../../../etc") // Throws Error
 */
export function sanitizeParcelId(parcelId: string): string {
  // Handle null/undefined
  if (!parcelId || typeof parcelId !== "string") {
    throw new Error("Parcel ID must be a non-empty string")
  }

  const trimmed = parcelId.trim()

  if (trimmed.length === 0) {
    throw new Error("Parcel ID cannot be empty")
  }

  // Enforce maximum length
  if (trimmed.length > 100) {
    throw new Error("Parcel ID must be 100 characters or less")
  }

  // Check for path traversal
  if (PATH_TRAVERSAL_PATTERN.test(trimmed)) {
    throw new Error("Invalid parcel ID: path traversal detected")
  }

  // Remove any characters that aren't alphanumeric, hyphen, underscore, space, or period
  // This matches the regex from scraper-validation.ts: /^[a-zA-Z0-9\-_\s.]+$/
  const cleaned = trimmed.replace(/[^a-zA-Z0-9\-_\s.]/g, "")

  if (cleaned.length === 0) {
    throw new Error("Parcel ID contains only invalid characters")
  }

  // Apply URL encoding
  const encoded = encodeURIComponent(cleaned)

  // Final security check
  if (PATH_TRAVERSAL_PATTERN.test(encoded)) {
    throw new Error("Invalid parcel ID after encoding")
  }

  return encoded
}

/**
 * Sanitize a county name for use in URLs
 *
 * County names typically contain letters, spaces, hyphens, periods, and apostrophes
 * (e.g., "St. Louis County", "O'Brien County").
 *
 * This function also converts the name to lowercase and replaces spaces with hyphens
 * for URL-friendly slugs, matching the pattern used in the scraper routes.
 *
 * @param countyName - The county name to sanitize
 * @param createSlug - If true, converts to lowercase slug format (default: true)
 * @returns Sanitized county name or slug
 * @throws Error if county name is invalid or contains path traversal
 *
 * @example
 * sanitizeCountyName("Blair County") // Returns "blair-county"
 * sanitizeCountyName("St. Louis County") // Returns "st.-louis-county"
 * sanitizeCountyName("Blair County", false) // Returns "Blair%20County"
 */
export function sanitizeCountyName(countyName: string, createSlug: boolean = true): string {
  // Handle null/undefined
  if (!countyName || typeof countyName !== "string") {
    throw new Error("County name must be a non-empty string")
  }

  const trimmed = countyName.trim()

  if (trimmed.length === 0) {
    throw new Error("County name cannot be empty")
  }

  // Enforce maximum length
  if (trimmed.length > 100) {
    throw new Error("County name must be 100 characters or less")
  }

  // Check for path traversal
  if (PATH_TRAVERSAL_PATTERN.test(trimmed)) {
    throw new Error("Invalid county name: path traversal detected")
  }

  // Remove any characters that aren't letters, spaces, hyphens, periods, or apostrophes
  // This matches the regex from scraper-validation.ts: /^[a-zA-Z\s\-.']+$/
  const cleaned = trimmed.replace(/[^a-zA-Z\s\-.']/g, "")

  if (cleaned.length === 0) {
    throw new Error("County name contains only invalid characters")
  }

  // Create URL-friendly slug if requested (matches screenshot/route.ts line 571)
  if (createSlug) {
    const slug = cleaned.toLowerCase().replace(/\s+/g, "-")
    return slug
  }

  // Otherwise, just encode for URL
  const encoded = encodeURIComponent(cleaned)

  // Final security check
  if (PATH_TRAVERSAL_PATTERN.test(encoded)) {
    throw new Error("Invalid county name after encoding")
  }

  return encoded
}

/**
 * Sanitize a US state code for use in URLs
 *
 * State codes must be exactly 2 uppercase letters and match valid US state/territory codes.
 * This function validates against the official list and converts to uppercase.
 *
 * @param stateCode - The state code to sanitize (e.g., "PA", "pa", "CA")
 * @returns Sanitized uppercase state code
 * @throws Error if state code is invalid
 *
 * @example
 * sanitizeStateCode("PA") // Returns "PA"
 * sanitizeStateCode("pa") // Returns "PA"
 * sanitizeStateCode("XX") // Throws Error
 */
export function sanitizeStateCode(stateCode: string): string {
  // Handle null/undefined
  if (!stateCode || typeof stateCode !== "string") {
    throw new Error("State code must be a non-empty string")
  }

  const trimmed = stateCode.trim().toUpperCase()

  // Must be exactly 2 characters
  if (trimmed.length !== 2) {
    throw new Error("State code must be exactly 2 characters")
  }

  // Must contain only letters
  if (!/^[A-Z]{2}$/.test(trimmed)) {
    throw new Error("State code must contain only letters")
  }

  // Validate against known US state/territory codes
  const validStateCodes = [
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
    "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
    "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
    "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
    "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
    "DC", "PR", "VI", "GU", "AS", "MP",
  ]

  if (!validStateCodes.includes(trimmed)) {
    throw new Error(`Invalid US state or territory code: ${trimmed}`)
  }

  // State codes don't need URL encoding (they're just 2 uppercase letters)
  // but we return the validated and uppercased value
  return trimmed
}

// ============================================
// Helper Functions
// ============================================

/**
 * Validate that a URL is safe and properly formatted
 *
 * Checks for:
 * - Valid URL format
 * - HTTPS protocol (optional)
 * - No path traversal in the path component
 * - Allowed domain (optional)
 *
 * @param url - The URL to validate
 * @param requireHttps - If true, requires HTTPS protocol (default: true)
 * @param allowedDomains - Optional array of allowed domains
 * @returns true if URL is valid and safe
 * @throws Error if URL is invalid or unsafe
 *
 * @example
 * validateUrl("https://app.regrid.com/property") // Returns true
 * validateUrl("http://app.regrid.com", true) // Throws Error (not HTTPS)
 * validateUrl("https://evil.com", true, ["regrid.com"]) // Throws Error (wrong domain)
 */
export function validateUrl(
  url: string,
  requireHttps: boolean = true,
  allowedDomains?: string[]
): boolean {
  if (!url || typeof url !== "string") {
    throw new Error("URL must be a non-empty string")
  }

  // Parse the URL
  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
  } catch {
    throw new Error("Invalid URL format")
  }

  // Check protocol
  if (requireHttps && parsedUrl.protocol !== "https:") {
    throw new Error("URL must use HTTPS protocol")
  }

  if (!requireHttps && parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error("URL must use HTTP or HTTPS protocol")
  }

  // Check for path traversal in pathname
  if (PATH_TRAVERSAL_PATTERN.test(parsedUrl.pathname)) {
    throw new Error("Path traversal detected in URL")
  }

  // Check allowed domains if specified
  if (allowedDomains && allowedDomains.length > 0) {
    const isAllowed = allowedDomains.some(
      (domain) => parsedUrl.hostname === domain || parsedUrl.hostname.endsWith(`.${domain}`)
    )

    if (!isAllowed) {
      throw new Error(`URL domain must be one of: ${allowedDomains.join(", ")}`)
    }
  }

  return true
}

/**
 * Create a safe query string from an object
 *
 * Sanitizes all values and constructs a properly encoded query string.
 * Skips null, undefined, and empty string values.
 *
 * @param params - Object containing query parameters
 * @returns Encoded query string (without leading "?")
 *
 * @example
 * createSafeQueryString({ county: "Blair", state: "PA" })
 * // Returns "county=Blair&state=PA"
 *
 * createSafeQueryString({ id: "123", invalid: null })
 * // Returns "id=123"
 */
export function createSafeQueryString(params: Record<string, string | number | boolean | null | undefined>): string {
  const pairs: string[] = []

  for (const [key, value] of Object.entries(params)) {
    // Skip null, undefined, or empty values
    if (value === null || value === undefined || value === "") {
      continue
    }

    // Encode both key and value
    const encodedKey = encodeURIComponent(key)
    const encodedValue = encodeURIComponent(String(value))

    pairs.push(`${encodedKey}=${encodedValue}`)
  }

  return pairs.join("&")
}

import { z } from "zod"

/**
 * Validation schemas for scraper route inputs
 *
 * These schemas prevent path traversal, URL injection, and other security issues
 * by validating and sanitizing user-provided inputs before they are used in URL construction.
 */

// Regex patterns for validation
const PATH_TRAVERSAL_PATTERN = /\.\.[\/\\]|\.\/|\.\.%2[fF]|%2[eE]%2[eE]/
const SPECIAL_URL_CHARS = /[<>{}[\]\\^`|"]/
const SQL_INJECTION_PATTERN = /(['";]|--|\b(OR|AND|UNION|SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC)\b)/i
const XSS_PATTERN = /<script|javascript:|on\w+=/i

// State code validation (2-letter US state codes)
const US_STATE_CODES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
  "DC", "PR", "VI", "GU", "AS", "MP"
] as const

/**
 * Custom refinement to check for path traversal attempts
 */
const noPathTraversal = (value: string) => {
  return !PATH_TRAVERSAL_PATTERN.test(value)
}

/**
 * Custom refinement to check for special URL characters that could cause issues
 */
const noSpecialUrlChars = (value: string) => {
  return !SPECIAL_URL_CHARS.test(value)
}

/**
 * Custom refinement to check for SQL injection patterns
 */
const noSqlInjection = (value: string) => {
  return !SQL_INJECTION_PATTERN.test(value)
}

/**
 * Custom refinement to check for XSS patterns
 */
const noXss = (value: string) => {
  return !XSS_PATTERN.test(value)
}

/**
 * Parcel ID validation schema
 *
 * Parcel IDs can contain alphanumeric characters, hyphens, and underscores
 * Typical format: 123-456-789 or ABC123DEF
 * Max length: 100 characters (generous to accommodate various county formats)
 */
export const parcelIdSchema = z
  .string()
  .trim()
  .min(1, "Parcel ID is required")
  .max(100, "Parcel ID must be 100 characters or less")
  .regex(
    /^[a-zA-Z0-9\-_\s.]+$/,
    "Parcel ID can only contain letters, numbers, hyphens, underscores, spaces, and periods"
  )
  .refine(noPathTraversal, "Invalid parcel ID: path traversal detected")
  .refine(noSpecialUrlChars, "Invalid parcel ID: special URL characters not allowed")
  .refine(noSqlInjection, "Invalid parcel ID: suspicious characters detected")
  .refine(noXss, "Invalid parcel ID: suspicious characters detected")

/**
 * County name validation schema
 *
 * County names typically contain letters, spaces, hyphens, and periods (e.g., "St. Louis County")
 * Max length: 100 characters
 */
export const countyNameSchema = z
  .string()
  .trim()
  .min(1, "County name is required")
  .max(100, "County name must be 100 characters or less")
  .regex(
    /^[a-zA-Z\s\-.']+$/,
    "County name can only contain letters, spaces, hyphens, periods, and apostrophes"
  )
  .refine(noPathTraversal, "Invalid county name: path traversal detected")
  .refine(noSpecialUrlChars, "Invalid county name: special URL characters not allowed")
  .refine(noSqlInjection, "Invalid county name: suspicious characters detected")
  .refine(noXss, "Invalid county name: suspicious characters detected")

/**
 * State code validation schema
 *
 * US state codes are exactly 2 uppercase letters
 * Validates against known US state/territory codes
 */
export const stateCodeSchema = z
  .string()
  .trim()
  .length(2, "State code must be exactly 2 characters")
  .toUpperCase()
  .refine(
    (value) => US_STATE_CODES.includes(value as any),
    "Invalid US state or territory code"
  )

/**
 * Property address validation schema
 *
 * Addresses can contain alphanumeric characters, spaces, commas, periods, hyphens, and #
 * Max length: 200 characters
 */
export const propertyAddressSchema = z
  .string()
  .trim()
  .min(1, "Property address is required")
  .max(200, "Property address must be 200 characters or less")
  .regex(
    /^[a-zA-Z0-9\s,.\-#']+$/,
    "Property address can only contain letters, numbers, spaces, commas, periods, hyphens, #, and apostrophes"
  )
  .refine(noPathTraversal, "Invalid property address: path traversal detected")
  .refine(noSpecialUrlChars, "Invalid property address: special URL characters not allowed")
  .refine(noSqlInjection, "Invalid property address: suspicious characters detected")
  .refine(noXss, "Invalid property address: suspicious characters detected")

/**
 * Property ID validation schema (UUID format)
 *
 * UUIDs are 36 characters with specific format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 */
export const propertyIdSchema = z
  .string()
  .trim()
  .uuid("Property ID must be a valid UUID")

/**
 * URL validation schema
 *
 * Validates that the URL is properly formatted and uses https protocol
 * Only allows regrid.com domains for the Regrid scraper
 */
export const regridUrlSchema = z
  .string()
  .trim()
  .url("Must be a valid URL")
  .startsWith("https://", "URL must use HTTPS protocol")
  .refine(
    (value) => {
      try {
        const url = new URL(value)
        return url.hostname.endsWith("regrid.com") || url.hostname === "regrid.com"
      } catch {
        return false
      }
    },
    "URL must be from regrid.com domain"
  )
  .refine(noPathTraversal, "Invalid URL: path traversal detected")

/**
 * Screenshot route request body schema
 */
export const screenshotRequestSchema = z.object({
  property_id: propertyIdSchema,
  regrid_url: regridUrlSchema,
  parcel_id: parcelIdSchema.optional(),
  property_address: propertyAddressSchema.optional(),
})

/**
 * Regrid route request body schema
 */
export const regridRequestSchema = z.object({
  property_id: propertyIdSchema,
  parcel_id: parcelIdSchema,
  county: countyNameSchema,
  state: stateCodeSchema,
  address: propertyAddressSchema.optional(),
})

/**
 * Type exports for TypeScript
 */
export type ScreenshotRequest = z.infer<typeof screenshotRequestSchema>
export type RegridRequest = z.infer<typeof regridRequestSchema>
export type ParcelId = z.infer<typeof parcelIdSchema>
export type CountyName = z.infer<typeof countyNameSchema>
export type StateCode = z.infer<typeof stateCodeSchema>
export type PropertyAddress = z.infer<typeof propertyAddressSchema>
export type PropertyId = z.infer<typeof propertyIdSchema>
export type RegridUrl = z.infer<typeof regridUrlSchema>

/**
 * Helper function to safely validate and parse data with detailed error messages
 *
 * @param schema - The Zod schema to validate against
 * @param data - The data to validate
 * @returns Object with success flag, parsed data (if valid), and error details (if invalid)
 */
export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string; details: z.ZodError } {
  const result = schema.safeParse(data)

  if (result.success) {
    return { success: true, data: result.data }
  }

  // Format error messages for user-friendly display
  const errorMessages = result.error.errors
    .map((err) => `${err.path.join(".")}: ${err.message}`)
    .join(", ")

  return {
    success: false,
    error: errorMessages,
    details: result.error,
  }
}

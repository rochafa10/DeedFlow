/**
 * Logger types and interfaces for sanitized logging
 */

// Log levels supported by the logger
export type LogLevel = "info" | "warn" | "error" | "log" | "debug"

// Sensitive field patterns to redact from logs
export type SensitiveFieldPattern =
  | "email"
  | "property_address"
  | "owner_name"
  | "latitude"
  | "longitude"
  | "coordinates"
  | "parcel_id"
  | "ip_address"
  | "phone"
  | "ssn"
  | "credit_card"

// Configuration for individual field sanitization
export interface SanitizationRule {
  // The field pattern to match (can be exact field name or pattern)
  pattern: string | RegExp
  // The type of sensitive data this rule protects
  type: SensitiveFieldPattern
  // How to redact (full replacement or partial masking)
  redactionStyle: "full" | "partial"
  // For partial redaction, how many characters to preserve (e.g., first 3 of parcel ID)
  preserveChars?: number
}

// Logger configuration interface
export interface LoggerConfig {
  // Minimum log level to output (filters out lower-priority logs)
  logLevel: LogLevel
  // Whether to enable logging at all
  enabled: boolean
  // Array of sanitization rules to apply
  sanitizationRules: SanitizationRule[]
  // Whether to preserve stack traces in error logs
  preserveStackTraces: boolean
  // Redaction placeholder text
  redactionText: string
}

// Logger interface defining available methods
export interface Logger {
  log: (...args: unknown[]) => void
  info: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
  debug: (...args: unknown[]) => void
}

// Type for values that can be logged
export type LogValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Error
  | Record<string, unknown>
  | unknown[]
  | unknown

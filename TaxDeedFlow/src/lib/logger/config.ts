/**
 * Logger configuration with default sanitization rules
 */

import type { LoggerConfig, SanitizationRule, LogLevel } from "./types"

// Default redaction placeholder
export const DEFAULT_REDACTION_TEXT = "[REDACTED]"

// Environment variable key for log level
export const LOG_LEVEL_ENV_KEY = "LOG_LEVEL"

// Default log level
export const DEFAULT_LOG_LEVEL: LogLevel = "info"

/**
 * Default sanitization rules for common sensitive fields
 * These patterns will automatically redact PII from logs
 */
export const DEFAULT_SANITIZATION_RULES: SanitizationRule[] = [
  // Email addresses
  {
    pattern: /^email$/i,
    type: "email",
    redactionStyle: "full",
  },
  {
    pattern: /^.*_email$/i,
    type: "email",
    redactionStyle: "full",
  },
  {
    pattern: /^user_?email$/i,
    type: "email",
    redactionStyle: "full",
  },
  // Property addresses
  {
    pattern: /^property_?address$/i,
    type: "property_address",
    redactionStyle: "full",
  },
  {
    pattern: /^address$/i,
    type: "property_address",
    redactionStyle: "full",
  },
  {
    pattern: /^street_?address$/i,
    type: "property_address",
    redactionStyle: "full",
  },
  {
    pattern: /^mailing_?address$/i,
    type: "property_address",
    redactionStyle: "full",
  },
  // Owner names
  {
    pattern: /^owner_?name$/i,
    type: "owner_name",
    redactionStyle: "full",
  },
  {
    pattern: /^property_?owner$/i,
    type: "owner_name",
    redactionStyle: "full",
  },
  {
    pattern: /^owner$/i,
    type: "owner_name",
    redactionStyle: "full",
  },
  // Geographic coordinates
  {
    pattern: /^latitude$/i,
    type: "latitude",
    redactionStyle: "full",
  },
  {
    pattern: /^lat$/i,
    type: "latitude",
    redactionStyle: "full",
  },
  {
    pattern: /^longitude$/i,
    type: "longitude",
    redactionStyle: "full",
  },
  {
    pattern: /^lon$/i,
    type: "longitude",
    redactionStyle: "full",
  },
  {
    pattern: /^lng$/i,
    type: "longitude",
    redactionStyle: "full",
  },
  {
    pattern: /^coordinates$/i,
    type: "coordinates",
    redactionStyle: "full",
  },
  {
    pattern: /^coords$/i,
    type: "coordinates",
    redactionStyle: "full",
  },
  // Parcel IDs (partial redaction - show first 3 chars for debugging)
  {
    pattern: /^parcel_?id$/i,
    type: "parcel_id",
    redactionStyle: "partial",
    preserveChars: 3,
  },
  {
    pattern: /^parcel_?number$/i,
    type: "parcel_id",
    redactionStyle: "partial",
    preserveChars: 3,
  },
  {
    pattern: /^parcel$/i,
    type: "parcel_id",
    redactionStyle: "partial",
    preserveChars: 3,
  },
  // IP addresses
  {
    pattern: /^ip$/i,
    type: "ip_address",
    redactionStyle: "full",
  },
  {
    pattern: /^ip_?address$/i,
    type: "ip_address",
    redactionStyle: "full",
  },
  {
    pattern: /^client_?ip$/i,
    type: "ip_address",
    redactionStyle: "full",
  },
  // Phone numbers
  {
    pattern: /^phone$/i,
    type: "phone",
    redactionStyle: "partial",
    preserveChars: 3,
  },
  {
    pattern: /^phone_?number$/i,
    type: "phone",
    redactionStyle: "partial",
    preserveChars: 3,
  },
  {
    pattern: /^contact_?phone$/i,
    type: "phone",
    redactionStyle: "partial",
    preserveChars: 3,
  },
  // Social Security Numbers
  {
    pattern: /^ssn$/i,
    type: "ssn",
    redactionStyle: "full",
  },
  {
    pattern: /^social_?security$/i,
    type: "ssn",
    redactionStyle: "full",
  },
  // Credit card numbers
  {
    pattern: /^credit_?card$/i,
    type: "credit_card",
    redactionStyle: "partial",
    preserveChars: 4,
  },
  {
    pattern: /^card_?number$/i,
    type: "credit_card",
    redactionStyle: "partial",
    preserveChars: 4,
  },
]

/**
 * Get log level from environment variable
 * Falls back to default if not set or invalid
 */
export function getLogLevel(): LogLevel {
  if (typeof process === "undefined") return DEFAULT_LOG_LEVEL

  try {
    const envLevel = process.env[LOG_LEVEL_ENV_KEY]
    if (!envLevel) return DEFAULT_LOG_LEVEL

    const normalizedLevel = envLevel.toLowerCase() as LogLevel
    const validLevels: LogLevel[] = ["info", "warn", "error", "log", "debug"]

    if (validLevels.includes(normalizedLevel)) {
      return normalizedLevel
    }

    return DEFAULT_LOG_LEVEL
  } catch (err) {
    // Fail silently and use default
    return DEFAULT_LOG_LEVEL
  }
}

/**
 * Get logger enabled status from environment
 * Can be disabled with LOG_LEVEL=none
 */
export function isLoggingEnabled(): boolean {
  if (typeof process === "undefined") return true

  try {
    const envLevel = process.env[LOG_LEVEL_ENV_KEY]
    return envLevel?.toLowerCase() !== "none"
  } catch (err) {
    return true
  }
}

/**
 * Default logger configuration
 * Uses environment variables if available
 */
export const DEFAULT_LOGGER_CONFIG: LoggerConfig = {
  logLevel: getLogLevel(),
  enabled: isLoggingEnabled(),
  sanitizationRules: DEFAULT_SANITIZATION_RULES,
  preserveStackTraces: true,
  redactionText: DEFAULT_REDACTION_TEXT,
}

/**
 * Create a custom logger configuration
 * Merges provided options with defaults
 */
export function createLoggerConfig(
  overrides?: Partial<LoggerConfig>
): LoggerConfig {
  return {
    ...DEFAULT_LOGGER_CONFIG,
    ...overrides,
    // Merge sanitization rules instead of replacing
    sanitizationRules: [
      ...DEFAULT_LOGGER_CONFIG.sanitizationRules,
      ...(overrides?.sanitizationRules || []),
    ],
  }
}

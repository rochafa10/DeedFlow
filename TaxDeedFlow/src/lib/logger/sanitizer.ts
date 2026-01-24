/**
 * Sanitizer utility for redacting PII and sensitive data from logs
 * Implements automatic field-based redaction with support for nested objects and arrays
 */

import type { LoggerConfig, SanitizationRule, LogValue } from "./types"
import { DEFAULT_LOGGER_CONFIG } from "./config"

/**
 * Sanitize a value by applying configured redaction rules
 * Recursively processes nested objects and arrays
 *
 * @param value - The value to sanitize (can be any type)
 * @param config - Logger configuration with sanitization rules
 * @returns Sanitized value with PII redacted
 */
export function sanitize(
  value: LogValue,
  config: LoggerConfig = DEFAULT_LOGGER_CONFIG
): LogValue {
  // Handle null and undefined
  if (value === null || value === undefined) {
    return value
  }

  // Handle primitive types (string, number, boolean)
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value
  }

  // Handle Error objects specially - preserve stack traces if configured
  if (value instanceof Error) {
    return sanitizeError(value, config)
  }

  // Handle arrays - recursively sanitize each element
  if (Array.isArray(value)) {
    return value.map((item) => sanitize(item, config))
  }

  // Handle objects - sanitize field values based on rules
  if (typeof value === "object") {
    return sanitizeObject(value as Record<string, unknown>, config)
  }

  // Unknown types - return as-is
  return value
}

/**
 * Sanitize an Error object
 * Preserves stack traces based on configuration
 *
 * @param error - The error to sanitize
 * @param config - Logger configuration
 * @returns Sanitized error representation
 */
function sanitizeError(error: Error, config: LoggerConfig): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {
    name: error.name,
    message: error.message,
  }

  // Include stack trace if configured
  if (config.preserveStackTraces && error.stack) {
    sanitized.stack = error.stack
  }

  // Sanitize any additional error properties
  const additionalProps = Object.keys(error).filter(
    (key) => key !== "name" && key !== "message" && key !== "stack"
  )

  for (const key of additionalProps) {
    const value = (error as unknown as Record<string, unknown>)[key]
    sanitized[key] = sanitize(value, config)
  }

  return sanitized
}

/**
 * Sanitize an object by applying field-based redaction rules
 * Recursively processes nested objects
 *
 * @param obj - The object to sanitize
 * @param config - Logger configuration with sanitization rules
 * @returns Sanitized object with sensitive fields redacted
 */
function sanitizeObject(
  obj: Record<string, unknown>,
  config: LoggerConfig
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {}

  for (const key in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) {
      continue
    }

    const value = obj[key]
    const matchingRule = findMatchingRule(key, config.sanitizationRules)

    if (matchingRule) {
      // Apply redaction based on rule
      sanitized[key] = applyRedaction(value, matchingRule, config.redactionText)
    } else {
      // No rule matched - recursively sanitize the value
      sanitized[key] = sanitize(value, config)
    }
  }

  return sanitized
}

/**
 * Find a sanitization rule that matches the given field name
 *
 * @param fieldName - The name of the field to check
 * @param rules - Array of sanitization rules
 * @returns Matching rule or null if no match found
 */
function findMatchingRule(
  fieldName: string,
  rules: SanitizationRule[]
): SanitizationRule | null {
  for (const rule of rules) {
    if (typeof rule.pattern === "string") {
      // Exact string match (case-insensitive)
      if (fieldName.toLowerCase() === rule.pattern.toLowerCase()) {
        return rule
      }
    } else if (rule.pattern instanceof RegExp) {
      // Regex match
      if (rule.pattern.test(fieldName)) {
        return rule
      }
    }
  }

  return null
}

/**
 * Apply redaction to a value based on the rule's redaction style
 *
 * @param value - The value to redact
 * @param rule - The sanitization rule to apply
 * @param redactionText - The placeholder text for redacted values
 * @returns Redacted value
 */
function applyRedaction(
  value: unknown,
  rule: SanitizationRule,
  redactionText: string
): string | unknown {
  // If value is null/undefined, return as-is
  if (value === null || value === undefined) {
    return value
  }

  // Convert to string for redaction
  const stringValue = String(value)

  if (rule.redactionStyle === "full") {
    // Full redaction - replace entire value
    return redactionText
  }

  if (rule.redactionStyle === "partial" && rule.preserveChars) {
    // Partial redaction - preserve first N characters
    if (stringValue.length <= rule.preserveChars) {
      // Value is too short to partially redact - redact fully
      return redactionText
    }

    const preserved = stringValue.substring(0, rule.preserveChars)
    return `${preserved}...${redactionText}`
  }

  // Default to full redaction if style is unknown
  return redactionText
}

/**
 * Check if a value contains any sensitive data based on configured rules
 * Useful for pre-flight checks before logging
 *
 * @param value - The value to check
 * @param config - Logger configuration with sanitization rules
 * @returns True if value contains sensitive fields, false otherwise
 */
export function containsSensitiveData(
  value: LogValue,
  config: LoggerConfig = DEFAULT_LOGGER_CONFIG
): boolean {
  // Primitives and null/undefined don't have field names to match
  if (
    value === null ||
    value === undefined ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return false
  }

  // Check arrays recursively
  if (Array.isArray(value)) {
    return value.some((item) => containsSensitiveData(item, config))
  }

  // Check objects for sensitive field names
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>

    for (const key in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, key)) {
        continue
      }

      // Check if field name matches a sensitive pattern
      const matchingRule = findMatchingRule(key, config.sanitizationRules)
      if (matchingRule) {
        return true
      }

      // Recursively check nested values
      if (containsSensitiveData(obj[key], config)) {
        return true
      }
    }
  }

  return false
}

/**
 * Sanitize multiple values at once
 * Useful for sanitizing function arguments before logging
 *
 * @param values - Array of values to sanitize
 * @param config - Logger configuration
 * @returns Array of sanitized values
 */
export function sanitizeAll(
  values: unknown[],
  config: LoggerConfig = DEFAULT_LOGGER_CONFIG
): unknown[] {
  return values.map((value) => sanitize(value, config))
}

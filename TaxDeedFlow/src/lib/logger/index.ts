/**
 * Main logger implementation with automatic PII sanitization
 * Wraps console methods and sanitizes all arguments before logging
 */

import type { Logger, LoggerConfig, LogLevel } from "./types"
import { DEFAULT_LOGGER_CONFIG } from "./config"
import { sanitizeAll } from "./sanitizer"

/**
 * Logger class that implements sanitized logging
 * All log methods sanitize their arguments before output
 */
class SanitizedLogger implements Logger {
  private config: LoggerConfig

  constructor(config: LoggerConfig = DEFAULT_LOGGER_CONFIG) {
    this.config = config
  }

  /**
   * Check if a given log level should be output based on configuration
   * @param level - The log level to check
   * @returns True if the level should be logged, false otherwise
   */
  private shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled) {
      return false
    }

    const levels: LogLevel[] = ["debug", "log", "info", "warn", "error"]
    const configuredLevelIndex = levels.indexOf(this.config.logLevel)
    const requestedLevelIndex = levels.indexOf(level)

    // Only log if requested level is >= configured level
    return requestedLevelIndex >= configuredLevelIndex
  }

  /**
   * Log a general message
   * @param args - Arguments to log (will be sanitized)
   */
  log(...args: unknown[]): void {
    if (!this.shouldLog("log")) return

    try {
      const sanitized = sanitizeAll(args, this.config)
      console.log(...sanitized)
    } catch (err) {
      // Fail silently to avoid breaking application flow
      console.error("Logger error:", err)
    }
  }

  /**
   * Log an informational message
   * @param args - Arguments to log (will be sanitized)
   */
  info(...args: unknown[]): void {
    if (!this.shouldLog("info")) return

    try {
      const sanitized = sanitizeAll(args, this.config)
      console.info(...sanitized)
    } catch (err) {
      console.error("Logger error:", err)
    }
  }

  /**
   * Log a warning message
   * @param args - Arguments to log (will be sanitized)
   */
  warn(...args: unknown[]): void {
    if (!this.shouldLog("warn")) return

    try {
      const sanitized = sanitizeAll(args, this.config)
      console.warn(...sanitized)
    } catch (err) {
      console.error("Logger error:", err)
    }
  }

  /**
   * Log an error message
   * @param args - Arguments to log (will be sanitized)
   */
  error(...args: unknown[]): void {
    if (!this.shouldLog("error")) return

    try {
      const sanitized = sanitizeAll(args, this.config)
      console.error(...sanitized)
    } catch (err) {
      console.error("Logger error:", err)
    }
  }

  /**
   * Log a debug message
   * @param args - Arguments to log (will be sanitized)
   */
  debug(...args: unknown[]): void {
    if (!this.shouldLog("debug")) return

    try {
      const sanitized = sanitizeAll(args, this.config)
      console.debug(...sanitized)
    } catch (err) {
      console.error("Logger error:", err)
    }
  }

  /**
   * Update logger configuration
   * @param config - New configuration or partial configuration to merge
   */
  configure(config: Partial<LoggerConfig>): void {
    this.config = {
      ...this.config,
      ...config,
      // Merge sanitization rules instead of replacing
      sanitizationRules: [
        ...this.config.sanitizationRules,
        ...(config.sanitizationRules || []),
      ],
    }
  }

  /**
   * Get current logger configuration
   * @returns Current logger configuration
   */
  getConfig(): LoggerConfig {
    return { ...this.config }
  }
}

/**
 * Singleton logger instance
 * Use this for all logging throughout the application
 *
 * Example usage:
 *   import { logger } from "@/lib/logger"
 *   logger.info("User logged in", { user_id: "123" })
 *   logger.error("API error", error)
 */
export const logger = new SanitizedLogger()

/**
 * Create a custom logger instance with specific configuration
 * Useful for testing or special logging scenarios
 *
 * @param config - Logger configuration
 * @returns New logger instance
 */
export function createLogger(config?: Partial<LoggerConfig>): Logger {
  return new SanitizedLogger({
    ...DEFAULT_LOGGER_CONFIG,
    ...config,
  })
}

// Re-export types and utilities for convenience
export type { Logger, LoggerConfig, LogLevel, SanitizationRule } from "./types"
export { DEFAULT_LOGGER_CONFIG, createLoggerConfig } from "./config"
export { sanitize, sanitizeAll, containsSensitiveData } from "./sanitizer"

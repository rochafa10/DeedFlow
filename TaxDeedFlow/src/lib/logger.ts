/**
 * Logger Utility
 *
 * Provides environment-aware structured logging with support for:
 * - Log level filtering based on NODE_ENV
 * - Contextual categorization for better debugging
 * - Singleton instance for consistent logging across the application
 * - Type-safe logging interface
 *
 * ## Environment Configuration
 *
 * Log levels are automatically set based on NODE_ENV:
 * - **development**: DEBUG (all logs visible)
 * - **production**: WARN (only warnings and errors)
 * - **test**: ERROR (only errors, keeps test output clean)
 *
 * Override the default log level using the environment variable:
 * ```bash
 * # In .env.local or environment
 * NEXT_PUBLIC_LOG_LEVEL=DEBUG  # Show all logs
 * NEXT_PUBLIC_LOG_LEVEL=INFO   # Show info, warn, error
 * NEXT_PUBLIC_LOG_LEVEL=WARN   # Show only warn and error
 * NEXT_PUBLIC_LOG_LEVEL=ERROR  # Show only errors
 * NEXT_PUBLIC_LOG_LEVEL=NONE   # Disable all logging
 * ```
 *
 * ## Basic Usage
 *
 * ```typescript
 * import { logger } from '@/lib/logger';
 *
 * // Simple logging
 * logger.debug('Processing request', { requestId: '123' });
 * logger.info('User authenticated', { userId: user.id });
 * logger.warn('Rate limit approaching', { remaining: 10 });
 * logger.error('Failed to fetch data', { error: err.message });
 * ```
 *
 * ## Using Contexts
 *
 * Create context-specific loggers for better categorization:
 *
 * ```typescript
 * // In API routes
 * const apiLogger = logger.withContext('Screenshot API');
 * apiLogger.debug('Capturing screenshot', { url });
 * apiLogger.error('Capture failed', { error: err.message });
 *
 * // In services
 * const serviceLogger = logger.withContext('Regrid Service');
 * serviceLogger.info('Fetching property data', { parcelId });
 *
 * // In components
 * const componentLogger = logger.withContext('PropertyCard');
 * componentLogger.debug('Rendering property', { propertyId });
 * ```
 *
 * ## Log Level Guidelines
 *
 * - **DEBUG**: Detailed diagnostic information (hidden in production)
 *   - Function entry/exit
 *   - Variable values during execution
 *   - Intermediate calculation results
 *
 * - **INFO**: General informational messages
 *   - Major operation start/completion
 *   - User actions
 *   - System state changes
 *
 * - **WARN**: Warning messages for recoverable issues
 *   - Deprecated API usage
 *   - Rate limit approaching
 *   - Missing optional data
 *
 * - **ERROR**: Error messages for failures
 *   - API request failures
 *   - Database errors
 *   - Unhandled exceptions
 */

/**
 * Log level enumeration
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

/**
 * Logger interface for structured logging
 */
export interface Logger {
  debug(message: string, data?: Record<string, unknown>): void;
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
  withContext(context: string): Logger;
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  /** Minimum log level to output */
  level: LogLevel;
  /** Enable timestamp in logs */
  timestamp: boolean;
  /** Enable colored output (for development) */
  colors: boolean;
  /** Optional context prefix for all logs */
  context?: string;
}

/**
 * Default logger configuration based on environment
 */
function getDefaultConfig(): LoggerConfig {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  const isTest = env === 'test';
  const isProduction = env === 'production';

  // Allow override via environment variable
  const envLogLevel = process.env.NEXT_PUBLIC_LOG_LEVEL?.toUpperCase();
  let level: LogLevel;

  if (envLogLevel && envLogLevel in LogLevel) {
    level = LogLevel[envLogLevel as keyof typeof LogLevel] as LogLevel;
  } else if (isProduction) {
    // Production: Only warn and error
    level = LogLevel.WARN;
  } else if (isTest) {
    // Test: Only error to keep test output clean
    level = LogLevel.ERROR;
  } else {
    // Development: All logs
    level = LogLevel.DEBUG;
  }

  return {
    level,
    timestamp: isDevelopment,
    colors: isDevelopment,
  };
}

/**
 * ANSI color codes for terminal output
 */
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

/**
 * Logger implementation
 */
class LoggerImpl implements Logger {
  private config: LoggerConfig;

  constructor(config?: Partial<LoggerConfig>) {
    this.config = { ...getDefaultConfig(), ...config };
  }

  /**
   * Creates a new logger instance with a specific context
   */
  withContext(context: string): Logger {
    return new LoggerImpl({ ...this.config, context });
  }

  /**
   * Formats a log message with optional timestamp and context
   */
  private formatMessage(level: string, message: string, data?: Record<string, unknown>): string {
    const parts: string[] = [];

    // Add timestamp if enabled
    if (this.config.timestamp) {
      parts.push(new Date().toISOString());
    }

    // Add context if available
    if (this.config.context) {
      parts.push(`[${this.config.context}]`);
    }

    // Add log level
    parts.push(`[${level}]`);

    // Add message
    parts.push(message);

    return parts.join(' ');
  }

  /**
   * Applies color formatting to log level
   */
  private colorizeLevel(level: string, color: string): string {
    if (!this.config.colors) {
      return level;
    }
    return `${color}${level}${colors.reset}`;
  }

  /**
   * Formats data object for display
   */
  private formatData(data?: Record<string, unknown>): string {
    if (!data || Object.keys(data).length === 0) {
      return '';
    }

    try {
      return JSON.stringify(data, null, 2);
    } catch (error) {
      return '[Circular or non-serializable data]';
    }
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    levelName: string,
    color: string,
    consoleFn: (message: string, ...args: unknown[]) => void,
    message: string,
    data?: Record<string, unknown>
  ): void {
    // Skip if log level is below configured threshold
    if (level < this.config.level) {
      return;
    }

    const colorizedLevel = this.colorizeLevel(levelName, color);
    const formattedMessage = this.formatMessage(colorizedLevel, message, data);

    if (data && Object.keys(data).length > 0) {
      consoleFn(formattedMessage, data);
    } else {
      consoleFn(formattedMessage);
    }
  }

  /**
   * Debug level logging (verbose, development only)
   */
  debug(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, 'DEBUG', colors.cyan, console.debug, message, data);
  }

  /**
   * Info level logging (general information)
   */
  info(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, 'INFO', colors.blue, console.info, message, data);
  }

  /**
   * Warning level logging (potential issues)
   */
  warn(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, 'WARN', colors.yellow, console.warn, message, data);
  }

  /**
   * Error level logging (errors and exceptions)
   */
  error(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, 'ERROR', colors.red, console.error, message, data);
  }
}

/**
 * Singleton logger instance
 *
 * Use this for general application logging:
 * ```typescript
 * import { logger } from '@/lib/logger';
 * logger.info('Application started');
 * ```
 */
export const logger: Logger = new LoggerImpl();

/**
 * Creates a logger with a specific context
 *
 * Useful for creating module-specific loggers:
 * ```typescript
 * const apiLogger = createLogger({ context: 'API' });
 * apiLogger.debug('Request received');
 * ```
 */
export function createLogger(config?: Partial<LoggerConfig>): Logger {
  return new LoggerImpl(config);
}

/**
 * Export LoggerImpl for testing purposes
 * @internal
 */
export { LoggerImpl };

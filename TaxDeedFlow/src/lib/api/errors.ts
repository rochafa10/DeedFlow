/**
 * Custom API Error Classes
 *
 * Provides a comprehensive error hierarchy for API operations including:
 * - Rate limiting errors
 * - Circuit breaker errors
 * - Validation errors
 * - Timeout errors
 * - Network errors
 */

/**
 * Base API Error class
 * All API-related errors extend this class for consistent error handling
 */
export class ApiError extends Error {
  /** HTTP status code of the error response */
  public readonly statusCode: number;

  /** API endpoint that caused the error */
  public readonly endpoint: string;

  /** Unique request identifier for debugging and logging */
  public readonly requestId: string;

  /** Original error that caused this error, if any */
  public readonly cause?: Error;

  /** Timestamp when the error occurred */
  public readonly timestamp: Date;

  /**
   * Whether this error is potentially retryable
   * Auto-calculated based on status code:
   * - 408 Request Timeout
   * - 429 Too Many Requests
   * - 5xx Server Errors
   */
  public readonly retryable: boolean;

  constructor(
    message: string,
    statusCode: number,
    endpoint: string,
    requestId: string,
    cause?: Error
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.endpoint = endpoint;
    this.requestId = requestId;
    this.cause = cause;
    this.timestamp = new Date();
    this.retryable = this.isRetryableStatus(statusCode);

    // Maintains proper stack trace for where error was thrown (V8 engines)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Determines if a status code indicates a retryable error
   * @param statusCode - HTTP status code to check
   * @returns true if the error is potentially retryable
   */
  private isRetryableStatus(statusCode: number): boolean {
    // 408 Request Timeout, 429 Too Many Requests, 5xx Server Errors
    return statusCode === 408 || statusCode === 429 || (statusCode >= 500 && statusCode < 600);
  }

  /**
   * Creates a serializable representation of the error
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      endpoint: this.endpoint,
      requestId: this.requestId,
      timestamp: this.timestamp.toISOString(),
      retryable: this.retryable,
      cause: this.cause?.message,
    };
  }

  /**
   * Returns a formatted string for logging
   */
  toLogString(): string {
    return `[${this.name}] ${this.message} (status: ${this.statusCode}, endpoint: ${this.endpoint}, requestId: ${this.requestId})`;
  }
}

/**
 * Rate Limit Error
 * Thrown when API rate limits are exceeded
 */
export class RateLimitError extends ApiError {
  /** Time in milliseconds until the rate limit resets */
  public readonly retryAfter: number;

  /** Maximum number of requests allowed in the rate limit window */
  public readonly limit: number;

  /** Number of requests remaining in the current window */
  public readonly remaining: number;

  /** Timestamp when the rate limit window resets */
  public readonly resetTime: Date;

  constructor(
    message: string,
    endpoint: string,
    requestId: string,
    retryAfter: number,
    limit: number,
    remaining: number,
    cause?: Error
  ) {
    super(message, 429, endpoint, requestId, cause);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
    this.limit = limit;
    this.remaining = remaining;
    this.resetTime = new Date(Date.now() + retryAfter);
  }

  /**
   * Returns the date when it's safe to retry
   */
  getRetryDate(): Date {
    return this.resetTime;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      retryAfter: this.retryAfter,
      limit: this.limit,
      remaining: this.remaining,
      resetTime: this.resetTime.toISOString(),
    };
  }
}

/**
 * Circuit Breaker Error
 * Thrown when the circuit breaker is open and requests are being blocked
 */
export class CircuitBreakerError extends ApiError {
  /** Name of the service that has an open circuit */
  public readonly serviceName: string;

  /** Timestamp when the circuit breaker will attempt to reset */
  public readonly resetTime: Date;

  /** Number of consecutive failures that triggered the circuit breaker */
  public readonly failureCount: number;

  /** Current state of the circuit breaker */
  public readonly circuitState: 'open' | 'half-open';

  constructor(
    message: string,
    endpoint: string,
    requestId: string,
    serviceName: string,
    resetTime: Date,
    failureCount: number,
    circuitState: 'open' | 'half-open' = 'open'
  ) {
    super(message, 503, endpoint, requestId);
    this.name = 'CircuitBreakerError';
    this.serviceName = serviceName;
    this.resetTime = resetTime;
    this.failureCount = failureCount;
    this.circuitState = circuitState;
  }

  /**
   * Returns the time in milliseconds until the circuit breaker resets
   */
  getTimeUntilReset(): number {
    return Math.max(0, this.resetTime.getTime() - Date.now());
  }

  /**
   * Checks if the circuit breaker should attempt to reset
   */
  shouldAttemptReset(): boolean {
    return Date.now() >= this.resetTime.getTime();
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      serviceName: this.serviceName,
      resetTime: this.resetTime.toISOString(),
      failureCount: this.failureCount,
      circuitState: this.circuitState,
    };
  }
}

/**
 * Validation Error
 * Thrown when request or response validation fails
 */
export class ValidationError extends ApiError {
  /** Field that failed validation */
  public readonly field: string;

  /** Validation constraints that were violated */
  public readonly constraints: Record<string, string>;

  /** The invalid value that was provided */
  public readonly invalidValue?: unknown;

  constructor(
    message: string,
    endpoint: string,
    requestId: string,
    field: string,
    constraints: Record<string, string>,
    invalidValue?: unknown
  ) {
    super(message, 400, endpoint, requestId);
    this.name = 'ValidationError';
    this.field = field;
    this.constraints = constraints;
    this.invalidValue = invalidValue;
  }

  /**
   * Returns a formatted list of validation errors
   */
  getValidationMessages(): string[] {
    return Object.entries(this.constraints).map(
      ([key, value]) => `${this.field}: ${key} - ${value}`
    );
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      field: this.field,
      constraints: this.constraints,
      invalidValue: this.invalidValue,
    };
  }
}

/**
 * Timeout Error
 * Thrown when a request exceeds the configured timeout
 */
export class TimeoutError extends ApiError {
  /** Timeout duration in milliseconds that was exceeded */
  public readonly timeoutMs: number;

  /** Time elapsed before timeout occurred */
  public readonly elapsedMs: number;

  constructor(
    message: string,
    endpoint: string,
    requestId: string,
    timeoutMs: number,
    elapsedMs?: number
  ) {
    super(message, 408, endpoint, requestId);
    this.name = 'TimeoutError';
    this.timeoutMs = timeoutMs;
    this.elapsedMs = elapsedMs ?? timeoutMs;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      timeoutMs: this.timeoutMs,
      elapsedMs: this.elapsedMs,
    };
  }
}

/**
 * Network Error
 * Thrown when network connectivity issues occur
 */
export class NetworkError extends ApiError {
  /** The original error that caused the network failure */
  public readonly originalError: Error;

  /** Type of network error */
  public readonly errorType: 'connection' | 'dns' | 'ssl' | 'unknown';

  constructor(
    message: string,
    endpoint: string,
    requestId: string,
    originalError: Error,
    errorType: 'connection' | 'dns' | 'ssl' | 'unknown' = 'unknown'
  ) {
    super(message, 0, endpoint, requestId, originalError);
    this.name = 'NetworkError';
    this.originalError = originalError;
    this.errorType = errorType;
  }

  /**
   * Determines if the error is likely transient and worth retrying
   */
  isTransient(): boolean {
    return this.errorType === 'connection' || this.errorType === 'dns';
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      originalError: {
        name: this.originalError.name,
        message: this.originalError.message,
      },
      errorType: this.errorType,
      isTransient: this.isTransient(),
    };
  }
}

/**
 * Type guard to check if an error is an ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * Type guard to check if an error is a RateLimitError
 */
export function isRateLimitError(error: unknown): error is RateLimitError {
  return error instanceof RateLimitError;
}

/**
 * Type guard to check if an error is a CircuitBreakerError
 */
export function isCircuitBreakerError(error: unknown): error is CircuitBreakerError {
  return error instanceof CircuitBreakerError;
}

/**
 * Type guard to check if an error is a ValidationError
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

/**
 * Type guard to check if an error is a TimeoutError
 */
export function isTimeoutError(error: unknown): error is TimeoutError {
  return error instanceof TimeoutError;
}

/**
 * Type guard to check if an error is a NetworkError
 */
export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}

/**
 * Determines the appropriate network error type from an error
 */
export function getNetworkErrorType(error: Error): 'connection' | 'dns' | 'ssl' | 'unknown' {
  const message = error.message.toLowerCase();

  if (message.includes('econnrefused') || message.includes('econnreset') || message.includes('connection')) {
    return 'connection';
  }
  if (message.includes('enotfound') || message.includes('dns') || message.includes('getaddrinfo')) {
    return 'dns';
  }
  if (message.includes('ssl') || message.includes('certificate') || message.includes('cert')) {
    return 'ssl';
  }

  return 'unknown';
}

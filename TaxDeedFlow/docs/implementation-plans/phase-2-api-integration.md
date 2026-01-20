# Phase 2: External API Integration Layer

## Overview
Create a robust API integration layer with caching, distributed rate limiting, circuit breaker pattern, and comprehensive error handling for all external data sources.

## Architecture

```
src/lib/api-services/
├── errors.ts                 # Custom error classes
├── logger.ts                 # Structured logging utility
├── rate-limiter.ts           # Distributed rate limiter (Supabase-backed)
├── circuit-breaker.ts        # Circuit breaker pattern implementation
├── request-deduplicator.ts   # Request deduplication for concurrent calls
├── base-service.ts           # Base class with caching, retry, circuit breaker
├── fema-service.ts           # FEMA NFHL Flood Zone API
├── usgs-service.ts           # USGS Earthquake API
├── nasa-firms-service.ts     # NASA FIRMS Wildfire API
├── census-service.ts         # Census Bureau Demographics
├── open-elevation-service.ts # Open-Elevation API
├── openweather-service.ts    # OpenWeather API
├── realtor-service.ts        # Realtor.com API (RapidAPI)
├── zillow-service.ts         # Zillow API (RapidAPI)
├── google-maps-service.ts    # Google Maps/Places API
├── health.ts                 # Health check utilities
└── index.ts                  # Export all services
```

---

## Custom Error Classes

```typescript
// src/lib/api-services/errors.ts

/**
 * Base API error class with additional context
 */
export class ApiError extends Error {
  public readonly serviceName: string;
  public readonly statusCode: number;
  public readonly originalError?: Error;
  public readonly retryable: boolean;
  public readonly timestamp: Date;
  public readonly requestId?: string;

  constructor(
    message: string,
    serviceName: string,
    statusCode: number = 500,
    options: {
      originalError?: Error;
      retryable?: boolean;
      requestId?: string;
    } = {}
  ) {
    super(message);
    this.name = 'ApiError';
    this.serviceName = serviceName;
    this.statusCode = statusCode;
    this.originalError = options.originalError;
    this.retryable = options.retryable ?? this.isRetryableStatus(statusCode);
    this.timestamp = new Date();
    this.requestId = options.requestId;

    // Capture stack trace
    Error.captureStackTrace(this, ApiError);
  }

  private isRetryableStatus(status: number): boolean {
    // 408 Request Timeout, 429 Too Many Requests, 5xx Server Errors
    return status === 408 || status === 429 || (status >= 500 && status < 600);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      serviceName: this.serviceName,
      statusCode: this.statusCode,
      retryable: this.retryable,
      timestamp: this.timestamp.toISOString(),
      requestId: this.requestId,
      stack: this.stack,
    };
  }
}

/**
 * Rate limit exceeded error
 */
export class RateLimitError extends ApiError {
  public readonly retryAfterMs: number;
  public readonly limit: number;
  public readonly remaining: number;
  public readonly resetAt: Date;

  constructor(
    serviceName: string,
    options: {
      retryAfterMs?: number;
      limit?: number;
      remaining?: number;
      resetAt?: Date;
      requestId?: string;
    } = {}
  ) {
    super(
      `Rate limit exceeded for ${serviceName}. Retry after ${options.retryAfterMs || 60000}ms`,
      serviceName,
      429,
      { retryable: true, requestId: options.requestId }
    );
    this.name = 'RateLimitError';
    this.retryAfterMs = options.retryAfterMs || 60000;
    this.limit = options.limit || 0;
    this.remaining = options.remaining || 0;
    this.resetAt = options.resetAt || new Date(Date.now() + this.retryAfterMs);
  }

  toJSON() {
    return {
      ...super.toJSON(),
      retryAfterMs: this.retryAfterMs,
      limit: this.limit,
      remaining: this.remaining,
      resetAt: this.resetAt.toISOString(),
    };
  }
}

/**
 * Circuit breaker open error - service is temporarily unavailable
 */
export class CircuitBreakerError extends ApiError {
  public readonly circuitState: 'open' | 'half-open';
  public readonly failureCount: number;
  public readonly lastFailureTime: Date;
  public readonly nextRetryTime: Date;

  constructor(
    serviceName: string,
    options: {
      circuitState?: 'open' | 'half-open';
      failureCount?: number;
      lastFailureTime?: Date;
      nextRetryTime?: Date;
      requestId?: string;
    } = {}
  ) {
    const state = options.circuitState || 'open';
    super(
      `Circuit breaker ${state} for ${serviceName}. Service temporarily unavailable.`,
      serviceName,
      503,
      { retryable: true, requestId: options.requestId }
    );
    this.name = 'CircuitBreakerError';
    this.circuitState = state;
    this.failureCount = options.failureCount || 0;
    this.lastFailureTime = options.lastFailureTime || new Date();
    this.nextRetryTime = options.nextRetryTime || new Date(Date.now() + 30000);
  }

  toJSON() {
    return {
      ...super.toJSON(),
      circuitState: this.circuitState,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime.toISOString(),
      nextRetryTime: this.nextRetryTime.toISOString(),
    };
  }
}

/**
 * Network error for connection failures
 */
export class NetworkError extends ApiError {
  public readonly cause: string;

  constructor(
    serviceName: string,
    cause: string,
    options: { originalError?: Error; requestId?: string } = {}
  ) {
    super(
      `Network error for ${serviceName}: ${cause}`,
      serviceName,
      0,
      { ...options, retryable: true }
    );
    this.name = 'NetworkError';
    this.cause = cause;
  }
}

/**
 * Timeout error
 */
export class TimeoutError extends ApiError {
  public readonly timeoutMs: number;

  constructor(
    serviceName: string,
    timeoutMs: number,
    options: { requestId?: string } = {}
  ) {
    super(
      `Request to ${serviceName} timed out after ${timeoutMs}ms`,
      serviceName,
      408,
      { ...options, retryable: true }
    );
    this.name = 'TimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Validation error for invalid responses
 */
export class ValidationError extends ApiError {
  public readonly validationErrors: string[];

  constructor(
    serviceName: string,
    validationErrors: string[],
    options: { requestId?: string } = {}
  ) {
    super(
      `Invalid response from ${serviceName}: ${validationErrors.join(', ')}`,
      serviceName,
      422,
      { ...options, retryable: false }
    );
    this.name = 'ValidationError';
    this.validationErrors = validationErrors;
  }
}
```

---

## Structured Logger

```typescript
// src/lib/api-services/logger.ts

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  serviceName?: string;
  requestId?: string;
  duration?: number;
  statusCode?: number;
  cacheHit?: boolean;
  retryAttempt?: number;
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private serviceName: string;
  private minLevel: LogLevel;
  private static levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor(serviceName: string = 'api-service') {
    this.serviceName = serviceName;
    this.minLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
  }

  private shouldLog(level: LogLevel): boolean {
    return Logger.levelPriority[level] >= Logger.levelPriority[this.minLevel];
  }

  private formatEntry(
    level: LogLevel,
    message: string,
    context: LogContext = {},
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: {
        serviceName: this.serviceName,
        ...context,
      },
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    return entry;
  }

  private log(entry: LogEntry): void {
    const output = JSON.stringify(entry);

    switch (entry.level) {
      case 'debug':
        console.debug(output);
        break;
      case 'info':
        console.info(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      case 'error':
        console.error(output);
        break;
    }
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      this.log(this.formatEntry('debug', message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      this.log(this.formatEntry('info', message, context));
    }
  }

  warn(message: string, context?: LogContext, error?: Error): void {
    if (this.shouldLog('warn')) {
      this.log(this.formatEntry('warn', message, context, error));
    }
  }

  error(message: string, context?: LogContext, error?: Error): void {
    if (this.shouldLog('error')) {
      this.log(this.formatEntry('error', message, context, error));
    }
  }

  // Create a child logger with additional context
  child(additionalContext: LogContext): Logger {
    const childLogger = new Logger(this.serviceName);
    const originalLog = childLogger.log.bind(childLogger);
    childLogger.log = (entry: LogEntry) => {
      entry.context = { ...additionalContext, ...entry.context };
      originalLog(entry);
    };
    return childLogger;
  }

  // Log API request start
  requestStart(endpoint: string, context?: LogContext): void {
    this.debug(`API request started: ${endpoint}`, {
      endpoint,
      ...context,
    });
  }

  // Log API request end
  requestEnd(
    endpoint: string,
    duration: number,
    statusCode: number,
    context?: LogContext
  ): void {
    const level = statusCode >= 400 ? 'warn' : 'info';
    this[level](`API request completed: ${endpoint}`, {
      endpoint,
      duration,
      statusCode,
      ...context,
    });
  }

  // Log cache events
  cacheHit(cacheKey: string, context?: LogContext): void {
    this.debug(`Cache hit: ${cacheKey}`, { cacheKey, cacheHit: true, ...context });
  }

  cacheMiss(cacheKey: string, context?: LogContext): void {
    this.debug(`Cache miss: ${cacheKey}`, { cacheKey, cacheHit: false, ...context });
  }

  // Log circuit breaker events
  circuitBreakerStateChange(
    oldState: string,
    newState: string,
    context?: LogContext
  ): void {
    this.warn(`Circuit breaker state change: ${oldState} -> ${newState}`, {
      circuitBreakerOldState: oldState,
      circuitBreakerNewState: newState,
      ...context,
    });
  }
}

// Export factory function
export function createLogger(serviceName: string): Logger {
  return new Logger(serviceName);
}

// Export default logger
export const logger = new Logger('api-services');
```

---

## Distributed Rate Limiter (Supabase-backed)

```typescript
// src/lib/api-services/rate-limiter.ts

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { RateLimitError } from './errors';
import { createLogger } from './logger';

interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour?: number;
  requestsPerDay?: number;
}

interface RateLimitState {
  minuteCount: number;
  minuteResetAt: Date;
  hourCount: number;
  hourResetAt: Date;
  dayCount: number;
  dayResetAt: Date;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfterMs?: number;
}

/**
 * Distributed rate limiter using Supabase for state persistence
 * Works correctly in serverless environments where in-memory state doesn't persist
 */
export class DistributedRateLimiter {
  private serviceName: string;
  private config: RateLimitConfig;
  private supabase: SupabaseClient;
  private logger = createLogger('rate-limiter');
  private tableName = 'api_rate_limits';

  constructor(serviceName: string, config: RateLimitConfig) {
    this.serviceName = serviceName;
    this.config = {
      requestsPerMinute: config.requestsPerMinute,
      requestsPerHour: config.requestsPerHour || config.requestsPerMinute * 60,
      requestsPerDay: config.requestsPerDay || config.requestsPerMinute * 60 * 24,
    };
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  /**
   * Check if request is allowed and increment counter
   * Uses Supabase RPC for atomic operations
   */
  async checkAndIncrement(): Promise<RateLimitResult> {
    const now = new Date();

    try {
      // Use Supabase RPC for atomic check and increment
      const { data, error } = await this.supabase.rpc('check_rate_limit', {
        p_service_name: this.serviceName,
        p_requests_per_minute: this.config.requestsPerMinute,
        p_requests_per_hour: this.config.requestsPerHour,
        p_requests_per_day: this.config.requestsPerDay,
      });

      if (error) {
        this.logger.error('Rate limit check failed', { serviceName: this.serviceName }, error);
        // Fail open - allow request if rate limiter fails
        return { allowed: true, remaining: -1, resetAt: now };
      }

      const result = data as {
        allowed: boolean;
        remaining_minute: number;
        remaining_hour: number;
        remaining_day: number;
        reset_at_minute: string;
        reset_at_hour: string;
        reset_at_day: string;
        violated_limit: string | null;
      };

      if (!result.allowed) {
        const resetAt = new Date(
          result.violated_limit === 'minute' ? result.reset_at_minute :
          result.violated_limit === 'hour' ? result.reset_at_hour :
          result.reset_at_day
        );
        const retryAfterMs = Math.max(0, resetAt.getTime() - now.getTime());

        this.logger.warn('Rate limit exceeded', {
          serviceName: this.serviceName,
          violatedLimit: result.violated_limit,
          retryAfterMs,
        });

        return {
          allowed: false,
          remaining: 0,
          resetAt,
          retryAfterMs,
        };
      }

      // Return the most restrictive remaining count
      const remaining = Math.min(
        result.remaining_minute,
        result.remaining_hour,
        result.remaining_day
      );

      return {
        allowed: true,
        remaining,
        resetAt: new Date(result.reset_at_minute),
      };
    } catch (err) {
      this.logger.error('Rate limiter exception', { serviceName: this.serviceName }, err as Error);
      // Fail open
      return { allowed: true, remaining: -1, resetAt: now };
    }
  }

  /**
   * Wrapper that throws RateLimitError if limit exceeded
   */
  async acquire(requestId?: string): Promise<void> {
    const result = await this.checkAndIncrement();

    if (!result.allowed) {
      throw new RateLimitError(this.serviceName, {
        retryAfterMs: result.retryAfterMs,
        limit: this.config.requestsPerMinute,
        remaining: result.remaining,
        resetAt: result.resetAt,
        requestId,
      });
    }
  }

  /**
   * Get current rate limit state without incrementing
   */
  async getState(): Promise<RateLimitState | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('service_name', this.serviceName)
      .single();

    if (error || !data) return null;

    return {
      minuteCount: data.minute_count,
      minuteResetAt: new Date(data.minute_reset_at),
      hourCount: data.hour_count,
      hourResetAt: new Date(data.hour_reset_at),
      dayCount: data.day_count,
      dayResetAt: new Date(data.day_reset_at),
    };
  }

  /**
   * Reset rate limit counters (admin function)
   */
  async reset(): Promise<void> {
    await this.supabase
      .from(this.tableName)
      .delete()
      .eq('service_name', this.serviceName);

    this.logger.info('Rate limit reset', { serviceName: this.serviceName });
  }
}

// SQL migration for rate limit table and function
export const RATE_LIMIT_MIGRATION = `
-- Rate limit tracking table
CREATE TABLE IF NOT EXISTS api_rate_limits (
  service_name TEXT PRIMARY KEY,
  minute_count INTEGER DEFAULT 0,
  minute_reset_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '1 minute',
  hour_count INTEGER DEFAULT 0,
  hour_reset_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '1 hour',
  day_count INTEGER DEFAULT 0,
  day_reset_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '1 day',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Atomic rate limit check and increment function
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_service_name TEXT,
  p_requests_per_minute INTEGER,
  p_requests_per_hour INTEGER,
  p_requests_per_day INTEGER
)
RETURNS JSON AS $$
DECLARE
  v_state api_rate_limits%ROWTYPE;
  v_now TIMESTAMPTZ := NOW();
  v_allowed BOOLEAN := TRUE;
  v_violated_limit TEXT := NULL;
BEGIN
  -- Get or create state with row lock
  INSERT INTO api_rate_limits (service_name)
  VALUES (p_service_name)
  ON CONFLICT (service_name) DO UPDATE SET updated_at = NOW()
  RETURNING * INTO v_state;

  -- Reset expired windows
  IF v_state.minute_reset_at <= v_now THEN
    v_state.minute_count := 0;
    v_state.minute_reset_at := v_now + INTERVAL '1 minute';
  END IF;

  IF v_state.hour_reset_at <= v_now THEN
    v_state.hour_count := 0;
    v_state.hour_reset_at := v_now + INTERVAL '1 hour';
  END IF;

  IF v_state.day_reset_at <= v_now THEN
    v_state.day_count := 0;
    v_state.day_reset_at := v_now + INTERVAL '1 day';
  END IF;

  -- Check limits (most restrictive first)
  IF v_state.minute_count >= p_requests_per_minute THEN
    v_allowed := FALSE;
    v_violated_limit := 'minute';
  ELSIF v_state.hour_count >= p_requests_per_hour THEN
    v_allowed := FALSE;
    v_violated_limit := 'hour';
  ELSIF v_state.day_count >= p_requests_per_day THEN
    v_allowed := FALSE;
    v_violated_limit := 'day';
  END IF;

  -- Increment counters if allowed
  IF v_allowed THEN
    v_state.minute_count := v_state.minute_count + 1;
    v_state.hour_count := v_state.hour_count + 1;
    v_state.day_count := v_state.day_count + 1;
  END IF;

  -- Update state
  UPDATE api_rate_limits SET
    minute_count = v_state.minute_count,
    minute_reset_at = v_state.minute_reset_at,
    hour_count = v_state.hour_count,
    hour_reset_at = v_state.hour_reset_at,
    day_count = v_state.day_count,
    day_reset_at = v_state.day_reset_at,
    updated_at = v_now
  WHERE service_name = p_service_name;

  RETURN json_build_object(
    'allowed', v_allowed,
    'remaining_minute', GREATEST(0, p_requests_per_minute - v_state.minute_count),
    'remaining_hour', GREATEST(0, p_requests_per_hour - v_state.hour_count),
    'remaining_day', GREATEST(0, p_requests_per_day - v_state.day_count),
    'reset_at_minute', v_state.minute_reset_at,
    'reset_at_hour', v_state.hour_reset_at,
    'reset_at_day', v_state.day_reset_at,
    'violated_limit', v_violated_limit
  );
END;
$$ LANGUAGE plpgsql;
`;
```

---

## Circuit Breaker Pattern

```typescript
// src/lib/api-services/circuit-breaker.ts

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CircuitBreakerError } from './errors';
import { createLogger } from './logger';

type CircuitState = 'closed' | 'open' | 'half-open';

interface CircuitBreakerConfig {
  failureThreshold: number;      // Number of failures before opening
  successThreshold: number;      // Number of successes to close from half-open
  timeout: number;               // Ms before trying again (open -> half-open)
  monitoringWindow: number;      // Ms to count failures within
}

interface CircuitBreakerState {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime: Date | null;
  lastSuccessTime: Date | null;
  nextRetryTime: Date | null;
}

/**
 * Distributed circuit breaker using Supabase for state persistence
 */
export class CircuitBreaker {
  private serviceName: string;
  private config: CircuitBreakerConfig;
  private supabase: SupabaseClient;
  private logger = createLogger('circuit-breaker');
  private tableName = 'api_circuit_breakers';

  constructor(serviceName: string, config?: Partial<CircuitBreakerConfig>) {
    this.serviceName = serviceName;
    this.config = {
      failureThreshold: config?.failureThreshold ?? 5,
      successThreshold: config?.successThreshold ?? 2,
      timeout: config?.timeout ?? 30000,          // 30 seconds
      monitoringWindow: config?.monitoringWindow ?? 60000, // 1 minute
    };
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  /**
   * Check if circuit allows requests
   */
  async canExecute(requestId?: string): Promise<boolean> {
    const state = await this.getState();

    if (state.state === 'closed') {
      return true;
    }

    if (state.state === 'open') {
      // Check if timeout has passed
      if (state.nextRetryTime && new Date() >= state.nextRetryTime) {
        await this.transitionTo('half-open');
        return true;
      }
      throw new CircuitBreakerError(this.serviceName, {
        circuitState: 'open',
        failureCount: state.failureCount,
        lastFailureTime: state.lastFailureTime || undefined,
        nextRetryTime: state.nextRetryTime || undefined,
        requestId,
      });
    }

    // half-open: allow limited requests
    return true;
  }

  /**
   * Record successful request
   */
  async recordSuccess(): Promise<void> {
    const state = await this.getState();

    await this.supabase
      .from(this.tableName)
      .upsert({
        service_name: this.serviceName,
        success_count: state.successCount + 1,
        last_success_time: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    // If in half-open and reached success threshold, close circuit
    if (state.state === 'half-open' && state.successCount + 1 >= this.config.successThreshold) {
      await this.transitionTo('closed');
    }
  }

  /**
   * Record failed request
   */
  async recordFailure(error: Error): Promise<void> {
    const now = new Date();
    const state = await this.getState();

    // Reset failure count if outside monitoring window
    let newFailureCount = state.failureCount + 1;
    if (state.lastFailureTime) {
      const windowStart = new Date(now.getTime() - this.config.monitoringWindow);
      if (state.lastFailureTime < windowStart) {
        newFailureCount = 1;
      }
    }

    await this.supabase
      .from(this.tableName)
      .upsert({
        service_name: this.serviceName,
        failure_count: newFailureCount,
        last_failure_time: now.toISOString(),
        last_error_message: error.message,
        updated_at: now.toISOString(),
      });

    // Open circuit if threshold reached
    if (newFailureCount >= this.config.failureThreshold) {
      await this.transitionTo('open');
    }

    // If half-open and got failure, go back to open
    if (state.state === 'half-open') {
      await this.transitionTo('open');
    }
  }

  /**
   * Get current circuit state
   */
  async getState(): Promise<CircuitBreakerState> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('service_name', this.serviceName)
      .single();

    if (error || !data) {
      return {
        state: 'closed',
        failureCount: 0,
        successCount: 0,
        lastFailureTime: null,
        lastSuccessTime: null,
        nextRetryTime: null,
      };
    }

    return {
      state: data.state as CircuitState,
      failureCount: data.failure_count,
      successCount: data.success_count,
      lastFailureTime: data.last_failure_time ? new Date(data.last_failure_time) : null,
      lastSuccessTime: data.last_success_time ? new Date(data.last_success_time) : null,
      nextRetryTime: data.next_retry_time ? new Date(data.next_retry_time) : null,
    };
  }

  /**
   * Transition circuit to new state
   */
  private async transitionTo(newState: CircuitState): Promise<void> {
    const oldState = (await this.getState()).state;

    const updateData: Record<string, unknown> = {
      service_name: this.serviceName,
      state: newState,
      updated_at: new Date().toISOString(),
    };

    if (newState === 'open') {
      updateData.next_retry_time = new Date(Date.now() + this.config.timeout).toISOString();
      updateData.success_count = 0;
    } else if (newState === 'closed') {
      updateData.failure_count = 0;
      updateData.success_count = 0;
      updateData.next_retry_time = null;
    } else if (newState === 'half-open') {
      updateData.success_count = 0;
    }

    await this.supabase
      .from(this.tableName)
      .upsert(updateData);

    this.logger.circuitBreakerStateChange(oldState, newState, {
      serviceName: this.serviceName,
    });
  }

  /**
   * Force close the circuit (admin function)
   */
  async forceClose(): Promise<void> {
    await this.transitionTo('closed');
  }

  /**
   * Force open the circuit (admin function)
   */
  async forceOpen(): Promise<void> {
    await this.transitionTo('open');
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>, requestId?: string): Promise<T> {
    await this.canExecute(requestId);

    try {
      const result = await fn();
      await this.recordSuccess();
      return result;
    } catch (error) {
      await this.recordFailure(error as Error);
      throw error;
    }
  }
}

// SQL migration for circuit breaker table
export const CIRCUIT_BREAKER_MIGRATION = `
-- Circuit breaker state table
CREATE TABLE IF NOT EXISTS api_circuit_breakers (
  service_name TEXT PRIMARY KEY,
  state TEXT DEFAULT 'closed' CHECK (state IN ('closed', 'open', 'half-open')),
  failure_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  last_failure_time TIMESTAMPTZ,
  last_success_time TIMESTAMPTZ,
  last_error_message TEXT,
  next_retry_time TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying open circuits
CREATE INDEX IF NOT EXISTS idx_circuit_breakers_state
ON api_circuit_breakers(state) WHERE state != 'closed';
`;
```

---

## Request Deduplicator

```typescript
// src/lib/api-services/request-deduplicator.ts

import { createLogger } from './logger';

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

/**
 * Request deduplicator prevents duplicate concurrent requests
 * for the same resource. When multiple callers request the same
 * data simultaneously, only one actual request is made.
 */
export class RequestDeduplicator {
  private pendingRequests: Map<string, PendingRequest<unknown>> = new Map();
  private logger = createLogger('request-deduplicator');
  private maxAge: number;

  constructor(maxAgeMs: number = 5000) {
    this.maxAge = maxAgeMs;
  }

  /**
   * Execute a function with deduplication
   * If an identical request is already in flight, wait for that result
   */
  async dedupe<T>(key: string, fn: () => Promise<T>): Promise<T> {
    // Clean up stale entries
    this.cleanup();

    // Check for existing request
    const existing = this.pendingRequests.get(key);
    if (existing) {
      this.logger.debug('Request deduplicated, waiting for existing', { key });
      return existing.promise as Promise<T>;
    }

    // Create new request
    const promise = fn().finally(() => {
      // Remove from pending after completion
      this.pendingRequests.delete(key);
    });

    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now(),
    });

    return promise;
  }

  /**
   * Remove stale entries that might be stuck
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, request] of this.pendingRequests.entries()) {
      if (now - request.timestamp > this.maxAge) {
        this.pendingRequests.delete(key);
        this.logger.warn('Removed stale pending request', { key });
      }
    }
  }

  /**
   * Get number of pending requests
   */
  get pendingCount(): number {
    return this.pendingRequests.size;
  }

  /**
   * Clear all pending requests (use with caution)
   */
  clear(): void {
    this.pendingRequests.clear();
  }
}
```

---

## Improved Base Service Class

```typescript
// src/lib/api-services/base-service.ts

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import {
  ApiError,
  RateLimitError,
  NetworkError,
  TimeoutError,
  ValidationError
} from './errors';
import { createLogger } from './logger';
import { DistributedRateLimiter } from './rate-limiter';
import { CircuitBreaker } from './circuit-breaker';
import { RequestDeduplicator } from './request-deduplicator';

interface CacheConfig {
  enabled: boolean;
  ttlSeconds: number;
  staleWhileRevalidate?: number;  // Serve stale while fetching fresh
}

interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour?: number;
  requestsPerDay?: number;
}

interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableStatuses: number[];
}

interface ServiceConfig {
  cache: CacheConfig;
  rateLimit: RateLimitConfig;
  retry: RetryConfig;
  timeout: number;
  circuitBreaker: {
    enabled: boolean;
    failureThreshold: number;
    timeout: number;
  };
}

const DEFAULT_CONFIG: ServiceConfig = {
  cache: {
    enabled: true,
    ttlSeconds: 86400,          // 1 day
    staleWhileRevalidate: 3600, // 1 hour
  },
  rateLimit: {
    requestsPerMinute: 60,
  },
  retry: {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    retryableStatuses: [408, 429, 500, 502, 503, 504],
  },
  timeout: 30000,
  circuitBreaker: {
    enabled: true,
    failureThreshold: 5,
    timeout: 30000,
  },
};

export abstract class BaseApiService {
  protected serviceName: string;
  protected baseUrl: string;
  protected config: ServiceConfig;
  protected supabase: SupabaseClient;
  protected logger;
  protected rateLimiter: DistributedRateLimiter;
  protected circuitBreaker: CircuitBreaker;
  protected deduplicator: RequestDeduplicator;

  constructor(
    serviceName: string,
    baseUrl: string,
    config: Partial<ServiceConfig> = {}
  ) {
    this.serviceName = serviceName;
    this.baseUrl = baseUrl;
    this.config = this.mergeConfig(DEFAULT_CONFIG, config);

    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    this.logger = createLogger(serviceName);
    this.rateLimiter = new DistributedRateLimiter(serviceName, this.config.rateLimit);
    this.circuitBreaker = new CircuitBreaker(serviceName, {
      failureThreshold: this.config.circuitBreaker.failureThreshold,
      timeout: this.config.circuitBreaker.timeout,
    });
    this.deduplicator = new RequestDeduplicator();
  }

  private mergeConfig(defaults: ServiceConfig, overrides: Partial<ServiceConfig>): ServiceConfig {
    return {
      cache: { ...defaults.cache, ...overrides.cache },
      rateLimit: { ...defaults.rateLimit, ...overrides.rateLimit },
      retry: { ...defaults.retry, ...overrides.retry },
      timeout: overrides.timeout ?? defaults.timeout,
      circuitBreaker: { ...defaults.circuitBreaker, ...overrides.circuitBreaker },
    };
  }

  /**
   * Generate unique request ID for tracing
   */
  protected generateRequestId(): string {
    return `${this.serviceName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate cache key from request params
   */
  protected generateCacheKey(params: Record<string, unknown>): string {
    const sorted = Object.keys(params).sort().reduce((obj, key) => {
      obj[key] = params[key];
      return obj;
    }, {} as Record<string, unknown>);
    return crypto.createHash('md5').update(JSON.stringify(sorted)).digest('hex');
  }

  /**
   * Check cache for existing response
   */
  protected async checkCache(
    requestHash: string
  ): Promise<{ data: unknown; isStale: boolean } | null> {
    if (!this.config.cache.enabled) return null;

    const now = new Date();
    const { data, error } = await this.supabase
      .from('report_api_cache')
      .select('response_data, expires_at, created_at')
      .eq('api_name', this.serviceName)
      .eq('request_hash', requestHash)
      .single();

    if (error || !data) {
      this.logger.cacheMiss(requestHash);
      return null;
    }

    const expiresAt = new Date(data.expires_at);
    const createdAt = new Date(data.created_at);

    // Check if still fresh
    if (expiresAt > now) {
      this.logger.cacheHit(requestHash);
      return { data: data.response_data, isStale: false };
    }

    // Check if within stale-while-revalidate window
    if (this.config.cache.staleWhileRevalidate) {
      const staleUntil = new Date(
        expiresAt.getTime() + this.config.cache.staleWhileRevalidate * 1000
      );
      if (staleUntil > now) {
        this.logger.debug('Serving stale cache while revalidating', { requestHash });
        return { data: data.response_data, isStale: true };
      }
    }

    this.logger.cacheMiss(requestHash);
    return null;
  }

  /**
   * Store response in cache
   */
  protected async setCache(
    requestHash: string,
    responseData: unknown,
    metadata: {
      latitude?: number;
      longitude?: number;
      endpoint?: string;
    } = {}
  ): Promise<void> {
    if (!this.config.cache.enabled) return;

    const expiresAt = new Date(
      Date.now() + this.config.cache.ttlSeconds * 1000
    ).toISOString();

    try {
      await this.supabase.from('report_api_cache').upsert({
        api_name: this.serviceName,
        request_hash: requestHash,
        response_data: responseData,
        latitude: metadata.latitude,
        longitude: metadata.longitude,
        endpoint: metadata.endpoint,
        expires_at: expiresAt,
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      this.logger.warn('Failed to cache response', { requestHash }, err as Error);
    }
  }

  /**
   * Calculate delay for exponential backoff
   */
  protected calculateBackoff(attempt: number): number {
    const delay = Math.min(
      this.config.retry.initialDelayMs * Math.pow(this.config.retry.backoffMultiplier, attempt),
      this.config.retry.maxDelayMs
    );
    // Add jitter (0-25% of delay)
    const jitter = delay * Math.random() * 0.25;
    return Math.floor(delay + jitter);
  }

  /**
   * Sleep for specified milliseconds
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Make API request with all protections
   */
  protected async makeRequest<T>(
    endpoint: string,
    params: Record<string, unknown> = {},
    options: RequestInit = {}
  ): Promise<T> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey({ endpoint, ...params });

    // Use deduplicator for concurrent identical requests
    return this.deduplicator.dedupe(cacheKey, async () => {
      // Check circuit breaker
      if (this.config.circuitBreaker.enabled) {
        await this.circuitBreaker.canExecute(requestId);
      }

      // Check cache first
      const cached = await this.checkCache(cacheKey);
      if (cached && !cached.isStale) {
        return cached.data as T;
      }

      // If stale cache exists, return it immediately and revalidate in background
      if (cached?.isStale) {
        this.revalidateInBackground(endpoint, params, options, cacheKey, requestId);
        return cached.data as T;
      }

      // Check rate limit
      await this.rateLimiter.acquire(requestId);

      // Perform request with retries
      return this.executeWithRetry<T>(endpoint, params, options, requestId, cacheKey, startTime);
    });
  }

  /**
   * Execute request with retry logic
   */
  private async executeWithRetry<T>(
    endpoint: string,
    params: Record<string, unknown>,
    options: RequestInit,
    requestId: string,
    cacheKey: string,
    startTime: number
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.retry.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const delay = this.calculateBackoff(attempt - 1);
          this.logger.debug(`Retry attempt ${attempt}, waiting ${delay}ms`, { requestId });
          await this.sleep(delay);
        }

        const result = await this.executeSingleRequest<T>(
          endpoint, params, options, requestId
        );

        // Record success for circuit breaker
        if (this.config.circuitBreaker.enabled) {
          await this.circuitBreaker.recordSuccess();
        }

        // Cache the result
        const lat = params.latitude || params.lat;
        const lng = params.longitude || params.lng || params.lon;
        await this.setCache(cacheKey, result, {
          latitude: lat as number | undefined,
          longitude: lng as number | undefined,
          endpoint,
        });

        const duration = Date.now() - startTime;
        this.logger.requestEnd(endpoint, duration, 200, { requestId, cacheHit: false });

        return result;
      } catch (error) {
        lastError = error as Error;

        // Check if retryable
        if (error instanceof ApiError && !error.retryable) {
          throw error;
        }

        // Don't retry on last attempt
        if (attempt === this.config.retry.maxRetries) {
          break;
        }

        this.logger.warn(`Request failed, will retry`, {
          requestId,
          attempt,
          error: lastError.message,
        });
      }
    }

    // Record failure for circuit breaker
    if (this.config.circuitBreaker.enabled && lastError) {
      await this.circuitBreaker.recordFailure(lastError);
    }

    throw lastError;
  }

  /**
   * Execute a single HTTP request
   */
  private async executeSingleRequest<T>(
    endpoint: string,
    params: Record<string, unknown>,
    options: RequestInit,
    requestId: string
  ): Promise<T> {
    // Build URL
    const url = new URL(endpoint, this.baseUrl);

    // Add query params for GET requests
    if (!options.method || options.method === 'GET') {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    this.logger.requestStart(endpoint, { requestId });

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url.toString(), {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId,
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      // Handle rate limit response
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const retryAfterMs = retryAfter
          ? parseInt(retryAfter) * 1000
          : 60000;
        throw new RateLimitError(this.serviceName, {
          retryAfterMs,
          requestId,
        });
      }

      // Handle other errors
      if (!response.ok) {
        throw new ApiError(
          `${this.serviceName} API error: ${response.status} ${response.statusText}`,
          this.serviceName,
          response.status,
          { requestId }
        );
      }

      const data = await response.json();
      return data as T;

    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof ApiError || error instanceof RateLimitError) {
        throw error;
      }

      // Handle abort (timeout)
      if ((error as Error).name === 'AbortError') {
        throw new TimeoutError(this.serviceName, this.config.timeout, { requestId });
      }

      // Handle network errors
      throw new NetworkError(
        this.serviceName,
        (error as Error).message,
        { originalError: error as Error, requestId }
      );
    }
  }

  /**
   * Revalidate cache in background
   */
  private async revalidateInBackground(
    endpoint: string,
    params: Record<string, unknown>,
    options: RequestInit,
    cacheKey: string,
    requestId: string
  ): Promise<void> {
    // Run in background without awaiting
    this.executeSingleRequest(endpoint, params, options, requestId)
      .then(async (result) => {
        const lat = params.latitude || params.lat;
        const lng = params.longitude || params.lng || params.lon;
        await this.setCache(cacheKey, result, {
          latitude: lat as number | undefined,
          longitude: lng as number | undefined,
          endpoint,
        });
        this.logger.debug('Background revalidation complete', { cacheKey });
      })
      .catch((error) => {
        this.logger.warn('Background revalidation failed', { cacheKey }, error);
      });
  }

  /**
   * Get service health status
   */
  async getHealth(): Promise<{
    service: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    circuitBreaker: string;
    rateLimitRemaining: number;
    lastError?: string;
  }> {
    const cbState = await this.circuitBreaker.getState();
    const rlState = await this.rateLimiter.getState();

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (cbState.state === 'open') {
      status = 'unhealthy';
    } else if (cbState.state === 'half-open' || cbState.failureCount > 0) {
      status = 'degraded';
    }

    return {
      service: this.serviceName,
      status,
      circuitBreaker: cbState.state,
      rateLimitRemaining: rlState
        ? Math.min(
            this.config.rateLimit.requestsPerMinute - rlState.minuteCount,
            (this.config.rateLimit.requestsPerHour || Infinity) - rlState.hourCount,
            (this.config.rateLimit.requestsPerDay || Infinity) - rlState.dayCount
          )
        : this.config.rateLimit.requestsPerMinute,
      lastError: cbState.lastFailureTime
        ? `Last failure: ${cbState.lastFailureTime.toISOString()}`
        : undefined,
    };
  }
}
```

---

## FEMA Flood Zone Service (Improved)

```typescript
// src/lib/api-services/fema-service.ts

import { BaseApiService } from './base-service';
import { ApiError, ValidationError } from './errors';

interface FEMAFloodZone {
  zone: string;
  zoneDescription: string;
  floodRisk: 'high' | 'moderate' | 'low' | 'minimal';
  panelNumber?: string;
  effectiveDate?: string;
  communityId?: string;
  baseFloodElevation?: number;
  insuranceRequired: boolean;
  rawResponse?: unknown;
}

interface FEMAResponse {
  features?: Array<{
    attributes: {
      FLD_ZONE?: string;
      ZONE_SUBTY?: string;
      SFHA_TF?: string;
      STATIC_BFE?: number;
      DFIRM_ID?: string;
      EFF_DATE?: string;
    };
  }>;
  error?: {
    code: number;
    message: string;
  };
}

export class FEMAService extends BaseApiService {
  constructor() {
    super(
      'fema',
      'https://hazards.fema.gov/gis/nfhl/rest/services/public/NFHL/MapServer',
      {
        cache: { enabled: true, ttlSeconds: 604800, staleWhileRevalidate: 86400 }, // 7 days, 1 day stale
        rateLimit: { requestsPerMinute: 30, requestsPerHour: 500 },
        retry: {
          maxRetries: 3,
          initialDelayMs: 2000,
          maxDelayMs: 30000,
          backoffMultiplier: 2,
          retryableStatuses: [408, 429, 500, 502, 503, 504],
        },
        timeout: 30000,
        circuitBreaker: { enabled: true, failureThreshold: 5, timeout: 60000 },
      }
    );
  }

  async getFloodZone(latitude: number, longitude: number): Promise<FEMAFloodZone> {
    // Validate coordinates
    if (!this.isValidCoordinate(latitude, longitude)) {
      throw new ValidationError(this.serviceName, [
        `Invalid coordinates: lat=${latitude}, lng=${longitude}`,
      ]);
    }

    try {
      const geometryParam = JSON.stringify({
        x: longitude,
        y: latitude,
        spatialReference: { wkid: 4326 },
      });

      const data = await this.makeRequest<FEMAResponse>('/28/query', {
        geometry: geometryParam,
        geometryType: 'esriGeometryPoint',
        spatialRel: 'esriSpatialRelIntersects',
        outFields: 'FLD_ZONE,ZONE_SUBTY,SFHA_TF,STATIC_BFE,DFIRM_ID,EFF_DATE',
        returnGeometry: false,
        f: 'json',
        latitude,
        longitude,
      });

      // Check for ESRI error response
      if (data.error) {
        throw new ApiError(
          `FEMA API error: ${data.error.message}`,
          this.serviceName,
          data.error.code
        );
      }

      return this.parseFloodZoneResponse(data);
    } catch (error) {
      // Return safe default for non-critical errors
      if (error instanceof ValidationError) {
        throw error;
      }

      this.logger.warn('FEMA request failed, returning default', {
        latitude,
        longitude,
      }, error as Error);

      // Return minimal/unknown zone as fallback
      return {
        zone: 'D',
        zoneDescription: 'Undetermined Risk - Unable to retrieve data',
        floodRisk: 'minimal',
        insuranceRequired: false,
      };
    }
  }

  private parseFloodZoneResponse(data: FEMAResponse): FEMAFloodZone {
    if (!data.features || data.features.length === 0) {
      return {
        zone: 'X',
        zoneDescription: 'Area of Minimal Flood Hazard',
        floodRisk: 'minimal',
        insuranceRequired: false,
      };
    }

    const feature = data.features[0].attributes;
    const zone = feature.FLD_ZONE || 'X';

    return {
      zone,
      zoneDescription: this.getZoneDescription(zone),
      floodRisk: this.calculateFloodRisk(zone),
      panelNumber: feature.DFIRM_ID,
      effectiveDate: feature.EFF_DATE,
      baseFloodElevation: feature.STATIC_BFE,
      insuranceRequired: feature.SFHA_TF === 'T',
      rawResponse: feature,
    };
  }

  private isValidCoordinate(lat: number, lng: number): boolean {
    return (
      typeof lat === 'number' &&
      typeof lng === 'number' &&
      !isNaN(lat) &&
      !isNaN(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    );
  }

  private getZoneDescription(zone: string): string {
    const descriptions: Record<string, string> = {
      'A': 'High Risk - 100-year floodplain, no BFE determined',
      'AE': 'High Risk - 100-year floodplain with Base Flood Elevation',
      'AH': 'High Risk - Shallow flooding (1-3 ft), ponding',
      'AO': 'High Risk - Sheet flow on sloping terrain',
      'AR': 'High Risk - Temporary increased risk due to levee restoration',
      'A99': 'High Risk - Protected by levee under construction',
      'V': 'High Risk - Coastal with velocity hazard (waves)',
      'VE': 'High Risk - Coastal with velocity and BFE',
      'X': 'Moderate to Low Risk - Outside 100-year floodplain',
      'X500': 'Moderate Risk - 500-year floodplain',
      'B': 'Moderate Risk - 500-year floodplain (older maps)',
      'C': 'Minimal Risk - Outside 500-year floodplain',
      'D': 'Undetermined Risk - Flood hazard not analyzed',
    };
    return descriptions[zone] || `Unknown Zone (${zone})`;
  }

  private calculateFloodRisk(zone: string): 'high' | 'moderate' | 'low' | 'minimal' {
    const highRiskZones = ['A', 'AE', 'AH', 'AO', 'AR', 'A99', 'V', 'VE'];
    const moderateRiskZones = ['B', 'X500'];
    const lowRiskZones = ['C', 'X'];

    if (highRiskZones.includes(zone)) return 'high';
    if (moderateRiskZones.includes(zone)) return 'moderate';
    if (lowRiskZones.includes(zone)) return 'low';
    return 'minimal';
  }
}
```

---

## Census Bureau Service (Improved)

```typescript
// src/lib/api-services/census-service.ts

import { BaseApiService } from './base-service';
import { ApiError, ValidationError, NetworkError } from './errors';

interface Demographics {
  population: number;
  medianAge: number;
  medianHouseholdIncome: number;
  medianHomeValue: number;
  ownerOccupiedPct: number;
  renterOccupiedPct: number;
  vacancyRate: number;
  educationBachelorsPct: number;
  unemploymentRate: number;
  povertyRate: number;
  tractId?: string;
  countyName?: string;
  stateName?: string;
  dataYear: number;
}

interface GeographyResult {
  state: string;
  county: string;
  tract: string;
  countyName?: string;
  stateName?: string;
}

interface CensusAPIResponse {
  [index: number]: (string | number)[];
}

export class CensusService extends BaseApiService {
  private apiKey: string;
  private dataYear = 2022; // Latest ACS 5-year estimates

  constructor() {
    super(
      'census',
      'https://api.census.gov/data',
      {
        cache: { enabled: true, ttlSeconds: 2592000, staleWhileRevalidate: 604800 }, // 30 days, 7 days stale
        rateLimit: { requestsPerMinute: 20, requestsPerHour: 500, requestsPerDay: 5000 },
        retry: {
          maxRetries: 2,
          initialDelayMs: 1000,
          maxDelayMs: 10000,
          backoffMultiplier: 2,
          retryableStatuses: [408, 429, 500, 502, 503, 504],
        },
        timeout: 30000,
        circuitBreaker: { enabled: true, failureThreshold: 5, timeout: 60000 },
      }
    );
    this.apiKey = process.env.CENSUS_API_KEY || '';
  }

  async getDemographics(latitude: number, longitude: number): Promise<Demographics> {
    // Validate coordinates
    if (!this.isValidCoordinate(latitude, longitude)) {
      throw new ValidationError(this.serviceName, [
        `Invalid coordinates: lat=${latitude}, lng=${longitude}`,
      ]);
    }

    // Get census tract from coordinates
    const geoData = await this.getGeography(latitude, longitude);
    if (!geoData) {
      throw new ApiError(
        'Could not determine census tract for coordinates',
        this.serviceName,
        404
      );
    }

    // Get ACS 5-year estimates
    try {
      const variables = [
        'B01003_001E', // Total population
        'B01002_001E', // Median age
        'B19013_001E', // Median household income
        'B25077_001E', // Median home value
        'B25003_002E', // Owner occupied
        'B25003_003E', // Renter occupied
        'B25002_003E', // Vacant
        'B15003_022E', // Bachelor's degree
        'B15003_001E', // Total education
        'B23025_005E', // Unemployed
        'B23025_002E', // Labor force
        'B17001_002E', // Below poverty
        'B17001_001E', // Total for poverty
      ].join(',');

      const data = await this.makeRequest<CensusAPIResponse>(
        `/${this.dataYear}/acs/acs5`,
        {
          get: variables,
          for: `tract:${geoData.tract}`,
          in: `state:${geoData.state}+county:${geoData.county}`,
          key: this.apiKey,
          latitude,
          longitude,
        }
      );

      return this.parseDemographicsResponse(data, geoData);
    } catch (error) {
      if (error instanceof ApiError || error instanceof ValidationError) {
        throw error;
      }

      this.logger.error('Failed to fetch demographics', {
        latitude,
        longitude,
        tract: geoData.tract,
      }, error as Error);

      // Return partial data with defaults
      return this.getDefaultDemographics(geoData);
    }
  }

  private async getGeography(
    lat: number,
    lng: number
  ): Promise<GeographyResult | null> {
    const cacheKey = this.generateCacheKey({ type: 'geography', lat, lng });

    try {
      const response = await fetch(
        `https://geocoding.geo.census.gov/geocoder/geographies/coordinates?x=${lng}&y=${lat}&benchmark=Public_AR_Current&vintage=Current_Current&format=json`,
        { signal: AbortSignal.timeout(10000) }
      );

      if (!response.ok) {
        throw new ApiError(
          `Census geocoder error: ${response.status}`,
          'census-geocoder',
          response.status
        );
      }

      const data = await response.json();
      const geo = data.result?.geographies?.['Census Tracts']?.[0];

      if (!geo) {
        this.logger.warn('No census tract found for coordinates', { lat, lng });
        return null;
      }

      return {
        state: geo.STATE,
        county: geo.COUNTY,
        tract: geo.TRACT,
        countyName: geo.BASENAME,
        stateName: geo.STATENAME,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new NetworkError(
        'census-geocoder',
        (error as Error).message,
        { originalError: error as Error }
      );
    }
  }

  private parseDemographicsResponse(
    data: CensusAPIResponse,
    geoData: GeographyResult
  ): Demographics {
    // First row is headers, second row is values
    if (!data || !data[1] || data[1].length < 13) {
      throw new ValidationError(this.serviceName, [
        'Invalid response format from Census API',
      ]);
    }

    const values = data[1];

    // Parse values with safety checks
    const parseNum = (val: string | number, defaultVal = 0): number => {
      const num = typeof val === 'string' ? parseInt(val, 10) : val;
      return isNaN(num) || num < 0 ? defaultVal : num;
    };

    const parseFloat_ = (val: string | number, defaultVal = 0): number => {
      const num = typeof val === 'string' ? parseFloat(val) : val;
      return isNaN(num) || num < 0 ? defaultVal : num;
    };

    const ownerOccupied = parseNum(values[4]);
    const renterOccupied = parseNum(values[5]);
    const vacant = parseNum(values[6]);
    const totalHousing = ownerOccupied + renterOccupied + vacant;

    const bachelors = parseNum(values[7]);
    const totalEducation = parseNum(values[8]);

    const unemployed = parseNum(values[9]);
    const laborForce = parseNum(values[10]);

    const belowPoverty = parseNum(values[11]);
    const totalPoverty = parseNum(values[12]);

    return {
      population: parseNum(values[0]),
      medianAge: parseFloat_(values[1]),
      medianHouseholdIncome: parseNum(values[2]),
      medianHomeValue: parseNum(values[3]),
      ownerOccupiedPct: this.calculatePct(ownerOccupied, ownerOccupied + renterOccupied),
      renterOccupiedPct: this.calculatePct(renterOccupied, ownerOccupied + renterOccupied),
      vacancyRate: this.calculatePct(vacant, totalHousing),
      educationBachelorsPct: this.calculatePct(bachelors, totalEducation),
      unemploymentRate: this.calculatePct(unemployed, laborForce),
      povertyRate: this.calculatePct(belowPoverty, totalPoverty),
      tractId: geoData.tract,
      countyName: geoData.countyName,
      stateName: geoData.stateName,
      dataYear: this.dataYear,
    };
  }

  private getDefaultDemographics(geoData: GeographyResult): Demographics {
    return {
      population: 0,
      medianAge: 0,
      medianHouseholdIncome: 0,
      medianHomeValue: 0,
      ownerOccupiedPct: 0,
      renterOccupiedPct: 0,
      vacancyRate: 0,
      educationBachelorsPct: 0,
      unemploymentRate: 0,
      povertyRate: 0,
      tractId: geoData.tract,
      countyName: geoData.countyName,
      stateName: geoData.stateName,
      dataYear: this.dataYear,
    };
  }

  private isValidCoordinate(lat: number, lng: number): boolean {
    return (
      typeof lat === 'number' &&
      typeof lng === 'number' &&
      !isNaN(lat) &&
      !isNaN(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    );
  }

  private calculatePct(numerator: number, denominator: number): number {
    if (denominator === 0) return 0;
    return Math.round((numerator / denominator) * 1000) / 10;
  }
}
```

---

## Health Check Utilities

```typescript
// src/lib/api-services/health.ts

import { FEMAService } from './fema-service';
import { USGSService } from './usgs-service';
import { NASAFIRMSService } from './nasa-firms-service';
import { CensusService } from './census-service';
import { OpenElevationService } from './open-elevation-service';
import { RealtorService } from './realtor-service';
import { GoogleMapsService } from './google-maps-service';
import { createLogger } from './logger';

interface ServiceHealth {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  circuitBreaker: string;
  rateLimitRemaining: number;
  lastError?: string;
  responseTimeMs?: number;
}

interface HealthCheckResult {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: ServiceHealth[];
  summary: {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
  };
}

const logger = createLogger('health-check');

/**
 * Check health of all API services
 */
export async function checkAllServicesHealth(): Promise<HealthCheckResult> {
  const services = [
    new FEMAService(),
    new USGSService(),
    new NASAFIRMSService(),
    new CensusService(),
    new OpenElevationService(),
    new RealtorService(),
    new GoogleMapsService(),
  ];

  const healthChecks = await Promise.all(
    services.map(async (service) => {
      const start = Date.now();
      try {
        const health = await service.getHealth();
        return {
          ...health,
          responseTimeMs: Date.now() - start,
        };
      } catch (error) {
        logger.error(`Health check failed for ${service.constructor.name}`, {}, error as Error);
        return {
          service: service.constructor.name,
          status: 'unhealthy' as const,
          circuitBreaker: 'unknown',
          rateLimitRemaining: 0,
          lastError: (error as Error).message,
          responseTimeMs: Date.now() - start,
        };
      }
    })
  );

  const summary = {
    total: healthChecks.length,
    healthy: healthChecks.filter(h => h.status === 'healthy').length,
    degraded: healthChecks.filter(h => h.status === 'degraded').length,
    unhealthy: healthChecks.filter(h => h.status === 'unhealthy').length,
  };

  let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  if (summary.unhealthy > 0) {
    overall = 'unhealthy';
  } else if (summary.degraded > 0) {
    overall = 'degraded';
  }

  return {
    overall,
    timestamp: new Date().toISOString(),
    services: healthChecks,
    summary,
  };
}

/**
 * Check health of a specific service
 */
export async function checkServiceHealth(serviceName: string): Promise<ServiceHealth | null> {
  const serviceMap: Record<string, new () => { getHealth(): Promise<ServiceHealth> }> = {
    fema: FEMAService,
    usgs: USGSService,
    nasa_firms: NASAFIRMSService,
    census: CensusService,
    open_elevation: OpenElevationService,
    realtor: RealtorService,
    google_maps: GoogleMapsService,
  };

  const ServiceClass = serviceMap[serviceName.toLowerCase()];
  if (!ServiceClass) {
    return null;
  }

  const service = new ServiceClass();
  return service.getHealth();
}

/**
 * Perform a deep health check with actual API calls
 */
export async function deepHealthCheck(
  testCoordinates = { lat: 40.7128, lng: -74.0060 } // NYC
): Promise<{
  overall: 'healthy' | 'degraded' | 'unhealthy';
  services: Array<{
    service: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    responseTimeMs: number;
    error?: string;
  }>;
}> {
  const services = [
    { name: 'fema', service: new FEMAService(), method: 'getFloodZone' },
    { name: 'usgs', service: new USGSService(), method: 'getEarthquakeRisk' },
    { name: 'census', service: new CensusService(), method: 'getDemographics' },
    { name: 'elevation', service: new OpenElevationService(), method: 'getElevation' },
  ];

  const results = await Promise.all(
    services.map(async ({ name, service, method }) => {
      const start = Date.now();
      try {
        // @ts-expect-error - dynamic method call
        await service[method](testCoordinates.lat, testCoordinates.lng);
        return {
          service: name,
          status: 'healthy' as const,
          responseTimeMs: Date.now() - start,
        };
      } catch (error) {
        const responseTimeMs = Date.now() - start;
        logger.warn(`Deep health check failed for ${name}`, { responseTimeMs }, error as Error);
        return {
          service: name,
          status: responseTimeMs > 10000 ? 'unhealthy' as const : 'degraded' as const,
          responseTimeMs,
          error: (error as Error).message,
        };
      }
    })
  );

  const unhealthyCount = results.filter(r => r.status === 'unhealthy').length;
  const degradedCount = results.filter(r => r.status === 'degraded').length;

  let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  if (unhealthyCount > results.length / 2) {
    overall = 'unhealthy';
  } else if (unhealthyCount > 0 || degradedCount > 0) {
    overall = 'degraded';
  }

  return { overall, services: results };
}
```

---

## Health Check API Endpoint

```typescript
// src/app/api/health/route.ts

import { NextResponse } from 'next/server';
import { checkAllServicesHealth, deepHealthCheck } from '@/lib/api-services/health';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const deep = searchParams.get('deep') === 'true';

  try {
    if (deep) {
      const result = await deepHealthCheck();
      return NextResponse.json(result, {
        status: result.overall === 'healthy' ? 200 :
                result.overall === 'degraded' ? 200 : 503,
      });
    }

    const result = await checkAllServicesHealth();
    return NextResponse.json(result, {
      status: result.overall === 'healthy' ? 200 :
              result.overall === 'degraded' ? 200 : 503,
    });
  } catch (error) {
    return NextResponse.json({
      overall: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: (error as Error).message,
    }, { status: 503 });
  }
}

// HEAD request for simple health probe
export async function HEAD() {
  try {
    const result = await checkAllServicesHealth();
    return new Response(null, {
      status: result.overall === 'unhealthy' ? 503 : 200,
    });
  } catch {
    return new Response(null, { status: 503 });
  }
}
```

---

## Service Index

```typescript
// src/lib/api-services/index.ts

// Error classes
export {
  ApiError,
  RateLimitError,
  CircuitBreakerError,
  NetworkError,
  TimeoutError,
  ValidationError,
} from './errors';

// Utilities
export { createLogger } from './logger';
export { DistributedRateLimiter, RATE_LIMIT_MIGRATION } from './rate-limiter';
export { CircuitBreaker, CIRCUIT_BREAKER_MIGRATION } from './circuit-breaker';
export { RequestDeduplicator } from './request-deduplicator';

// Base class
export { BaseApiService } from './base-service';

// Services
export { FEMAService } from './fema-service';
export { USGSService } from './usgs-service';
export { NASAFIRMSService } from './nasa-firms-service';
export { CensusService } from './census-service';
export { OpenElevationService } from './open-elevation-service';
export { RealtorService } from './realtor-service';
export { GoogleMapsService } from './google-maps-service';

// Health checks
export {
  checkAllServicesHealth,
  checkServiceHealth,
  deepHealthCheck,
} from './health';

// Singleton instances with lazy initialization
let femaService: FEMAService | null = null;
let usgsService: USGSService | null = null;
let nasaService: NASAFIRMSService | null = null;
let censusService: CensusService | null = null;
let elevationService: OpenElevationService | null = null;
let realtorService: RealtorService | null = null;
let googleMapsService: GoogleMapsService | null = null;

export function getFEMAService(): FEMAService {
  if (!femaService) femaService = new FEMAService();
  return femaService;
}

export function getUSGSService(): USGSService {
  if (!usgsService) usgsService = new USGSService();
  return usgsService;
}

export function getNASAFIRMSService(): NASAFIRMSService {
  if (!nasaService) nasaService = new NASAFIRMSService();
  return nasaService;
}

export function getCensusService(): CensusService {
  if (!censusService) censusService = new CensusService();
  return censusService;
}

export function getOpenElevationService(): OpenElevationService {
  if (!elevationService) elevationService = new OpenElevationService();
  return elevationService;
}

export function getRealtorService(): RealtorService {
  if (!realtorService) realtorService = new RealtorService();
  return realtorService;
}

export function getGoogleMapsService(): GoogleMapsService {
  if (!googleMapsService) googleMapsService = new GoogleMapsService();
  return googleMapsService;
}

// Reset all services (useful for testing)
export function resetAllServices(): void {
  femaService = null;
  usgsService = null;
  nasaService = null;
  censusService = null;
  elevationService = null;
  realtorService = null;
  googleMapsService = null;
}
```

---

## Database Migrations

Run these migrations to set up the required tables:

```sql
-- Migration: Create API infrastructure tables

-- 1. Rate limit tracking table
CREATE TABLE IF NOT EXISTS api_rate_limits (
  service_name TEXT PRIMARY KEY,
  minute_count INTEGER DEFAULT 0,
  minute_reset_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '1 minute',
  hour_count INTEGER DEFAULT 0,
  hour_reset_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '1 hour',
  day_count INTEGER DEFAULT 0,
  day_reset_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '1 day',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Circuit breaker state table
CREATE TABLE IF NOT EXISTS api_circuit_breakers (
  service_name TEXT PRIMARY KEY,
  state TEXT DEFAULT 'closed' CHECK (state IN ('closed', 'open', 'half-open')),
  failure_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  last_failure_time TIMESTAMPTZ,
  last_success_time TIMESTAMPTZ,
  last_error_message TEXT,
  next_retry_time TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. API response cache table (if not exists)
CREATE TABLE IF NOT EXISTS report_api_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_name TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  endpoint TEXT,
  response_data JSONB NOT NULL,
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(api_name, request_hash)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_api_cache_expiry
ON report_api_cache(api_name, expires_at);

CREATE INDEX IF NOT EXISTS idx_api_cache_location
ON report_api_cache(latitude, longitude)
WHERE latitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_circuit_breakers_state
ON api_circuit_breakers(state) WHERE state != 'closed';

-- 4. Rate limit check function
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_service_name TEXT,
  p_requests_per_minute INTEGER,
  p_requests_per_hour INTEGER,
  p_requests_per_day INTEGER
)
RETURNS JSON AS $$
DECLARE
  v_state api_rate_limits%ROWTYPE;
  v_now TIMESTAMPTZ := NOW();
  v_allowed BOOLEAN := TRUE;
  v_violated_limit TEXT := NULL;
BEGIN
  -- Get or create state with row lock
  INSERT INTO api_rate_limits (service_name)
  VALUES (p_service_name)
  ON CONFLICT (service_name) DO UPDATE SET updated_at = NOW()
  RETURNING * INTO v_state;

  -- Reset expired windows
  IF v_state.minute_reset_at <= v_now THEN
    v_state.minute_count := 0;
    v_state.minute_reset_at := v_now + INTERVAL '1 minute';
  END IF;

  IF v_state.hour_reset_at <= v_now THEN
    v_state.hour_count := 0;
    v_state.hour_reset_at := v_now + INTERVAL '1 hour';
  END IF;

  IF v_state.day_reset_at <= v_now THEN
    v_state.day_count := 0;
    v_state.day_reset_at := v_now + INTERVAL '1 day';
  END IF;

  -- Check limits (most restrictive first)
  IF v_state.minute_count >= p_requests_per_minute THEN
    v_allowed := FALSE;
    v_violated_limit := 'minute';
  ELSIF v_state.hour_count >= p_requests_per_hour THEN
    v_allowed := FALSE;
    v_violated_limit := 'hour';
  ELSIF v_state.day_count >= p_requests_per_day THEN
    v_allowed := FALSE;
    v_violated_limit := 'day';
  END IF;

  -- Increment counters if allowed
  IF v_allowed THEN
    v_state.minute_count := v_state.minute_count + 1;
    v_state.hour_count := v_state.hour_count + 1;
    v_state.day_count := v_state.day_count + 1;
  END IF;

  -- Update state
  UPDATE api_rate_limits SET
    minute_count = v_state.minute_count,
    minute_reset_at = v_state.minute_reset_at,
    hour_count = v_state.hour_count,
    hour_reset_at = v_state.hour_reset_at,
    day_count = v_state.day_count,
    day_reset_at = v_state.day_reset_at,
    updated_at = v_now
  WHERE service_name = p_service_name;

  RETURN json_build_object(
    'allowed', v_allowed,
    'remaining_minute', GREATEST(0, p_requests_per_minute - v_state.minute_count),
    'remaining_hour', GREATEST(0, p_requests_per_hour - v_state.hour_count),
    'remaining_day', GREATEST(0, p_requests_per_day - v_state.day_count),
    'reset_at_minute', v_state.minute_reset_at,
    'reset_at_hour', v_state.hour_reset_at,
    'reset_at_day', v_state.day_reset_at,
    'violated_limit', v_violated_limit
  );
END;
$$ LANGUAGE plpgsql;

-- 5. Cache cleanup function (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM report_api_cache
  WHERE expires_at < NOW() - INTERVAL '1 hour';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
```

---

## Environment Variables

Add to `.env.local`:

```env
# API Keys
CENSUS_API_KEY=your_census_api_key
NASA_FIRMS_MAP_KEY=your_nasa_firms_key
GOOGLE_MAPS_API_KEY=your_google_maps_key
RAPIDAPI_KEY=your_rapidapi_key

# Supabase (existing)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Logging
LOG_LEVEL=info  # debug, info, warn, error
```

---

## Verification Steps

1. **Run database migrations** - Create required tables and functions
2. **Test error classes** - Verify custom errors work as expected
3. **Test rate limiter** - Make rapid requests and verify limits enforced
4. **Test circuit breaker** - Simulate failures and verify circuit opens
5. **Test caching** - Verify cache hits and stale-while-revalidate
6. **Test retry logic** - Simulate transient failures
7. **Test request deduplication** - Make concurrent identical requests
8. **Test health endpoints** - Verify `/api/health` and `/api/health?deep=true`
9. **Verify logging** - Check structured logs are being produced

---

## Summary of Improvements

| Feature | Before | After |
|---------|--------|-------|
| Error Handling | Basic Error class | Custom error hierarchy (ApiError, RateLimitError, CircuitBreakerError, NetworkError, TimeoutError, ValidationError) |
| Rate Limiting | In-memory (doesn't work in serverless) | Distributed via Supabase with minute/hour/day windows |
| Circuit Breaker | None | Full implementation with state persistence |
| Retry Logic | None | Exponential backoff with jitter |
| Logging | console.log | Structured JSON logging with context |
| Caching | Basic | Stale-while-revalidate support |
| Request Deduplication | None | Prevents duplicate concurrent requests |
| Health Checks | None | Comprehensive health endpoints |
| Service Configuration | Hardcoded | Configurable with sensible defaults |

---

## Next Phase

After completing Phase 2, proceed to [Phase 3: Report UI Components](./phase-3-ui-components.md)

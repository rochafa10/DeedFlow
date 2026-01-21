/**
 * Base API Service
 *
 * Provides a robust foundation for API services with:
 * - In-memory caching with TTL
 * - Retry logic with exponential backoff
 * - Circuit breaker pattern
 * - Rate limiting
 * - Request deduplication
 * - Comprehensive logging
 */

import {
  ApiError,
  RateLimitError,
  CircuitBreakerError,
  TimeoutError,
  NetworkError,
  getNetworkErrorType,
} from './errors';

import {
  ApiConfig,
  CacheConfig,
  CircuitBreakerConfig,
  RateLimitConfig,
  RequestOptions,
  ApiResponse,
  CacheEntry,
  CacheStats,
  CircuitState,
  CircuitBreakerState,
  RateLimitInfo,
  RateLimiterState,
  RequestLogEntry,
  HttpMethod,
  DEFAULT_API_CONFIG,
  DEFAULT_CACHE_CONFIG,
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
  DEFAULT_RATE_LIMIT_CONFIG,
} from './types';

/**
 * Generates a unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Calculates approximate size of data in bytes
 */
function approximateSize(data: unknown): number {
  return new Blob([JSON.stringify(data)]).size;
}

/**
 * Logger interface for API operations
 */
interface Logger {
  debug(message: string, data?: Record<string, unknown>): void;
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
}

/**
 * Default console logger implementation
 */
const defaultLogger: Logger = {
  debug: (message, data) => console.debug(`[API] ${message}`, data || ''),
  info: (message, data) => console.info(`[API] ${message}`, data || ''),
  warn: (message, data) => console.warn(`[API] ${message}`, data || ''),
  error: (message, data) => console.error(`[API] ${message}`, data || ''),
};

/**
 * Base API Service class
 *
 * Provides a comprehensive foundation for building API service clients with
 * built-in caching, retry logic, circuit breaker pattern, and rate limiting.
 *
 * **Important Design Note:** This implementation uses in-memory state for
 * caching, rate limiting, and circuit breaker. This is suitable for:
 * - Single-server deployments
 * - Development and testing
 * - Short-lived serverless functions with low concurrency
 *
 * For distributed deployments (multiple servers, high-concurrency serverless),
 * consider implementing Supabase-backed distributed state in a future phase.
 *
 * @see Phase 2B (future) for distributed state implementation
 */
export class BaseApiService {
  /** Service configuration */
  protected config: ApiConfig;

  /** Cache configuration */
  protected cacheConfig: CacheConfig;

  /** Circuit breaker configuration */
  protected circuitBreakerConfig: CircuitBreakerConfig;

  /** Rate limit configuration */
  protected rateLimitConfig: RateLimitConfig;

  /** In-memory cache storage */
  protected cache: Map<string, CacheEntry<unknown>>;

  /** Current circuit breaker state */
  protected circuitState: CircuitState;

  /** Count of consecutive failures */
  protected failureCount: number;

  /** Count of consecutive successes in half-open state */
  protected successCount: number;

  /** Timestamp of last failure */
  protected lastFailureTime: number;

  /** Number of requests blocked by open circuit */
  protected blockedRequests: number;

  /** Rate limiter state */
  protected rateLimiterState: RateLimiterState;

  /** In-flight request promises for deduplication */
  protected inFlightRequests: Map<string, Promise<ApiResponse<unknown>>>;

  /** Cache statistics */
  protected cacheHits: number = 0;
  protected cacheMisses: number = 0;

  /** Request log for debugging */
  protected requestLog: RequestLogEntry[] = [];
  protected maxLogSize: number = 100;

  /** Logger instance */
  protected logger: Logger;

  /**
   * Creates a new BaseApiService instance
   *
   * @param config - API configuration
   * @param cacheConfig - Optional cache configuration
   * @param circuitBreakerConfig - Optional circuit breaker configuration
   * @param rateLimitConfig - Optional rate limit configuration
   * @param logger - Optional custom logger
   */
  constructor(
    config: Partial<ApiConfig> & { baseUrl: string },
    cacheConfig?: Partial<CacheConfig>,
    circuitBreakerConfig?: Partial<CircuitBreakerConfig>,
    rateLimitConfig?: Partial<RateLimitConfig>,
    logger?: Logger
  ) {
    // Merge with default configurations
    this.config = { ...DEFAULT_API_CONFIG, ...config };
    this.cacheConfig = { ...DEFAULT_CACHE_CONFIG, ...cacheConfig };
    this.circuitBreakerConfig = { ...DEFAULT_CIRCUIT_BREAKER_CONFIG, ...circuitBreakerConfig };
    this.rateLimitConfig = { ...DEFAULT_RATE_LIMIT_CONFIG, ...rateLimitConfig };

    // Initialize state
    this.cache = new Map();
    this.circuitState = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
    this.blockedRequests = 0;
    this.inFlightRequests = new Map();
    this.logger = logger || defaultLogger;

    // Initialize rate limiter with full token bucket
    this.rateLimiterState = {
      tokens: this.rateLimitConfig.burstSize,
      lastRefill: Date.now(),
      queuedRequests: 0,
    };

    this.logger.info(`BaseApiService initialized`, {
      baseUrl: this.config.baseUrl,
      serviceName: this.config.serviceName,
    });
  }

  // ============================================================================
  // Public Methods
  // ============================================================================

  /**
   * Makes an API request with caching, retry, and circuit breaker support
   *
   * @param endpoint - API endpoint (will be appended to baseUrl)
   * @param options - Request options
   * @returns Promise resolving to the API response
   */
  protected async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const requestId = generateRequestId();
    const startTime = Date.now();
    const method = options.method || 'GET';
    const fullUrl = this.buildUrl(endpoint, options.params);
    const cacheKey = this.getCacheKey(endpoint, options);

    this.logger.debug(`Request started`, { requestId, method, endpoint });

    try {
      // Check circuit breaker
      this.checkCircuitBreaker(endpoint, requestId);

      // Check rate limit
      await this.checkRateLimit();

      // Check cache for GET requests
      if (method === 'GET' && options.cache !== false) {
        const cachedResponse = await this.getFromCache<T>(cacheKey);
        if (cachedResponse !== null) {
          this.cacheHits++;
          const responseTime = Date.now() - startTime;
          this.logRequest(requestId, method, endpoint, 200, responseTime, true, 0);

          this.logger.debug(`Cache hit`, { requestId, cacheKey });

          const cacheEntry = this.cache.get(cacheKey) as CacheEntry<T>;
          return {
            data: cachedResponse,
            status: 200,
            headers: {},
            cached: true,
            requestId,
            responseTime,
            cacheMetadata: {
              age: Date.now() - cacheEntry.timestamp,
              expiresAt: new Date(cacheEntry.timestamp + cacheEntry.ttl),
              isStale: Date.now() > cacheEntry.timestamp + cacheEntry.ttl,
            },
          };
        }
        this.cacheMisses++;
      }

      // Check for in-flight request deduplication
      if (method === 'GET' && this.inFlightRequests.has(cacheKey)) {
        this.logger.debug(`Deduplicating request`, { requestId, cacheKey });
        return this.inFlightRequests.get(cacheKey) as Promise<ApiResponse<T>>;
      }

      // Create the request promise
      const requestPromise = this.executeRequest<T>(
        fullUrl,
        endpoint,
        method,
        options,
        requestId,
        startTime,
        cacheKey
      );

      // Store for deduplication (only GET requests)
      if (method === 'GET') {
        this.inFlightRequests.set(cacheKey, requestPromise as Promise<ApiResponse<unknown>>);
      }

      const response = await requestPromise;

      // Remove from in-flight
      this.inFlightRequests.delete(cacheKey);

      return response;
    } catch (error) {
      // Remove from in-flight on error
      this.inFlightRequests.delete(cacheKey);

      // Log the error
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logRequest(requestId, method, endpoint, null, responseTime, false, 0, errorMessage);

      throw error;
    }
  }

  /**
   * Gets the current circuit breaker state
   */
  public getCircuitBreakerState(): CircuitBreakerState {
    return {
      state: this.circuitState,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime || null,
      resetTime:
        this.circuitState === 'open'
          ? this.lastFailureTime + this.circuitBreakerConfig.resetTimeout
          : null,
      blockedRequests: this.blockedRequests,
    };
  }

  /**
   * Gets cache statistics
   */
  public getCacheStats(): CacheStats {
    let memoryUsage = 0;
    let oldestEntry: number | undefined;
    let newestEntry: number | undefined;

    this.cache.forEach((entry) => {
      memoryUsage += entry.size || 0;
      if (!oldestEntry || entry.timestamp < oldestEntry) {
        oldestEntry = entry.timestamp;
      }
      if (!newestEntry || entry.timestamp > newestEntry) {
        newestEntry = entry.timestamp;
      }
    });

    return {
      size: this.cache.size,
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRatio: this.cacheHits / Math.max(1, this.cacheHits + this.cacheMisses),
      memoryUsage,
      oldestEntry,
      newestEntry,
    };
  }

  /**
   * Clears the cache
   */
  public clearCache(): void {
    this.cache.clear();
    this.logger.info(`Cache cleared`);
  }

  /**
   * Invalidates a specific cache entry
   */
  public invalidateCache(pattern: string | RegExp): number {
    let count = 0;
    const keys = Array.from(this.cache.keys());

    for (const key of keys) {
      if (
        (typeof pattern === 'string' && key.includes(pattern)) ||
        (pattern instanceof RegExp && pattern.test(key))
      ) {
        this.cache.delete(key);
        count++;
      }
    }

    this.logger.debug(`Cache entries invalidated`, { pattern: pattern.toString(), count });
    return count;
  }

  /**
   * Manually resets the circuit breaker
   */
  public resetCircuitBreaker(): void {
    this.circuitState = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
    this.logger.info(`Circuit breaker manually reset`);
  }

  /**
   * Gets recent request logs
   */
  public getRequestLog(): RequestLogEntry[] {
    return [...this.requestLog];
  }

  // ============================================================================
  // Protected Methods
  // ============================================================================

  /**
   * Executes the actual HTTP request with retries
   */
  protected async executeRequest<T>(
    fullUrl: string,
    endpoint: string,
    method: HttpMethod,
    options: RequestOptions,
    requestId: string,
    startTime: number,
    cacheKey: string
  ): Promise<ApiResponse<T>> {
    const timeout = options.timeout ?? this.config.timeout;
    const retries = options.retries ?? this.config.retries;

    // Execute with retry logic
    const response = await this.retry<Response>(
      async () => {
        return this.fetchWithTimeout(fullUrl, method, options, timeout, requestId, endpoint);
      },
      retries,
      this.config.retryDelay,
      requestId,
      endpoint
    );

    // Record success for circuit breaker
    this.recordSuccess();

    // Parse response
    const data = await this.parseResponse<T>(response, endpoint, requestId);

    // Handle rate limit headers
    this.extractRateLimitInfo(response);

    // Cache successful GET responses
    if (method === 'GET' && options.cache !== false) {
      const cacheSettings = typeof options.cache === 'object' ? options.cache : {};
      const ttl = cacheSettings.ttl ?? this.cacheConfig.ttl;
      await this.setCache(cacheKey, data, ttl, requestId);
    }

    // Extract response headers
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    const responseTime = Date.now() - startTime;
    this.logRequest(requestId, method, endpoint, response.status, responseTime, false, 0);

    return {
      data,
      status: response.status,
      headers,
      cached: false,
      requestId,
      responseTime,
    };
  }

  /**
   * Performs fetch with timeout
   */
  protected async fetchWithTimeout(
    url: string,
    method: HttpMethod,
    options: RequestOptions,
    timeout: number,
    requestId: string,
    endpoint: string
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId,
        ...this.config.headers,
        ...options.headers,
      };

      // Add API key if configured
      if (this.config.apiKey) {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      }

      const fetchOptions: RequestInit = {
        method,
        headers,
        signal: options.signal || controller.signal,
      };

      // Add body for non-GET requests
      if (options.body && method !== 'GET' && method !== 'HEAD') {
        fetchOptions.body =
          typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
      }

      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);

      // Check for rate limiting
      if (response.status === 429) {
        const rateLimitInfo = this.extractRateLimitInfo(response);
        throw new RateLimitError(
          `Rate limit exceeded for ${endpoint}`,
          endpoint,
          requestId,
          rateLimitInfo.retryAfter || 60000,
          rateLimitInfo.limit,
          rateLimitInfo.remaining
        );
      }

      // Check for server errors
      if (!response.ok) {
        throw new ApiError(
          `Request failed with status ${response.status}: ${response.statusText}`,
          response.status,
          endpoint,
          requestId
        );
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      // Handle abort (timeout)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new TimeoutError(
          `Request to ${endpoint} timed out after ${timeout}ms`,
          endpoint,
          requestId,
          timeout
        );
      }

      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        const errorType = getNetworkErrorType(error);
        throw new NetworkError(
          `Network error while requesting ${endpoint}: ${error.message}`,
          endpoint,
          requestId,
          error,
          errorType
        );
      }

      // Re-throw API errors
      if (error instanceof ApiError) {
        throw error;
      }

      // Wrap unknown errors
      const wrappedError = error instanceof Error ? error : new Error(String(error));
      throw new ApiError(
        `Unexpected error: ${wrappedError.message}`,
        500,
        endpoint,
        requestId,
        wrappedError
      );
    }
  }

  /**
   * Parses the response body
   */
  protected async parseResponse<T>(
    response: Response,
    endpoint: string,
    requestId: string
  ): Promise<T> {
    const contentType = response.headers.get('content-type');

    if (contentType?.includes('application/json')) {
      try {
        return (await response.json()) as T;
      } catch {
        throw new ApiError(
          'Failed to parse JSON response',
          500,
          endpoint,
          requestId
        );
      }
    }

    // Return text for non-JSON responses
    return (await response.text()) as unknown as T;
  }

  /**
   * Builds the full URL with query parameters
   */
  protected buildUrl(
    endpoint: string,
    params?: Record<string, string | number | boolean | undefined>
  ): string {
    const baseUrl = this.config.baseUrl.replace(/\/$/, '');
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    let url = `${baseUrl}${normalizedEndpoint}`;

    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    return url;
  }

  /**
   * Generates a deterministic cache key for a request
   */
  protected getCacheKey(endpoint: string, options?: RequestOptions): string {
    const method = options?.method || 'GET';
    const params = options?.params ? JSON.stringify(options.params) : '';
    const body = options?.body ? JSON.stringify(options.body) : '';
    const prefix = this.cacheConfig.keyPrefix || this.config.serviceName || 'api';

    return `${prefix}:${method}:${endpoint}:${params}:${body}`;
  }

  /**
   * Retrieves data from cache if valid
   */
  protected async getFromCache<T>(key: string): Promise<T | null> {
    if (!this.cacheConfig.enabled) {
      return null;
    }

    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      return null;
    }

    const age = Date.now() - entry.timestamp;
    const isExpired = age > entry.ttl;

    if (isExpired) {
      // Check for stale-while-revalidate
      if (
        this.cacheConfig.staleWhileRevalidate &&
        this.cacheConfig.maxStaleTime &&
        age < entry.ttl + this.cacheConfig.maxStaleTime
      ) {
        // Return stale data (revalidation should happen in background)
        entry.hits++;
        return entry.data;
      }

      // Entry is expired, remove it
      this.cache.delete(key);
      return null;
    }

    // Update hit count
    entry.hits++;
    return entry.data;
  }

  /**
   * Stores data in cache
   */
  protected async setCache<T>(
    key: string,
    data: T,
    ttl?: number,
    requestId?: string
  ): Promise<void> {
    if (!this.cacheConfig.enabled) {
      return;
    }

    // Enforce max cache size
    if (this.cache.size >= this.cacheConfig.maxSize) {
      this.evictOldestCacheEntry();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl ?? this.cacheConfig.ttl,
      hits: 0,
      requestId: requestId || generateRequestId(),
      size: approximateSize(data),
    };

    this.cache.set(key, entry);
    this.logger.debug(`Cache set`, { key, ttl: entry.ttl });
  }

  /**
   * Evicts the oldest cache entry (LRU)
   */
  protected evictOldestCacheEntry(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    this.cache.forEach((entry, key) => {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    });

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.logger.debug(`Cache entry evicted`, { key: oldestKey });
    }
  }

  /**
   * Checks if circuit breaker allows the request
   */
  protected checkCircuitBreaker(endpoint: string, requestId: string): void {
    const now = Date.now();

    switch (this.circuitState) {
      case 'closed':
        // Normal operation
        return;

      case 'open':
        // Check if we should transition to half-open
        if (now >= this.lastFailureTime + this.circuitBreakerConfig.resetTimeout) {
          this.circuitState = 'half-open';
          this.successCount = 0;
          this.logger.info(`Circuit breaker transitioning to half-open`);
          return;
        }

        // Circuit is open, reject the request
        this.blockedRequests++;
        throw new CircuitBreakerError(
          `Circuit breaker is open for ${this.config.serviceName || 'service'}`,
          endpoint,
          requestId,
          this.config.serviceName || 'unknown',
          new Date(this.lastFailureTime + this.circuitBreakerConfig.resetTimeout),
          this.failureCount,
          'open'
        );

      case 'half-open':
        // Allow limited requests to test the service
        return;
    }
  }

  /**
   * Records a successful request
   */
  protected recordSuccess(): void {
    if (this.circuitState === 'half-open') {
      this.successCount++;

      if (this.successCount >= this.circuitBreakerConfig.halfOpenRequests) {
        // Enough successes, close the circuit
        this.circuitState = 'closed';
        this.failureCount = 0;
        this.successCount = 0;
        this.logger.info(`Circuit breaker closed after successful recovery`);
      }
    } else if (this.circuitState === 'closed') {
      // Reset failure count on success
      this.failureCount = 0;
    }
  }

  /**
   * Records a failed request
   */
  protected recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.circuitState === 'half-open') {
      // Any failure in half-open state reopens the circuit
      this.circuitState = 'open';
      this.successCount = 0;
      this.logger.warn(`Circuit breaker reopened after failure in half-open state`);
    } else if (
      this.circuitState === 'closed' &&
      this.failureCount >= this.circuitBreakerConfig.failureThreshold
    ) {
      // Too many failures, open the circuit
      this.circuitState = 'open';
      this.logger.warn(`Circuit breaker opened after ${this.failureCount} consecutive failures`);
    }
  }

  /**
   * Retries a function with exponential backoff
   */
  protected async retry<T>(
    fn: () => Promise<T>,
    retries: number,
    baseDelay: number,
    requestId: string,
    endpoint: string
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on certain errors
        if (
          error instanceof CircuitBreakerError ||
          error instanceof RateLimitError ||
          (error instanceof ApiError && error.statusCode >= 400 && error.statusCode < 500)
        ) {
          this.recordFailure();
          throw error;
        }

        // Record failure for circuit breaker
        this.recordFailure();

        // If we've exhausted retries, throw
        if (attempt >= retries) {
          this.logger.error(`Request failed after ${attempt + 1} attempts`, {
            requestId,
            endpoint,
            error: lastError.message,
          });
          throw lastError;
        }

        // Calculate delay with exponential backoff and jitter (0-25% of base delay)
        const baseDelayWithBackoff = baseDelay * Math.pow(2, attempt);
        const jitter = baseDelayWithBackoff * Math.random() * 0.25;
        const delay = baseDelayWithBackoff + jitter;

        this.logger.warn(`Request failed, retrying in ${Math.round(delay)}ms`, {
          requestId,
          endpoint,
          attempt: attempt + 1,
          maxRetries: retries,
          error: lastError.message,
        });

        await this.sleep(delay);
      }
    }

    // Should never reach here, but TypeScript needs this
    throw lastError || new Error('Retry failed');
  }

  /**
   * Checks and enforces rate limiting using token bucket algorithm
   */
  protected async checkRateLimit(): Promise<void> {
    const now = Date.now();
    const timePassed = now - this.rateLimiterState.lastRefill;

    // Refill tokens based on time passed
    const tokensToAdd = (timePassed / 1000) * this.rateLimitConfig.requestsPerSecond;
    this.rateLimiterState.tokens = Math.min(
      this.rateLimitConfig.burstSize,
      this.rateLimiterState.tokens + tokensToAdd
    );
    this.rateLimiterState.lastRefill = now;

    // Check if we have tokens available
    if (this.rateLimiterState.tokens < 1) {
      // Calculate wait time
      const waitTime = ((1 - this.rateLimiterState.tokens) / this.rateLimitConfig.requestsPerSecond) * 1000;

      if (this.rateLimitConfig.queueExcess) {
        // Wait for token to become available
        this.logger.debug(`Rate limit reached, waiting ${Math.round(waitTime)}ms`);
        await this.sleep(waitTime);
        this.rateLimiterState.tokens = 1; // We've waited, so we have a token
      } else {
        throw new RateLimitError(
          'Internal rate limit exceeded',
          'internal',
          generateRequestId(),
          waitTime,
          this.rateLimitConfig.requestsPerSecond,
          0
        );
      }
    }

    // Consume a token
    this.rateLimiterState.tokens -= 1;
  }

  /**
   * Extracts rate limit information from response headers
   */
  protected extractRateLimitInfo(response: Response): RateLimitInfo {
    const limit = parseInt(response.headers.get('X-RateLimit-Limit') || '0', 10);
    const remaining = parseInt(response.headers.get('X-RateLimit-Remaining') || '0', 10);
    const resetTimestamp = parseInt(response.headers.get('X-RateLimit-Reset') || '0', 10);
    const retryAfter = parseInt(response.headers.get('Retry-After') || '0', 10);

    return {
      limit: limit || this.rateLimitConfig.requestsPerSecond,
      remaining,
      resetAt: new Date(resetTimestamp * 1000),
      retryAfter: retryAfter * 1000, // Convert to milliseconds
    };
  }

  /**
   * Logs a request for debugging and metrics
   */
  protected logRequest(
    requestId: string,
    method: HttpMethod,
    endpoint: string,
    status: number | null,
    responseTime: number | null,
    cached: boolean,
    retries: number,
    error?: string
  ): void {
    const entry: RequestLogEntry = {
      requestId,
      service: this.config.serviceName || 'unknown',
      method,
      endpoint,
      timestamp: new Date(),
      status,
      responseTime,
      cached,
      retries,
      error,
    };

    this.requestLog.push(entry);

    // Trim log if it exceeds max size
    if (this.requestLog.length > this.maxLogSize) {
      this.requestLog = this.requestLog.slice(-this.maxLogSize);
    }
  }

  /**
   * Sleep utility
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ============================================================================
  // Convenience Methods
  // ============================================================================

  /**
   * GET request
   */
  protected async get<T>(endpoint: string, options?: Omit<RequestOptions, 'method'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  /**
   * POST request
   */
  protected async post<T>(
    endpoint: string,
    body?: unknown,
    options?: Omit<RequestOptions, 'method' | 'body'>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body });
  }

  /**
   * PUT request
   */
  protected async put<T>(
    endpoint: string,
    body?: unknown,
    options?: Omit<RequestOptions, 'method' | 'body'>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body });
  }

  /**
   * PATCH request
   */
  protected async patch<T>(
    endpoint: string,
    body?: unknown,
    options?: Omit<RequestOptions, 'method' | 'body'>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', body });
  }

  /**
   * DELETE request
   */
  protected async delete<T>(endpoint: string, options?: Omit<RequestOptions, 'method'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export default BaseApiService;

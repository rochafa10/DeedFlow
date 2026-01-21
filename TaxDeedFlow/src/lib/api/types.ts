/**
 * API Types and Interfaces
 *
 * Comprehensive type definitions for the API integration layer including:
 * - Configuration interfaces
 * - Request/Response types
 * - Cache management types
 * - Circuit breaker types
 * - Rate limiting types
 */

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * API service configuration
 */
export interface ApiConfig {
  /** Base URL for the API */
  baseUrl: string;

  /** Request timeout in milliseconds */
  timeout: number;

  /** Number of retry attempts for failed requests */
  retries: number;

  /** Base delay between retries in milliseconds (used with exponential backoff) */
  retryDelay: number;

  /** Default headers to include with every request */
  headers?: Record<string, string>;

  /** API key for authentication (if required) */
  apiKey?: string;

  /** Service name for logging and metrics */
  serviceName?: string;
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  /** Whether caching is enabled */
  enabled: boolean;

  /** Time-to-live for cache entries in milliseconds */
  ttl: number;

  /** Maximum number of entries to store in cache */
  maxSize: number;

  /** Storage type for cache */
  storage: 'memory' | 'localStorage' | 'sessionStorage';

  /** Optional prefix for cache keys */
  keyPrefix?: string;

  /** Whether to use stale-while-revalidate strategy */
  staleWhileRevalidate?: boolean;

  /** Maximum stale time in milliseconds (for stale-while-revalidate) */
  maxStaleTime?: number;
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  /** Number of consecutive failures before opening the circuit */
  failureThreshold: number;

  /** Time in milliseconds before attempting to reset the circuit */
  resetTimeout: number;

  /** Number of successful requests needed in half-open state to close circuit */
  halfOpenRequests: number;

  /** Optional: specific error codes that should trigger circuit breaker */
  triggerOnCodes?: number[];

  /** Optional: whether to include timeouts in failure count */
  countTimeoutsAsFailures?: boolean;
}

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  /** Maximum requests per second */
  requestsPerSecond: number;

  /** Maximum burst size (requests that can be made immediately) */
  burstSize: number;

  /** Whether to queue requests that exceed rate limit */
  queueExcess?: boolean;

  /** Maximum queue size (if queueExcess is true) */
  maxQueueSize?: number;
}

// ============================================================================
// Request Types
// ============================================================================

/**
 * HTTP methods supported by the API client
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

/**
 * Request options for API calls
 */
export interface RequestOptions {
  /** HTTP method (defaults to GET) */
  method?: HttpMethod;

  /** Request headers */
  headers?: Record<string, string>;

  /** Request body (will be JSON stringified if object) */
  body?: unknown;

  /** Cache configuration for this specific request */
  cache?: Partial<CacheConfig> | false;

  /** Request-specific timeout (overrides service config) */
  timeout?: number;

  /** Request-specific retry count (overrides service config) */
  retries?: number;

  /** Query parameters to append to URL */
  params?: Record<string, string | number | boolean | undefined>;

  /** Signal for request cancellation */
  signal?: AbortSignal;

  /** Whether to skip authentication for this request */
  skipAuth?: boolean;

  /** Priority level for request (used for queuing) */
  priority?: 'high' | 'normal' | 'low';

  /** Tags for request categorization and metrics */
  tags?: string[];
}

// ============================================================================
// Response Types
// ============================================================================

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
  /** Response data */
  data: T;

  /** HTTP status code */
  status: number;

  /** Response headers */
  headers: Record<string, string>;

  /** Whether this response was served from cache */
  cached: boolean;

  /** Unique request identifier */
  requestId: string;

  /** Response time in milliseconds */
  responseTime: number;

  /** Cache metadata (if cached) */
  cacheMetadata?: {
    age: number;
    expiresAt: Date;
    isStale: boolean;
  };
}

/**
 * Paginated response structure
 */
export interface PaginatedResponse<T> {
  /** Array of items */
  items: T[];

  /** Total number of items across all pages */
  total: number;

  /** Current page number (1-indexed) */
  page: number;

  /** Number of items per page */
  pageSize: number;

  /** Whether there are more pages */
  hasMore: boolean;

  /** Optional cursor for cursor-based pagination */
  nextCursor?: string;
}

// ============================================================================
// Cache Types
// ============================================================================

/**
 * Cache state enumeration
 */
export type CircuitState = 'closed' | 'open' | 'half-open';

/**
 * Cache entry structure
 */
export interface CacheEntry<T> {
  /** Cached data */
  data: T;

  /** Timestamp when the entry was created */
  timestamp: number;

  /** Time-to-live for this entry in milliseconds */
  ttl: number;

  /** Number of times this cache entry has been accessed */
  hits: number;

  /** ETag for cache validation (if provided by server) */
  etag?: string;

  /** Last-Modified header value (if provided by server) */
  lastModified?: string;

  /** Request ID that created this cache entry */
  requestId: string;

  /** Size of the cached data in bytes (approximate) */
  size?: number;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  /** Total number of cache entries */
  size: number;

  /** Total cache hits */
  hits: number;

  /** Total cache misses */
  misses: number;

  /** Hit ratio (hits / (hits + misses)) */
  hitRatio: number;

  /** Approximate memory usage in bytes */
  memoryUsage: number;

  /** Oldest entry timestamp */
  oldestEntry?: number;

  /** Newest entry timestamp */
  newestEntry?: number;
}

// ============================================================================
// Circuit Breaker Types
// ============================================================================

/**
 * Circuit breaker state information
 */
export interface CircuitBreakerState {
  /** Current state of the circuit */
  state: CircuitState;

  /** Number of consecutive failures */
  failureCount: number;

  /** Number of consecutive successes (in half-open state) */
  successCount: number;

  /** Timestamp of last failure */
  lastFailureTime: number | null;

  /** Timestamp when circuit will reset (if open) */
  resetTime: number | null;

  /** Total number of requests blocked by open circuit */
  blockedRequests: number;
}

// ============================================================================
// Rate Limiting Types
// ============================================================================

/**
 * Rate limit information from response headers
 */
export interface RateLimitInfo {
  /** Maximum requests allowed in the window */
  limit: number;

  /** Remaining requests in current window */
  remaining: number;

  /** Timestamp when the rate limit window resets */
  resetAt: Date;

  /** Time in seconds until rate limit resets */
  retryAfter?: number;
}

/**
 * Internal rate limiter state
 */
export interface RateLimiterState {
  /** Available tokens for the token bucket algorithm */
  tokens: number;

  /** Last time tokens were refilled */
  lastRefill: number;

  /** Number of requests currently queued */
  queuedRequests: number;
}

// ============================================================================
// Logging Types
// ============================================================================

/**
 * API request log entry
 */
export interface RequestLogEntry {
  /** Unique request identifier */
  requestId: string;

  /** Service name */
  service: string;

  /** HTTP method */
  method: HttpMethod;

  /** Request endpoint */
  endpoint: string;

  /** Request timestamp */
  timestamp: Date;

  /** Response status code (null if failed before response) */
  status: number | null;

  /** Response time in milliseconds */
  responseTime: number | null;

  /** Whether response was cached */
  cached: boolean;

  /** Number of retries attempted */
  retries: number;

  /** Error message (if failed) */
  error?: string;

  /** Request tags */
  tags?: string[];
}

// ============================================================================
// Health Check Types
// ============================================================================

/**
 * Health check status
 */
export interface HealthStatus {
  /** Whether the service is healthy */
  healthy: boolean;

  /** Response latency in milliseconds */
  latency: number;

  /** Timestamp of last health check */
  lastCheck: Date;

  /** Array of recent errors */
  errors: HealthCheckError[];

  /** Circuit breaker state */
  circuitState: CircuitState;

  /** Cache statistics */
  cacheStats?: CacheStats;

  /** Additional health details */
  details?: Record<string, unknown>;
}

/**
 * Health check error entry
 */
export interface HealthCheckError {
  /** Error message */
  message: string;

  /** Error timestamp */
  timestamp: Date;

  /** Error code (if applicable) */
  code?: string | number;
}

// ============================================================================
// Default Configurations
// ============================================================================

/**
 * Default API configuration values
 */
export const DEFAULT_API_CONFIG: Omit<ApiConfig, 'baseUrl'> = {
  timeout: 30000,
  retries: 3,
  retryDelay: 1000,
};

/**
 * Default cache configuration values
 */
export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  enabled: true,
  ttl: 3600000, // 1 hour
  maxSize: 1000,
  storage: 'memory',
  staleWhileRevalidate: false,
};

/**
 * Default circuit breaker configuration values
 */
export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeout: 60000, // 1 minute
  halfOpenRequests: 3,
  countTimeoutsAsFailures: true,
};

/**
 * Default rate limit configuration values
 */
export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  requestsPerSecond: 10,
  burstSize: 20,
  queueExcess: false,
};

// ============================================================================
// External API Response Types
// ============================================================================

/**
 * FEMA Flood Zone API response
 */
export interface FloodZoneResponse {
  /** Flood zone designation (e.g., 'A', 'AE', 'X', 'VE') */
  floodZone: string;

  /** Whether the property is in a Special Flood Hazard Area */
  isSFHA: boolean;

  /** Flood zone description */
  description: string;

  /** Base Flood Elevation (if applicable) */
  bfe?: number;

  /** Map panel number */
  panelNumber?: string;

  /** Map effective date */
  mapEffectiveDate?: string;

  /** Community number */
  communityNumber?: string;

  /** Raw API response data */
  raw?: Record<string, unknown>;
}

/**
 * FEMA NFHL (National Flood Hazard Layer) response
 */
export interface NFHLResponse {
  /** Array of flood hazard areas that intersect the location */
  hazardAreas: Array<{
    zone: string;
    zoneSubtype?: string;
    bfe?: number;
    staticBfe?: boolean;
  }>;

  /** FIRM panel information */
  firmPanel?: {
    panelNumber: string;
    suffix: string;
    effectiveDate: string;
  };

  /** LOMA/LOMR information if any */
  lomaLomr?: Array<{
    caseNumber: string;
    determinationType: string;
    determinationDate: string;
  }>;

  /** Coastal Barrier Resources System designation */
  cbrs?: {
    unitName: string;
    unitType: string;
    systemType: string;
  };

  /** Raw API response data */
  raw?: Record<string, unknown>;
}

/**
 * Census Geographic Data response
 */
export interface GeographicResponse {
  /** State FIPS code */
  stateFips: string;

  /** County FIPS code */
  countyFips: string;

  /** Combined state and county FIPS */
  fips: string;

  /** Census tract */
  tract: string;

  /** Census block group */
  blockGroup: string;

  /** Census block */
  block: string;

  /** State name */
  stateName: string;

  /** County name */
  countyName: string;

  /** Metropolitan Statistical Area code */
  msaCode?: string;

  /** Congressional district */
  congressionalDistrict?: string;

  /** School district */
  schoolDistrict?: string;

  /** Raw API response data */
  raw?: Record<string, unknown>;
}

/**
 * Census Demographics response
 */
export interface DemographicsResponse {
  /** Total population */
  population: number;

  /** Median household income */
  medianHouseholdIncome: number;

  /** Median home value */
  medianHomeValue: number;

  /** Percentage of owner-occupied housing units */
  ownerOccupiedPct: number;

  /** Percentage below poverty level */
  povertyPct: number;

  /** Median age */
  medianAge: number;

  /** Educational attainment (bachelor's degree or higher) */
  bachelorsDegreeOrHigherPct: number;

  /** Unemployment rate */
  unemploymentRate: number;

  /** Total housing units */
  totalHousingUnits: number;

  /** Vacancy rate */
  vacancyRate: number;

  /** Year of data */
  dataYear: number;

  /** Raw API response data */
  raw?: Record<string, unknown>;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Makes all properties of T optional recursively
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Extracts the data type from an ApiResponse
 */
export type ExtractApiData<T> = T extends ApiResponse<infer U> ? U : never;

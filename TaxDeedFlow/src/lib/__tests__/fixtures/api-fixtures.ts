/**
 * API Test Fixtures
 *
 * Provides mock API responses, configurations, and error scenarios
 * for comprehensive testing of the API service layer.
 *
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-22
 */

import type {
  ApiConfig,
  CacheConfig,
  CircuitBreakerConfig,
  RateLimitConfig,
  ApiResponse,
  CacheEntry,
  CircuitBreakerState,
  RateLimitInfo,
} from '@/lib/api/types';

// ============================================
// Mock Configurations
// ============================================

/**
 * Default API configuration for tests
 */
export const mockApiConfig: ApiConfig = {
  baseUrl: 'https://api.test.example.com',
  timeout: 5000,
  retries: 2,
  retryDelay: 100,
  serviceName: 'test-service',
  headers: {
    'X-Test-Header': 'test-value',
  },
};

/**
 * Mock API configuration with authentication
 */
export const mockApiConfigWithAuth: ApiConfig = {
  ...mockApiConfig,
  apiKey: 'test-api-key-12345',
  headers: {
    'X-Test-Header': 'test-value',
    'Authorization': 'Bearer test-token',
  },
};

/**
 * Mock cache configuration - enabled
 */
export const mockCacheConfig: CacheConfig = {
  enabled: true,
  ttl: 60000, // 1 minute
  maxSize: 100,
  storage: 'memory',
  keyPrefix: 'test',
  staleWhileRevalidate: false,
};

/**
 * Mock cache configuration - disabled
 */
export const mockCacheConfigDisabled: CacheConfig = {
  enabled: false,
  ttl: 0,
  maxSize: 0,
  storage: 'memory',
};

/**
 * Mock circuit breaker configuration
 */
export const mockCircuitBreakerConfig: CircuitBreakerConfig = {
  failureThreshold: 3,
  resetTimeout: 5000,
  halfOpenRequests: 2,
  countTimeoutsAsFailures: true,
};

/**
 * Mock rate limit configuration
 */
export const mockRateLimitConfig: RateLimitConfig = {
  requestsPerSecond: 10,
  burstSize: 20,
  queueExcess: true,
  maxQueueSize: 100,
};

// ============================================
// Mock API Responses - Generic
// ============================================

/**
 * Successful API response with generic data
 */
export const mockSuccessResponse: ApiResponse<{ message: string; data: number[] }> = {
  data: {
    message: 'Success',
    data: [1, 2, 3, 4, 5],
  },
  status: 200,
  headers: {
    'content-type': 'application/json',
    'x-request-id': 'req_test_001',
  },
  cached: false,
  requestId: 'req_test_001',
  responseTime: 150,
};

/**
 * Cached API response
 */
export const mockCachedResponse: ApiResponse<{ message: string }> = {
  data: {
    message: 'From cache',
  },
  status: 200,
  headers: {
    'content-type': 'application/json',
  },
  cached: true,
  requestId: 'req_test_002',
  responseTime: 5,
  cacheMetadata: {
    age: 15000,
    expiresAt: new Date('2026-01-22T13:00:00.000Z'),
    isStale: false,
  },
};

/**
 * Empty/null response
 */
export const mockEmptyResponse: ApiResponse<null> = {
  data: null,
  status: 204,
  headers: {},
  cached: false,
  requestId: 'req_test_003',
  responseTime: 100,
};

// ============================================
// Mock API Responses - Census Service
// ============================================

/**
 * Mock Census geocoder response
 */
export const mockCensusGeocoderResponse = {
  result: {
    input: {
      location: {
        x: -78.3947,
        y: 40.5187,
      },
    },
    geographies: {
      'Census Blocks': [
        {
          GEOID: '420130201001000',
          STATE: '42',
          COUNTY: '013',
          TRACT: '020100',
          BLKGRP: '1',
          BLOCK: '1000',
          NAME: 'Block 1000',
          BASENAME: '1000',
          CENTLAT: '40.518700',
          CENTLON: '-78.394700',
        },
      ],
      'Counties': [
        {
          GEOID: '42013',
          STATE: '42',
          COUNTY: '013',
          NAME: 'Blair County',
          BASENAME: 'Blair',
          CENTLAT: '40.488389',
          CENTLON: '-78.346111',
        },
      ],
    },
  },
};

/**
 * Mock Census ACS demographics response
 */
export const mockCensusACSResponse = [
  ['NAME', 'B01003_001E', 'B19013_001E', 'B25077_001E'],
  ['Blair County, Pennsylvania', '123456', '52000', '125000'],
];

/**
 * Parsed Census geographic data
 */
export const mockCensusGeographicData = {
  blockId: '420130201001000',
  tractId: '020100',
  countyId: '013',
  stateId: '42',
  countyName: 'Blair County',
  stateName: 'Pennsylvania',
  centroidLat: 40.5187,
  centroidLon: -78.3947,
};

/**
 * Parsed Census demographics data
 */
export const mockCensusDemographicsData = {
  population: 123456,
  medianIncome: 52000,
  medianHomeValue: 125000,
  area: 'Blair County, Pennsylvania',
};

// ============================================
// Mock API Responses - FBI Crime Service
// ============================================

/**
 * Mock FBI crime data response
 */
export const mockFBICrimeDataResponse = {
  year: 2023,
  state_name: 'Pennsylvania',
  state_abbr: 'PA',
  population: 12800000,
  violent_crime: 35000,
  homicide: 800,
  rape_revised: 3500,
  robbery: 8000,
  aggravated_assault: 22700,
  property_crime: 120000,
  burglary: 20000,
  larceny: 85000,
  motor_vehicle_theft: 15000,
  arson: 1200,
};

/**
 * Mock crime summary with analysis
 */
export const mockCrimeSummary = {
  state: 'Pennsylvania',
  stateAbbr: 'PA',
  latestYear: 2023,
  violentCrimeRate: 273.4,
  propertyCrimeRate: 937.5,
  nationalComparison: {
    violentCrime: 'below_average' as const,
    propertyCrime: 'average' as const,
  },
  trend: 'stable' as const,
  riskLevel: 'moderate' as const,
  topOffenses: [
    { type: 'larceny', count: 85000 },
    { type: 'aggravated_assault', count: 22700 },
    { type: 'burglary', count: 20000 },
  ],
};

// ============================================
// Mock API Responses - Climate Service
// ============================================

/**
 * Mock climate data response
 */
export const mockClimateDataResponse = {
  location: 'Altoona, PA',
  latitude: 40.5187,
  longitude: -78.3947,
  data: {
    temperature: {
      avgAnnual: 48.5,
      avgJanuary: 28.2,
      avgJuly: 72.8,
      recordHigh: 103,
      recordLow: -25,
    },
    precipitation: {
      avgAnnualInches: 42.5,
      avgSnowfallInches: 45.2,
      rainyDays: 154,
    },
    extremeWeather: {
      tornadoes: 'low',
      hurricanes: 'minimal',
      flooding: 'moderate',
      drought: 'low',
    },
  },
};

// ============================================
// Mock API Responses - Elevation Service
// ============================================

/**
 * Mock elevation data response
 */
export const mockElevationDataResponse = {
  latitude: 40.5187,
  longitude: -78.3947,
  elevation: 1171, // feet
  units: 'feet',
  resolution: '1/3 arc-second',
};

// ============================================
// Mock Error Responses
// ============================================

/**
 * 400 Bad Request error
 */
export const mockBadRequestError = {
  message: 'Invalid request parameters',
  code: 'BAD_REQUEST',
  status: 400,
  details: {
    field: 'latitude',
    error: 'Must be between -90 and 90',
  },
};

/**
 * 401 Unauthorized error
 */
export const mockUnauthorizedError = {
  message: 'Authentication required',
  code: 'UNAUTHORIZED',
  status: 401,
  details: {
    reason: 'Missing or invalid API key',
  },
};

/**
 * 403 Forbidden error
 */
export const mockForbiddenError = {
  message: 'Access denied',
  code: 'FORBIDDEN',
  status: 403,
  details: {
    reason: 'Insufficient permissions',
  },
};

/**
 * 404 Not Found error
 */
export const mockNotFoundError = {
  message: 'Resource not found',
  code: 'NOT_FOUND',
  status: 404,
  details: {
    resource: 'county',
    id: 'invalid-id',
  },
};

/**
 * 429 Rate Limit error
 */
export const mockRateLimitError = {
  message: 'Rate limit exceeded',
  code: 'RATE_LIMIT_EXCEEDED',
  status: 429,
  details: {
    limit: 100,
    remaining: 0,
    resetAt: '2026-01-22T13:00:00.000Z',
    retryAfter: 3600,
  },
};

/**
 * 500 Internal Server Error
 */
export const mockInternalServerError = {
  message: 'Internal server error',
  code: 'INTERNAL_ERROR',
  status: 500,
  details: {
    errorId: 'err_test_12345',
  },
};

/**
 * 502 Bad Gateway error
 */
export const mockBadGatewayError = {
  message: 'Bad gateway',
  code: 'BAD_GATEWAY',
  status: 502,
  details: {
    upstream: 'external-api.example.com',
  },
};

/**
 * 503 Service Unavailable error
 */
export const mockServiceUnavailableError = {
  message: 'Service temporarily unavailable',
  code: 'SERVICE_UNAVAILABLE',
  status: 503,
  details: {
    retryAfter: 60,
    reason: 'Maintenance in progress',
  },
};

/**
 * Timeout error
 */
export const mockTimeoutError = {
  message: 'Request timeout',
  code: 'TIMEOUT',
  status: 408,
  details: {
    timeout: 5000,
    elapsed: 5000,
  },
};

/**
 * Network error
 */
export const mockNetworkError = {
  message: 'Network connection failed',
  code: 'NETWORK_ERROR',
  status: 0,
  details: {
    type: 'connection_refused',
  },
};

// ============================================
// Mock Cache Entries
// ============================================

/**
 * Fresh cache entry
 */
export const mockFreshCacheEntry: CacheEntry<{ value: string }> = {
  data: { value: 'cached data' },
  timestamp: Date.now() - 10000, // 10 seconds ago
  ttl: 60000, // 1 minute TTL
  hits: 5,
  requestId: 'req_cache_001',
  size: 256,
};

/**
 * Stale cache entry
 */
export const mockStaleCacheEntry: CacheEntry<{ value: string }> = {
  data: { value: 'stale data' },
  timestamp: Date.now() - 120000, // 2 minutes ago
  ttl: 60000, // 1 minute TTL (expired)
  hits: 15,
  requestId: 'req_cache_002',
  size: 256,
};

/**
 * Large cache entry
 */
export const mockLargeCacheEntry: CacheEntry<{ data: number[] }> = {
  data: { data: Array.from({ length: 10000 }, (_, i) => i) },
  timestamp: Date.now() - 5000,
  ttl: 300000, // 5 minutes
  hits: 2,
  requestId: 'req_cache_003',
  size: 50000,
};

// ============================================
// Mock Circuit Breaker States
// ============================================

/**
 * Circuit breaker - closed state (normal)
 */
export const mockCircuitBreakerClosed: CircuitBreakerState = {
  state: 'closed',
  failureCount: 0,
  successCount: 0,
  lastFailureTime: null,
  resetTime: null,
  blockedRequests: 0,
};

/**
 * Circuit breaker - open state (blocking requests)
 */
export const mockCircuitBreakerOpen: CircuitBreakerState = {
  state: 'open',
  failureCount: 5,
  successCount: 0,
  lastFailureTime: Date.now() - 1000,
  resetTime: Date.now() + 4000, // 5 seconds from failure
  blockedRequests: 12,
};

/**
 * Circuit breaker - half-open state (testing recovery)
 */
export const mockCircuitBreakerHalfOpen: CircuitBreakerState = {
  state: 'half-open',
  failureCount: 5,
  successCount: 1,
  lastFailureTime: Date.now() - 6000,
  resetTime: null,
  blockedRequests: 12,
};

// ============================================
// Mock Rate Limit Info
// ============================================

/**
 * Rate limit info - plenty of requests available
 */
export const mockRateLimitInfoAvailable: RateLimitInfo = {
  limit: 100,
  remaining: 85,
  resetAt: new Date('2026-01-22T14:00:00.000Z'),
  retryAfter: null,
};

/**
 * Rate limit info - nearly exhausted
 */
export const mockRateLimitInfoLow: RateLimitInfo = {
  limit: 100,
  remaining: 5,
  resetAt: new Date('2026-01-22T13:30:00.000Z'),
  retryAfter: null,
};

/**
 * Rate limit info - exhausted
 */
export const mockRateLimitInfoExhausted: RateLimitInfo = {
  limit: 100,
  remaining: 0,
  resetAt: new Date('2026-01-22T14:00:00.000Z'),
  retryAfter: 3600000, // 1 hour in ms
};

// ============================================
// Mock Response Headers
// ============================================

/**
 * Standard response headers
 */
export const mockStandardHeaders = {
  'content-type': 'application/json',
  'x-request-id': 'req_test_001',
  'x-response-time': '150ms',
  'cache-control': 'public, max-age=3600',
};

/**
 * Rate limit headers
 */
export const mockRateLimitHeaders = {
  'content-type': 'application/json',
  'x-ratelimit-limit': '100',
  'x-ratelimit-remaining': '85',
  'x-ratelimit-reset': '1737554400',
};

/**
 * Error response headers
 */
export const mockErrorHeaders = {
  'content-type': 'application/json',
  'x-request-id': 'req_error_001',
  'x-error-code': 'INTERNAL_ERROR',
};

// ============================================
// Mock Multi-Response Scenarios
// ============================================

/**
 * Sequence of responses for retry testing
 */
export const mockRetrySequence = [
  mockServiceUnavailableError, // First attempt fails
  mockServiceUnavailableError, // Second attempt fails
  mockSuccessResponse,          // Third attempt succeeds
];

/**
 * Sequence of responses for circuit breaker testing
 */
export const mockCircuitBreakerSequence = [
  mockInternalServerError, // Failure 1
  mockInternalServerError, // Failure 2
  mockInternalServerError, // Failure 3 - circuit opens
  mockBadGatewayError,     // Would be blocked by open circuit
  mockBadGatewayError,     // Would be blocked by open circuit
];

/**
 * Sequence of responses for rate limit testing
 */
export const mockRateLimitSequence = [
  mockSuccessResponse,    // Normal request
  mockSuccessResponse,    // Normal request
  mockRateLimitError,     // Rate limit hit
  mockSuccessResponse,    // After backoff
];

// ============================================
// Helper Functions
// ============================================

/**
 * Creates a mock API response with custom data
 */
export function createMockApiResponse<T>(
  data: T,
  status: number = 200,
  cached: boolean = false
): ApiResponse<T> {
  return {
    data,
    status,
    headers: mockStandardHeaders,
    cached,
    requestId: `req_mock_${Date.now()}`,
    responseTime: cached ? 5 : Math.floor(Math.random() * 300) + 50,
    ...(cached && {
      cacheMetadata: {
        age: 15000,
        expiresAt: new Date(Date.now() + 45000),
        isStale: false,
      },
    }),
  };
}

/**
 * Creates a mock error response
 */
export function createMockErrorResponse(
  message: string,
  status: number,
  code?: string
) {
  return {
    message,
    code: code || `ERROR_${status}`,
    status,
    details: {
      timestamp: new Date().toISOString(),
      requestId: `req_error_${Date.now()}`,
    },
  };
}

/**
 * Creates a mock cache entry
 */
export function createMockCacheEntry<T>(
  data: T,
  ageMs: number = 0,
  ttlMs: number = 60000
): CacheEntry<T> {
  return {
    data,
    timestamp: Date.now() - ageMs,
    ttl: ttlMs,
    hits: Math.floor(Math.random() * 10),
    requestId: `req_cache_${Date.now()}`,
    size: new Blob([JSON.stringify(data)]).size,
  };
}

/**
 * Simulates network delay
 */
export async function simulateNetworkDelay(ms: number = 100): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Creates a mock fetch Response object
 */
export function createMockFetchResponse<T>(
  data: T,
  status: number = 200,
  headers: Record<string, string> = {}
): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: getStatusText(status),
    headers: new Headers({
      'content-type': 'application/json',
      ...headers,
    }),
    json: async () => data,
    text: async () => JSON.stringify(data),
    blob: async () => new Blob([JSON.stringify(data)]),
    arrayBuffer: async () => new TextEncoder().encode(JSON.stringify(data)).buffer,
    clone: function() { return this; },
  } as Response;
}

/**
 * Gets standard HTTP status text
 */
function getStatusText(status: number): string {
  const statusTexts: Record<number, string> = {
    200: 'OK',
    201: 'Created',
    204: 'No Content',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    408: 'Request Timeout',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
  };
  return statusTexts[status] || 'Unknown';
}

// ============================================
// Exports
// ============================================

/**
 * API fixtures namespace for grouped imports
 */
export const APIFixtures = {
  // Configurations
  config: mockApiConfig,
  configWithAuth: mockApiConfigWithAuth,
  cacheConfig: mockCacheConfig,
  cacheConfigDisabled: mockCacheConfigDisabled,
  circuitBreakerConfig: mockCircuitBreakerConfig,
  rateLimitConfig: mockRateLimitConfig,

  // Generic responses
  successResponse: mockSuccessResponse,
  cachedResponse: mockCachedResponse,
  emptyResponse: mockEmptyResponse,

  // Service-specific responses
  census: {
    geocoder: mockCensusGeocoderResponse,
    acs: mockCensusACSResponse,
    geographic: mockCensusGeographicData,
    demographics: mockCensusDemographicsData,
  },
  fbiCrime: {
    data: mockFBICrimeDataResponse,
    summary: mockCrimeSummary,
  },
  climate: {
    data: mockClimateDataResponse,
  },
  elevation: {
    data: mockElevationDataResponse,
  },

  // Error responses
  errors: {
    badRequest: mockBadRequestError,
    unauthorized: mockUnauthorizedError,
    forbidden: mockForbiddenError,
    notFound: mockNotFoundError,
    rateLimit: mockRateLimitError,
    internalServer: mockInternalServerError,
    badGateway: mockBadGatewayError,
    serviceUnavailable: mockServiceUnavailableError,
    timeout: mockTimeoutError,
    network: mockNetworkError,
  },

  // Cache entries
  cache: {
    fresh: mockFreshCacheEntry,
    stale: mockStaleCacheEntry,
    large: mockLargeCacheEntry,
  },

  // Circuit breaker states
  circuitBreaker: {
    closed: mockCircuitBreakerClosed,
    open: mockCircuitBreakerOpen,
    halfOpen: mockCircuitBreakerHalfOpen,
  },

  // Rate limit info
  rateLimit: {
    available: mockRateLimitInfoAvailable,
    low: mockRateLimitInfoLow,
    exhausted: mockRateLimitInfoExhausted,
  },

  // Headers
  headers: {
    standard: mockStandardHeaders,
    rateLimit: mockRateLimitHeaders,
    error: mockErrorHeaders,
  },

  // Sequences
  sequences: {
    retry: mockRetrySequence,
    circuitBreaker: mockCircuitBreakerSequence,
    rateLimit: mockRateLimitSequence,
  },

  // Helper functions
  createResponse: createMockApiResponse,
  createError: createMockErrorResponse,
  createCacheEntry: createMockCacheEntry,
  simulateDelay: simulateNetworkDelay,
  createFetchResponse: createMockFetchResponse,
};

export default APIFixtures;

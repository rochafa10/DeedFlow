/**
 * API Integration Layer
 *
 * Comprehensive API integration layer with:
 * - Custom error classes for different error scenarios
 * - Type definitions for requests, responses, and configurations
 * - Base service with caching, retry logic, circuit breaker, and rate limiting
 * - FEMA flood zone data service
 * - Census geographic and demographic data service
 * - Health check utilities for service monitoring
 *
 * @module @/lib/api
 *
 * @example
 * ```typescript
 * import {
 *   FEMAService,
 *   CensusService,
 *   checkApiHealth,
 *   ApiError,
 *   isRateLimitError
 * } from '@/lib/api';
 *
 * // Create service instances
 * const fema = new FEMAService();
 * const census = new CensusService({ apiKey: process.env.CENSUS_API_KEY });
 *
 * // Get flood zone for a property
 * const floodZone = await fema.getFloodZone(40.7128, -74.0060);
 *
 * // Get demographics for a county
 * const demographics = await census.getDemographics('36061');
 *
 * // Check service health
 * const health = await checkApiHealth(fema);
 * ```
 */

// ============================================================================
// Error Classes
// ============================================================================

export {
  ApiError,
  RateLimitError,
  CircuitBreakerError,
  ValidationError,
  TimeoutError,
  NetworkError,
  // Type guards
  isApiError,
  isRateLimitError,
  isCircuitBreakerError,
  isValidationError,
  isTimeoutError,
  isNetworkError,
  // Utilities
  getNetworkErrorType,
} from './errors';

// ============================================================================
// Types
// ============================================================================

export type {
  // Configuration Types
  ApiConfig,
  CacheConfig,
  CircuitBreakerConfig,
  RateLimitConfig,

  // Request Types
  HttpMethod,
  RequestOptions,

  // Response Types
  ApiResponse,
  PaginatedResponse,

  // Cache Types
  CircuitState,
  CacheEntry,
  CacheStats,
  CircuitBreakerState,

  // Rate Limiting Types
  RateLimitInfo,
  RateLimiterState,

  // Logging Types
  RequestLogEntry,

  // Health Check Types
  HealthStatus,
  HealthCheckError,

  // External API Response Types
  FloodZoneResponse,
  NFHLResponse,
  GeographicResponse,
  DemographicsResponse,

  // Utility Types
  DeepPartial,
  ExtractApiData,
} from './types';

// Default Configurations
export {
  DEFAULT_API_CONFIG,
  DEFAULT_CACHE_CONFIG,
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
  DEFAULT_RATE_LIMIT_CONFIG,
} from './types';

// ============================================================================
// Base Service
// ============================================================================

export { BaseApiService, default as BaseService } from './base-service';

// ============================================================================
// API Services
// ============================================================================

export {
  // FEMA Service
  FEMAService,
  getFEMAService,
  resetFEMAService,
  // Census Service
  CensusService,
  getCensusService,
  resetCensusService,
} from './services';

// ============================================================================
// Health Check Utilities
// ============================================================================

export {
  checkApiHealth,
  checkAllServicesHealth,
  createHealthHandler,
  getHealthStatusCode,
  formatHealthStatus,
  resetHealthHistory,
  resetServiceHealthHistory,
  shouldSkipHealthCheck,
  createSimpleHealthResponse,
} from './health';

export type {
  HealthCheckConfig,
  HealthCheckResult,
  AggregatedHealthStatus,
} from './health';

// ============================================================================
// Authenticated Fetch (existing utility)
// ============================================================================

export {
  authFetch,
  authGet,
  authPost,
  authPut,
  authPatch,
  authDelete,
} from './authFetch';

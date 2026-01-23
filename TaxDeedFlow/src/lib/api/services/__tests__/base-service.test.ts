/**
 * Base API Service Tests
 *
 * Tests the core API service functionality including:
 * - Request/response handling
 * - Caching with TTL and eviction
 * - Circuit breaker pattern (closed, open, half-open states)
 * - Rate limiting with token bucket algorithm
 * - Retry logic with exponential backoff
 * - Request deduplication
 * - Error handling and logging
 *
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-22
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { BaseApiService } from '../../base-service';
import {
  ApiError,
  RateLimitError,
  CircuitBreakerError,
  TimeoutError,
  NetworkError,
} from '../../errors';
import type { ApiConfig, CacheConfig, CircuitBreakerConfig, RateLimitConfig } from '../../types';

// ============================================
// Test Service Implementation
// ============================================

/**
 * Concrete test implementation of BaseApiService
 * Exposes protected methods for testing
 */
class TestApiService extends BaseApiService {
  constructor(
    config: Partial<ApiConfig> & { baseUrl: string },
    cacheConfig?: Partial<CacheConfig>,
    circuitBreakerConfig?: Partial<CircuitBreakerConfig>,
    rateLimitConfig?: Partial<RateLimitConfig>
  ) {
    super(config, cacheConfig, circuitBreakerConfig, rateLimitConfig);
  }

  // Expose protected methods for testing
  public async testRequest<T>(endpoint: string, options?: any) {
    return this.request<T>(endpoint, options);
  }

  public testBuildUrl(endpoint: string, params?: Record<string, any>) {
    return this.buildUrl(endpoint, params);
  }

  public testGetCacheKey(endpoint: string, options?: any) {
    return this.getCacheKey(endpoint, options);
  }

  public async testGetFromCache<T>(key: string) {
    return this.getFromCache<T>(key);
  }

  public async testSetCache<T>(key: string, data: T, ttl?: number, requestId?: string) {
    return this.setCache(key, data, ttl, requestId);
  }

  public testRecordSuccess() {
    return this.recordSuccess();
  }

  public testRecordFailure() {
    return this.recordFailure();
  }

  public async testCheckRateLimit() {
    return this.checkRateLimit();
  }

  // Expose convenience methods
  public async testGet<T>(endpoint: string, options?: any) {
    return this.get<T>(endpoint, options);
  }

  public async testPost<T>(endpoint: string, body?: unknown, options?: any) {
    return this.post<T>(endpoint, body, options);
  }

  public async testPut<T>(endpoint: string, body?: unknown, options?: any) {
    return this.put<T>(endpoint, body, options);
  }

  public async testPatch<T>(endpoint: string, body?: unknown, options?: any) {
    return this.patch<T>(endpoint, body, options);
  }

  public async testDelete<T>(endpoint: string, options?: any) {
    return this.delete<T>(endpoint, options);
  }
}

// ============================================
// Test Data & Mocks
// ============================================

const mockBaseUrl = 'https://api.example.com';
const mockApiResponse = { data: 'test', success: true };
const mockApiKey = 'test-api-key-12345';

/**
 * Creates a mock fetch response
 */
function createMockResponse(
  data: any,
  status = 200,
  headers: Record<string, string> = {}
): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: new Map(Object.entries({
      'content-type': 'application/json',
      ...headers,
    })) as any,
    json: async () => data,
    text: async () => JSON.stringify(data),
  } as Response;
}

/**
 * Creates a mock fetch that succeeds
 */
function mockFetchSuccess(data = mockApiResponse, status = 200, headers = {}) {
  return vi.fn().mockResolvedValue(createMockResponse(data, status, headers));
}

/**
 * Creates a mock fetch that fails
 */
function mockFetchFailure(status = 500, message = 'Internal Server Error') {
  return vi.fn().mockResolvedValue(
    createMockResponse({ error: message }, status)
  );
}

/**
 * Creates a mock fetch that times out
 */
function mockFetchTimeout() {
  return vi.fn().mockImplementation(() => {
    return new Promise((_, reject) => {
      setTimeout(() => {
        const error = new Error('The operation was aborted');
        error.name = 'AbortError';
        reject(error);
      }, 100);
    });
  });
}

/**
 * Creates a mock fetch that has network error
 */
function mockFetchNetworkError() {
  return vi.fn().mockRejectedValue(new TypeError('fetch failed: ECONNREFUSED'));
}

// ============================================
// Basic Functionality Tests
// ============================================

describe('BaseApiService - Basic Functionality', () => {
  let service: TestApiService;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    service = new TestApiService({ baseUrl: mockBaseUrl });
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('constructor and initialization', () => {
    it('should initialize with required config', () => {
      const testService = new TestApiService({ baseUrl: mockBaseUrl });
      expect(testService).toBeDefined();
    });

    it('should merge with default configurations', () => {
      const testService = new TestApiService({
        baseUrl: mockBaseUrl,
        timeout: 5000,
      });
      expect(testService).toBeDefined();
    });

    it('should accept custom cache config', () => {
      const cacheConfig = { enabled: false, ttl: 1000, maxSize: 50, storage: 'memory' as const };
      const testService = new TestApiService({ baseUrl: mockBaseUrl }, cacheConfig);
      const stats = testService.getCacheStats();
      expect(stats.size).toBe(0);
    });

    it('should accept custom circuit breaker config', () => {
      const circuitConfig = { failureThreshold: 10, resetTimeout: 30000, halfOpenRequests: 5 };
      const testService = new TestApiService({ baseUrl: mockBaseUrl }, undefined, circuitConfig);
      const state = testService.getCircuitBreakerState();
      expect(state.state).toBe('closed');
    });

    it('should accept custom rate limit config', () => {
      const rateLimitConfig = { requestsPerSecond: 5, burstSize: 10 };
      const testService = new TestApiService({ baseUrl: mockBaseUrl }, undefined, undefined, rateLimitConfig);
      expect(testService).toBeDefined();
    });

    it('should initialize circuit breaker in closed state', () => {
      const state = service.getCircuitBreakerState();
      expect(state.state).toBe('closed');
      expect(state.failureCount).toBe(0);
      expect(state.successCount).toBe(0);
    });
  });

  describe('URL building', () => {
    it('should build URL without parameters', () => {
      const url = service.testBuildUrl('/users');
      expect(url).toBe('https://api.example.com/users');
    });

    it('should build URL with parameters', () => {
      const url = service.testBuildUrl('/users', { id: 123, active: true });
      expect(url).toBe('https://api.example.com/users?id=123&active=true');
    });

    it('should handle endpoint with leading slash', () => {
      const url = service.testBuildUrl('/users');
      expect(url).toBe('https://api.example.com/users');
    });

    it('should handle endpoint without leading slash', () => {
      const url = service.testBuildUrl('users');
      expect(url).toBe('https://api.example.com/users');
    });

    it('should skip undefined parameters', () => {
      const url = service.testBuildUrl('/users', { id: 123, name: undefined });
      expect(url).toBe('https://api.example.com/users?id=123');
    });

    it('should handle baseUrl with trailing slash', () => {
      const testService = new TestApiService({ baseUrl: 'https://api.example.com/' });
      const url = testService.testBuildUrl('/users');
      expect(url).toBe('https://api.example.com/users');
    });
  });

  describe('cache key generation', () => {
    it('should generate consistent cache keys', () => {
      const key1 = service.testGetCacheKey('/users', { method: 'GET' });
      const key2 = service.testGetCacheKey('/users', { method: 'GET' });
      expect(key1).toBe(key2);
    });

    it('should generate different keys for different endpoints', () => {
      const key1 = service.testGetCacheKey('/users');
      const key2 = service.testGetCacheKey('/posts');
      expect(key1).not.toBe(key2);
    });

    it('should generate different keys for different methods', () => {
      const key1 = service.testGetCacheKey('/users', { method: 'GET' });
      const key2 = service.testGetCacheKey('/users', { method: 'POST' });
      expect(key1).not.toBe(key2);
    });

    it('should include params in cache key', () => {
      const key1 = service.testGetCacheKey('/users', { params: { id: 1 } });
      const key2 = service.testGetCacheKey('/users', { params: { id: 2 } });
      expect(key1).not.toBe(key2);
    });

    it('should include body in cache key', () => {
      const key1 = service.testGetCacheKey('/users', { body: { name: 'Alice' } });
      const key2 = service.testGetCacheKey('/users', { body: { name: 'Bob' } });
      expect(key1).not.toBe(key2);
    });
  });
});

// ============================================
// Caching Tests
// ============================================

describe('BaseApiService - Caching', () => {
  let service: TestApiService;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    service = new TestApiService({ baseUrl: mockBaseUrl });
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('cache operations', () => {
    it('should cache GET responses', async () => {
      global.fetch = mockFetchSuccess();

      const response1 = await service.testGet('/users');
      const response2 = await service.testGet('/users');

      expect(response1.data).toEqual(mockApiResponse);
      expect(response2.cached).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should not cache when caching is disabled', async () => {
      const testService = new TestApiService(
        { baseUrl: mockBaseUrl },
        { enabled: false, ttl: 3600000, maxSize: 100, storage: 'memory' }
      );
      global.fetch = mockFetchSuccess();

      await testService.testGet('/users');
      await testService.testGet('/users');

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should not cache when cache option is false', async () => {
      global.fetch = mockFetchSuccess();

      await service.testGet('/users', { cache: false });
      await service.testGet('/users', { cache: false });

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should respect custom TTL', async () => {
      global.fetch = mockFetchSuccess();

      const key = service.testGetCacheKey('/users');
      await service.testSetCache(key, mockApiResponse, 100);

      const cached1 = await service.testGetFromCache(key);
      expect(cached1).toEqual(mockApiResponse);

      await new Promise(resolve => setTimeout(resolve, 150));

      const cached2 = await service.testGetFromCache(key);
      expect(cached2).toBeNull();
    });

    it('should evict oldest entry when cache is full', async () => {
      const testService = new TestApiService(
        { baseUrl: mockBaseUrl },
        { enabled: true, ttl: 3600000, maxSize: 2, storage: 'memory' }
      );

      const key1 = 'key1';
      const key2 = 'key2';
      const key3 = 'key3';

      await testService.testSetCache(key1, { data: 1 });
      await testService.testSetCache(key2, { data: 2 });
      await testService.testSetCache(key3, { data: 3 });

      const stats = testService.getCacheStats();
      expect(stats.size).toBe(2);

      const cached1 = await testService.testGetFromCache(key1);
      expect(cached1).toBeNull();
    });

    it('should track cache hits and misses', async () => {
      global.fetch = mockFetchSuccess();

      await service.testGet('/users');
      await service.testGet('/users');
      await service.testGet('/posts');

      const stats = service.getCacheStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(2);
      expect(stats.hitRatio).toBeGreaterThan(0);
    });

    it('should clear cache', async () => {
      await service.testSetCache('key1', { data: 1 });
      await service.testSetCache('key2', { data: 2 });

      service.clearCache();

      const stats = service.getCacheStats();
      expect(stats.size).toBe(0);
    });

    it('should invalidate cache by pattern (string)', async () => {
      await service.testSetCache('users:1', { id: 1 });
      await service.testSetCache('users:2', { id: 2 });
      await service.testSetCache('posts:1', { id: 1 });

      const count = service.invalidateCache('users');

      expect(count).toBe(2);
      const stats = service.getCacheStats();
      expect(stats.size).toBe(1);
    });

    it('should invalidate cache by pattern (regex)', async () => {
      await service.testSetCache('users:1', { id: 1 });
      await service.testSetCache('users:2', { id: 2 });
      await service.testSetCache('posts:1', { id: 1 });

      const count = service.invalidateCache(/^users:/);

      expect(count).toBe(2);
      const stats = service.getCacheStats();
      expect(stats.size).toBe(1);
    });

    it('should include cache metadata in cached responses', async () => {
      global.fetch = mockFetchSuccess();

      await service.testGet('/users');
      const response = await service.testGet('/users');

      expect(response.cached).toBe(true);
      expect(response.cacheMetadata).toBeDefined();
      expect(response.cacheMetadata?.age).toBeGreaterThanOrEqual(0);
      expect(response.cacheMetadata?.expiresAt).toBeInstanceOf(Date);
    });
  });

  describe('cache statistics', () => {
    it('should provide accurate cache stats', async () => {
      await service.testSetCache('key1', { data: 'test1' });
      await service.testSetCache('key2', { data: 'test2' });

      const stats = service.getCacheStats();

      expect(stats.size).toBe(2);
      expect(stats.memoryUsage).toBeGreaterThan(0);
      expect(stats.oldestEntry).toBeDefined();
      expect(stats.newestEntry).toBeDefined();
    });

    it('should calculate hit ratio correctly', async () => {
      global.fetch = mockFetchSuccess();

      await service.testGet('/users');
      await service.testGet('/users');
      await service.testGet('/users');
      await service.testGet('/posts');

      const stats = service.getCacheStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(2);
      expect(stats.hitRatio).toBe(0.5);
    });
  });
});

// ============================================
// Circuit Breaker Tests
// ============================================

describe('BaseApiService - Circuit Breaker', () => {
  let service: TestApiService;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    service = new TestApiService(
      { baseUrl: mockBaseUrl, retries: 0 },
      undefined,
      { failureThreshold: 3, resetTimeout: 1000, halfOpenRequests: 2 }
    );
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('circuit states', () => {
    it('should start in closed state', () => {
      const state = service.getCircuitBreakerState();
      expect(state.state).toBe('closed');
    });

    it('should open circuit after threshold failures', async () => {
      global.fetch = mockFetchFailure(500);

      for (let i = 0; i < 3; i++) {
        try {
          await service.testGet('/users');
        } catch (e) {
          // Expected to fail
        }
      }

      const state = service.getCircuitBreakerState();
      expect(state.state).toBe('open');
      expect(state.failureCount).toBe(3);
    });

    it('should block requests when circuit is open', async () => {
      global.fetch = mockFetchFailure(500);

      for (let i = 0; i < 3; i++) {
        try {
          await service.testGet('/users');
        } catch (e) {
          // Expected to fail
        }
      }

      await expect(service.testGet('/users')).rejects.toThrow(CircuitBreakerError);

      const state = service.getCircuitBreakerState();
      expect(state.blockedRequests).toBeGreaterThan(0);
    });

    it('should transition to half-open after reset timeout', async () => {
      global.fetch = mockFetchFailure(500);

      for (let i = 0; i < 3; i++) {
        try {
          await service.testGet('/users');
        } catch (e) {
          // Expected to fail
        }
      }

      expect(service.getCircuitBreakerState().state).toBe('open');

      await new Promise(resolve => setTimeout(resolve, 1100));

      global.fetch = mockFetchSuccess();
      await service.testGet('/users');

      const state = service.getCircuitBreakerState();
      expect(state.state).toBe('half-open');
    });

    it('should close circuit after successful requests in half-open', async () => {
      global.fetch = mockFetchFailure(500);

      for (let i = 0; i < 3; i++) {
        try {
          await service.testGet('/users');
        } catch (e) {
          // Expected to fail
        }
      }

      await new Promise(resolve => setTimeout(resolve, 1100));

      global.fetch = mockFetchSuccess();

      await service.testGet('/users');
      await service.testGet('/posts');

      const state = service.getCircuitBreakerState();
      expect(state.state).toBe('closed');
      expect(state.failureCount).toBe(0);
    });

    it('should reopen circuit on failure in half-open state', async () => {
      global.fetch = mockFetchFailure(500);

      for (let i = 0; i < 3; i++) {
        try {
          await service.testGet('/users');
        } catch (e) {
          // Expected to fail
        }
      }

      await new Promise(resolve => setTimeout(resolve, 1100));

      try {
        await service.testGet('/users');
      } catch (e) {
        // Expected to fail
      }

      const state = service.getCircuitBreakerState();
      expect(state.state).toBe('open');
    });

    it('should reset circuit breaker manually', async () => {
      global.fetch = mockFetchFailure(500);

      for (let i = 0; i < 3; i++) {
        try {
          await service.testGet('/users');
        } catch (e) {
          // Expected to fail
        }
      }

      expect(service.getCircuitBreakerState().state).toBe('open');

      service.resetCircuitBreaker();

      const state = service.getCircuitBreakerState();
      expect(state.state).toBe('closed');
      expect(state.failureCount).toBe(0);
    });

    it('should reset failure count on success in closed state', async () => {
      global.fetch = mockFetchFailure(500);

      try {
        await service.testGet('/users');
      } catch (e) {
        // Expected to fail
      }

      expect(service.getCircuitBreakerState().failureCount).toBe(1);

      global.fetch = mockFetchSuccess();
      await service.testGet('/users');

      expect(service.getCircuitBreakerState().failureCount).toBe(0);
    });
  });
});

// ============================================
// Rate Limiting Tests
// ============================================

describe('BaseApiService - Rate Limiting', () => {
  let service: TestApiService;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('token bucket algorithm', () => {
    it('should allow requests within burst size', async () => {
      service = new TestApiService(
        { baseUrl: mockBaseUrl },
        undefined,
        undefined,
        { requestsPerSecond: 2, burstSize: 5, queueExcess: false }
      );
      global.fetch = mockFetchSuccess();

      for (let i = 0; i < 5; i++) {
        await service.testGet(`/users/${i}`);
      }

      expect(global.fetch).toHaveBeenCalledTimes(5);
    });

    it('should throw error when rate limit exceeded without queueing', async () => {
      service = new TestApiService(
        { baseUrl: mockBaseUrl },
        undefined,
        undefined,
        { requestsPerSecond: 1, burstSize: 2, queueExcess: false }
      );
      global.fetch = mockFetchSuccess();

      await service.testGet('/users/1');
      await service.testGet('/users/2');

      await expect(service.testGet('/users/3')).rejects.toThrow(RateLimitError);
    });

    it('should queue requests when rate limit exceeded with queueing', async () => {
      service = new TestApiService(
        { baseUrl: mockBaseUrl },
        undefined,
        undefined,
        { requestsPerSecond: 10, burstSize: 2, queueExcess: true }
      );
      global.fetch = mockFetchSuccess();

      const startTime = Date.now();

      await service.testGet('/users/1');
      await service.testGet('/users/2');
      await service.testGet('/users/3');

      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeGreaterThan(50);
    });

    it('should refill tokens over time', async () => {
      service = new TestApiService(
        { baseUrl: mockBaseUrl },
        undefined,
        undefined,
        { requestsPerSecond: 10, burstSize: 2, queueExcess: false }
      );
      global.fetch = mockFetchSuccess();

      await service.testGet('/users/1');
      await service.testGet('/users/2');

      await new Promise(resolve => setTimeout(resolve, 200));

      await service.testGet('/users/3');
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('rate limit headers', () => {
    it('should handle 429 rate limit response', async () => {
      service = new TestApiService({ baseUrl: mockBaseUrl, retries: 0 });

      global.fetch = vi.fn().mockResolvedValue(
        createMockResponse({ error: 'Too Many Requests' }, 429, {
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': '0',
          'Retry-After': '60',
        })
      );

      await expect(service.testGet('/users')).rejects.toThrow(RateLimitError);
    });
  });
});

// ============================================
// Retry Logic Tests
// ============================================

describe('BaseApiService - Retry Logic', () => {
  let service: TestApiService;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    service = new TestApiService(
      { baseUrl: mockBaseUrl, retries: 3, retryDelay: 10 }
    );
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('retry behavior', () => {
    it('should retry on server errors', async () => {
      global.fetch = mockFetchFailure(500);

      try {
        await service.testGet('/users');
      } catch (e) {
        // Expected to fail
      }

      expect(global.fetch).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
    });

    it('should not retry on client errors', async () => {
      global.fetch = mockFetchFailure(400);

      try {
        await service.testGet('/users');
      } catch (e) {
        // Expected to fail
      }

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should not retry on rate limit errors', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        createMockResponse({ error: 'Too Many Requests' }, 429)
      );

      try {
        await service.testGet('/users');
      } catch (e) {
        // Expected to fail
      }

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should succeed on eventual success', async () => {
      let attempts = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          return Promise.resolve(createMockResponse({ error: 'Error' }, 500));
        }
        return Promise.resolve(createMockResponse(mockApiResponse));
      });

      const response = await service.testGet('/users');

      expect(response.data).toEqual(mockApiResponse);
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should respect custom retry count', async () => {
      global.fetch = mockFetchFailure(500);

      try {
        await service.testGet('/users', { retries: 1 });
      } catch (e) {
        // Expected to fail
      }

      expect(global.fetch).toHaveBeenCalledTimes(2); // 1 initial + 1 retry
    });
  });
});

// ============================================
// Request Deduplication Tests
// ============================================

describe('BaseApiService - Request Deduplication', () => {
  let service: TestApiService;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    service = new TestApiService(
      { baseUrl: mockBaseUrl },
      { enabled: false, ttl: 3600000, maxSize: 100, storage: 'memory' }
    );
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('deduplication', () => {
    it('should deduplicate identical concurrent GET requests', async () => {
      global.fetch = vi.fn().mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve(createMockResponse(mockApiResponse));
          }, 50);
        });
      });

      const [response1, response2, response3] = await Promise.all([
        service.testGet('/users'),
        service.testGet('/users'),
        service.testGet('/users'),
      ]);

      expect(response1.data).toEqual(mockApiResponse);
      expect(response2.data).toEqual(mockApiResponse);
      expect(response3.data).toEqual(mockApiResponse);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should not deduplicate POST requests', async () => {
      global.fetch = vi.fn().mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve(createMockResponse(mockApiResponse));
          }, 50);
        });
      });

      await Promise.all([
        service.testPost('/users', { name: 'Alice' }),
        service.testPost('/users', { name: 'Alice' }),
      ]);

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should not deduplicate different endpoints', async () => {
      global.fetch = vi.fn().mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve(createMockResponse(mockApiResponse));
          }, 50);
        });
      });

      await Promise.all([
        service.testGet('/users'),
        service.testGet('/posts'),
      ]);

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });
});

// ============================================
// Error Handling Tests
// ============================================

describe('BaseApiService - Error Handling', () => {
  let service: TestApiService;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    service = new TestApiService({ baseUrl: mockBaseUrl, retries: 0 });
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('error types', () => {
    it('should throw ApiError on HTTP errors', async () => {
      global.fetch = mockFetchFailure(500);

      await expect(service.testGet('/users')).rejects.toThrow(ApiError);
    });

    it('should throw TimeoutError on timeout', async () => {
      service = new TestApiService({ baseUrl: mockBaseUrl, timeout: 50, retries: 0 });
      global.fetch = mockFetchTimeout();

      await expect(service.testGet('/users')).rejects.toThrow(TimeoutError);
    });

    it('should throw NetworkError on network failure', async () => {
      global.fetch = mockFetchNetworkError();

      await expect(service.testGet('/users')).rejects.toThrow(NetworkError);
    });

    it('should include request metadata in errors', async () => {
      global.fetch = mockFetchFailure(404);

      try {
        await service.testGet('/users');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        if (error instanceof ApiError) {
          expect(error.endpoint).toBe('/users');
          expect(error.statusCode).toBe(404);
          expect(error.requestId).toBeDefined();
        }
      }
    });
  });
});

// ============================================
// Convenience Methods Tests
// ============================================

describe('BaseApiService - Convenience Methods', () => {
  let service: TestApiService;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    service = new TestApiService({ baseUrl: mockBaseUrl });
    global.fetch = mockFetchSuccess();
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('HTTP methods', () => {
    it('should perform GET request', async () => {
      const response = await service.testGet('/users');
      expect(response.data).toEqual(mockApiResponse);
    });

    it('should perform POST request', async () => {
      const body = { name: 'Alice' };
      const response = await service.testPost('/users', body);
      expect(response.data).toEqual(mockApiResponse);
    });

    it('should perform PUT request', async () => {
      const body = { name: 'Alice' };
      const response = await service.testPut('/users/1', body);
      expect(response.data).toEqual(mockApiResponse);
    });

    it('should perform PATCH request', async () => {
      const body = { name: 'Alice' };
      const response = await service.testPatch('/users/1', body);
      expect(response.data).toEqual(mockApiResponse);
    });

    it('should perform DELETE request', async () => {
      const response = await service.testDelete('/users/1');
      expect(response.data).toEqual(mockApiResponse);
    });
  });
});

// ============================================
// Logging Tests
// ============================================

describe('BaseApiService - Logging', () => {
  let service: TestApiService;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    service = new TestApiService({ baseUrl: mockBaseUrl });
    global.fetch = mockFetchSuccess();
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('request logging', () => {
    it('should log successful requests', async () => {
      await service.testGet('/users');

      const logs = service.getRequestLog();
      expect(logs.length).toBeGreaterThan(0);

      const lastLog = logs[logs.length - 1];
      expect(lastLog.method).toBe('GET');
      expect(lastLog.endpoint).toBe('/users');
      expect(lastLog.status).toBe(200);
      expect(lastLog.error).toBeUndefined();
    });

    it('should log failed requests', async () => {
      const testService = new TestApiService({ baseUrl: mockBaseUrl, retries: 0 });
      global.fetch = mockFetchFailure(500);

      try {
        await testService.testGet('/users');
      } catch (e) {
        // Expected to fail
      }

      const logs = testService.getRequestLog();
      const lastLog = logs[logs.length - 1];
      expect(lastLog.error).toBeDefined();
    });

    it('should limit log size', async () => {
      const testService = new TestApiService(
        { baseUrl: mockBaseUrl, retries: 0 },
        { enabled: false, ttl: 3600000, maxSize: 100, storage: 'memory' }
      );
      global.fetch = mockFetchSuccess();

      for (let i = 0; i < 150; i++) {
        try {
          await testService.testGet(`/users/${i}`);
        } catch (e) {
          // Ignore
        }
      }

      const logs = testService.getRequestLog();
      expect(logs.length).toBeLessThanOrEqual(100);
    });
  });
});

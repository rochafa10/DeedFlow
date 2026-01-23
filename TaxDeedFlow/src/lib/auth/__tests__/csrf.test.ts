/**
 * CSRF Token Validation Tests
 *
 * Tests the CSRF protection functionality including:
 * - Token generation and validation
 * - Server-side token storage and verification
 * - Token expiration handling
 * - Single-use token enforcement
 * - CSRF validation for HTTP requests
 * - Token cleanup mechanisms
 *
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-22
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  generateCsrfToken,
  storeCsrfToken,
  validateStoredCsrfToken,
  cleanupExpiredCsrfTokens,
  validateCsrf,
  csrfErrorResponse,
  getCsrfStorageKey,
  getCsrfHeaderName,
} from '../csrf';

// ============================================
// Mock Setup
// ============================================

// Mock the Supabase client module
vi.mock('@/lib/supabase/client', () => ({
  createServerClient: vi.fn(),
}));

// Mock crypto for consistent token generation in tests
const mockCrypto = {
  getRandomValues: vi.fn((array: Uint8Array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = i % 256; // Predictable values for testing
    }
    return array;
  }),
};

// ============================================
// Test Utilities
// ============================================

/**
 * Create a mock Supabase client with configurable responses
 */
function createMockSupabaseClient(config: {
  insertSuccess?: boolean;
  selectData?: any;
  selectError?: any;
  deleteSuccess?: boolean;
  rpcData?: any;
  rpcError?: any;
} = {}) {
  const {
    insertSuccess = true,
    selectData = null,
    selectError = null,
    deleteSuccess = true,
    rpcData = null,
    rpcError = null,
  } = config;

  return {
    from: vi.fn((table: string) => ({
      insert: vi.fn(() => ({
        error: insertSuccess ? null : { message: 'Insert failed' },
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: selectData,
            error: selectError,
          })),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          error: deleteSuccess ? null : { message: 'Delete failed' },
        })),
      })),
    })),
    rpc: vi.fn(() => ({
      data: rpcData,
      error: rpcError,
    })),
  };
}

/**
 * Create a mock NextRequest for testing
 */
function createMockRequest(config: {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
} = {}): NextRequest {
  const {
    method = 'GET',
    url = 'http://localhost:3000/api/test',
    headers = {},
  } = config;

  const request = new NextRequest(url, {
    method,
    headers: new Headers(headers),
  });

  return request;
}

/**
 * Get future date for testing token expiration
 */
function getFutureDate(minutesFromNow: number): Date {
  const date = new Date();
  date.setMinutes(date.getMinutes() + minutesFromNow);
  return date;
}

/**
 * Get past date for testing expired tokens
 */
function getPastDate(minutesAgo: number): Date {
  const date = new Date();
  date.setMinutes(date.getMinutes() - minutesAgo);
  return date;
}

// ============================================
// Token Generation Tests
// ============================================

describe('generateCsrfToken', () => {
  beforeEach(() => {
    // Mock crypto for consistent testing
    vi.stubGlobal('crypto', mockCrypto);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('should generate a 64-character hexadecimal token', () => {
    const token = generateCsrfToken();

    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.length).toBe(64); // 32 bytes * 2 hex chars per byte
    expect(token).toMatch(/^[0-9a-f]{64}$/); // Only hex characters
  });

  it('should generate different tokens on successive calls', () => {
    // Use real crypto to get random values
    vi.stubGlobal('crypto', {
      getRandomValues: (array: Uint8Array) => {
        for (let i = 0; i < array.length; i++) {
          array[i] = Math.floor(Math.random() * 256);
        }
        return array;
      },
    });

    const token1 = generateCsrfToken();
    const token2 = generateCsrfToken();
    const token3 = generateCsrfToken();

    expect(token1).not.toBe(token2);
    expect(token2).not.toBe(token3);
    expect(token1).not.toBe(token3);
  });

  it('should work with crypto.getRandomValues', () => {
    const mockGetRandomValues = vi.fn((array: Uint8Array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = 255; // All bytes set to 0xFF
      }
      return array;
    });

    vi.stubGlobal('crypto', { getRandomValues: mockGetRandomValues });

    const token = generateCsrfToken();

    expect(mockGetRandomValues).toHaveBeenCalledTimes(1);
    expect(token).toBe('f'.repeat(64)); // All 0xFF bytes = 'ff' in hex
  });

  it('should fallback to Math.random when crypto is unavailable', () => {
    // Remove crypto to test fallback
    vi.stubGlobal('crypto', undefined);

    const token = generateCsrfToken();

    expect(token).toBeDefined();
    expect(token.length).toBe(64);
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });
});

// ============================================
// Token Storage Tests
// ============================================

describe('storeCsrfToken', () => {
  let createServerClient: any;

  beforeEach(async () => {
    const module = await import('@/lib/supabase/client');
    createServerClient = module.createServerClient;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully store a valid token', async () => {
    const mockClient = createMockSupabaseClient({ insertSuccess: true });
    vi.mocked(createServerClient).mockReturnValue(mockClient as any);

    const token = generateCsrfToken();
    const result = await storeCsrfToken(token);

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
    expect(mockClient.from).toHaveBeenCalledWith('csrf_tokens');
  });

  it('should store token with session ID when provided', async () => {
    const mockInsert = vi.fn(() => ({ error: null }));
    const mockClient = {
      from: vi.fn(() => ({
        insert: mockInsert,
      })),
    };
    vi.mocked(createServerClient).mockReturnValue(mockClient as any);

    const token = generateCsrfToken();
    const sessionId = 'test-session-123';
    const result = await storeCsrfToken(token, sessionId);

    expect(result.success).toBe(true);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_session_id: sessionId,
      })
    );
  });

  it('should hash token before storage', async () => {
    const mockInsert = vi.fn(() => ({ error: null }));
    const mockClient = {
      from: vi.fn(() => ({
        insert: mockInsert,
      })),
    };
    vi.mocked(createServerClient).mockReturnValue(mockClient as any);

    const token = 'test-token-12345678901234567890';
    await storeCsrfToken(token);

    const insertCall = mockInsert.mock.calls[0][0];
    expect(insertCall.token_hash).toBeDefined();
    expect(insertCall.token_hash).not.toBe(token); // Should be hashed, not plaintext
    expect(insertCall.token_hash.length).toBe(64); // SHA-256 produces 64 hex chars
  });

  it('should set expiration time 30 minutes in future', async () => {
    const mockInsert = vi.fn(() => ({ error: null }));
    const mockClient = {
      from: vi.fn(() => ({
        insert: mockInsert,
      })),
    };
    vi.mocked(createServerClient).mockReturnValue(mockClient as any);

    const beforeTime = new Date();
    beforeTime.setMinutes(beforeTime.getMinutes() + 29); // 29 minutes from now

    const token = generateCsrfToken();
    await storeCsrfToken(token);

    const afterTime = new Date();
    afterTime.setMinutes(afterTime.getMinutes() + 31); // 31 minutes from now

    const insertCall = mockInsert.mock.calls[0][0];
    const expiresAt = new Date(insertCall.expires_at);

    expect(expiresAt.getTime()).toBeGreaterThan(beforeTime.getTime());
    expect(expiresAt.getTime()).toBeLessThan(afterTime.getTime());
  });

  it('should handle database insert failure', async () => {
    const mockClient = createMockSupabaseClient({ insertSuccess: false });
    vi.mocked(createServerClient).mockReturnValue(mockClient as any);

    const token = generateCsrfToken();
    const result = await storeCsrfToken(token);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to store CSRF token');
  });

  it('should handle missing Supabase configuration', async () => {
    vi.mocked(createServerClient).mockReturnValue(null);

    const token = generateCsrfToken();
    const result = await storeCsrfToken(token);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Database not configured');
  });

  it('should handle exceptions during storage', async () => {
    const mockClient = {
      from: vi.fn(() => {
        throw new Error('Database connection error');
      }),
    };
    vi.mocked(createServerClient).mockReturnValue(mockClient as any);

    const token = generateCsrfToken();
    const result = await storeCsrfToken(token);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to store CSRF token');
  });
});

// ============================================
// Token Validation Tests
// ============================================

describe('validateStoredCsrfToken', () => {
  let createServerClient: any;

  beforeEach(async () => {
    const module = await import('@/lib/supabase/client');
    createServerClient = module.createServerClient;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should validate a valid stored token', async () => {
    const tokenData = {
      id: 'token-123',
      expires_at: getFutureDate(15).toISOString(), // Expires in 15 minutes
    };

    const mockClient = createMockSupabaseClient({
      selectData: tokenData,
      deleteSuccess: true,
    });
    vi.mocked(createServerClient).mockReturnValue(mockClient as any);

    const token = generateCsrfToken();
    const result = await validateStoredCsrfToken(token);

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should delete token after successful validation (single-use)', async () => {
    const tokenData = {
      id: 'token-456',
      expires_at: getFutureDate(15).toISOString(),
    };

    const mockEq = vi.fn(() => ({ error: null }));
    const mockDelete = vi.fn(() => ({
      eq: mockEq,
    }));

    const mockClient = {
      from: vi.fn((table: string) => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: tokenData,
              error: null,
            })),
          })),
        })),
        delete: mockDelete,
      })),
    };

    vi.mocked(createServerClient).mockReturnValue(mockClient as any);

    const token = generateCsrfToken();
    await validateStoredCsrfToken(token);

    expect(mockDelete).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith('id', 'token-456');
  });

  it('should reject token that does not exist in database', async () => {
    const mockClient = createMockSupabaseClient({
      selectData: null,
      selectError: { message: 'Not found' },
    });
    vi.mocked(createServerClient).mockReturnValue(mockClient as any);

    const token = generateCsrfToken();
    const result = await validateStoredCsrfToken(token);

    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid or expired CSRF token.');
  });

  it('should reject expired token', async () => {
    const tokenData = {
      id: 'token-789',
      expires_at: getPastDate(5).toISOString(), // Expired 5 minutes ago
    };

    const mockClient = createMockSupabaseClient({
      selectData: tokenData,
      deleteSuccess: true,
    });
    vi.mocked(createServerClient).mockReturnValue(mockClient as any);

    const token = generateCsrfToken();
    const result = await validateStoredCsrfToken(token);

    expect(result.valid).toBe(false);
    expect(result.error).toBe('CSRF token has expired.');
  });

  it('should delete expired token during validation', async () => {
    const tokenData = {
      id: 'token-expired-123',
      expires_at: getPastDate(10).toISOString(),
    };

    const mockEq = vi.fn(() => ({ error: null }));
    const mockDelete = vi.fn(() => ({
      eq: mockEq,
    }));

    const mockClient = {
      from: vi.fn((table: string) => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: tokenData,
              error: null,
            })),
          })),
        })),
        delete: mockDelete,
      })),
    };

    vi.mocked(createServerClient).mockReturnValue(mockClient as any);

    const token = generateCsrfToken();
    await validateStoredCsrfToken(token);

    expect(mockDelete).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith('id', 'token-expired-123');
  });

  it('should still return valid even if token deletion fails', async () => {
    const tokenData = {
      id: 'token-delete-fail',
      expires_at: getFutureDate(15).toISOString(),
    };

    const mockClient = createMockSupabaseClient({
      selectData: tokenData,
      deleteSuccess: false, // Delete fails
    });
    vi.mocked(createServerClient).mockReturnValue(mockClient as any);

    const token = generateCsrfToken();
    const result = await validateStoredCsrfToken(token);

    // Token was valid, so validation should still succeed
    expect(result.valid).toBe(true);
  });

  it('should fallback to length validation when Supabase not configured', async () => {
    vi.mocked(createServerClient).mockReturnValue(null);

    const validToken = 'a'.repeat(64); // 64 chars (valid)
    const invalidToken = 'abc'; // Too short

    const validResult = await validateStoredCsrfToken(validToken);
    const invalidResult = await validateStoredCsrfToken(invalidToken);

    expect(validResult.valid).toBe(true);
    expect(invalidResult.valid).toBe(false);
    expect(invalidResult.error).toBe('Invalid CSRF token format.');
  });

  it('should handle exceptions during validation', async () => {
    const mockClient = {
      from: vi.fn(() => {
        throw new Error('Database query error');
      }),
    };
    vi.mocked(createServerClient).mockReturnValue(mockClient as any);

    const token = generateCsrfToken();
    const result = await validateStoredCsrfToken(token);

    expect(result.valid).toBe(false);
    expect(result.error).toBe('CSRF token validation failed.');
  });
});

// ============================================
// Token Cleanup Tests
// ============================================

describe('cleanupExpiredCsrfTokens', () => {
  let createServerClient: any;

  beforeEach(async () => {
    const module = await import('@/lib/supabase/client');
    createServerClient = module.createServerClient;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully cleanup expired tokens', async () => {
    const mockClient = createMockSupabaseClient({
      rpcData: 5, // 5 tokens deleted
      rpcError: null,
    });
    vi.mocked(createServerClient).mockReturnValue(mockClient as any);

    const deletedCount = await cleanupExpiredCsrfTokens();

    expect(deletedCount).toBe(5);
    expect(mockClient.rpc).toHaveBeenCalledWith('cleanup_expired_csrf_tokens');
  });

  it('should return 0 when no expired tokens exist', async () => {
    const mockClient = createMockSupabaseClient({
      rpcData: 0,
      rpcError: null,
    });
    vi.mocked(createServerClient).mockReturnValue(mockClient as any);

    const deletedCount = await cleanupExpiredCsrfTokens();

    expect(deletedCount).toBe(0);
  });

  it('should handle cleanup RPC errors', async () => {
    const mockClient = createMockSupabaseClient({
      rpcData: null,
      rpcError: { message: 'RPC failed' },
    });
    vi.mocked(createServerClient).mockReturnValue(mockClient as any);

    const deletedCount = await cleanupExpiredCsrfTokens();

    expect(deletedCount).toBe(-1);
  });

  it('should return -1 when Supabase not configured', async () => {
    vi.mocked(createServerClient).mockReturnValue(null);

    const deletedCount = await cleanupExpiredCsrfTokens();

    expect(deletedCount).toBe(-1);
  });

  it('should handle exceptions during cleanup', async () => {
    const mockClient = {
      rpc: vi.fn(() => {
        throw new Error('Cleanup error');
      }),
    };
    vi.mocked(createServerClient).mockReturnValue(mockClient as any);

    const deletedCount = await cleanupExpiredCsrfTokens();

    expect(deletedCount).toBe(-1);
  });
});

// ============================================
// CSRF Request Validation Tests
// ============================================

describe('validateCsrf', () => {
  let createServerClient: any;

  beforeEach(async () => {
    const module = await import('@/lib/supabase/client');
    createServerClient = module.createServerClient;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET requests', () => {
    it('should allow GET requests without CSRF validation', async () => {
      const request = createMockRequest({ method: 'GET' });
      const result = await validateCsrf(request);

      expect(result.valid).toBe(true);
    });
  });

  describe('POST requests with Origin header', () => {
    it('should allow POST with matching Origin header', async () => {
      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/test',
        headers: { Origin: 'http://localhost:3000' },
      });

      const result = await validateCsrf(request);

      expect(result.valid).toBe(true);
    });

    it('should block POST with mismatched Origin header', async () => {
      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/test',
        headers: { Origin: 'http://evil.com' },
      });

      const result = await validateCsrf(request);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Cross-origin request blocked');
    });
  });

  describe('POST requests with Referer header', () => {
    it('should allow POST with matching Referer header', async () => {
      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/test',
        headers: { Referer: 'http://localhost:3000/page' },
      });

      const result = await validateCsrf(request);

      expect(result.valid).toBe(true);
    });

    it('should block POST with mismatched Referer header', async () => {
      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/test',
        headers: { Referer: 'http://evil.com/page' },
      });

      const result = await validateCsrf(request);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Cross-origin request blocked');
    });

    it('should block POST with invalid Referer URL format', async () => {
      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/test',
        headers: { Referer: 'not-a-valid-url' },
      });

      const result = await validateCsrf(request);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid referer format');
    });
  });

  describe('POST requests with CSRF token', () => {
    it('should validate POST with valid CSRF token', async () => {
      const tokenData = {
        id: 'token-valid',
        expires_at: getFutureDate(15).toISOString(),
      };

      const mockClient = createMockSupabaseClient({
        selectData: tokenData,
        deleteSuccess: true,
      });
      vi.mocked(createServerClient).mockReturnValue(mockClient as any);

      const token = generateCsrfToken();
      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/test',
        headers: { 'X-CSRF-Token': token },
      });

      const result = await validateCsrf(request);

      expect(result.valid).toBe(true);
    });

    it('should block POST with invalid CSRF token', async () => {
      const mockClient = createMockSupabaseClient({
        selectData: null,
        selectError: { message: 'Not found' },
      });
      vi.mocked(createServerClient).mockReturnValue(mockClient as any);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/test',
        headers: { 'X-CSRF-Token': 'invalid-token-12345678901234567890' },
      });

      const result = await validateCsrf(request);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid or expired CSRF token');
    });

    it('should block POST with expired CSRF token', async () => {
      const tokenData = {
        id: 'token-expired',
        expires_at: getPastDate(10).toISOString(),
      };

      const mockClient = createMockSupabaseClient({
        selectData: tokenData,
        deleteSuccess: true,
      });
      vi.mocked(createServerClient).mockReturnValue(mockClient as any);

      const token = generateCsrfToken();
      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/test',
        headers: { 'X-CSRF-Token': token },
      });

      const result = await validateCsrf(request);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('CSRF token has expired.');
    });

    it('should block POST without any security headers', async () => {
      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/test',
        headers: {},
      });

      const result = await validateCsrf(request);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Missing security headers');
    });
  });

  describe('state-changing methods', () => {
    it('should validate PUT requests', async () => {
      const request = createMockRequest({
        method: 'PUT',
        url: 'http://localhost:3000/api/test',
        headers: { Origin: 'http://localhost:3000' },
      });

      const result = await validateCsrf(request);

      expect(result.valid).toBe(true);
    });

    it('should validate DELETE requests', async () => {
      const request = createMockRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/test',
        headers: { Origin: 'http://localhost:3000' },
      });

      const result = await validateCsrf(request);

      expect(result.valid).toBe(true);
    });

    it('should validate PATCH requests', async () => {
      const request = createMockRequest({
        method: 'PATCH',
        url: 'http://localhost:3000/api/test',
        headers: { Origin: 'http://localhost:3000' },
      });

      const result = await validateCsrf(request);

      expect(result.valid).toBe(true);
    });
  });
});

// ============================================
// Error Response Tests
// ============================================

describe('csrfErrorResponse', () => {
  it('should return 403 response with default message', () => {
    const response = csrfErrorResponse();

    expect(response.status).toBe(403);
  });

  it('should return 403 response with custom message', async () => {
    const customMessage = 'Custom CSRF error message';
    const response = csrfErrorResponse(customMessage);

    expect(response.status).toBe(403);

    const body = await response.json();
    expect(body.error).toBe('Forbidden');
    expect(body.message).toBe(customMessage);
    expect(body.status).toBe(403);
  });

  it('should include default message when no custom message provided', async () => {
    const response = csrfErrorResponse();
    const body = await response.json();

    expect(body.message).toContain('CSRF validation failed');
  });
});

// ============================================
// Helper Function Tests
// ============================================

describe('helper functions', () => {
  it('getCsrfStorageKey should return storage key', () => {
    const key = getCsrfStorageKey();

    expect(key).toBe('taxdeedflow_csrf_token');
  });

  it('getCsrfHeaderName should return header name', () => {
    const headerName = getCsrfHeaderName();

    expect(headerName).toBe('X-CSRF-Token');
  });
});

// ============================================
// Integration Tests
// ============================================

describe('CSRF token lifecycle (integration)', () => {
  let createServerClient: any;

  beforeEach(async () => {
    const module = await import('@/lib/supabase/client');
    createServerClient = module.createServerClient;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should complete full token lifecycle: generate -> store -> validate -> delete', async () => {
    // Step 1: Generate token
    const token = generateCsrfToken();
    expect(token).toBeDefined();
    expect(token.length).toBe(64);

    // Step 2: Store token
    const mockInsert = vi.fn(() => ({ error: null }));
    let mockClient: any = {
      from: vi.fn(() => ({
        insert: mockInsert,
      })),
    };
    vi.mocked(createServerClient).mockReturnValue(mockClient);

    const storeResult = await storeCsrfToken(token, 'session-123');
    expect(storeResult.success).toBe(true);
    expect(mockInsert).toHaveBeenCalled();

    // Step 3: Validate token (should succeed and delete)
    const tokenData = {
      id: 'token-lifecycle-test',
      expires_at: getFutureDate(15).toISOString(),
    };

    const mockDelete = vi.fn(() => ({
      eq: vi.fn(() => ({ error: null })),
    }));

    mockClient = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: tokenData,
              error: null,
            })),
          })),
        })),
        delete: mockDelete,
      })),
    };
    vi.mocked(createServerClient).mockReturnValue(mockClient);

    const validateResult = await validateStoredCsrfToken(token);
    expect(validateResult.valid).toBe(true);
    expect(mockDelete).toHaveBeenCalled(); // Token deleted after use

    // Step 4: Try to reuse token (should fail - single use)
    mockClient = createMockSupabaseClient({
      selectData: null,
      selectError: { message: 'Not found' },
    });
    vi.mocked(createServerClient).mockReturnValue(mockClient);

    const reuseResult = await validateStoredCsrfToken(token);
    expect(reuseResult.valid).toBe(false);
  });

  it('should prevent token reuse attack', async () => {
    const token = generateCsrfToken();

    // First validation succeeds
    const tokenData = {
      id: 'token-reuse-test',
      expires_at: getFutureDate(15).toISOString(),
    };

    let mockClient = createMockSupabaseClient({
      selectData: tokenData,
      deleteSuccess: true,
    });
    vi.mocked(createServerClient).mockReturnValue(mockClient as any);

    const firstValidation = await validateStoredCsrfToken(token);
    expect(firstValidation.valid).toBe(true);

    // Second validation fails (token was deleted)
    mockClient = createMockSupabaseClient({
      selectData: null,
      selectError: { message: 'Not found' },
    });
    vi.mocked(createServerClient).mockReturnValue(mockClient as any);

    const secondValidation = await validateStoredCsrfToken(token);
    expect(secondValidation.valid).toBe(false);
    expect(secondValidation.error).toContain('Invalid or expired');
  });
});

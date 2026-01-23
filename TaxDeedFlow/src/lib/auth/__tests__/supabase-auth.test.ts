/**
 * Supabase Auth Validation Tests
 *
 * Tests the Supabase Auth validation functionality including:
 * - validateSupabaseAuth function
 * - Valid JWT token authentication
 * - Invalid/expired token handling
 * - Missing token scenarios
 * - Role-based authorization
 * - Response helper functions
 *
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-23
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  validateSupabaseAuth,
  unauthorizedResponse,
  forbiddenResponse,
  type AuthResult,
} from '../supabase-auth';

// ============================================
// Mock Setup
// ============================================

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createServerClient: vi.fn(),
}));

// Import the mocked function
import { createServerClient } from '@/lib/supabase/client';

// ============================================
// Test Fixtures
// ============================================

/**
 * Create a mock NextRequest with Authorization header
 */
function createMockRequest(token?: string): NextRequest {
  const headers = new Headers();
  if (token !== undefined) {
    headers.set('Authorization', token);
  }

  return {
    headers,
    url: 'http://localhost:3000/api/test',
    method: 'GET',
  } as NextRequest;
}

/**
 * Create a mock Supabase client with auth.getUser method
 */
function createMockSupabaseClient(getUserResponse: any) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue(getUserResponse),
    },
  };
}

/**
 * Mock successful user response from Supabase
 */
const mockValidUserResponse = {
  data: {
    user: {
      id: 'user-123',
      email: 'test@example.com',
      user_metadata: {
        full_name: 'Test User',
        role: 'admin',
      },
    },
  },
  error: null,
};

/**
 * Mock user response without metadata
 */
const mockUserWithoutMetadata = {
  data: {
    user: {
      id: 'user-456',
      email: 'basic@example.com',
      user_metadata: {},
    },
  },
  error: null,
};

/**
 * Mock user response with partial metadata
 */
const mockUserWithPartialMetadata = {
  data: {
    user: {
      id: 'user-789',
      email: 'partial@example.com',
      user_metadata: {
        name: 'Partial User',
        // No role specified
      },
    },
  },
  error: null,
};

/**
 * Mock error response for invalid token
 */
const mockInvalidTokenResponse = {
  data: { user: null },
  error: { message: 'Invalid JWT token' },
};

/**
 * Mock error response for expired token
 */
const mockExpiredTokenResponse = {
  data: { user: null },
  error: { message: 'Token has expired' },
};

/**
 * Mock response with no user data
 */
const mockNoUserResponse = {
  data: { user: null },
  error: null,
};

// ============================================
// validateSupabaseAuth Tests
// ============================================

describe('validateSupabaseAuth', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  describe('successful authentication', () => {
    it('should authenticate valid token with full user metadata', async () => {
      const mockClient = createMockSupabaseClient(mockValidUserResponse);
      vi.mocked(createServerClient).mockReturnValue(mockClient as any);

      const request = createMockRequest('Bearer valid-jwt-token');
      const result = await validateSupabaseAuth(request);

      expect(result.authenticated).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.id).toBe('user-123');
      expect(result.user?.email).toBe('test@example.com');
      expect(result.user?.name).toBe('Test User');
      expect(result.user?.role).toBe('admin');
      expect(result.error).toBeUndefined();
    });

    it('should authenticate token without user metadata', async () => {
      const mockClient = createMockSupabaseClient(mockUserWithoutMetadata);
      vi.mocked(createServerClient).mockReturnValue(mockClient as any);

      const request = createMockRequest('Bearer valid-jwt-token');
      const result = await validateSupabaseAuth(request);

      expect(result.authenticated).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.id).toBe('user-456');
      expect(result.user?.email).toBe('basic@example.com');
      expect(result.user?.name).toBe('basic'); // Derived from email
      expect(result.user?.role).toBe('viewer'); // Default role
      expect(result.error).toBeUndefined();
    });

    it('should authenticate token with partial metadata', async () => {
      const mockClient = createMockSupabaseClient(mockUserWithPartialMetadata);
      vi.mocked(createServerClient).mockReturnValue(mockClient as any);

      const request = createMockRequest('Bearer valid-jwt-token');
      const result = await validateSupabaseAuth(request);

      expect(result.authenticated).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.id).toBe('user-789');
      expect(result.user?.email).toBe('partial@example.com');
      expect(result.user?.name).toBe('Partial User'); // From 'name' field
      expect(result.user?.role).toBe('viewer'); // Default role
      expect(result.error).toBeUndefined();
    });

    it('should call Supabase getUser with extracted token', async () => {
      const mockClient = createMockSupabaseClient(mockValidUserResponse);
      vi.mocked(createServerClient).mockReturnValue(mockClient as any);

      const request = createMockRequest('Bearer my-token-here');
      await validateSupabaseAuth(request);

      expect(mockClient.auth.getUser).toHaveBeenCalledWith('my-token-here');
      expect(mockClient.auth.getUser).toHaveBeenCalledTimes(1);
    });
  });

  describe('missing authorization', () => {
    it('should reject request without Authorization header', async () => {
      const mockClient = createMockSupabaseClient(mockValidUserResponse);
      vi.mocked(createServerClient).mockReturnValue(mockClient as any);

      const request = createMockRequest(); // No token
      const result = await validateSupabaseAuth(request);

      expect(result.authenticated).toBe(false);
      expect(result.user).toBeUndefined();
      expect(result.error).toBe('Authentication required. Please provide valid credentials.');
      expect(mockClient.auth.getUser).not.toHaveBeenCalled();
    });

    it('should reject empty Authorization header', async () => {
      const mockClient = createMockSupabaseClient(mockValidUserResponse);
      vi.mocked(createServerClient).mockReturnValue(mockClient as any);

      const request = createMockRequest('');
      const result = await validateSupabaseAuth(request);

      expect(result.authenticated).toBe(false);
      expect(result.user).toBeUndefined();
      expect(result.error).toBe('Authentication required. Please provide valid credentials.');
    });
  });

  describe('invalid authorization format', () => {
    it('should reject token without Bearer prefix', async () => {
      const mockClient = createMockSupabaseClient(mockValidUserResponse);
      vi.mocked(createServerClient).mockReturnValue(mockClient as any);

      const request = createMockRequest('just-a-token');
      const result = await validateSupabaseAuth(request);

      expect(result.authenticated).toBe(false);
      expect(result.user).toBeUndefined();
      expect(result.error).toBe('Invalid authorization header format. Expected: Bearer <token>');
      expect(mockClient.auth.getUser).not.toHaveBeenCalled();
    });

    it('should reject Bearer without token', async () => {
      const mockClient = createMockSupabaseClient(mockValidUserResponse);
      vi.mocked(createServerClient).mockReturnValue(mockClient as any);

      const request = createMockRequest('Bearer ');
      const result = await validateSupabaseAuth(request);

      expect(result.authenticated).toBe(false);
      expect(result.user).toBeUndefined();
      expect(result.error).toBe('Invalid authorization header format. Expected: Bearer <token>');
      expect(mockClient.auth.getUser).not.toHaveBeenCalled();
    });

    it('should reject malformed authorization header', async () => {
      const mockClient = createMockSupabaseClient(mockValidUserResponse);
      vi.mocked(createServerClient).mockReturnValue(mockClient as any);

      const request = createMockRequest('Basic dXNlcjpwYXNz');
      const result = await validateSupabaseAuth(request);

      expect(result.authenticated).toBe(false);
      expect(result.user).toBeUndefined();
      expect(result.error).toBe('Invalid authorization header format. Expected: Bearer <token>');
      expect(mockClient.auth.getUser).not.toHaveBeenCalled();
    });
  });

  describe('invalid tokens', () => {
    it('should reject invalid JWT token', async () => {
      const mockClient = createMockSupabaseClient(mockInvalidTokenResponse);
      vi.mocked(createServerClient).mockReturnValue(mockClient as any);

      const request = createMockRequest('Bearer invalid-token');
      const result = await validateSupabaseAuth(request);

      expect(result.authenticated).toBe(false);
      expect(result.user).toBeUndefined();
      expect(result.error).toBe('Invalid JWT token');
      expect(mockClient.auth.getUser).toHaveBeenCalledWith('invalid-token');
    });

    it('should reject expired token', async () => {
      const mockClient = createMockSupabaseClient(mockExpiredTokenResponse);
      vi.mocked(createServerClient).mockReturnValue(mockClient as any);

      const request = createMockRequest('Bearer expired-token');
      const result = await validateSupabaseAuth(request);

      expect(result.authenticated).toBe(false);
      expect(result.user).toBeUndefined();
      expect(result.error).toBe('Token has expired');
      expect(mockClient.auth.getUser).toHaveBeenCalledWith('expired-token');
    });

    it('should reject token with no user data', async () => {
      const mockClient = createMockSupabaseClient(mockNoUserResponse);
      vi.mocked(createServerClient).mockReturnValue(mockClient as any);

      const request = createMockRequest('Bearer no-user-token');
      const result = await validateSupabaseAuth(request);

      expect(result.authenticated).toBe(false);
      expect(result.user).toBeUndefined();
      expect(result.error).toBe('Invalid or expired token.');
    });
  });

  describe('error handling', () => {
    it('should handle Supabase client creation failure', async () => {
      vi.mocked(createServerClient).mockReturnValue(null);

      const request = createMockRequest('Bearer valid-token');
      const result = await validateSupabaseAuth(request);

      expect(result.authenticated).toBe(false);
      expect(result.user).toBeUndefined();
      expect(result.error).toBe('Supabase authentication not configured.');
    });

    it('should handle getUser throwing an exception', async () => {
      const mockClient = {
        auth: {
          getUser: vi.fn().mockRejectedValue(new Error('Network error')),
        },
      };
      vi.mocked(createServerClient).mockReturnValue(mockClient as any);

      const request = createMockRequest('Bearer valid-token');
      const result = await validateSupabaseAuth(request);

      expect(result.authenticated).toBe(false);
      expect(result.user).toBeUndefined();
      expect(result.error).toBe('Failed to validate authentication token.');
    });

    it('should handle unexpected errors gracefully', async () => {
      const mockClient = {
        auth: {
          getUser: vi.fn().mockImplementation(() => {
            throw new Error('Unexpected error');
          }),
        },
      };
      vi.mocked(createServerClient).mockReturnValue(mockClient as any);

      const request = createMockRequest('Bearer valid-token');
      const result = await validateSupabaseAuth(request);

      expect(result.authenticated).toBe(false);
      expect(result.user).toBeUndefined();
      expect(result.error).toBe('Failed to validate authentication token.');
    });
  });

  describe('role-based scenarios', () => {
    it('should correctly identify admin role', async () => {
      const adminResponse = {
        data: {
          user: {
            id: 'admin-001',
            email: 'admin@example.com',
            user_metadata: {
              full_name: 'Admin User',
              role: 'admin',
            },
          },
        },
        error: null,
      };

      const mockClient = createMockSupabaseClient(adminResponse);
      vi.mocked(createServerClient).mockReturnValue(mockClient as any);

      const request = createMockRequest('Bearer admin-token');
      const result = await validateSupabaseAuth(request);

      expect(result.authenticated).toBe(true);
      expect(result.user?.role).toBe('admin');
    });

    it('should correctly identify editor role', async () => {
      const editorResponse = {
        data: {
          user: {
            id: 'editor-001',
            email: 'editor@example.com',
            user_metadata: {
              full_name: 'Editor User',
              role: 'editor',
            },
          },
        },
        error: null,
      };

      const mockClient = createMockSupabaseClient(editorResponse);
      vi.mocked(createServerClient).mockReturnValue(mockClient as any);

      const request = createMockRequest('Bearer editor-token');
      const result = await validateSupabaseAuth(request);

      expect(result.authenticated).toBe(true);
      expect(result.user?.role).toBe('editor');
    });

    it('should default to viewer role when not specified', async () => {
      const viewerResponse = {
        data: {
          user: {
            id: 'viewer-001',
            email: 'viewer@example.com',
            user_metadata: {
              full_name: 'Viewer User',
              // No role specified
            },
          },
        },
        error: null,
      };

      const mockClient = createMockSupabaseClient(viewerResponse);
      vi.mocked(createServerClient).mockReturnValue(mockClient as any);

      const request = createMockRequest('Bearer viewer-token');
      const result = await validateSupabaseAuth(request);

      expect(result.authenticated).toBe(true);
      expect(result.user?.role).toBe('viewer');
    });
  });

  describe('edge cases', () => {
    it('should handle user without email', async () => {
      const noEmailResponse = {
        data: {
          user: {
            id: 'no-email-001',
            email: null,
            user_metadata: {
              full_name: 'No Email User',
            },
          },
        },
        error: null,
      };

      const mockClient = createMockSupabaseClient(noEmailResponse);
      vi.mocked(createServerClient).mockReturnValue(mockClient as any);

      const request = createMockRequest('Bearer no-email-token');
      const result = await validateSupabaseAuth(request);

      expect(result.authenticated).toBe(true);
      expect(result.user?.email).toBe('unknown@example.com');
      expect(result.user?.name).toBe('No Email User');
    });

    it('should trim whitespace from Bearer token', async () => {
      const mockClient = createMockSupabaseClient(mockValidUserResponse);
      vi.mocked(createServerClient).mockReturnValue(mockClient as any);

      const request = createMockRequest('Bearer   token-with-spaces   ');
      await validateSupabaseAuth(request);

      expect(mockClient.auth.getUser).toHaveBeenCalledWith('token-with-spaces');
    });

    it('should handle user_metadata being null', async () => {
      const nullMetadataResponse = {
        data: {
          user: {
            id: 'null-meta-001',
            email: 'nullmeta@example.com',
            user_metadata: null,
          },
        },
        error: null,
      };

      const mockClient = createMockSupabaseClient(nullMetadataResponse);
      vi.mocked(createServerClient).mockReturnValue(mockClient as any);

      const request = createMockRequest('Bearer null-meta-token');
      const result = await validateSupabaseAuth(request);

      expect(result.authenticated).toBe(true);
      expect(result.user?.name).toBe('nullmeta'); // Derived from email
      expect(result.user?.role).toBe('viewer'); // Default role
    });
  });
});

// ============================================
// Response Helper Tests
// ============================================

describe('unauthorizedResponse', () => {
  it('should create 401 response with default message', async () => {
    const response = unauthorizedResponse();

    expect(response.status).toBe(401);

    // Parse response body using .json()
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
    expect(body.message).toBe('Authentication required. Please log in to access this resource.');
    expect(body.status).toBe(401);
  });

  it('should create 401 response with custom message', async () => {
    const customMessage = 'Your session has expired.';
    const response = unauthorizedResponse(customMessage);

    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
    expect(body.message).toBe(customMessage);
    expect(body.status).toBe(401);
  });
});

describe('forbiddenResponse', () => {
  it('should create 403 response with default message', async () => {
    const response = forbiddenResponse();

    expect(response.status).toBe(403);

    const body = await response.json();
    expect(body.error).toBe('Forbidden');
    expect(body.message).toBe('You do not have permission to access this resource.');
    expect(body.status).toBe(403);
  });

  it('should create 403 response with custom message', async () => {
    const customMessage = 'Admin access required.';
    const response = forbiddenResponse(customMessage);

    expect(response.status).toBe(403);

    const body = await response.json();
    expect(body.error).toBe('Forbidden');
    expect(body.message).toBe(customMessage);
    expect(body.status).toBe(403);
  });
});

// ============================================
// Integration Tests
// ============================================

describe('integration scenarios', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should complete full authentication flow for valid request', async () => {
    const mockClient = createMockSupabaseClient(mockValidUserResponse);
    vi.mocked(createServerClient).mockReturnValue(mockClient as any);

    const request = createMockRequest('Bearer valid-jwt-token');
    const result = await validateSupabaseAuth(request);

    // Verify the complete flow
    expect(createServerClient).toHaveBeenCalledTimes(1);
    expect(mockClient.auth.getUser).toHaveBeenCalledTimes(1);
    expect(mockClient.auth.getUser).toHaveBeenCalledWith('valid-jwt-token');
    expect(result.authenticated).toBe(true);
    expect(result.user).toBeDefined();
    expect(result.error).toBeUndefined();
  });

  it('should handle complete authentication failure flow', async () => {
    const mockClient = createMockSupabaseClient(mockInvalidTokenResponse);
    vi.mocked(createServerClient).mockReturnValue(mockClient as any);

    const request = createMockRequest('Bearer invalid-token');
    const result = await validateSupabaseAuth(request);

    // Verify the complete failure flow
    expect(createServerClient).toHaveBeenCalledTimes(1);
    expect(mockClient.auth.getUser).toHaveBeenCalledTimes(1);
    expect(result.authenticated).toBe(false);
    expect(result.user).toBeUndefined();
    expect(result.error).toBeDefined();
  });
});

/**
 * CSRF Token Generation and Validation Tests
 *
 * Tests the security-critical CSRF functionality including:
 * - generateCsrfToken function
 * - Token format and uniqueness
 * - Cryptographic security (no Math.random)
 * - Error handling for missing crypto API
 * - validateCsrf function
 * - Helper utilities
 *
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-24
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  generateCsrfToken,
  validateCsrf,
  csrfErrorResponse,
  getCsrfStorageKey,
  getCsrfHeaderName,
} from '../csrf';

// ============================================
// Token Generation Tests
// ============================================

describe('generateCsrfToken', () => {
  describe('basic functionality', () => {
    it('should generate a valid CSRF token', () => {
      const token = generateCsrfToken();

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('should generate a 64-character hexadecimal string', () => {
      const token = generateCsrfToken();

      // Check length
      expect(token.length).toBe(64);

      // Check if it's valid hexadecimal (only 0-9, a-f)
      expect(token).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should generate tokens with proper zero-padding', () => {
      // Generate multiple tokens to increase chance of getting bytes < 16
      const tokens = Array.from({ length: 100 }, () => generateCsrfToken());

      tokens.forEach((token) => {
        // Each pair of characters represents a byte (00-ff)
        // Check that all byte representations are properly zero-padded
        for (let i = 0; i < token.length; i += 2) {
          const byteStr = token.substring(i, i + 2);
          expect(byteStr.length).toBe(2);
          expect(byteStr).toMatch(/^[0-9a-f]{2}$/);
        }
      });
    });
  });

  describe('token uniqueness', () => {
    it('should generate unique tokens on each call', () => {
      const token1 = generateCsrfToken();
      const token2 = generateCsrfToken();

      expect(token1).not.toBe(token2);
    });

    it('should generate statistically unique tokens (100 samples)', () => {
      const tokens = new Set<string>();
      const count = 100;

      for (let i = 0; i < count; i++) {
        tokens.add(generateCsrfToken());
      }

      // All tokens should be unique
      expect(tokens.size).toBe(count);
    });

    it('should generate diverse tokens (no repeated patterns)', () => {
      const token = generateCsrfToken();

      // Check that token doesn't have obvious repetition
      // (e.g., not all same character, not simple patterns)
      const uniqueChars = new Set(token.split(''));
      expect(uniqueChars.size).toBeGreaterThan(10); // Should have variety of hex chars
    });
  });

  describe('cryptographic security', () => {
    it('should use crypto.getRandomValues (not Math.random)', () => {
      // Spy on crypto.getRandomValues
      const getRandomValuesSpy = vi.spyOn(crypto, 'getRandomValues');

      generateCsrfToken();

      expect(getRandomValuesSpy).toHaveBeenCalledTimes(1);
      expect(getRandomValuesSpy).toHaveBeenCalledWith(expect.any(Uint8Array));

      getRandomValuesSpy.mockRestore();
    });

    it('should generate tokens from 32 random bytes', () => {
      const getRandomValuesSpy = vi.spyOn(crypto, 'getRandomValues');

      generateCsrfToken();

      // Should be called with a Uint8Array of length 32
      const callArg = getRandomValuesSpy.mock.calls[0][0] as Uint8Array;
      expect(callArg).toBeInstanceOf(Uint8Array);
      expect(callArg.length).toBe(32);

      getRandomValuesSpy.mockRestore();
    });

    it('should have high entropy (no obvious biases)', () => {
      const tokens = Array.from({ length: 10 }, () => generateCsrfToken());

      tokens.forEach((token) => {
        // Count occurrences of each hex digit
        const digitCounts: Record<string, number> = {};
        for (const char of token) {
          digitCounts[char] = (digitCounts[char] || 0) + 1;
        }

        // No single digit should dominate (basic entropy check)
        // With 64 chars, each of 16 hex digits should appear ~4 times on average
        // Allow wide variance but flag obvious biases
        Object.values(digitCounts).forEach((count) => {
          expect(count).toBeLessThan(20); // No digit appears >20 times out of 64
        });
      });
    });
  });

  describe('error handling', () => {
    afterEach(() => {
      // Restore all mocks after each test
      vi.unstubAllGlobals();
    });

    it('should throw error if crypto is undefined', () => {
      // Use vitest's stubGlobal to mock the crypto object
      vi.stubGlobal('crypto', undefined);

      expect(() => generateCsrfToken()).toThrow();
      expect(() => generateCsrfToken()).toThrow(/Crypto API is not available/);
    });

    it('should throw error if crypto.getRandomValues is undefined', () => {
      // Use vitest's stubGlobal to mock crypto without getRandomValues
      vi.stubGlobal('crypto', { getRandomValues: undefined });

      expect(() => generateCsrfToken()).toThrow();
      expect(() => generateCsrfToken()).toThrow(/Crypto API is not available/);
    });

    it('should include helpful error message about Node.js version', () => {
      // Use vitest's stubGlobal to mock the crypto object
      vi.stubGlobal('crypto', undefined);

      expect(() => generateCsrfToken()).toThrow(/Node\.js 18\+/);
      expect(() => generateCsrfToken()).toThrow(/modern browser/);
    });

    it('should not use Math.random as fallback', () => {
      // Spy on Math.random to ensure it's never called
      const mathRandomSpy = vi.spyOn(Math, 'random');

      // Generate multiple tokens
      for (let i = 0; i < 10; i++) {
        generateCsrfToken();
      }

      expect(mathRandomSpy).not.toHaveBeenCalled();

      mathRandomSpy.mockRestore();
    });
  });
});

// ============================================
// CSRF Validation Tests
// ============================================

describe('validateCsrf', () => {
  describe('HTTP method handling', () => {
    it('should allow GET requests without validation', async () => {
      const request = new NextRequest('https://example.com/api/test', {
        method: 'GET',
      });

      const result = await validateCsrf(request);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should allow HEAD requests without validation', async () => {
      const request = new NextRequest('https://example.com/api/test', {
        method: 'HEAD',
      });

      const result = await validateCsrf(request);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should allow OPTIONS requests without validation', async () => {
      const request = new NextRequest('https://example.com/api/test', {
        method: 'OPTIONS',
      });

      const result = await validateCsrf(request);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('POST request validation with Origin header', () => {
    it('should validate POST with matching Origin header', async () => {
      const request = new NextRequest('https://example.com/api/test', {
        method: 'POST',
        headers: {
          Origin: 'https://example.com',
        },
      });

      const result = await validateCsrf(request);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject POST with mismatched Origin header', async () => {
      const request = new NextRequest('https://example.com/api/test', {
        method: 'POST',
        headers: {
          Origin: 'https://evil.com',
        },
      });

      const result = await validateCsrf(request);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('origin');
    });

    it('should reject POST with different protocol in Origin', async () => {
      const request = new NextRequest('https://example.com/api/test', {
        method: 'POST',
        headers: {
          Origin: 'http://example.com', // http instead of https
        },
      });

      const result = await validateCsrf(request);

      expect(result.valid).toBe(false);
    });

    it('should reject POST with different port in Origin', async () => {
      const request = new NextRequest('https://example.com:443/api/test', {
        method: 'POST',
        headers: {
          Origin: 'https://example.com:8080',
        },
      });

      const result = await validateCsrf(request);

      expect(result.valid).toBe(false);
    });
  });

  describe('state-changing methods validation', () => {
    const methods = ['POST', 'PUT', 'DELETE', 'PATCH'];

    methods.forEach((method) => {
      it(`should validate ${method} with matching Origin`, async () => {
        const request = new NextRequest('https://example.com/api/test', {
          method,
          headers: {
            Origin: 'https://example.com',
          },
        });

        const result = await validateCsrf(request);

        expect(result.valid).toBe(true);
      });

      it(`should reject ${method} with mismatched Origin`, async () => {
        const request = new NextRequest('https://example.com/api/test', {
          method,
          headers: {
            Origin: 'https://evil.com',
          },
        });

        const result = await validateCsrf(request);

        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });
  });

  describe('Referer header fallback', () => {
    it('should validate with matching Referer when Origin is absent', async () => {
      const request = new NextRequest('https://example.com/api/test', {
        method: 'POST',
        headers: {
          Referer: 'https://example.com/some-page',
        },
      });

      const result = await validateCsrf(request);

      expect(result.valid).toBe(true);
    });

    it('should reject with mismatched Referer', async () => {
      const request = new NextRequest('https://example.com/api/test', {
        method: 'POST',
        headers: {
          Referer: 'https://evil.com/some-page',
        },
      });

      const result = await validateCsrf(request);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('referer');
    });

    it('should reject with invalid Referer URL format', async () => {
      const request = new NextRequest('https://example.com/api/test', {
        method: 'POST',
        headers: {
          Referer: 'not-a-valid-url',
        },
      });

      const result = await validateCsrf(request);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('referer');
    });

    it('should prefer Origin over Referer when both present', async () => {
      const request = new NextRequest('https://example.com/api/test', {
        method: 'POST',
        headers: {
          Origin: 'https://example.com',
          Referer: 'https://evil.com/page',
        },
      });

      const result = await validateCsrf(request);

      // Should use Origin (which matches) and ignore evil Referer
      expect(result.valid).toBe(true);
    });
  });

  describe('CSRF token header fallback', () => {
    it('should accept valid CSRF token when Origin and Referer absent', async () => {
      const token = generateCsrfToken();
      const request = new NextRequest('https://example.com/api/test', {
        method: 'POST',
        headers: {
          'X-CSRF-Token': token,
        },
      });

      const result = await validateCsrf(request);

      expect(result.valid).toBe(true);
    });

    it('should reject short CSRF token', async () => {
      const request = new NextRequest('https://example.com/api/test', {
        method: 'POST',
        headers: {
          'X-CSRF-Token': 'short',
        },
      });

      const result = await validateCsrf(request);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid CSRF token format');
    });

    it('should reject empty CSRF token', async () => {
      const request = new NextRequest('https://example.com/api/test', {
        method: 'POST',
        headers: {
          'X-CSRF-Token': '',
        },
      });

      const result = await validateCsrf(request);

      expect(result.valid).toBe(false);
    });

    it('should reject request with no security headers', async () => {
      const request = new NextRequest('https://example.com/api/test', {
        method: 'POST',
        // No Origin, Referer, or X-CSRF-Token headers
      });

      const result = await validateCsrf(request);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Missing security headers');
    });
  });

  describe('case sensitivity', () => {
    it('should handle uppercase method names', async () => {
      const request = new NextRequest('https://example.com/api/test', {
        method: 'POST',
        headers: {
          Origin: 'https://example.com',
        },
      });

      const result = await validateCsrf(request);

      expect(result.valid).toBe(true);
    });

    it('should handle lowercase method names', async () => {
      const request = new NextRequest('https://example.com/api/test', {
        method: 'post',
        headers: {
          Origin: 'https://example.com',
        },
      });

      const result = await validateCsrf(request);

      expect(result.valid).toBe(true);
    });

    it('should handle mixed case method names', async () => {
      const request = new NextRequest('https://example.com/api/test', {
        method: 'PoSt',
        headers: {
          Origin: 'https://example.com',
        },
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
  it('should return 403 status code', () => {
    const response = csrfErrorResponse();

    expect(response.status).toBe(403);
  });

  it('should include error field in JSON body', async () => {
    const response = csrfErrorResponse();
    const body = await response.json();

    expect(body.error).toBe('Forbidden');
  });

  it('should include default message', async () => {
    const response = csrfErrorResponse();
    const body = await response.json();

    expect(body.message).toContain('CSRF validation failed');
  });

  it('should allow custom error message', async () => {
    const customMessage = 'Custom CSRF error message';
    const response = csrfErrorResponse(customMessage);
    const body = await response.json();

    expect(body.message).toBe(customMessage);
  });

  it('should include status in JSON body', async () => {
    const response = csrfErrorResponse();
    const body = await response.json();

    expect(body.status).toBe(403);
  });

  it('should be a valid NextResponse', () => {
    const response = csrfErrorResponse();

    expect(response).toBeDefined();
    expect(response.headers).toBeDefined();
  });
});

// ============================================
// Helper Utility Tests
// ============================================

describe('helper utilities', () => {
  describe('getCsrfStorageKey', () => {
    it('should return a non-empty string', () => {
      const key = getCsrfStorageKey();

      expect(typeof key).toBe('string');
      expect(key.length).toBeGreaterThan(0);
    });

    it('should return consistent value', () => {
      const key1 = getCsrfStorageKey();
      const key2 = getCsrfStorageKey();

      expect(key1).toBe(key2);
    });

    it('should return taxdeedflow-specific key', () => {
      const key = getCsrfStorageKey();

      expect(key).toContain('taxdeedflow');
    });
  });

  describe('getCsrfHeaderName', () => {
    it('should return a non-empty string', () => {
      const headerName = getCsrfHeaderName();

      expect(typeof headerName).toBe('string');
      expect(headerName.length).toBeGreaterThan(0);
    });

    it('should return consistent value', () => {
      const name1 = getCsrfHeaderName();
      const name2 = getCsrfHeaderName();

      expect(name1).toBe(name2);
    });

    it('should return X-CSRF-Token header name', () => {
      const headerName = getCsrfHeaderName();

      expect(headerName).toBe('X-CSRF-Token');
    });
  });
});

// ============================================
// Integration Tests
// ============================================

describe('integration scenarios', () => {
  it('should generate token and validate it successfully', async () => {
    const token = generateCsrfToken();
    const request = new NextRequest('https://example.com/api/test', {
      method: 'POST',
      headers: {
        'X-CSRF-Token': token,
      },
    });

    const result = await validateCsrf(request);

    expect(result.valid).toBe(true);
  });

  it('should handle complete CSRF protection flow', async () => {
    // 1. Generate token
    const token = generateCsrfToken();
    expect(token).toBeDefined();
    expect(token.length).toBe(64);

    // 2. Store token (simulated)
    const storageKey = getCsrfStorageKey();
    expect(storageKey).toBeDefined();

    // 3. Include token in request
    const headerName = getCsrfHeaderName();
    const request = new NextRequest('https://example.com/api/test', {
      method: 'POST',
      headers: {
        [headerName]: token,
      },
    });

    // 4. Validate request
    const result = await validateCsrf(request);
    expect(result.valid).toBe(true);
  });

  it('should reject cross-origin attack scenario', async () => {
    // Attacker tries to make request from evil.com to example.com
    const request = new NextRequest('https://example.com/api/sensitive', {
      method: 'POST',
      headers: {
        Origin: 'https://evil.com',
      },
    });

    const result = await validateCsrf(request);

    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should handle legitimate same-origin requests', async () => {
    const request = new NextRequest('https://example.com/api/test', {
      method: 'POST',
      headers: {
        Origin: 'https://example.com',
        'Content-Type': 'application/json',
      },
    });

    const result = await validateCsrf(request);

    expect(result.valid).toBe(true);
  });
});

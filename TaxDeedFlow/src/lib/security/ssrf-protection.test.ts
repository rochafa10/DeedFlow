/**
 * SSRF Protection Utility Tests
 *
 * Tests the URL validation and SSRF protection functionality including:
 * - Valid Regrid URL acceptance
 * - Localhost blocking
 * - Private IP address blocking
 * - AWS metadata service blocking
 * - Dangerous protocol blocking (file://, ftp://, etc.)
 * - Domain allowlist enforcement
 * - URL sanitization
 * - Error message clarity
 *
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-23
 */

import { describe, it, expect } from 'vitest';
import {
  validateRegridUrl,
  validateRegridUrlOrThrow,
  type ValidationResult,
} from './ssrf-protection';

// ============================================
// Valid Regrid URLs Tests
// ============================================

describe('validateRegridUrl - Valid URLs', () => {
  describe('regrid.com domains', () => {
    it('should accept valid app.regrid.com URL', () => {
      const result = validateRegridUrl(
        'https://app.regrid.com/us/pa/blair/parcel/123'
      );

      expect(result.valid).toBe(true);
      expect(result.sanitizedUrl).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it('should accept valid regrid.com URL', () => {
      const result = validateRegridUrl('https://regrid.com/api/v1/parcels');

      expect(result.valid).toBe(true);
      expect(result.sanitizedUrl).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it('should accept HTTP protocol for regrid.com', () => {
      const result = validateRegridUrl(
        'http://app.regrid.com/us/pa/blair/parcel/123'
      );

      expect(result.valid).toBe(true);
      expect(result.sanitizedUrl).toBeDefined();
    });

    it('should accept subdomains of regrid.com', () => {
      const result = validateRegridUrl(
        'https://api.regrid.com/v1/parcels/search'
      );

      expect(result.valid).toBe(true);
      expect(result.sanitizedUrl).toBeDefined();
    });

    it('should accept URLs with query parameters', () => {
      const result = validateRegridUrl(
        'https://app.regrid.com/us/pa/blair/parcel/123?view=detail&zoom=15'
      );

      expect(result.valid).toBe(true);
      expect(result.sanitizedUrl).toBeDefined();
    });

    it('should accept URLs with hash fragments', () => {
      const result = validateRegridUrl(
        'https://app.regrid.com/us/pa/blair/parcel/123#map-view'
      );

      expect(result.valid).toBe(true);
      expect(result.sanitizedUrl).toBeDefined();
    });

    it('should accept URLs with port numbers', () => {
      const result = validateRegridUrl(
        'https://app.regrid.com:443/us/pa/blair/parcel/123'
      );

      expect(result.valid).toBe(true);
      expect(result.sanitizedUrl).toBeDefined();
    });
  });
});

// ============================================
// Localhost Blocking Tests
// ============================================

describe('validateRegridUrl - Localhost Blocking', () => {
  describe('localhost variations', () => {
    it('should block localhost HTTP URL', () => {
      const result = validateRegridUrl('http://localhost:3000/api/admin');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('localhost');
      expect(result.sanitizedUrl).toBeUndefined();
    });

    it('should block localhost HTTPS URL', () => {
      const result = validateRegridUrl('https://localhost:8443/secure/data');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('localhost');
    });

    it('should block uppercase LOCALHOST', () => {
      const result = validateRegridUrl('http://LOCALHOST:3000/api');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('localhost');
    });

    it('should block 127.0.0.1 loopback IP', () => {
      const result = validateRegridUrl('http://127.0.0.1:3000/api/internal');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('private IP');
    });

    it('should block 127.x.x.x range', () => {
      const result = validateRegridUrl('http://127.1.2.3:8080/api');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('private IP');
    });

    it('should block 0.0.0.0', () => {
      const result = validateRegridUrl('http://0.0.0.0:3000/api');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('localhost');
    });

    it('should block IPv6 localhost ::1', () => {
      const result = validateRegridUrl('http://[::1]:3000/api');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('localhost');
    });

    it('should block IPv6 loopback in IPv4 notation', () => {
      const result = validateRegridUrl('http://[::ffff:127.0.0.1]:3000/api');

      expect(result.valid).toBe(false);
      // May be detected as either localhost or private IP depending on parsing
      expect(result.error).toMatch(/localhost|private IP|Domain not allowed/);
    });
  });
});

// ============================================
// Private IP Blocking Tests
// ============================================

describe('validateRegridUrl - Private IP Blocking', () => {
  describe('10.x.x.x range (Class A private)', () => {
    it('should block 10.0.0.1', () => {
      const result = validateRegridUrl('http://10.0.0.1/api');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('private IP');
    });

    it('should block 10.255.255.254', () => {
      const result = validateRegridUrl('http://10.255.255.254/internal');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('private IP');
    });

    it('should block 10.x with custom port', () => {
      const result = validateRegridUrl('http://10.1.2.3:8080/admin');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('private IP');
    });
  });

  describe('172.16-31.x.x range (Class B private)', () => {
    it('should block 172.16.0.1', () => {
      const result = validateRegridUrl('http://172.16.0.1/api');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('private IP');
    });

    it('should block 172.31.255.254', () => {
      const result = validateRegridUrl('http://172.31.255.254/internal');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('private IP');
    });

    it('should block 172.20.x.x (middle of range)', () => {
      const result = validateRegridUrl('http://172.20.1.1:3000/admin');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('private IP');
    });

    it('should allow 172.15.x.x (before range)', () => {
      // This is technically a public IP if it existed
      const result = validateRegridUrl('http://172.15.0.1/api');

      // Should fail for domain not being regrid.com, not for being private
      expect(result.valid).toBe(false);
      expect(result.error).not.toContain('private IP');
      expect(result.error).toContain('Domain not allowed');
    });

    it('should allow 172.32.x.x (after range)', () => {
      // This is technically a public IP if it existed
      const result = validateRegridUrl('http://172.32.0.1/api');

      // Should fail for domain not being regrid.com, not for being private
      expect(result.valid).toBe(false);
      expect(result.error).not.toContain('private IP');
      expect(result.error).toContain('Domain not allowed');
    });
  });

  describe('192.168.x.x range (Class C private)', () => {
    it('should block 192.168.1.1', () => {
      const result = validateRegridUrl('http://192.168.1.1/router');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('private IP');
    });

    it('should block 192.168.0.1', () => {
      const result = validateRegridUrl('http://192.168.0.1/admin');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('private IP');
    });

    it('should block 192.168.255.254', () => {
      const result = validateRegridUrl('http://192.168.255.254/config');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('private IP');
    });
  });

  describe('169.254.x.x range (Link-local / AWS metadata)', () => {
    it('should block AWS metadata service IP', () => {
      const result = validateRegridUrl(
        'http://169.254.169.254/latest/meta-data/'
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('private IP');
    });

    it('should block 169.254.0.1', () => {
      const result = validateRegridUrl('http://169.254.0.1/api');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('private IP');
    });

    it('should block 169.254.255.254', () => {
      const result = validateRegridUrl('http://169.254.255.254/internal');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('private IP');
    });
  });
});

// ============================================
// Dangerous Protocol Blocking Tests
// ============================================

describe('validateRegridUrl - Protocol Blocking', () => {
  describe('file:// protocol', () => {
    it('should block file:// protocol', () => {
      const result = validateRegridUrl('file:///etc/passwd');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Blocked protocol');
      expect(result.error).toContain('file:');
    });

    it('should block file:// on Windows paths', () => {
      const result = validateRegridUrl('file:///C:/Windows/System32/config');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Blocked protocol');
    });
  });

  describe('ftp:// and ftps:// protocols', () => {
    it('should block ftp:// protocol', () => {
      const result = validateRegridUrl('ftp://ftp.example.com/files');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Blocked protocol');
      expect(result.error).toContain('ftp:');
    });

    it('should block ftps:// protocol', () => {
      const result = validateRegridUrl('ftps://secure.example.com/files');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Blocked protocol');
    });
  });

  describe('other dangerous protocols', () => {
    it('should block gopher:// protocol', () => {
      const result = validateRegridUrl('gopher://gopher.example.com/1');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Blocked protocol');
    });

    it('should block data:// protocol', () => {
      const result = validateRegridUrl('data:text/plain;base64,SGVsbG8=');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Blocked protocol');
    });

    it('should block javascript:// protocol', () => {
      const result = validateRegridUrl('javascript:alert(1)');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Blocked protocol');
    });

    it('should block vbscript:// protocol', () => {
      const result = validateRegridUrl('vbscript:msgbox(1)');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Blocked protocol');
    });
  });

  describe('invalid protocols', () => {
    it('should block custom protocol', () => {
      const result = validateRegridUrl('custom://app.regrid.com/api');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid protocol');
    });

    it('should block ws:// protocol', () => {
      const result = validateRegridUrl('ws://app.regrid.com/websocket');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid protocol');
    });

    it('should block wss:// protocol', () => {
      const result = validateRegridUrl('wss://app.regrid.com/websocket');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid protocol');
    });
  });
});

// ============================================
// Domain Allowlist Tests
// ============================================

describe('validateRegridUrl - Domain Allowlist', () => {
  describe('non-regrid domains', () => {
    it('should block google.com', () => {
      const result = validateRegridUrl('https://google.com');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Domain not allowed');
      expect(result.error).toContain('google.com');
    });

    it('should block example.com', () => {
      const result = validateRegridUrl('https://example.com/api');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Domain not allowed');
    });

    it('should block malicious subdomain attempt', () => {
      const result = validateRegridUrl('https://regrid.com.evil.com/api');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Domain not allowed');
    });

    it('should block domain with regrid in path', () => {
      const result = validateRegridUrl('https://evil.com/regrid.com/api');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Domain not allowed');
    });

    it('should block partial domain match', () => {
      const result = validateRegridUrl('https://fakeregrid.com/api');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Domain not allowed');
    });

    it('should block suffix match attempt', () => {
      const result = validateRegridUrl('https://notregrid.com/api');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Domain not allowed');
    });
  });

  describe('case sensitivity', () => {
    it('should accept REGRID.COM (uppercase)', () => {
      const result = validateRegridUrl('https://REGRID.COM/api');

      expect(result.valid).toBe(true);
      expect(result.sanitizedUrl).toBeDefined();
    });

    it('should accept App.ReGrid.Com (mixed case)', () => {
      const result = validateRegridUrl(
        'https://App.ReGrid.Com/us/pa/blair/parcel/123'
      );

      expect(result.valid).toBe(true);
      expect(result.sanitizedUrl).toBeDefined();
    });
  });
});

// ============================================
// Invalid URL Format Tests
// ============================================

describe('validateRegridUrl - Invalid URL Formats', () => {
  it('should reject empty string', () => {
    const result = validateRegridUrl('');

    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid URL format');
  });

  it('should reject malformed URL', () => {
    const result = validateRegridUrl('not-a-url');

    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should reject URL without protocol', () => {
    const result = validateRegridUrl('app.regrid.com/us/pa/blair/parcel/123');

    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should reject malformed URL with invalid characters', () => {
    // Use a truly malformed URL that can't be parsed
    const result = validateRegridUrl('ht!tp://app.regrid.com/path');

    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should reject relative URL', () => {
    const result = validateRegridUrl('/api/parcels');

    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });
});

// ============================================
// URL Sanitization Tests
// ============================================

describe('validateRegridUrl - URL Sanitization', () => {
  it('should trim whitespace from URL', () => {
    const result = validateRegridUrl(
      '  https://app.regrid.com/us/pa/blair/parcel/123  '
    );

    expect(result.valid).toBe(true);
    expect(result.sanitizedUrl).not.toContain('  ');
  });

  it('should remove leading quotes', () => {
    const result = validateRegridUrl(
      '"https://app.regrid.com/us/pa/blair/parcel/123"'
    );

    expect(result.valid).toBe(true);
    expect(result.sanitizedUrl).toBeDefined();
  });

  it('should remove trailing quotes', () => {
    const result = validateRegridUrl(
      "'https://app.regrid.com/us/pa/blair/parcel/123'"
    );

    expect(result.valid).toBe(true);
    expect(result.sanitizedUrl).toBeDefined();
  });

  it('should normalize URL with trailing slash', () => {
    const result = validateRegridUrl('https://app.regrid.com/');

    expect(result.valid).toBe(true);
    expect(result.sanitizedUrl).toBeDefined();
  });

  it('should preserve query parameters in sanitized URL', () => {
    const result = validateRegridUrl(
      'https://app.regrid.com/api?param1=value1&param2=value2'
    );

    expect(result.valid).toBe(true);
    expect(result.sanitizedUrl).toContain('param1=value1');
    expect(result.sanitizedUrl).toContain('param2=value2');
  });
});

// ============================================
// validateRegridUrlOrThrow Tests
// ============================================

describe('validateRegridUrlOrThrow', () => {
  it('should return sanitized URL for valid input', () => {
    const url = 'https://app.regrid.com/us/pa/blair/parcel/123';
    const result = validateRegridUrlOrThrow(url);

    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
    expect(result).toContain('app.regrid.com');
  });

  it('should throw error for localhost URL', () => {
    expect(() => {
      validateRegridUrlOrThrow('http://localhost:3000/api');
    }).toThrow('localhost');
  });

  it('should throw error for private IP', () => {
    expect(() => {
      validateRegridUrlOrThrow('http://192.168.1.1/admin');
    }).toThrow('private IP');
  });

  it('should throw error for AWS metadata service', () => {
    expect(() => {
      validateRegridUrlOrThrow('http://169.254.169.254/latest/meta-data/');
    }).toThrow('private IP');
  });

  it('should throw error for file:// protocol', () => {
    expect(() => {
      validateRegridUrlOrThrow('file:///etc/passwd');
    }).toThrow('Blocked protocol');
  });

  it('should throw error for invalid domain', () => {
    expect(() => {
      validateRegridUrlOrThrow('https://evil.com/api');
    }).toThrow('Domain not allowed');
  });

  it('should throw error for invalid URL format', () => {
    expect(() => {
      validateRegridUrlOrThrow('not-a-url');
    }).toThrow();
  });

  it('should throw error for empty string', () => {
    expect(() => {
      validateRegridUrlOrThrow('');
    }).toThrow();
  });
});

// ============================================
// Edge Cases and Security Tests
// ============================================

describe('validateRegridUrl - Edge Cases', () => {
  describe('encoding attempts', () => {
    it('should block URL-encoded localhost', () => {
      // %6c%6f%63%61%6c%68%6f%73%74 = localhost
      const result = validateRegridUrl(
        'http://%6c%6f%63%61%6c%68%6f%73%74:3000/api'
      );

      // URL constructor will decode this
      expect(result.valid).toBe(false);
    });

    it('should block localhost with different representations', () => {
      const result = validateRegridUrl('http://127.1:3000/api');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('private IP');
    });
  });

  describe('redirect attempts', () => {
    it('should validate final URL, not redirect parameter', () => {
      const result = validateRegridUrl(
        'https://app.regrid.com/api?redirect=http://localhost:3000'
      );

      // Should pass because the hostname is app.regrid.com
      // The query parameter is not evaluated as a URL
      expect(result.valid).toBe(true);
    });
  });

  describe('unusual but valid URLs', () => {
    it('should accept URLs with authentication (userinfo)', () => {
      const result = validateRegridUrl(
        'https://user:pass@app.regrid.com/api'
      );

      expect(result.valid).toBe(true);
    });

    it('should accept URLs with unusual ports', () => {
      const result = validateRegridUrl(
        'https://app.regrid.com:8443/secure/api'
      );

      expect(result.valid).toBe(true);
    });

    it('should accept deeply nested paths', () => {
      const result = validateRegridUrl(
        'https://app.regrid.com/a/b/c/d/e/f/g/h/i/j'
      );

      expect(result.valid).toBe(true);
    });
  });
});

// ============================================
// Regression Tests
// ============================================

describe('validateRegridUrl - Regression Tests', () => {
  it('should not throw unhandled exceptions', () => {
    const testCases = [
      null as any,
      undefined as any,
      123 as any,
      {} as any,
      [] as any,
      'https://app.regrid.com/valid',
      'http://localhost:3000/invalid',
      'not-a-url',
      '',
    ];

    testCases.forEach((testCase) => {
      expect(() => {
        validateRegridUrl(testCase);
      }).not.toThrow();
    });
  });

  it('should always return ValidationResult structure', () => {
    const result = validateRegridUrl('invalid-url');

    expect(result).toBeDefined();
    expect(result).toHaveProperty('valid');
    expect(typeof result.valid).toBe('boolean');
  });

  it('should never return both error and sanitizedUrl', () => {
    const testCases = [
      'https://app.regrid.com/valid',
      'http://localhost:3000/invalid',
      'not-a-url',
    ];

    testCases.forEach((url) => {
      const result = validateRegridUrl(url);

      if (result.valid) {
        expect(result.sanitizedUrl).toBeDefined();
        expect(result.error).toBeUndefined();
      } else {
        expect(result.error).toBeDefined();
        expect(result.sanitizedUrl).toBeUndefined();
      }
    });
  });
});

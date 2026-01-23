/**
 * SSRF Protection Utility
 *
 * Provides URL validation to prevent Server-Side Request Forgery (SSRF) attacks
 * in scraper endpoints that accept external URLs.
 *
 * Validates URLs against:
 * - Protocol allowlist (http, https only)
 * - Domain allowlist (regrid.com, app.regrid.com)
 * - Private IP address ranges (10.x, 172.16-31.x, 192.168.x, 127.x, 169.254.x)
 * - Localhost variations
 * - Dangerous schemes (file://, ftp://, etc.)
 *
 * @module lib/security/ssrf-protection
 * @author Claude Code Agent
 * @date 2026-01-23
 */

import { z } from 'zod';

// ============================================
// Constants
// ============================================

/**
 * Allowed protocols for external URLs
 */
const ALLOWED_PROTOCOLS = ['http:', 'https:'];

/**
 * Allowed domains for Regrid URLs
 */
const ALLOWED_DOMAINS = ['regrid.com', 'app.regrid.com'];

/**
 * Blocked URL schemes that could be used for SSRF
 */
const BLOCKED_SCHEMES = ['file:', 'ftp:', 'ftps:', 'gopher:', 'data:', 'javascript:', 'vbscript:'];

/**
 * Private IP address ranges (CIDR notation)
 * - 10.0.0.0/8 (10.0.0.0 - 10.255.255.255)
 * - 172.16.0.0/12 (172.16.0.0 - 172.31.255.255)
 * - 192.168.0.0/16 (192.168.0.0 - 192.168.255.255)
 * - 127.0.0.0/8 (127.0.0.0 - 127.255.255.255) - Loopback
 * - 169.254.0.0/16 (169.254.0.0 - 169.254.255.255) - Link-local (AWS metadata)
 */
const PRIVATE_IP_PATTERNS = [
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^127\./,
  /^169\.254\./,
];

/**
 * Localhost variations to block
 */
const LOCALHOST_PATTERNS = [
  'localhost',
  '0.0.0.0',
  '::1',
  '::ffff:127.0.0.1',
  '[::1]',
];

// ============================================
// Validation Schema
// ============================================

/**
 * Zod schema for URL string validation
 */
const UrlSchema = z.string().url();

// ============================================
// Types
// ============================================

/**
 * Result of URL validation
 */
export interface ValidationResult {
  /** Whether the URL is valid and safe */
  valid: boolean;
  /** Error message if validation failed */
  error?: string;
  /** Sanitized/normalized URL if validation succeeded */
  sanitizedUrl?: string;
}

// ============================================
// Private Helper Functions
// ============================================

/**
 * Check if hostname is a private IP address
 */
function isPrivateIP(hostname: string): boolean {
  // Remove brackets from IPv6 addresses
  const cleanHostname = hostname.replace(/^\[|\]$/g, '');

  // Check against private IP patterns
  return PRIVATE_IP_PATTERNS.some(pattern => pattern.test(cleanHostname));
}

/**
 * Check if hostname is localhost
 */
function isLocalhost(hostname: string): boolean {
  const lowerHostname = hostname.toLowerCase();
  return LOCALHOST_PATTERNS.some(pattern => lowerHostname === pattern || lowerHostname.startsWith(pattern));
}

/**
 * Check if domain matches allowed domains
 */
function isAllowedDomain(hostname: string): boolean {
  const lowerHostname = hostname.toLowerCase();
  return ALLOWED_DOMAINS.some(domain =>
    lowerHostname === domain || lowerHostname.endsWith(`.${domain}`)
  );
}

/**
 * Normalize and sanitize URL
 */
function sanitizeUrl(url: string): string {
  // Trim whitespace
  let sanitized = url.trim();

  // Remove any leading/trailing quotes
  sanitized = sanitized.replace(/^["']|["']$/g, '');

  return sanitized;
}

// ============================================
// Public API
// ============================================

/**
 * Validate a Regrid URL for SSRF protection
 *
 * @param url - URL string to validate
 * @returns Validation result with sanitized URL or error message
 *
 * @example
 * ```typescript
 * const result = validateRegridUrl('https://app.regrid.com/us/pa/blair/parcel/123');
 * if (result.valid) {
 *   // Use result.sanitizedUrl
 * } else {
 *   // Handle error: result.error
 * }
 * ```
 */
export function validateRegridUrl(url: string): ValidationResult {
  try {
    // Sanitize input
    const sanitized = sanitizeUrl(url);

    // Validate basic URL format with Zod
    const schemaResult = UrlSchema.safeParse(sanitized);
    if (!schemaResult.success) {
      return {
        valid: false,
        error: 'Invalid URL format',
      };
    }

    // Parse URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(sanitized);
    } catch (err) {
      return {
        valid: false,
        error: 'Failed to parse URL',
      };
    }

    // Check for blocked schemes
    const protocol = parsedUrl.protocol.toLowerCase();
    if (BLOCKED_SCHEMES.includes(protocol)) {
      return {
        valid: false,
        error: `Blocked protocol: ${protocol}. Only HTTP and HTTPS are allowed.`,
      };
    }

    // Check protocol is allowed
    if (!ALLOWED_PROTOCOLS.includes(protocol)) {
      return {
        valid: false,
        error: `Invalid protocol: ${protocol}. Only HTTP and HTTPS are allowed.`,
      };
    }

    // Check for localhost
    if (isLocalhost(parsedUrl.hostname)) {
      return {
        valid: false,
        error: 'Access to localhost is not allowed',
      };
    }

    // Check for private IP addresses
    if (isPrivateIP(parsedUrl.hostname)) {
      return {
        valid: false,
        error: 'Access to private IP addresses is not allowed',
      };
    }

    // Check domain allowlist
    if (!isAllowedDomain(parsedUrl.hostname)) {
      return {
        valid: false,
        error: `Domain not allowed: ${parsedUrl.hostname}. Only regrid.com domains are permitted.`,
      };
    }

    // All checks passed
    return {
      valid: true,
      sanitizedUrl: parsedUrl.toString(),
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown validation error',
    };
  }
}

/**
 * Validate URL and throw error if invalid
 * Convenience function for use in API routes
 *
 * @param url - URL to validate
 * @returns Sanitized URL
 * @throws Error if URL is invalid
 *
 * @example
 * ```typescript
 * try {
 *   const safeUrl = validateRegridUrlOrThrow(regridUrl);
 *   await captureScreenshot(safeUrl);
 * } catch (error) {
 *   return NextResponse.json({ error: error.message }, { status: 400 });
 * }
 * ```
 */
export function validateRegridUrlOrThrow(url: string): string {
  const result = validateRegridUrl(url);
  if (!result.valid) {
    throw new Error(result.error || 'URL validation failed');
  }
  return result.sanitizedUrl!;
}

import { test, expect } from '@playwright/test';

/**
 * E2E Tests for SSRF Protection in Scraper Endpoints
 *
 * These tests verify that the screenshot and regrid scraper endpoints
 * properly validate URLs to prevent Server-Side Request Forgery (SSRF) attacks.
 *
 * Test coverage:
 * - Valid Regrid URLs are accepted
 * - Localhost URLs are rejected
 * - Private IP addresses are rejected
 * - AWS metadata service URLs are rejected
 * - Dangerous protocols (file://, ftp://, etc.) are rejected
 * - Error messages are descriptive and helpful
 *
 * NOTE: These tests require the Next.js dev server to be running on port 3000.
 * Start it with: npm run dev
 */

const API_KEY = process.env.INTERNAL_API_KEY || 'tdf-internal-scraper-key';
const SCREENSHOT_ENDPOINT = '/api/scrape/screenshot';

// Increase timeout for tests that may need to wait for database connections
test.setTimeout(60000);

test.describe('SSRF Protection - Screenshot Endpoint', () => {

  test('should accept valid Regrid URLs', async ({ request }) => {
    const response = await request.post(SCREENSHOT_ENDPOINT, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      data: {
        property_id: 'test-property-id-12345',
        regrid_url: 'https://app.regrid.com/us/pa/blair/parcel/123456',
      },
    });

    // The request should NOT fail with 400 due to URL validation
    // It might fail later due to invalid property_id or other reasons (422, 500),
    // but it should NOT be rejected for SSRF (400 with "Invalid URL" error)
    const body = await response.json();

    if (response.status() === 400) {
      // If it's a 400, make sure it's NOT an SSRF error
      expect(body.error).not.toBe('Invalid URL');
      expect(body.message).not.toContain('localhost');
      expect(body.message).not.toContain('private IP');
    }

    // Valid Regrid URL should pass URL validation (may fail later for other reasons)
    expect(response.status()).not.toBe(400);
  });

  test('should reject localhost URLs', async ({ request }) => {
    const response = await request.post(SCREENSHOT_ENDPOINT, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      data: {
        property_id: 'test-property-id',
        regrid_url: 'http://localhost:3000/api/admin',
      },
    });

    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.error).toBe('Invalid URL');
    expect(body.message).toContain('localhost');
    expect(body.details).toBeDefined();
  });

  test('should reject 127.0.0.1 URLs', async ({ request }) => {
    const response = await request.post(SCREENSHOT_ENDPOINT, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      data: {
        property_id: 'test-property-id',
        regrid_url: 'http://127.0.0.1:3000/api/admin',
      },
    });

    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.error).toBe('Invalid URL');
    expect(body.message).toContain('private IP');
  });

  test('should reject 0.0.0.0 URLs', async ({ request }) => {
    const response = await request.post(SCREENSHOT_ENDPOINT, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      data: {
        property_id: 'test-property-id',
        regrid_url: 'http://0.0.0.0:8080/secret',
      },
    });

    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.error).toBe('Invalid URL');
    expect(body.message).toContain('localhost');
  });

  test('should reject private IP - 10.x.x.x range', async ({ request }) => {
    const response = await request.post(SCREENSHOT_ENDPOINT, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      data: {
        property_id: 'test-property-id',
        regrid_url: 'http://10.0.0.1/internal-api',
      },
    });

    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.error).toBe('Invalid URL');
    expect(body.message).toContain('private IP');
  });

  test('should reject private IP - 192.168.x.x range', async ({ request }) => {
    const response = await request.post(SCREENSHOT_ENDPOINT, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      data: {
        property_id: 'test-property-id',
        regrid_url: 'http://192.168.1.1/router-admin',
      },
    });

    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.error).toBe('Invalid URL');
    expect(body.message).toContain('private IP');
  });

  test('should reject private IP - 172.16-31.x.x range', async ({ request }) => {
    const response = await request.post(SCREENSHOT_ENDPOINT, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      data: {
        property_id: 'test-property-id',
        regrid_url: 'http://172.16.0.1/internal',
      },
    });

    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.error).toBe('Invalid URL');
    expect(body.message).toContain('private IP');
  });

  test('should reject AWS metadata service URL (169.254.169.254)', async ({ request }) => {
    const response = await request.post(SCREENSHOT_ENDPOINT, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      data: {
        property_id: 'test-property-id',
        regrid_url: 'http://169.254.169.254/latest/meta-data/',
      },
    });

    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.error).toBe('Invalid URL');
    expect(body.message).toContain('private IP');

    // Verify details mention security
    expect(body.details).toContain('security');
  });

  test('should reject file:// protocol', async ({ request }) => {
    const response = await request.post(SCREENSHOT_ENDPOINT, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      data: {
        property_id: 'test-property-id',
        regrid_url: 'file:///etc/passwd',
      },
    });

    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.error).toBe('Invalid URL');
    expect(body.message).toMatch(/protocol|file:/i);
  });

  test('should reject ftp:// protocol', async ({ request }) => {
    const response = await request.post(SCREENSHOT_ENDPOINT, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      data: {
        property_id: 'test-property-id',
        regrid_url: 'ftp://internal-server.com/files',
      },
    });

    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.error).toBe('Invalid URL');
    expect(body.message).toMatch(/protocol|ftp:/i);
  });

  test('should reject data:// protocol', async ({ request }) => {
    const response = await request.post(SCREENSHOT_ENDPOINT, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      data: {
        property_id: 'test-property-id',
        regrid_url: 'data:text/html,<script>alert("xss")</script>',
      },
    });

    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.error).toBe('Invalid URL');
    expect(body.message).toMatch(/protocol|data:/i);
  });

  test('should reject non-Regrid domains', async ({ request }) => {
    const response = await request.post(SCREENSHOT_ENDPOINT, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      data: {
        property_id: 'test-property-id',
        regrid_url: 'https://evil-site.com/steal-data',
      },
    });

    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.error).toBe('Invalid URL');
    expect(body.message).toContain('Domain not allowed');
    expect(body.message).toContain('evil-site.com');
    expect(body.message).toContain('regrid.com');
  });

  test('should reject malformed URLs', async ({ request }) => {
    const response = await request.post(SCREENSHOT_ENDPOINT, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      data: {
        property_id: 'test-property-id',
        regrid_url: 'not-a-valid-url',
      },
    });

    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.error).toBe('Invalid URL');
  });

  test('should provide descriptive error messages', async ({ request }) => {
    const response = await request.post(SCREENSHOT_ENDPOINT, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      data: {
        property_id: 'test-property-id',
        regrid_url: 'http://localhost:3000',
      },
    });

    expect(response.status()).toBe(400);

    const body = await response.json();

    // Should have clear error structure
    expect(body.error).toBeDefined();
    expect(body.message).toBeDefined();
    expect(body.details).toBeDefined();

    // Error message should be helpful
    expect(body.message.length).toBeGreaterThan(10);

    // Details should mention security
    expect(body.details).toContain('security');
  });

  test('should still require authentication even for invalid URLs', async ({ request }) => {
    const response = await request.post(SCREENSHOT_ENDPOINT, {
      headers: {
        'Content-Type': 'application/json',
        // Omit x-api-key header
      },
      data: {
        property_id: 'test-property-id',
        regrid_url: 'http://localhost:3000',
      },
    });

    // Should be unauthorized (401) before SSRF validation
    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  test('should accept regrid.com subdomain URLs', async ({ request }) => {
    const response = await request.post(SCREENSHOT_ENDPOINT, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      data: {
        property_id: 'test-property-id-12345',
        regrid_url: 'https://data.regrid.com/some/path',
      },
    });

    const body = await response.json();

    // Should NOT fail with SSRF error (may fail for other reasons)
    if (response.status() === 400) {
      expect(body.error).not.toBe('Invalid URL');
      expect(body.message).not.toContain('Domain not allowed');
    }
  });

  test('should handle IPv6 localhost [::1]', async ({ request }) => {
    const response = await request.post(SCREENSHOT_ENDPOINT, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      data: {
        property_id: 'test-property-id',
        regrid_url: 'http://[::1]:3000/api',
      },
    });

    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.error).toBe('Invalid URL');
    expect(body.message).toContain('localhost');
  });

  test('should sanitize URL with whitespace', async ({ request }) => {
    const response = await request.post(SCREENSHOT_ENDPOINT, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      data: {
        property_id: 'test-property-id-12345',
        regrid_url: '  https://app.regrid.com/us/pa/blair/parcel/123  ',
      },
    });

    const body = await response.json();

    // Whitespace should be trimmed and URL accepted
    if (response.status() === 400) {
      expect(body.error).not.toBe('Invalid URL');
    }
  });
});

test.describe('SSRF Protection - Health Check', () => {
  test('GET endpoint should return service status', async ({ request }) => {
    const response = await request.get(SCREENSHOT_ENDPOINT);

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.status).toBe('ok');
    expect(body.service).toContain('Screenshot');
  });
});

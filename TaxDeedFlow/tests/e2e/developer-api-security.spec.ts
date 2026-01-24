import { test, expect } from '@playwright/test';

/**
 * Developer API - Security Tests
 *
 * Tests security scenarios including authentication, authorization,
 * and proper error handling for invalid/expired/revoked API keys.
 */

// Test configuration
const API_V1_BASE = '/api/v1';
const API_DEV_BASE = '/api/developer';
const TEST_API_KEY_NAME = 'Security Test Key';

// Store created API key for revocation test
let testApiKey: string | null = null;
let testApiKeyId: string | null = null;

test.describe('Developer API - Security Tests', () => {
  test.describe.configure({ mode: 'serial' }); // Run tests in order

  test.describe('Missing API Key Authentication', () => {
    test('should reject GET /api/v1/properties without x-api-key header → 401', async ({ request }) => {
      const response = await request.get(`${API_V1_BASE}/properties`);

      // Verify 401 Unauthorized status
      expect(response.status()).toBe(401);

      // Verify error response structure
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
      expect(data.error.code).toBeDefined();
      expect(data.error.message).toBeDefined();

      // Verify error message is clear but secure (doesn't leak implementation details)
      expect(data.error.message).toContain('API key');
      expect(data.error.message.toLowerCase()).toMatch(/required|missing|authentication/);

      // Ensure we don't expose sensitive details
      expect(data.error.message).not.toContain('database');
      expect(data.error.message).not.toContain('hash');
      expect(data.error.message).not.toContain('bcrypt');

      console.log('✓ Missing API key rejected with 401');
      console.log(`  Error message: "${data.error.message}"`);
    });

    test('should reject GET /api/v1/properties/[id] without x-api-key header → 401', async ({ request }) => {
      const response = await request.get(`${API_V1_BASE}/properties/test-id-123`);

      expect(response.status()).toBe(401);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.message).toContain('API key');

      console.log('✓ Missing API key rejected for property detail endpoint');
    });

    test('should reject GET /api/v1/counties without x-api-key header → 401', async ({ request }) => {
      const response = await request.get(`${API_V1_BASE}/counties`);

      expect(response.status()).toBe(401);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.message).toContain('API key');

      console.log('✓ Missing API key rejected for counties endpoint');
    });

    test('should reject POST /api/v1/risk-analysis without x-api-key header → 401', async ({ request }) => {
      const response = await request.post(`${API_V1_BASE}/risk-analysis`, {
        data: {
          property_id: 'test-id-123',
        },
      });

      expect(response.status()).toBe(401);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.message).toContain('API key');

      console.log('✓ Missing API key rejected for risk analysis endpoint');
    });
  });

  test.describe('Invalid API Key Authentication', () => {
    test('should reject request with completely invalid API key format → 401', async ({ request }) => {
      const response = await request.get(`${API_V1_BASE}/properties`, {
        headers: {
          'x-api-key': 'completely_invalid_key_123456789',
        },
      });

      expect(response.status()).toBe(401);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
      expect(data.error.message.toLowerCase()).toMatch(/invalid|unauthorized/);

      // Ensure error message is secure
      expect(data.error.message).not.toContain('database');
      expect(data.error.message).not.toContain('SELECT');
      expect(data.error.message).not.toContain('null');

      console.log('✓ Invalid API key format rejected with 401');
      console.log(`  Error message: "${data.error.message}"`);
    });

    test('should reject request with valid format but non-existent API key → 401', async ({ request }) => {
      // Create a key with valid format but doesn't exist in database
      const fakeKey = 'tdf_' + 'a'.repeat(40);

      const response = await request.get(`${API_V1_BASE}/properties`, {
        headers: {
          'x-api-key': fakeKey,
        },
      });

      expect(response.status()).toBe(401);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.message.toLowerCase()).toMatch(/invalid|unauthorized/);

      console.log('✓ Non-existent API key rejected with 401');
    });

    test('should reject request with empty API key header → 401', async ({ request }) => {
      const response = await request.get(`${API_V1_BASE}/properties`, {
        headers: {
          'x-api-key': '',
        },
      });

      expect(response.status()).toBe(401);

      const data = await response.json();
      expect(data.success).toBe(false);

      console.log('✓ Empty API key header rejected with 401');
    });

    test('should reject request with whitespace-only API key → 401', async ({ request }) => {
      const response = await request.get(`${API_V1_BASE}/properties`, {
        headers: {
          'x-api-key': '   ',
        },
      });

      expect(response.status()).toBe(401);

      const data = await response.json();
      expect(data.success).toBe(false);

      console.log('✓ Whitespace-only API key rejected with 401');
    });
  });

  test.describe('Revoked API Key Scenario', () => {
    test('should create API key for revocation test', async ({ request }) => {
      const response = await request.post(`${API_DEV_BASE}/keys`, {
        data: {
          name: TEST_API_KEY_NAME,
          permissions: ['read'],
          rate_limit_tier: 'free',
        },
      });

      // If unauthorized, skip this test suite
      if (response.status() === 401) {
        test.skip(true, 'Authentication required - run tests with authenticated session');
        return;
      }

      expect(response.status()).toBe(201);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.api_key).toBeDefined();
      expect(data.data.api_key).toMatch(/^tdf_[a-zA-Z0-9]{40}$/);

      // Store for revocation test
      testApiKey = data.data.api_key;
      testApiKeyId = data.data.id;

      console.log('✓ Test API key created for revocation scenario');
      console.log(`  Key ID: ${testApiKeyId}`);
    });

    test('should successfully use API key before revocation', async ({ request }) => {
      test.skip(!testApiKey, 'API key not created');

      const response = await request.get(`${API_V1_BASE}/properties`, {
        headers: {
          'x-api-key': testApiKey!,
        },
        params: {
          limit: '1',
        },
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);

      console.log('✓ API key works before revocation');
    });

    test('should revoke the API key', async ({ request }) => {
      test.skip(!testApiKeyId, 'API key ID not available');

      const response = await request.delete(`${API_DEV_BASE}/keys/${testApiKeyId}`);

      // If unauthorized, skip
      if (response.status() === 401) {
        test.skip(true, 'Authentication required - skipping revocation test');
        return;
      }

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);

      console.log('✓ API key revoked successfully');
    });

    test('should reject requests with revoked API key → 401', async ({ request }) => {
      test.skip(!testApiKey, 'API key not created');

      const response = await request.get(`${API_V1_BASE}/properties`, {
        headers: {
          'x-api-key': testApiKey!,
        },
      });

      // Verify revoked key is rejected with 401
      expect(response.status()).toBe(401);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
      expect(data.error.message.toLowerCase()).toMatch(/invalid|unauthorized|revoked/);

      // Ensure error message doesn't reveal too much
      expect(data.error.message).not.toContain('revoked_at');
      expect(data.error.message).not.toContain('timestamp');

      console.log('✓ Revoked API key rejected with 401');
      console.log(`  Error message: "${data.error.message}"`);
    });

    test('should reject multiple different endpoints with revoked key', async ({ request }) => {
      test.skip(!testApiKey, 'API key not created');

      // Test multiple endpoints to ensure revocation is enforced everywhere
      const endpoints = [
        { method: 'GET', path: `${API_V1_BASE}/properties` },
        { method: 'GET', path: `${API_V1_BASE}/counties` },
        { method: 'POST', path: `${API_V1_BASE}/risk-analysis`, data: { property_id: 'test' } },
      ];

      for (const endpoint of endpoints) {
        let response;
        if (endpoint.method === 'GET') {
          response = await request.get(endpoint.path, {
            headers: {
              'x-api-key': testApiKey!,
            },
          });
        } else {
          response = await request.post(endpoint.path, {
            headers: {
              'x-api-key': testApiKey!,
            },
            data: endpoint.data,
          });
        }

        expect(response.status()).toBe(401);

        const data = await response.json();
        expect(data.success).toBe(false);

        console.log(`  ✓ Revoked key rejected on ${endpoint.method} ${endpoint.path}`);
      }

      console.log('✓ Revoked key rejected across all endpoints');
    });
  });

  test.describe('Error Message Security', () => {
    test('should return secure error messages that do not leak implementation details', async ({ request }) => {
      // Test various invalid scenarios
      const scenarios = [
        {
          name: 'No API key',
          headers: {},
        },
        {
          name: 'Invalid API key',
          headers: { 'x-api-key': 'invalid_key' },
        },
        {
          name: 'SQL injection attempt',
          headers: { 'x-api-key': "' OR '1'='1" },
        },
        {
          name: 'XSS attempt',
          headers: { 'x-api-key': '<script>alert("xss")</script>' },
        },
      ];

      for (const scenario of scenarios) {
        const response = await request.get(`${API_V1_BASE}/properties`, {
          headers: scenario.headers,
        });

        expect(response.status()).toBe(401);

        const data = await response.json();
        expect(data.success).toBe(false);
        expect(data.error).toBeDefined();
        expect(data.error.message).toBeDefined();

        // Verify error message is clean and doesn't expose sensitive info
        const errorMessage = data.error.message.toLowerCase();

        // Should not contain sensitive technical details
        expect(errorMessage).not.toContain('database');
        expect(errorMessage).not.toContain('postgres');
        expect(errorMessage).not.toContain('sql');
        expect(errorMessage).not.toContain('query');
        expect(errorMessage).not.toContain('bcrypt');
        expect(errorMessage).not.toContain('hash');
        expect(errorMessage).not.toContain('salt');
        expect(errorMessage).not.toContain('password');
        expect(errorMessage).not.toContain('secret');
        expect(errorMessage).not.toContain('token');
        expect(errorMessage).not.toContain('stack');
        expect(errorMessage).not.toContain('exception');

        // Should not echo back the invalid input
        if (scenario.headers['x-api-key']) {
          expect(data.error.message).not.toContain(scenario.headers['x-api-key']);
        }

        console.log(`  ✓ ${scenario.name}: Secure error message`);
      }

      console.log('✓ All error messages are secure and do not leak implementation details');
    });

    test('should include error codes in responses for programmatic handling', async ({ request }) => {
      const response = await request.get(`${API_V1_BASE}/properties`);

      expect(response.status()).toBe(401);

      const data = await response.json();
      expect(data.error.code).toBeDefined();
      expect(typeof data.error.code).toBe('string');
      expect(data.error.code.length).toBeGreaterThan(0);

      console.log('✓ Error responses include machine-readable error codes');
      console.log(`  Error code: ${data.error.code}`);
    });

    test('should maintain consistent error response structure', async ({ request }) => {
      const response = await request.get(`${API_V1_BASE}/properties`, {
        headers: {
          'x-api-key': 'invalid_key',
        },
      });

      expect(response.status()).toBe(401);

      const data = await response.json();

      // Verify consistent error structure
      expect(data).toHaveProperty('success');
      expect(data.success).toBe(false);
      expect(data).toHaveProperty('error');
      expect(data.error).toHaveProperty('code');
      expect(data.error).toHaveProperty('message');
      expect(typeof data.error.code).toBe('string');
      expect(typeof data.error.message).toBe('string');

      console.log('✓ Error responses have consistent structure');
    });
  });

  test.describe('Permission Validation', () => {
    test('should verify API key permissions are validated (read permission)', async ({ request }) => {
      // This test verifies that the API checks for proper permissions
      // All our test keys have 'read' permission, so they should work for GET requests

      // First, create a key with read permission
      const createResponse = await request.post(`${API_DEV_BASE}/keys`, {
        data: {
          name: 'Read Permission Test Key',
          permissions: ['read'],
          rate_limit_tier: 'free',
        },
      });

      if (createResponse.status() === 401) {
        test.skip(true, 'Authentication required - skipping permission test');
        return;
      }

      expect(createResponse.status()).toBe(201);

      const createData = await createResponse.json();
      const readOnlyKey = createData.data.api_key;

      // Verify the key works for GET requests (read permission)
      const getResponse = await request.get(`${API_V1_BASE}/properties`, {
        headers: {
          'x-api-key': readOnlyKey,
        },
        params: {
          limit: '1',
        },
      });

      expect(getResponse.status()).toBe(200);

      console.log('✓ API key with read permission can access GET endpoints');

      // Clean up - revoke the test key
      const keyId = createData.data.id;
      await request.delete(`${API_DEV_BASE}/keys/${keyId}`);
    });
  });
});

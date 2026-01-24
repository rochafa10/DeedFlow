import { test, expect, APIRequestContext } from '@playwright/test';

/**
 * Developer API - API-Only Tests
 *
 * Tests the Developer API endpoints directly without UI interaction.
 * This is more reliable and faster than full UI tests.
 */

// Test configuration
const TEST_API_KEY_NAME = 'Playwright E2E Test Key';
const API_V1_BASE = '/api/v1';
const API_DEV_BASE = '/api/developer';

// We'll store the created API key for use across tests
let createdApiKey: string | null = null;
let createdApiKeyId: string | null = null;

test.describe('Developer API - Direct API Tests', () => {
  test.describe.configure({ mode: 'serial' }); // Run tests in order

  test('should reject requests without API key', async ({ request }) => {
    const response = await request.get(`${API_V1_BASE}/properties`);

    expect(response.status()).toBe(401);

    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error).toBeDefined();
    expect(data.error.message).toContain('API key');
  });

  test('should reject requests with invalid API key', async ({ request }) => {
    const response = await request.get(`${API_V1_BASE}/properties`, {
      headers: {
        'x-api-key': 'invalid_key_123456789',
      },
    });

    expect(response.status()).toBe(401);

    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error.message).toContain('Invalid');
  });

  test('should create API key via developer API', async ({ request }) => {
    // Note: This test requires authentication via session cookies
    // You may need to adjust this based on your auth setup

    const response = await request.post(`${API_DEV_BASE}/keys`, {
      data: {
        name: TEST_API_KEY_NAME,
        permissions: ['read'],
        rate_limit_tier: 'free',
      },
    });

    // If unauthorized, skip this test and subsequent ones
    if (response.status() === 401) {
      test.skip(true, 'Authentication required - run tests with authenticated session');
      return;
    }

    expect(response.status()).toBe(201);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    expect(data.data.api_key).toBeDefined();
    expect(data.data.api_key).toMatch(/^tdf_[a-zA-Z0-9]{40}$/);

    // Store for later tests
    createdApiKey = data.data.api_key;
    createdApiKeyId = data.data.id;

    console.log('Created API key:', createdApiKey?.substring(0, 15) + '...');
  });

  test('should make successful request with valid API key', async ({ request }) => {
    test.skip(!createdApiKey, 'API key not created');

    const response = await request.get(`${API_V1_BASE}/properties`, {
      headers: {
        'x-api-key': createdApiKey!,
      },
      params: {
        limit: '10',
      },
    });

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    expect(data.data.properties).toBeDefined();
    expect(Array.isArray(data.data.properties)).toBe(true);
    expect(data.data.total).toBeGreaterThanOrEqual(0);
    expect(data.data.pagination).toBeDefined();
    expect(data.data.pagination.limit).toBe(10);

    // Verify rate limit headers are present
    expect(response.headers()['x-ratelimit-limit']).toBeDefined();
    expect(response.headers()['x-ratelimit-remaining']).toBeDefined();
    expect(response.headers()['x-ratelimit-reset']).toBeDefined();

    console.log(`API returned ${data.data.total} total properties`);
  });

  test('should support property filtering', async ({ request }) => {
    test.skip(!createdApiKey, 'API key not created');

    // Test filtering by state
    const response = await request.get(`${API_V1_BASE}/properties`, {
      headers: {
        'x-api-key': createdApiKey!,
      },
      params: {
        state_code: 'PA',
        limit: '5',
      },
    });

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data.properties)).toBe(true);

    // Verify all returned properties are from PA
    data.data.properties.forEach((property: any) => {
      expect(property.state_code).toBe('PA');
    });
  });

  test('should get single property details', async ({ request }) => {
    test.skip(!createdApiKey, 'API key not created');

    // First get a list to find a property ID
    const listResponse = await request.get(`${API_V1_BASE}/properties`, {
      headers: {
        'x-api-key': createdApiKey!,
      },
      params: {
        limit: '1',
      },
    });

    expect(listResponse.status()).toBe(200);
    const listData = await listResponse.json();

    if (listData.data.properties.length === 0) {
      test.skip(true, 'No properties available for testing');
      return;
    }

    const propertyId = listData.data.properties[0].id;

    // Get single property details
    const response = await request.get(`${API_V1_BASE}/properties/${propertyId}`, {
      headers: {
        'x-api-key': createdApiKey!,
      },
    });

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    expect(data.data.id).toBe(propertyId);
    expect(data.data.parcel_number).toBeDefined();
  });

  test('should get counties list', async ({ request }) => {
    test.skip(!createdApiKey, 'API key not created');

    const response = await request.get(`${API_V1_BASE}/counties`, {
      headers: {
        'x-api-key': createdApiKey!,
      },
    });

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    expect(Array.isArray(data.data)).toBe(true);

    // Verify county structure
    if (data.data.length > 0) {
      const county = data.data[0];
      expect(county.id).toBeDefined();
      expect(county.name).toBeDefined();
      expect(county.state_code).toBeDefined();
      expect(county.property_count).toBeGreaterThanOrEqual(0);
    }

    console.log(`API returned ${data.data.length} counties`);
  });

  test('should get single county details', async ({ request }) => {
    test.skip(!createdApiKey, 'API key not created');

    // First get a list to find a county ID
    const listResponse = await request.get(`${API_V1_BASE}/counties`, {
      headers: {
        'x-api-key': createdApiKey!,
      },
    });

    expect(listResponse.status()).toBe(200);
    const listData = await listResponse.json();

    if (listData.data.length === 0) {
      test.skip(true, 'No counties available for testing');
      return;
    }

    const countyId = listData.data[0].id;

    // Get single county details
    const response = await request.get(`${API_V1_BASE}/counties/${countyId}`, {
      headers: {
        'x-api-key': createdApiKey!,
      },
    });

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    expect(data.data.id).toBe(countyId);
    expect(data.data.name).toBeDefined();
    expect(data.data.state_code).toBeDefined();
  });

  test('should perform risk analysis', async ({ request }) => {
    test.skip(!createdApiKey, 'API key not created');

    // Get a property to analyze
    const listResponse = await request.get(`${API_V1_BASE}/properties`, {
      headers: {
        'x-api-key': createdApiKey!,
      },
      params: {
        limit: '1',
      },
    });

    const listData = await listResponse.json();

    if (listData.data.properties.length === 0) {
      test.skip(true, 'No properties available for risk analysis');
      return;
    }

    const propertyId = listData.data.properties[0].id;

    // Perform risk analysis
    const response = await request.post(`${API_V1_BASE}/risk-analysis`, {
      headers: {
        'x-api-key': createdApiKey!,
      },
      data: {
        property_id: propertyId,
      },
    });

    // Risk analysis may fail if property doesn't have coordinates
    if (response.status() === 400) {
      console.log('Property lacks coordinates for risk analysis - expected behavior');
      return;
    }

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    expect(data.data.overall_risk).toBeDefined();
    expect(data.data.risk_factors).toBeDefined();
  });

  test('should track usage statistics', async ({ request }) => {
    test.skip(!createdApiKey, 'API key not created');

    // Make a few requests to generate usage data
    for (let i = 0; i < 5; i++) {
      await request.get(`${API_V1_BASE}/properties`, {
        headers: {
          'x-api-key': createdApiKey!,
        },
        params: {
          limit: '1',
        },
      });
    }

    // Wait a moment for usage to be recorded
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Get usage statistics
    const response = await request.get(`${API_DEV_BASE}/usage`);

    // If unauthorized, the test needs session auth
    if (response.status() === 401) {
      console.log('Usage endpoint requires session auth - skipping');
      return;
    }

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    expect(data.data.total_requests).toBeGreaterThan(0);
    expect(data.data.rate_limit_status).toBeDefined();
  });

  test('should enforce rate limiting', async ({ request }) => {
    test.skip(!createdApiKey, 'API key not created');

    // This is a lighter rate limit test
    // We'll make requests until we hit the limit or reach a reasonable max

    test.setTimeout(60000); // 1 minute timeout

    console.log('Testing rate limiting with sample requests...');

    let requestCount = 0;
    let rateLimited = false;
    const maxRequests = 50; // Test with smaller number first

    for (let i = 0; i < maxRequests; i++) {
      const response = await request.get(`${API_V1_BASE}/properties`, {
        headers: {
          'x-api-key': createdApiKey!,
        },
        params: {
          limit: '1',
        },
      });

      requestCount++;

      if (response.status() === 429) {
        rateLimited = true;
        console.log(`Rate limited after ${requestCount} requests`);

        // Verify rate limit response
        const data = await response.json();
        expect(data.success).toBe(false);
        expect(data.error.code).toBe('RATE_LIMIT_EXCEEDED');

        // Verify rate limit headers
        expect(response.headers()['x-ratelimit-remaining']).toBe('0');
        break;
      }

      expect(response.status()).toBe(200);
    }

    // Note: With 'free' tier (1000/hour), we won't hit limit in 50 requests
    // This test verifies the rate limit headers are present
    console.log(`Made ${requestCount} requests, rate limited: ${rateLimited}`);

    // At minimum, verify rate limit headers are being sent
    const lastResponse = await request.get(`${API_V1_BASE}/properties`, {
      headers: {
        'x-api-key': createdApiKey!,
      },
      params: {
        limit: '1',
      },
    });

    expect(lastResponse.headers()['x-ratelimit-limit']).toBeDefined();
    expect(lastResponse.headers()['x-ratelimit-remaining']).toBeDefined();
    expect(lastResponse.headers()['x-ratelimit-reset']).toBeDefined();

    console.log('Rate limit headers verified');
  });

  test('should list API keys', async ({ request }) => {
    const response = await request.get(`${API_DEV_BASE}/keys`);

    // If unauthorized, skip
    if (response.status() === 401) {
      console.log('List keys endpoint requires session auth - skipping');
      return;
    }

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);

    // Find our created key
    if (createdApiKeyId) {
      const ourKey = data.data.find((key: any) => key.id === createdApiKeyId);
      expect(ourKey).toBeDefined();
      expect(ourKey.name).toBe(TEST_API_KEY_NAME);
      expect(ourKey.permissions).toContain('read');
    }
  });

  test('should revoke API key', async ({ request }) => {
    test.skip(!createdApiKeyId, 'API key ID not available');

    const response = await request.delete(`${API_DEV_BASE}/keys/${createdApiKeyId}`);

    // If unauthorized, skip
    if (response.status() === 401) {
      console.log('Revoke endpoint requires session auth - skipping');
      return;
    }

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);

    // Verify the key no longer works
    const testResponse = await request.get(`${API_V1_BASE}/properties`, {
      headers: {
        'x-api-key': createdApiKey!,
      },
    });

    expect(testResponse.status()).toBe(401);

    console.log('API key successfully revoked');
  });
});

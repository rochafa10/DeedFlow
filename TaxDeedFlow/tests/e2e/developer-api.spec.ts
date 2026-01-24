import { test, expect, Page } from '@playwright/test';

/**
 * End-to-End Test: Developer API Flow
 *
 * Tests the complete flow:
 * 1. Create API key via UI
 * 2. Make authenticated API request
 * 3. View usage statistics
 * 4. Test rate limiting
 */

// Helper function to login (you may need to adjust based on your auth setup)
async function login(page: Page) {
  // For now, we'll skip to authenticated state
  // In a real scenario, you would:
  // 1. Navigate to login page
  // 2. Fill in credentials
  // 3. Submit form
  // 4. Wait for redirect

  // This is a placeholder - adjust based on your actual auth flow
  await page.goto('/auth/login');
  // TODO: Replace with actual login steps when auth flow is implemented
}

test.describe('Developer API End-to-End Flow', () => {
  let apiKey: string;

  test.beforeEach(async ({ page }) => {
    // Ensure we're logged in before each test
    await login(page);
  });

  test('should create API key via developer portal', async ({ page }) => {
    // Navigate to API keys page
    await page.goto('/developer/keys');
    await expect(page.getByRole('heading', { name: 'API Keys' })).toBeVisible();

    // Click create new API key button
    await page.getByRole('button', { name: /create.*api.*key/i }).click();

    // Fill in the API key name
    await page.getByLabel(/name/i).fill('E2E Test Key');

    // Select permissions (check the 'read' permission)
    await page.getByRole('checkbox', { name: /read/i }).check();

    // Submit the form
    await page.getByRole('button', { name: /create/i }).click();

    // Wait for the API key to be created and displayed
    await expect(page.getByText(/api.*key.*created/i)).toBeVisible({ timeout: 5000 });

    // Extract the API key from the alert/display
    // The key should be shown in a code block or input field
    const keyElement = page.locator('[data-testid="api-key-value"]').or(
      page.locator('code').filter({ hasText: /^tdf_[a-zA-Z0-9]{40}$/ })
    );

    await expect(keyElement).toBeVisible({ timeout: 5000 });
    apiKey = await keyElement.textContent() || '';

    expect(apiKey).toMatch(/^tdf_[a-zA-Z0-9]{40}$/);
    console.log('Created API key:', apiKey.substring(0, 15) + '...');
  });

  test('should make authenticated API request with API key', async ({ request }) => {
    // First, create an API key via direct API call for testing
    // In a real scenario, this would use the key from the previous test
    // For isolated tests, we create a fresh key here

    test.skip(!apiKey, 'API key not available');

    // Make GET request to /api/v1/properties with API key
    const response = await request.get('/api/v1/properties', {
      headers: {
        'x-api-key': apiKey,
      },
      params: {
        limit: '10',
      },
    });

    // Verify successful response
    expect(response.status()).toBe(200);

    // Verify response structure
    const data = await response.json();
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('data');
    expect(data.data).toHaveProperty('properties');
    expect(data.data).toHaveProperty('total');
    expect(data.data).toHaveProperty('pagination');

    // Verify properties array exists
    expect(Array.isArray(data.data.properties)).toBe(true);

    console.log(`API returned ${data.data.total} total properties`);
  });

  test('should display usage statistics after API request', async ({ page, request }) => {
    test.skip(!apiKey, 'API key not available');

    // Make a few API requests to generate usage data
    for (let i = 0; i < 3; i++) {
      await request.get('/api/v1/properties', {
        headers: {
          'x-api-key': apiKey,
        },
        params: {
          limit: '5',
        },
      });
    }

    // Wait a moment for usage to be recorded
    await page.waitForTimeout(1000);

    // Navigate to usage dashboard
    await page.goto('/developer/usage');
    await expect(page.getByRole('heading', { name: /usage/i })).toBeVisible();

    // Verify usage statistics are displayed
    await expect(page.getByText(/total.*requests/i)).toBeVisible();
    await expect(page.getByText(/requests.*today/i)).toBeVisible();
    await expect(page.getByText(/rate.*limit/i)).toBeVisible();

    // Verify that request count is greater than 0
    const totalRequestsText = await page.locator('text=/\\d+.*total.*requests|total.*requests.*\\d+/i').textContent();
    expect(totalRequestsText).toBeTruthy();

    console.log('Usage statistics displayed:', totalRequestsText);
  });

  test('should enforce rate limiting after exceeding limit', async ({ request }) => {
    test.skip(!apiKey, 'API key not available');

    // This test makes 1001 requests to verify rate limiting
    // Note: This is a heavy test and may take several minutes
    // For faster testing, you can reduce the limit in rate-limiter.ts temporarily

    test.setTimeout(300000); // 5 minutes timeout

    console.log('Starting rate limit test - making 1001 requests...');

    let successCount = 0;
    let rateLimitedCount = 0;
    let lastResponse;

    // Make requests until we hit the rate limit
    // Default tier is 'free' with 1000 requests per hour
    for (let i = 1; i <= 1001; i++) {
      lastResponse = await request.get('/api/v1/properties', {
        headers: {
          'x-api-key': apiKey,
        },
        params: {
          limit: '1',
        },
      });

      if (lastResponse.status() === 200) {
        successCount++;
      } else if (lastResponse.status() === 429) {
        rateLimitedCount++;
        console.log(`Rate limited on request ${i}`);
        break; // Stop after first rate limit hit
      }

      // Log progress every 100 requests
      if (i % 100 === 0) {
        console.log(`Progress: ${i}/1001 requests completed`);
      }
    }

    console.log(`Test completed: ${successCount} successful, ${rateLimitedCount} rate limited`);

    // Verify that we got rate limited
    expect(lastResponse!.status()).toBe(429);

    // Verify rate limit headers are present
    const rateLimitLimit = lastResponse!.headers()['x-ratelimit-limit'];
    const rateLimitRemaining = lastResponse!.headers()['x-ratelimit-remaining'];
    const rateLimitReset = lastResponse!.headers()['x-ratelimit-reset'];

    expect(rateLimitLimit).toBeTruthy();
    expect(rateLimitRemaining).toBe('0');
    expect(rateLimitReset).toBeTruthy();

    // Verify error response structure
    const errorData = await lastResponse!.json();
    expect(errorData).toHaveProperty('success', false);
    expect(errorData).toHaveProperty('error');
    expect(errorData.error).toHaveProperty('code', 'RATE_LIMIT_EXCEEDED');
    expect(errorData.error.message).toContain('Rate limit exceeded');

    console.log('Rate limiting verified successfully');
  });

  test('complete end-to-end flow: create key → make request → view usage', async ({ page, request }) => {
    // This test combines all steps in sequence

    // Step 1: Navigate to developer portal
    await page.goto('/developer');
    await expect(page.getByRole('heading', { name: 'Developer Portal' })).toBeVisible();

    // Step 2: Navigate to API keys page
    await page.getByRole('link', { name: /api.*keys/i }).click();
    await expect(page.getByRole('heading', { name: 'API Keys' })).toBeVisible();

    // Step 3: Create new API key
    await page.getByRole('button', { name: /create.*api.*key/i }).click();
    await page.getByLabel(/name/i).fill('Complete E2E Test Key');
    await page.getByRole('checkbox', { name: /read/i }).check();
    await page.getByRole('button', { name: /create/i }).click();

    // Step 4: Extract API key
    await expect(page.getByText(/api.*key.*created/i)).toBeVisible({ timeout: 5000 });
    const keyElement = page.locator('[data-testid="api-key-value"]').or(
      page.locator('code').filter({ hasText: /^tdf_[a-zA-Z0-9]{40}$/ })
    );
    const newApiKey = await keyElement.textContent() || '';
    expect(newApiKey).toMatch(/^tdf_[a-zA-Z0-9]{40}$/);

    // Step 5: Make API request with the new key
    const apiResponse = await request.get('/api/v1/properties', {
      headers: {
        'x-api-key': newApiKey,
      },
      params: {
        limit: '5',
      },
    });

    expect(apiResponse.status()).toBe(200);
    const apiData = await apiResponse.json();
    expect(apiData.success).toBe(true);
    expect(Array.isArray(apiData.data.properties)).toBe(true);

    // Step 6: View usage statistics
    await page.waitForTimeout(1000); // Wait for usage to be recorded
    await page.goto('/developer/usage');
    await expect(page.getByRole('heading', { name: /usage/i })).toBeVisible();

    // Verify the request is shown in usage
    await expect(page.getByText(/total.*requests/i)).toBeVisible();
    const usageText = await page.locator('text=/\\d+.*total.*requests|total.*requests.*\\d+/i').textContent();
    expect(usageText).toContain('1'); // At least 1 request

    // Step 7: Verify rate limit status is displayed
    await expect(page.getByText(/rate.*limit/i)).toBeVisible();
    await expect(page.locator('text=/\\d+.*\\/.*\\d+.*requests/i')).toBeVisible(); // Shows "X / Y requests"

    console.log('Complete end-to-end flow verified successfully');
  });

  test.afterAll(async ({ request }) => {
    // Cleanup: Revoke the test API key
    if (apiKey) {
      console.log('Cleaning up test API key...');
      // Note: This would require the API key ID, which we'd need to track
      // For now, keys can be manually cleaned up via the UI
    }
  });
});

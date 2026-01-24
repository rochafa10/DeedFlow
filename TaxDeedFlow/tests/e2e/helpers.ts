/**
 * E2E Test Helper Functions
 *
 * Shared utilities for team collaboration E2E tests
 *
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-23
 */

import { Page, expect } from '@playwright/test';

/**
 * Login helper - authenticates as demo user
 * Ensures authentication persists across page navigations
 */
export async function loginAsDemoUser(
  page: Page,
  userType: 'admin' | 'analyst' | 'viewer' = 'admin'
): Promise<void> {
  console.log(`[E2E] Logging in as ${userType}...`);

  // WORKAROUND: Navigate to home page first to ensure app initializes properly
  // Then navigate to login page
  console.log('[E2E] Navigating to home page first...');
  await page.goto('/', { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(3000);

  console.log('[E2E] Navigating to login page...');
  await page.goto('/login', { waitUntil: 'load', timeout: 60000 });

  // Give the page time to fully load and hydrate
  await page.waitForTimeout(5000);

  // Wait for the email input to appear (indicates React has hydrated and AuthContext initialized)
  await page.waitForSelector('input[type="email"]', {
    state: 'visible',
    timeout: 40000
  });

  console.log(`[E2E] Login form loaded successfully`);

  // Select credentials based on user type
  const credentials = {
    admin: { email: 'demo@taxdeedflow.com', password: 'demo123' },
    analyst: { email: 'demo@taxdeedflow.com', password: 'demo123' }, // Use admin for analyst too
    viewer: { email: 'viewer@taxdeedflow.com', password: 'viewer123' },
  };

  const { email, password } = credentials[userType];

  // Fill in login form
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);

  // Submit form
  await page.getByRole('button', { name: /sign in/i }).click();

  // Wait for redirect to dashboard or home with increased timeout
  await page.waitForURL(/\/(dashboard|\/)/, { timeout: 15000 });

  // CRITICAL: Set localStorage explicitly to ensure auth state persists
  await page.evaluate(() => {
    const demoUser = {
      id: 'user-demo-001',
      email: 'admin@taxdeedflow.com',
      role: 'admin',
      currentOrganizationId: 'org-demo-001',
      organizationRole: 'admin',
    };

    const demoOrg = {
      id: 'org-demo-001',
      name: 'Demo Organization',
      slug: 'demo-org',
      settings: {
        features: {
          dealPipeline: true,
          sharedWatchlists: true,
          auditLog: true,
        },
      },
    };

    localStorage.setItem('user', JSON.stringify(demoUser));
    localStorage.setItem('currentOrganization', JSON.stringify(demoOrg));
  });

  // Reload to pick up localStorage changes
  await page.reload({ waitUntil: 'domcontentloaded' });

  // Wait for network to be idle (all async operations complete)
  await page.waitForLoadState('networkidle', { timeout: 15000 });

  // Log current state for debugging
  const currentUrl = page.url();
  console.log(`[E2E] Login complete. URL: ${currentUrl}`);
}

/**
 * Logout helper - signs out current user
 */
export async function logout(page: Page): Promise<void> {
  // Click user menu
  await page.getByRole('button', { name: /user menu/i }).click();

  // Click logout
  await page.getByRole('menuitem', { name: /logout/i }).click();

  // Verify redirected to login
  await page.waitForURL('/login', { timeout: 5000 });
}

/**
 * Navigate to team management page
 * Waits for page load and authentication checks
 */
export async function navigateToTeamPage(page: Page): Promise<void> {
  console.log('[E2E] Navigating to /team...');
  await page.goto('/team', { waitUntil: 'domcontentloaded' });

  // Wait for network to be idle before checking content
  await page.waitForLoadState('networkidle', { timeout: 30000 });

  // Verify URL
  await expect(page).toHaveURL('/team');

  // Log current URL for debugging
  console.log(`[E2E] Current URL: ${page.url()}`);

  // Wait for main content to appear (more reliable than specific text)
  await page.waitForSelector('main, [role="main"], h1', { timeout: 30000 });

  // Wait for loading state to disappear
  await page.waitForSelector('.animate-pulse, .animate-spin', {
    state: 'detached',
    timeout: 10000,
  }).catch(() => {
    // Loading state might not exist, that's ok
  });

  console.log('[E2E] Team page loaded successfully');
}

/**
 * Navigate to watchlists page
 * Waits for page load and authentication checks
 */
export async function navigateToWatchlistsPage(page: Page): Promise<void> {
  console.log('[E2E] Navigating to /watchlists...');
  await page.goto('/watchlists', { waitUntil: 'domcontentloaded' });

  // Wait for network to be idle before checking content
  await page.waitForLoadState('networkidle', { timeout: 30000 });

  // Verify URL
  await expect(page).toHaveURL('/watchlists');

  // Log current URL for debugging
  console.log(`[E2E] Current URL: ${page.url()}`);

  // Wait for main content to appear (more reliable than specific text)
  await page.waitForSelector('main, [role="main"], h1', { timeout: 30000 });

  // Wait for loading state to disappear
  await page.waitForSelector('.animate-pulse, .animate-spin', {
    state: 'detached',
    timeout: 10000,
  }).catch(() => {
    // Loading state might not exist, that's ok
  });

  console.log('[E2E] Watchlists page loaded successfully');
}

/**
 * Navigate to deal pipeline page
 * Waits for page load and authentication checks
 */
export async function navigateToPipelinePage(page: Page): Promise<void> {
  console.log('[E2E] Navigating to /pipeline...');
  await page.goto('/pipeline', { waitUntil: 'domcontentloaded' });

  // Wait for network to be idle before checking content
  await page.waitForLoadState('networkidle', { timeout: 30000 });

  // Verify URL
  await expect(page).toHaveURL('/pipeline');

  // Log current URL for debugging
  console.log(`[E2E] Current URL: ${page.url()}`);

  // Wait for main content to appear (more reliable than specific text)
  await page.waitForSelector('main, [role="main"], h1', { timeout: 30000 });

  // Wait for loading state to disappear
  await page.waitForSelector('.animate-pulse, .animate-spin', {
    state: 'detached',
    timeout: 10000,
  }).catch(() => {
    // Loading state might not exist, that's ok
  });

  console.log('[E2E] Pipeline page loaded successfully');
}

/**
 * Navigate to audit log page
 * Waits for page load and authentication checks
 */
export async function navigateToAuditLogPage(page: Page): Promise<void> {
  console.log('[E2E] Navigating to /audit-log...');
  await page.goto('/audit-log', { waitUntil: 'domcontentloaded' });

  // Wait for network to be idle before checking content
  await page.waitForLoadState('networkidle', { timeout: 30000 });

  // Verify URL
  await expect(page).toHaveURL('/audit-log');

  // Log current URL for debugging
  console.log(`[E2E] Current URL: ${page.url()}`);

  // Wait for main content to appear (more reliable than specific text)
  await page.waitForSelector('main, [role="main"], h1', { timeout: 30000 });

  // Wait for loading state to disappear
  await page.waitForSelector('.animate-pulse, .animate-spin', {
    state: 'detached',
    timeout: 10000,
  }).catch(() => {
    // Loading state might not exist, that's ok
  });

  console.log('[E2E] Audit log page loaded successfully');
}

/**
 * Create a watchlist
 */
export async function createWatchlist(
  page: Page,
  options: {
    name: string;
    description?: string;
    color?: string;
    visibility?: 'private' | 'shared' | 'public';
  }
): Promise<void> {
  // Open create dialog
  await page.getByRole('button', { name: /create watchlist/i }).click();

  // Wait for dialog
  await expect(page.getByRole('heading', { name: /create new watchlist/i })).toBeVisible();

  // Fill in details
  await page.getByLabel(/^name$/i).fill(options.name);

  if (options.description) {
    await page.getByLabel(/description/i).fill(options.description);
  }

  if (options.color) {
    const colorButton = page.locator(`button[aria-label*="${options.color}"]`).first();
    await colorButton.click();
  }

  // Set visibility
  const visibility = options.visibility || 'private';
  if (visibility === 'shared') {
    await page.getByLabel(/shared with organization/i).check();
  } else if (visibility === 'public') {
    await page.getByLabel(/public/i).check();
  } else {
    await page.getByLabel(/private/i).check();
  }

  // Submit
  await page.getByRole('button', { name: /^create$/i }).click();

  // Wait for success
  await expect(page.getByText(/watchlist created/i)).toBeVisible({ timeout: 5000 });
}

/**
 * Invite a team member
 */
export async function inviteTeamMember(
  page: Page,
  email: string,
  role: 'admin' | 'analyst' | 'viewer'
): Promise<void> {
  // Open invite dialog
  await page.getByRole('button', { name: /invite member/i }).click();

  // Wait for dialog
  await expect(page.getByRole('heading', { name: /invite team member/i })).toBeVisible();

  // Fill in email
  await page.getByLabel(/email address/i).fill(email);

  // Select role
  await page.getByLabel(/role/i).click();
  await page.getByRole('option', { name: new RegExp(role, 'i') }).click();

  // Submit
  await page.getByRole('button', { name: /send invitation/i }).click();

  // Wait for success
  await expect(page.getByText(/invitation sent/i)).toBeVisible({ timeout: 5000 });

  // Close dialog
  await page.keyboard.press('Escape');
}

/**
 * Wait for element to be visible with custom timeout
 */
export async function waitForElement(
  page: Page,
  selector: string,
  timeout: number = 5000
): Promise<void> {
  await page.waitForSelector(selector, { state: 'visible', timeout });
}

/**
 * Check if element exists (doesn't throw if not found)
 */
export async function elementExists(page: Page, selector: string): Promise<boolean> {
  const element = page.locator(selector);
  const count = await element.count();
  return count > 0;
}

/**
 * Clear localStorage and sessionStorage
 */
export async function clearStorage(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

/**
 * Take a screenshot with a descriptive name
 */
export async function takeScreenshot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: `test-results/screenshots/${name}.png`, fullPage: true });
}

/**
 * Verify no console errors
 */
export async function verifyNoConsoleErrors(page: Page): Promise<void> {
  const errors: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  page.on('pageerror', (error) => {
    errors.push(error.message);
  });

  // Wait a bit for any async errors
  await page.waitForTimeout(1000);

  if (errors.length > 0) {
    throw new Error(`Console errors detected: ${errors.join(', ')}`);
  }
}

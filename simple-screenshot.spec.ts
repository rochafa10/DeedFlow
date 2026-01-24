import { test, expect } from '@playwright/test';

// Simple screenshot test without Supabase dependency
test.describe('ActivityFeed Visual Verification', () => {
  test('Take screenshot of orchestration page', async ({ page }) => {
    console.log('Navigating to orchestration page...');

    // Set viewport for consistent screenshots
    await page.setViewportSize({ width: 1920, height: 1080 });

    await page.goto('http://localhost:3000/orchestration', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Wait for ActivityFeed to be visible
    await page.waitForSelector('text=Agent Activity Feed', { timeout: 10000 });

    // Take full page screenshot
    await page.screenshot({
      path: 'C:\\Users\\fs_ro\\Documents\\TAX DEED FLOW\\.auto-claude\\worktrees\\tasks\\018-agent-activity-feed\\screenshots\\orchestration-full.png',
      fullPage: true
    });

    console.log('✅ Full page screenshot captured');

    // Take screenshot of just the ActivityFeed component
    const activityFeed = page.locator('text=Agent Activity Feed').locator('..').locator('..');
    await activityFeed.screenshot({
      path: 'C:\\Users\\fs_ro\\Documents\\TAX DEED FLOW\\.auto-claude\\worktrees\\tasks\\018-agent-activity-feed\\screenshots\\activity-feed-component.png'
    });

    console.log('✅ ActivityFeed component screenshot captured');

    // Verify key elements are present
    await expect(page.locator('text=Agent Activity Feed')).toBeVisible();
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
    await expect(page.locator('button[aria-label="Refresh activity feed"]')).toBeVisible();

    console.log('✅ All key UI elements verified');
  });
});

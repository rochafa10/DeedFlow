#!/usr/bin/env node
/**
 * Regrid Screenshot Capture Script v4
 *
 * FIXES in v4:
 * - Navigate to https://app.regrid.com/ (NOT /login which gives 404)
 * - Use correct selectors: input[placeholder="Email address"], input[placeholder="Password"]
 * - Use .first() to handle duplicate IDs on the page
 * - FIX: Submit button is input[type="submit"] not button:has-text("Sign in")
 *
 * Usage: node regrid-screenshot.js <parcel_id> <county> <state> <property_id>
 * Output: JSON with success/error and base64 screenshot
 */

const { chromium } = require('playwright');

// Get arguments - order matches server.mjs: parcel, county, state, propertyId
const [,, parcel, county, state, propertyId] = process.argv;

if (!parcel) {
  console.error(JSON.stringify({ success: false, error: 'Missing parcel_id argument' }));
  process.exit(1);
}

// Regrid credentials from environment or fallback
const REGRID_EMAIL = process.env.REGRID_EMAIL || 'lulu.lopes.sousa@gmail.com';
const REGRID_PASSWORD = process.env.REGRID_PASSWORD || 'Bia@2020';

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 }
    });
    const page = await context.newPage();

    // Step 1: Navigate to main app page (NOT /login which gives 404)
    console.error('[Screenshot] Navigating to Regrid main page...');
    await page.goto('https://app.regrid.com/', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2000);

    // Check if we need to log in (look for login form)
    const loginFormVisible = await page.locator('input[placeholder="Email address"]').first().isVisible({ timeout: 5000 }).catch(() => false);

    if (loginFormVisible) {
      console.error('[Screenshot] Login form found, logging in...');

      // Fill email using placeholder selector (handles duplicate IDs)
      await page.locator('input[placeholder="Email address"]').first().fill(REGRID_EMAIL);
      console.error('[Screenshot] Email filled');

      // Fill password
      await page.locator('input[placeholder="Password"]').first().fill(REGRID_PASSWORD);
      console.error('[Screenshot] Password filled');

      // Click Sign in button (it's an input[type="submit"], not a button)
      await page.locator('input[type="submit"][value="Sign in"]').first().click();
      console.error('[Screenshot] Sign in clicked');

      // Wait for login to complete
      await page.waitForLoadState('networkidle', { timeout: 30000 });
      await page.waitForTimeout(3000);

      // Verify login succeeded (should no longer see login form)
      const stillShowingLogin = await page.locator('input[placeholder="Email address"]').first().isVisible({ timeout: 2000 }).catch(() => false);
      if (stillShowingLogin) {
        throw new Error('Login failed - form still visible after submit');
      }
      console.error('[Screenshot] Login successful');
    } else {
      console.error('[Screenshot] Already logged in or no login form found');
    }

    // Step 2: Navigate to county with parcel search
    const searchUrl = `https://app.regrid.com/us/${state || 'pa'}/${county || 'blair'}?search=${encodeURIComponent(parcel)}`;
    console.error(`[Screenshot] Navigating to: ${searchUrl}`);
    await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);

    // Step 3: Use keyboard navigation to select parcel from search results
    console.error('[Screenshot] Selecting parcel with keyboard navigation...');
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(4000);

    // Step 4: Close the Property Details panel to show just the map
    console.error('[Screenshot] Attempting to close Property Details panel...');
    try {
      const closeSelectors = [
        '#property > .close',
        '.property-panel .close',
        'button.close-panel',
        '[aria-label="Close"]',
        '.panel-close',
        '.close-button'
      ];

      for (const selector of closeSelectors) {
        try {
          const closeButton = page.locator(selector).first();
          if (await closeButton.isVisible({ timeout: 1000 }).catch(() => false)) {
            await closeButton.click();
            await page.waitForTimeout(1000);
            console.error(`[Screenshot] Closed panel using: ${selector}`);
            break;
          }
        } catch (e) {
          // Try next
        }
      }
    } catch (e) {
      console.error('[Screenshot] Could not close Property Details panel:', e.message);
    }

    // Step 5: Take screenshot
    console.error('[Screenshot] Capturing screenshot...');
    const screenshot = await page.screenshot({ type: 'png', fullPage: false });

    // Output JSON to stdout
    console.log(JSON.stringify({
      success: true,
      screenshot: screenshot.toString('base64'),
      property_id: propertyId || '',
      parcel_id: parcel
    }));

  } catch (error) {
    console.error('[Screenshot] Error:', error.message);
    console.log(JSON.stringify({ success: false, error: error.message }));
    process.exit(1);
  } finally {
    await browser.close();
  }
})();

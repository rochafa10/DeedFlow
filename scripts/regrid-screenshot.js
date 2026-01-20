#!/usr/bin/env node
/**
 * Regrid Screenshot Capture Script
 *
 * This script runs on Digital Ocean with Playwright to capture
 * zoomed-in parcel screenshots from Regrid.
 *
 * Usage: node /opt/regrid-screenshot.js <property_id> <county> <state> <parcel_id>
 *
 * Output: Base64-encoded PNG screenshot to stdout
 */

const { chromium } = require('playwright');

// Get arguments
const [,, propertyId, county, state, parcelId] = process.argv;

if (!propertyId || !county || !state || !parcelId) {
  console.error('Usage: node regrid-screenshot.js <property_id> <county> <state> <parcel_id>');
  process.exit(1);
}

// Regrid credentials
const REGRID_EMAIL = 'lulu.lopes.sousa@gmail.com';
const REGRID_PASSWORD = 'Bia@2020';

async function captureScreenshot() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 }
    });
    const page = await context.newPage();

    // Step 1: Login to Regrid
    console.error('[Screenshot] Logging in to Regrid...');
    await page.goto('https://app.regrid.com/login', { waitUntil: 'networkidle' });

    await page.fill('input[name="email"]', REGRID_EMAIL);
    await page.fill('input[name="password"]', REGRID_PASSWORD);
    await page.click('button[type="submit"]');

    // Wait for login to complete
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Step 2: Navigate to county with parcel search
    const searchUrl = `https://app.regrid.com/us/${state}/${county}?search=${encodeURIComponent(parcelId)}`;
    console.error(`[Screenshot] Navigating to: ${searchUrl}`);
    await page.goto(searchUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Step 3: Use keyboard navigation to select parcel from search results
    console.error('[Screenshot] Selecting parcel with keyboard navigation...');
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(4000);

    // Step 4: Close the Property Details panel to show just the map
    console.error('[Screenshot] Closing Property Details panel...');
    try {
      const closeButton = page.locator('#property > .close');
      if (await closeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await closeButton.click();
        await page.waitForTimeout(1000);
        console.error('[Screenshot] Property Details panel closed');
      }
    } catch (e) {
      console.error('[Screenshot] Could not close Property Details panel:', e.message);
    }

    // Step 5: Take screenshot
    console.error('[Screenshot] Capturing screenshot...');
    const screenshot = await page.screenshot({
      type: 'png',
      fullPage: false
    });

    // Output base64 to stdout (this is what n8n will capture)
    process.stdout.write(screenshot.toString('base64'));

    console.error('[Screenshot] Success!');

  } catch (error) {
    console.error('[Screenshot] Error:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

captureScreenshot();

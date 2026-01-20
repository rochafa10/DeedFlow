#!/usr/bin/env node
/**
 * Regrid Screenshot Capture Script v13
 *
 * FIXES in v13:
 * - Target the X close button directly using JavaScript DOM traversal
 * - Find the Property Details header and click the close button within it
 * - Use bounding box calculation to click the X button position
 *
 * Usage: node regrid-screenshot-v13.js <parcel_id> <county> <state> <property_id>
 * Output: JSON with success/error and base64 screenshot
 */

const { chromium } = require('playwright');

const [,, parcel, county, state, propertyId] = process.argv;

if (!parcel) {
  console.error(JSON.stringify({ success: false, error: 'Missing parcel_id argument' }));
  process.exit(1);
}

const REGRID_EMAIL = process.env.REGRID_EMAIL || 'lulu.lopes.sousa@gmail.com';
const REGRID_PASSWORD = process.env.REGRID_PASSWORD || 'Bia@2020';

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();

    // Step 1: Navigate to main app page
    console.error('[Screenshot] Navigating to Regrid main page...');
    await page.goto('https://app.regrid.com/', { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(3000);

    // Check if we need to log in
    const loginFormVisible = await page.locator('input[placeholder="Email address"]').first().isVisible({ timeout: 5000 }).catch(() => false);

    if (loginFormVisible) {
      console.error('[Screenshot] Login form found, logging in...');
      await page.locator('input[placeholder="Email address"]').first().fill(REGRID_EMAIL);
      await page.locator('input[placeholder="Password"]').first().fill(REGRID_PASSWORD);
      await page.locator('input[type="submit"][value="Sign in"]').first().click();
      await page.waitForLoadState('load', { timeout: 30000 });
      await page.waitForTimeout(3000);
      const stillShowingLogin = await page.locator('input[placeholder="Email address"]').first().isVisible({ timeout: 2000 }).catch(() => false);
      if (stillShowingLogin) {
        throw new Error('Login failed - form still visible after submit');
      }
      console.error('[Screenshot] Login successful');
    }

    // Step 2: Navigate to county page
    const stateSlug = (state || 'pa').toLowerCase();
    const countySlug = (county || 'blair').toLowerCase().replace(/\s+/g, '-');
    const countyUrl = `https://app.regrid.com/us/${stateSlug}/${countySlug}`;
    console.error(`[Screenshot] Navigating to county: ${countyUrl}`);
    await page.goto(countyUrl, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(3000);

    // Step 3: Find and use the search box
    console.error(`[Screenshot] Searching for parcel: ${parcel}`);
    const searchSelectors = [
      'input[placeholder*="Search"]',
      'input[placeholder*="search"]',
      '[role="searchbox"]',
      'input[type="search"]'
    ];

    let searchBox = null;
    for (const selector of searchSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 1000 })) {
          searchBox = element;
          break;
        }
      } catch (e) {}
    }

    if (!searchBox) throw new Error('Could not find search box');

    await searchBox.click();
    await page.waitForTimeout(500);
    await searchBox.fill(parcel);
    await page.waitForTimeout(2500);

    // Step 4: Select search result
    console.error('[Screenshot] Selecting search result...');
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(300);
    await page.keyboard.press('Enter');

    // Step 5: Wait for map to zoom
    console.error('[Screenshot] Waiting for map to zoom to parcel...');
    await page.waitForTimeout(5000);

    // Step 6: v13 - TARGETED CLOSE: Find and click the X button in Property Details panel
    console.error('[Screenshot] v13: Finding Property Details close button...');

    let panelClosed = false;

    // Method 1: Use JavaScript to find the close button by traversing from "Property Details" text
    try {
      panelClosed = await page.evaluate(() => {
        // Find all elements containing "Property Details" text
        const allElements = document.querySelectorAll('*');
        for (const el of allElements) {
          if (el.childNodes.length === 1 &&
              el.childNodes[0].nodeType === Node.TEXT_NODE &&
              el.textContent.trim() === 'Property Details') {

            // Found the Property Details header text, now find nearby close button
            let container = el.parentElement;
            for (let i = 0; i < 3 && container; i++) {
              const buttons = container.querySelectorAll('button, [role="button"]');
              for (const btn of buttons) {
                const rect = btn.getBoundingClientRect();
                // Close button should be small and positioned to the right
                if (rect.width > 0 && rect.width < 50 && rect.height < 50) {
                  btn.click();
                  return true;
                }
              }
              container = container.parentElement;
            }
          }
        }
        return false;
      });

      if (panelClosed) {
        console.error('[Screenshot] Method 1: Clicked close button via DOM traversal');
        await page.waitForTimeout(1000);
      }
    } catch (e) {
      console.error('[Screenshot] Method 1 failed:', e.message);
    }

    // Verify if panel is actually closed
    if (panelClosed) {
      panelClosed = await page.evaluate(() => !document.body.innerText.includes('Property Details'));
    }

    // Method 2: Click at calculated position based on panel layout
    // Looking at the screenshot: panel is at ~115-350px horizontally, X button at top right
    if (!panelClosed) {
      console.error('[Screenshot] Method 2: Clicking at calculated X button position...');
      try {
        // X button appears to be around (340, 410) based on panel position
        await page.mouse.click(340, 410);
        await page.waitForTimeout(1000);

        panelClosed = await page.evaluate(() => !document.body.innerText.includes('Property Details'));
        console.error(`[Screenshot] Method 2 click at (340, 410): panel_closed=${panelClosed}`);
      } catch (e) {
        console.error('[Screenshot] Method 2 failed:', e.message);
      }
    }

    // Method 3: Try additional positions around where X should be
    if (!panelClosed) {
      console.error('[Screenshot] Method 3: Trying multiple X button positions...');
      const xPositions = [
        [338, 411], [342, 409], [335, 413], [345, 407], [330, 415]
      ];

      for (const [x, y] of xPositions) {
        try {
          await page.mouse.click(x, y);
          await page.waitForTimeout(600);
          panelClosed = await page.evaluate(() => !document.body.innerText.includes('Property Details'));
          if (panelClosed) {
            console.error(`[Screenshot] Method 3: Panel closed at position (${x}, ${y})`);
            break;
          }
        } catch (e) {}
      }
    }

    // Method 4: Use locator to find button with close/x characteristics
    if (!panelClosed) {
      console.error('[Screenshot] Method 4: Using Playwright locators...');
      try {
        // Try various close button selectors
        const closeSelectors = [
          'button:near(:text("Property Details"))',
          '[class*="close"]',
          '[class*="Close"]',
          'button svg',
        ];

        for (const sel of closeSelectors) {
          try {
            const btn = page.locator(sel).first();
            if (await btn.isVisible({ timeout: 300 })) {
              const box = await btn.boundingBox();
              // Only click if its in the left panel area (x < 400)
              if (box && box.x < 400 && box.y < 500) {
                await btn.click();
                await page.waitForTimeout(500);
                panelClosed = await page.evaluate(() => !document.body.innerText.includes('Property Details'));
                if (panelClosed) {
                  console.error(`[Screenshot] Method 4: Closed with selector ${sel}`);
                  break;
                }
              }
            }
          } catch (e) {}
        }
      } catch (e) {
        console.error('[Screenshot] Method 4 failed:', e.message);
      }
    }

    // Final wait
    await page.waitForTimeout(1000);

    // Step 7: Take screenshot
    console.error('[Screenshot] Capturing screenshot...');
    const screenshot = await page.screenshot({ type: 'png', fullPage: false });

    console.log(JSON.stringify({
      success: true,
      screenshot: screenshot.toString('base64'),
      property_id: propertyId || '',
      parcel_id: parcel,
      panel_closed: panelClosed
    }));

  } catch (error) {
    console.error('[Screenshot] Error:', error.message);
    console.log(JSON.stringify({ success: false, error: error.message }));
    process.exit(1);
  } finally {
    await browser.close();
  }
})();

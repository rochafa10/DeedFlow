#!/usr/bin/env node
/**
 * Regrid Screenshot Capture Script v11
 *
 * FIXES in v11:
 * - Close Property Details panel by clicking the X button (not Escape key)
 * - Use specific selector for the panel close button
 * - Fallback: click outside the panel to deselect
 *
 * FIXES in v10:
 * - REMOVED ALL Escape key presses - Escape was closing the entire page/browser
 *
 * Usage: node regrid-screenshot-v11.js <parcel_id> <county> <state> <property_id>
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
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();

    // Step 1: Navigate to main app page (use 'load' not 'networkidle' - map tiles never stop loading)
    console.error('[Screenshot] Navigating to Regrid main page...');
    await page.goto('https://app.regrid.com/', { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(3000);

    // Check if we need to log in (look for login form)
    const loginFormVisible = await page.locator('input[placeholder="Email address"]').first().isVisible({ timeout: 5000 }).catch(() => false);

    if (loginFormVisible) {
      console.error('[Screenshot] Login form found, logging in...');

      // Fill email using placeholder selector
      await page.locator('input[placeholder="Email address"]').first().fill(REGRID_EMAIL);
      console.error('[Screenshot] Email filled');

      // Fill password
      await page.locator('input[placeholder="Password"]').first().fill(REGRID_PASSWORD);
      console.error('[Screenshot] Password filled');

      // Click Sign in button
      await page.locator('input[type="submit"][value="Sign in"]').first().click();
      console.error('[Screenshot] Sign in clicked');

      // Wait for login to complete (use load state, not networkidle)
      await page.waitForLoadState('load', { timeout: 30000 });
      await page.waitForTimeout(3000);

      // Verify login succeeded
      const stillShowingLogin = await page.locator('input[placeholder="Email address"]').first().isVisible({ timeout: 2000 }).catch(() => false);
      if (stillShowingLogin) {
        throw new Error('Login failed - form still visible after submit');
      }
      console.error('[Screenshot] Login successful');
    } else {
      console.error('[Screenshot] Already logged in or no login form found');
    }

    // Step 2: Navigate to county page for geographic context (use 'load' not 'networkidle')
    const stateSlug = (state || 'pa').toLowerCase();
    const countySlug = (county || 'blair').toLowerCase().replace(/\s+/g, '-');
    const countyUrl = `https://app.regrid.com/us/${stateSlug}/${countySlug}`;
    console.error(`[Screenshot] Navigating to county: ${countyUrl}`);
    await page.goto(countyUrl, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(3000);

    // Step 3: Find and use the search box
    console.error(`[Screenshot] Searching for parcel: ${parcel}`);

    // Find search box
    const searchSelectors = [
      'input[placeholder*="Search"]',
      'input[placeholder*="search"]',
      '[role="searchbox"]',
      'input[type="search"]',
      '#search-input',
      '.search-input'
    ];

    let searchBox = null;
    for (const selector of searchSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 1000 })) {
          searchBox = element;
          console.error(`[Screenshot] Found search box: ${selector}`);
          break;
        }
      } catch (e) {
        // Try next
      }
    }

    if (!searchBox) {
      throw new Error('Could not find search box');
    }

    // Click and fill the search box
    await searchBox.click();
    await page.waitForTimeout(500);
    await searchBox.fill(parcel);
    console.error('[Screenshot] Entered search query');

    // Wait for autocomplete dropdown to appear
    await page.waitForTimeout(2500);

    // Step 4: CLICK on the first search result (NOT just keyboard navigation)
    // This triggers proper zoom and parcel highlight
    console.error('[Screenshot] Looking for search result to click...');

    // Try to find and click the first result in the dropdown
    const resultSelectors = [
      '.pac-item:first-child',                    // Google Places autocomplete
      '.autocomplete-item:first-child',           // Custom autocomplete
      '.search-result:first-child',               // Generic
      '[role="option"]:first-child',              // Accessible dropdown
      '.ui-menu-item:first-child',                // jQuery UI
      '.result-item:first-child',                 // Generic result
      '.dropdown-item:first-child',               // Bootstrap dropdown
      'li[role="option"]:first-child',            // List-based
      '.suggestion:first-child',                  // Suggestion list
      '[data-type="parcel"]:first-child',         // Parcel-specific
      '.results li:first-child',                  // Results list
      '#search-results li:first-child',           // ID-based results
    ];

    let resultClicked = false;
    for (const selector of resultSelectors) {
      try {
        const result = page.locator(selector).first();
        if (await result.isVisible({ timeout: 500 })) {
          await result.click();
          console.error(`[Screenshot] Clicked result using: ${selector}`);
          resultClicked = true;
          break;
        }
      } catch (e) {
        // Try next
      }
    }

    if (!resultClicked) {
      // Fallback: Use ArrowDown + Enter
      console.error('[Screenshot] No clickable result found, using keyboard navigation...');
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(300);
      await page.keyboard.press('Enter');
    }

    // Step 5: Wait for map to zoom to parcel (this is the critical wait)
    console.error('[Screenshot] Waiting for map to zoom to parcel...');
    await page.waitForTimeout(5000); // Give time for zoom animation

    // Step 6: Check if we're zoomed in properly (look for parcel highlight)
    const zoomCheck = await page.evaluate(() => {
      const body = document.body.innerText;
      return {
        hasPropertyDetails: body.includes('Property Details'),
        hasOwner: body.includes('Owner'),
        hasParcelInfo: body.includes('APN') || body.includes('Parcel'),
        noZoomMessage: !body.includes('Zoom in to see parcels'),
        currentUrl: window.location.href
      };
    });
    console.error('[Screenshot] Zoom check:', JSON.stringify(zoomCheck));

    // Step 7: If we still see "Zoom in to see parcels", try clicking on the map
    if (!zoomCheck.hasPropertyDetails) {
      console.error('[Screenshot] Property details not visible, trying alternative approach...');

      // Try pressing Enter on the search again
      await page.keyboard.press('Enter');
      await page.waitForTimeout(3000);

      // Or try clicking in the center of the map
      const mapElement = page.locator('#map, .map-container, .mapboxgl-map, [class*="map"]').first();
      if (await mapElement.isVisible({ timeout: 2000 }).catch(() => false)) {
        const box = await mapElement.boundingBox();
        if (box) {
          // Click center of map
          await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
          console.error('[Screenshot] Clicked center of map');
          await page.waitForTimeout(3000);
        }
      }
    }

    // Step 8: v11 - CLOSE Property Details panel by clicking X button
    console.error('[Screenshot] Attempting to close Property Details panel...');

    let panelClosed = false;

    // Method 1: Try various X button selectors on the Property Details panel
    const closeButtonSelectors = [
      // Based on the visible X button in the panel header
      '.property-details-header button',
      '.panel-header .close',
      '.panel-header button',
      'button[aria-label="Close"]',
      'button[aria-label="close"]',
      'button[title="Close"]',
      'button[title="close"]',
      '.close-button',
      '.btn-close',
      // SVG-based close buttons
      'button:has(svg[class*="close"])',
      'button:has(svg[class*="x"])',
      // Generic patterns for Regrid UI
      '.property-panel button:first-child',
      '.details-panel button:first-child',
      '[class*="PropertyDetails"] button',
      '[class*="property-details"] button',
      // The panel itself might have a close mechanism
      '.panel button.close',
      '.sidebar button.close',
    ];

    for (const selector of closeButtonSelectors) {
      try {
        const closeBtn = page.locator(selector).first();
        if (await closeBtn.isVisible({ timeout: 300 })) {
          await closeBtn.click();
          console.error(`[Screenshot] Clicked close button: ${selector}`);
          panelClosed = true;
          await page.waitForTimeout(500);
          break;
        }
      } catch (e) {
        // Try next selector
      }
    }

    // Method 2: Use JavaScript to find and click close button
    if (!panelClosed) {
      console.error('[Screenshot] Trying JavaScript approach to close panel...');
      try {
        panelClosed = await page.evaluate(() => {
          // Find any close/X buttons near Property Details text
          const allButtons = document.querySelectorAll('button, [role="button"]');
          for (const btn of allButtons) {
            // Check if it's a close/X button (by icon, aria-label, or class)
            const isCloseBtn =
              btn.getAttribute('aria-label')?.toLowerCase().includes('close') ||
              btn.className?.toLowerCase().includes('close') ||
              btn.querySelector('svg') !== null; // SVG icon buttons

            if (isCloseBtn && btn.offsetParent !== null) {
              // Check if it's in the left panel area (x < 500)
              const rect = btn.getBoundingClientRect();
              if (rect.left < 500 && rect.top < 400) {
                btn.click();
                return true;
              }
            }
          }
          return false;
        });
        if (panelClosed) {
          console.error('[Screenshot] Closed panel via JavaScript');
          await page.waitForTimeout(500);
        }
      } catch (e) {
        console.error('[Screenshot] JavaScript close failed:', e.message);
      }
    }

    // Method 3: Click on the map to deselect the parcel (closes panel)
    if (!panelClosed) {
      console.error('[Screenshot] Clicking on map to deselect parcel...');
      try {
        // Click on the right side of the map (away from panels)
        // At 1920x1080, clicking at (1200, 400) should be safe
        await page.mouse.click(1200, 400);
        await page.waitForTimeout(1000);

        // Check if panel is gone
        const stillHasPanel = await page.evaluate(() => {
          return document.body.innerText.includes('Property Details');
        });

        if (!stillHasPanel) {
          console.error('[Screenshot] Panel closed by map click');
          panelClosed = true;
        }
      } catch (e) {
        console.error('[Screenshot] Map click failed:', e.message);
      }
    }

    // Method 4: Navigate to a slightly different map view to clear selection
    if (!panelClosed) {
      console.error('[Screenshot] Trying to clear selection via navigation...');
      try {
        // Press Tab to move focus away from the panel, then click map
        await page.keyboard.press('Tab');
        await page.waitForTimeout(200);
        await page.mouse.click(1100, 500);
        await page.waitForTimeout(1000);
        console.error('[Screenshot] Attempted focus change + map click');
      } catch (e) {
        console.error('[Screenshot] Navigation clear failed:', e.message);
      }
    }

    // Final wait for any animations
    await page.waitForTimeout(1500);

    // Step 9: Take screenshot
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

#!/usr/bin/env node
/**
 * Regrid Screenshot Capture Script v2
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

    // Step 1: Login to Regrid
    console.error('[Screenshot] Logging in to Regrid...');
    await page.goto('https://app.regrid.com/login', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2000);

    // Try multiple selector strategies for email field
    const emailSelectors = [
      'input[name="email"]',
      'input[type="email"]',
      'input[placeholder*="email" i]',
      'input[id*="email" i]',
      '#email',
      'input[autocomplete="email"]'
    ];

    let emailFilled = false;
    for (const selector of emailSelectors) {
      try {
        const emailInput = page.locator(selector).first();
        if (await emailInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await emailInput.fill(REGRID_EMAIL);
          emailFilled = true;
          console.error(`[Screenshot] Email filled using: ${selector}`);
          break;
        }
      } catch (e) {
        // Try next selector
      }
    }

    if (!emailFilled) {
      throw new Error('Could not find email input field. Tried: ' + emailSelectors.join(', '));
    }

    // Try multiple selector strategies for password field
    const passwordSelectors = [
      'input[name="password"]',
      'input[type="password"]',
      'input[placeholder*="password" i]',
      'input[id*="password" i]',
      '#password',
      'input[autocomplete="current-password"]'
    ];

    let passwordFilled = false;
    for (const selector of passwordSelectors) {
      try {
        const passwordInput = page.locator(selector).first();
        if (await passwordInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await passwordInput.fill(REGRID_PASSWORD);
          passwordFilled = true;
          console.error(`[Screenshot] Password filled using: ${selector}`);
          break;
        }
      } catch (e) {
        // Try next selector
      }
    }

    if (!passwordFilled) {
      throw new Error('Could not find password input field');
    }

    // Click submit button
    const submitSelectors = [
      'button[type="submit"]',
      'button:has-text("Sign in")',
      'button:has-text("Log in")',
      'button:has-text("Login")',
      'input[type="submit"]',
      'button.login-button',
      'button.submit'
    ];

    let submitted = false;
    for (const selector of submitSelectors) {
      try {
        const submitBtn = page.locator(selector).first();
        if (await submitBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await submitBtn.click();
          submitted = true;
          console.error(`[Screenshot] Submitted using: ${selector}`);
          break;
        }
      } catch (e) {
        // Try next selector
      }
    }

    if (!submitted) {
      // Fallback: press Enter
      await page.keyboard.press('Enter');
      console.error('[Screenshot] Submitted using Enter key');
    }

    // Wait for login to complete
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    await page.waitForTimeout(3000);

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
        '.panel-close'
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

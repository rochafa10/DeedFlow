#!/usr/bin/env node
/**
 * Regrid Screenshot & Data Scraper v15
 *
 * ENHANCED: Now scrapes property data from Property Details panel
 * - Opens Property Details panel
 * - Extracts all property data
 * - Closes panel
 * - Takes screenshot
 * - Returns both data and screenshot
 *
 * Usage: node regrid-screenshot-v15.js <parcel_id> <county> <state> <property_id>
 * Output: JSON with success/error, base64 screenshot, and regrid_data object
 */

const { chromium } = require('playwright');

const [,, parcel, county, state, propertyId] = process.argv;

if (!parcel) {
  console.error(JSON.stringify({ success: false, error: 'Missing parcel_id argument' }));
  process.exit(1);
}

const REGRID_EMAIL = process.env.REGRID_EMAIL || 'lulu.lopes.sousa@gmail.com';
const REGRID_PASSWORD = process.env.REGRID_PASSWORD || 'Bia@2020';

/**
 * Extract property data from Property Details panel
 */
async function extractPropertyData(page) {
  console.error('[Scraper] Extracting property data from panel...');
  
  const data = await page.evaluate(() => {
    const result = {
      regrid_id: null,
      ll_uuid: null,
      property_type: null,
      property_class: null,
      land_use: null,
      zoning: null,
      lot_size_sqft: null,
      lot_size_acres: null,
      lot_dimensions: null,
      building_sqft: null,
      year_built: null,
      bedrooms: null,
      bathrooms: null,
      assessed_value: null,
      assessed_land_value: null,
      assessed_improvement_value: null,
      market_value: null,
      latitude: null,
      longitude: null,
      water_service: null,
      sewer_service: null,
      elevation_ft: null,
      additional_fields: {}
    };

    // Get all text content from the page
    const bodyText = document.body.innerText;
    const bodyHTML = document.body.innerHTML;

    // Try to find Property Details panel
    const panelSelectors = [
      '[class*="PropertyDetails"]',
      '[class*="property-details"]',
      '[class*="panel"]',
      '[role="dialog"]',
      '[class*="sidebar"]'
    ];

    let panel = null;
    for (const sel of panelSelectors) {
      try {
        const el = document.querySelector(sel);
        if (el && el.innerText.includes('Property Details')) {
          panel = el;
          break;
        }
      } catch (e) {}
    }

    // If no panel found, search entire body
    const searchText = panel ? panel.innerText : bodyText;

    // Extract Regrid UUID from panel text (more reliable than URL)
    const regridUuidMatch = searchText.match(/Regrid\s+UUID[:\s]+([a-f0-9-]+)/i);
    if (regridUuidMatch && regridUuidMatch[1]) {
      result.regrid_id = regridUuidMatch[1].trim();
      result.ll_uuid = regridUuidMatch[1].trim();
    }

    // Fallback: Extract from URL
    if (!result.regrid_id) {
      const urlMatch = window.location.href.match(/\/parcel\/([^\/]+)/);
      if (urlMatch) {
        result.regrid_id = urlMatch[1];
        result.ll_uuid = urlMatch[1];
      }
    }

    // Extract data using regex patterns (improved based on actual panel structure)
    const patterns = {
      property_type: /Property\s+Type[:\s]+([^\n]+)/i,
      property_class: /Zoning\s+Type[:\s]+([^\n]+)/i,  // Use Zoning Type for property_class
      land_use: /Parcel\s+Use\s+Code[:\s]+"?([^"\n]+)"?/i,
      zoning: /Zoning\s+Subtype[:\s]+([^\n]+)/i,
      lot_size_acres: /(?:Deed\s+Acres|Calculated\s+Parcel\s+Area|0\.\d+\s+Acres)[:\s]+"?([\d.]+)"?/i,
      lot_size_sqft: /Lot\s+Size[:\s]+([\d,]+)\s*(?:sq\s*ft|square\s*feet|SF)/i,
      lot_dimensions: /(?:Land\s+Description|Lot\s+Dimensions)[:\s]+([^\n]+)/i,
      building_sqft: /Building\s+Area[:\s]+([\d,]+)\s*(?:sq\s*ft|SF)/i,
      year_built: /Year\s+Built[:\s]+(\d{4})/i,
      bedrooms: /Bedrooms?[:\s]+(\d+)/i,
      bathrooms: /Bathrooms?[:\s]+([\d.]+)/i,
      assessed_value: /Total\s+Parcel\s+Value[:\s]+\$?([\d,]+\.?\d*)/i,
      assessed_land_value: /Land\s+Value[:\s]+\$?([\d,]+\.?\d*)/i,
      assessed_improvement_value: /Improvement\s+Value[:\s]+\$?([\d,]+\.?\d*)/i,
      market_value: /Market\s+Value[:\s]+\$?([\d,]+)/i,
      water_service: /Water[:\s]+([^\n]+)/i,
      sewer_service: /Sewer[:\s]+([^\n]+)/i,
      elevation_ft: /Highest\s+Parcel\s+Elevation[:\s]+"?([\d.]+)"?/i
    };

    for (const [key, pattern] of Object.entries(patterns)) {
      const match = searchText.match(pattern);
      if (match && match[1]) {
        let value = match[1].trim();
        
        // Clean numeric values
        if (['lot_size_sqft', 'lot_size_acres', 'building_sqft', 'assessed_value', 'assessed_land_value', 'assessed_improvement_value', 'market_value', 'elevation_ft'].includes(key)) {
          value = value.replace(/,/g, '').replace(/"/g, '');
          result[key] = parseFloat(value) || null;
        } else if (['year_built', 'bedrooms'].includes(key)) {
          result[key] = parseInt(value) || null;
        } else if (key === 'bathrooms') {
          result[key] = parseFloat(value) || null;
        } else {
          result[key] = value.replace(/"/g, '').trim();
        }
      }
    }

    // Extract coordinates from panel text (more reliable - exact format: "Latitude\n40.512463")
    const latMatch = searchText.match(/Latitude[:\s]+"?([-\d.]+)"?/i);
    const lonMatch = searchText.match(/Longitude[:\s]+"?([-\d.]+)"?/i);
    if (latMatch && latMatch[1]) {
      result.latitude = parseFloat(latMatch[1]) || null;
    }
    if (lonMatch && lonMatch[1]) {
      result.longitude = parseFloat(lonMatch[1]) || null;
    }
    
    // Fallback: Extract from Centroid Coordinates
    if (!result.latitude || !result.longitude) {
      const centroidMatch = searchText.match(/Centroid\s+Coordinates[:\s]+([-\d.]+)[,\s]+([-\d.]+)/i);
      if (centroidMatch) {
        result.latitude = parseFloat(centroidMatch[1]) || null;
        result.longitude = parseFloat(centroidMatch[2]) || null;
      }
    }
    
    // Fallback: Extract from generic coordinate pattern
    if (!result.latitude || !result.longitude) {
      const coordMatch = bodyText.match(/Lat[:\s]+([-\d.]+)[,\s]+Lon[:\s]+([-\d.]+)/i);
      if (coordMatch) {
        result.latitude = parseFloat(coordMatch[1]) || null;
        result.longitude = parseFloat(coordMatch[2]) || null;
      }
    }

    // Store raw HTML for debugging
    result.raw_html = bodyHTML.substring(0, 50000); // Limit to 50KB

    // Calculate data quality score (0.0 to 1.0) - improved with more fields
    let score = 0.0;
    const requiredFields = [
      'regrid_id', 'property_type', 'land_use', 'lot_size_acres', 
      'assessed_value', 'latitude', 'longitude', 'water_service'
    ];
    requiredFields.forEach(field => {
      if (result[field] !== null && result[field] !== '') score += 0.125;
    });
    result.data_quality_score = Math.min(score, 1.0);

    return result;
  });

  return data;
}

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
    console.error('[Scraper] Navigating to Regrid main page...');
    await page.goto('https://app.regrid.com/', { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(3000);

    // Check if we need to log in
    const loginFormVisible = await page.locator('input[placeholder="Email address"]').first().isVisible({ timeout: 5000 }).catch(() => false);

    if (loginFormVisible) {
      console.error('[Scraper] Login form found, logging in...');
      await page.locator('input[placeholder="Email address"]').first().fill(REGRID_EMAIL);
      await page.locator('input[placeholder="Password"]').first().fill(REGRID_PASSWORD);
      await page.locator('input[type="submit"][value="Sign in"]').first().click();
      await page.waitForLoadState('load', { timeout: 30000 });
      await page.waitForTimeout(3000);
      const stillShowingLogin = await page.locator('input[placeholder="Email address"]').first().isVisible({ timeout: 2000 }).catch(() => false);
      if (stillShowingLogin) {
        throw new Error('Login failed - form still visible after submit');
      }
      console.error('[Scraper] Login successful');
    }

    // Step 2: Navigate to county page
    const stateSlug = (state || 'pa').toLowerCase();
    const countySlug = (county || 'blair').toLowerCase().replace(/\s+/g, '-');
    const countyUrl = `https://app.regrid.com/us/${stateSlug}/${countySlug}`;
    console.error(`[Scraper] Navigating to county: ${countyUrl}`);
    await page.goto(countyUrl, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(3000);

    // Step 3: Find and use the search box
    console.error(`[Scraper] Searching for parcel: ${parcel}`);
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
          console.error(`[Scraper] Found search box: ${selector}`);
          break;
        }
      } catch (e) {}
    }

    if (!searchBox) throw new Error('Could not find search box');

    await searchBox.click();
    await page.waitForTimeout(500);
    await searchBox.fill(parcel);
    console.error('[Scraper] Entered search query');
    await page.waitForTimeout(2500);

    // Step 4: Click dropdown result
    console.error('[Scraper] Looking for search result to click...');
    const resultSelectors = [
      '.pac-item:first-child',
      '.autocomplete-item:first-child',
      '.search-result:first-child',
      '[role="option"]:first-child',
      '.ui-menu-item:first-child',
      '.result-item:first-child',
      '.dropdown-item:first-child',
      'li[role="option"]:first-child',
      '.suggestion:first-child',
      '[data-type="parcel"]:first-child',
      '.results li:first-child',
      '#search-results li:first-child',
    ];

    let resultClicked = false;
    for (const selector of resultSelectors) {
      try {
        const result = page.locator(selector).first();
        if (await result.isVisible({ timeout: 500 })) {
          await result.click();
          console.error(`[Scraper] Clicked result using: ${selector}`);
          resultClicked = true;
          break;
        }
      } catch (e) {}
    }

    if (!resultClicked) {
      console.error('[Scraper] No clickable result found, using keyboard navigation...');
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(300);
      await page.keyboard.press('Enter');
    }

    // Step 5: Wait for map to zoom and Property Details panel to appear
    console.error('[Scraper] Waiting for map to zoom to parcel...');
    await page.waitForTimeout(5000);

    // Step 6: Check if Property Details panel is visible
    const hasPropertyDetails = await page.evaluate(() => {
      return document.body.innerText.includes('Property Details');
    });

    if (!hasPropertyDetails) {
      console.error('[Scraper] Property Details panel not found, trying Enter again...');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(3000);
    }

    // Step 7: NEW - Extract property data BEFORE closing panel
    console.error('[Scraper] Extracting property data...');
    await page.waitForTimeout(2000); // Wait for panel to fully load
    const regridData = await extractPropertyData(page);
    console.error('[Scraper] Extracted data:', JSON.stringify(regridData, null, 2));

    // Step 8: Close Property Details panel (using reliable selector from browser MCP test)
    console.error('[Scraper] Closing Property Details panel...');
    let panelClosed = false;

    // Method 1: Use the close button selector we successfully tested
    try {
      const closeButton = page.locator('#property > .close').first();
      if (await closeButton.isVisible({ timeout: 2000 })) {
        await closeButton.click();
        await page.waitForTimeout(1000);
        panelClosed = await page.evaluate(() => !document.body.innerText.includes('Property Details'));
        if (panelClosed) {
          console.error('[Scraper] Method 1: Panel closed using #property > .close selector');
        }
      }
    } catch (e) {
      console.error('[Scraper] Method 1 failed:', e.message);
    }

    // Method 2: Try Escape key
    if (!panelClosed) {
      console.error('[Scraper] Method 2: Trying Escape key...');
      try {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);
        panelClosed = await page.evaluate(() => !document.body.innerText.includes('Property Details'));
        if (panelClosed) {
          console.error('[Scraper] Method 2: Panel closed using Escape key');
        }
      } catch (e) {
        console.error('[Scraper] Method 2 failed:', e.message);
      }
    }

    // Method 3: Click on map to close panel
    if (!panelClosed) {
      console.error('[Scraper] Method 3: Clicking on map region...');
      try {
        await page.locator('[role="region"][aria-label*="Map" i]').first().click();
        await page.waitForTimeout(1000);
        panelClosed = await page.evaluate(() => !document.body.innerText.includes('Property Details'));
        if (panelClosed) {
          console.error('[Scraper] Method 3: Panel closed by clicking map');
        }
      } catch (e) {
        console.error('[Scraper] Method 3 failed:', e.message);
      }
    }

    // Final wait
    await page.waitForTimeout(1000);

    // Step 9: Take screenshot
    console.error('[Scraper] Capturing screenshot...');
    const screenshot = await page.screenshot({ type: 'png', fullPage: false });

    // Step 10: Return both screenshot and scraped data
    const result = {
      success: true,
      screenshot: screenshot.toString('base64'),
      property_id: propertyId || '',
      parcel_id: parcel,
      regrid_data: regridData,
      panel_closed: panelClosed,
      scraped_at: new Date().toISOString()
    };

    console.log(JSON.stringify(result));

  } catch (error) {
    console.error('[Scraper] Error:', error.message);
    console.log(JSON.stringify({ 
      success: false, 
      error: error.message,
      property_id: propertyId || '',
      parcel_id: parcel
    }));
    process.exit(1);
  } finally {
    await browser.close();
  }
})();

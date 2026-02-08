#!/usr/bin/env node
/**
 * LOCAL TEST for Regrid Screenshot & Data Scraper v17
 *
 * This script runs the v17 scraper locally and saves:
 * - Screenshot as PNG file
 * - Extracted data as JSON file
 *
 * Usage: node test-regrid-v17-local.js
 *
 * Test property: 94 Madison Rd, Martinsburg, PA 16662
 * Parcel ID: 03.09-015..-000.00-000
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_PARCEL = '03.09-015..-000.00-000';
const TEST_COUNTY = 'blair';
const TEST_STATE = 'pa';
const TEST_PROPERTY_ID = 'test-local-001';
const QUALITY_MODE = 'high';

// Output directory
const OUTPUT_DIR = path.join(__dirname, '..', 'test-output');

// Credentials (same as v17)
const REGRID_EMAIL = process.env.REGRID_EMAIL || 'lulu.lopes.sousa@gmail.com';
const REGRID_PASSWORD = process.env.REGRID_PASSWORD || 'Bia@2020';

// Quality settings
const QUALITY_SETTINGS = {
  high: {
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 2,
    screenshot: { type: 'png', fullPage: false }
  },
  medium: {
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1.5,
    screenshot: { type: 'jpeg', quality: 90, fullPage: false }
  }
};

const settings = QUALITY_SETTINGS[QUALITY_MODE] || QUALITY_SETTINGS.high;

/**
 * Extract comprehensive property data from Property Details panel
 */
async function extractPropertyData(page) {
  console.log('[TEST] Extracting comprehensive property data from panel...');

  // First, try to expand all collapsible sections
  await page.evaluate(() => {
    const headers = document.querySelectorAll('.panel-heading[data-toggle="collapse"], [class*="collapse"]:not(.in)');
    headers.forEach(h => {
      try { h.click(); } catch(e) {}
    });
  });

  // Wait for sections to expand
  await page.waitForTimeout(1500);

  const data = await page.evaluate(() => {
    const result = {
      // ===== IDENTIFIERS =====
      regrid_id: null,
      ll_uuid: null,
      regrid_uuid: null,
      alt_parcel_id: null,
      control_number: null,

      // ===== ADDRESS FIELDS =====
      address: null,
      city: null,
      state: null,
      zip: null,

      // ===== OWNER INFORMATION =====
      owner_name: null,
      mailing_address: null,
      mailing_city: null,
      mailing_state: null,
      mailing_zip: null,

      // ===== PROPERTY CLASSIFICATION =====
      property_type: null,
      property_class: null,
      land_use: null,
      zoning: null,
      parcel_use_code: null,

      // ===== LOT INFORMATION =====
      lot_size_sqft: null,
      lot_size_acres: null,
      lot_dimensions: null,
      deed_acres: null,
      lot_type: null,
      terrain: null,
      land_description: null,

      // ===== BUILDING INFORMATION =====
      building_sqft: null,
      year_built: null,
      bedrooms: null,
      bathrooms: null,
      number_of_stories: null,
      building_count: null,
      building_footprint_sqft: null,

      // ===== VALUATION =====
      assessed_value: null,
      market_value: null,
      total_parcel_value: null,
      improvement_value: null,
      land_value: null,
      last_sale_price: null,
      last_sale_date: null,

      // ===== LOCATION =====
      latitude: null,
      longitude: null,

      // ===== UTILITIES =====
      water_service: null,
      sewer_service: null,
      gas_availability: null,
      electric_service: null,
      road_type: null,

      // ===== GEOGRAPHIC & CENSUS =====
      opportunity_zone: null,
      census_tract: null,
      census_block: null,
      census_blockgroup: null,
      neighborhood_code: null,

      // ===== SCHOOL & DISTRICT =====
      school_district: null,
      school_district_code: null,
      district_number: null,
      ward_number: null,
      map_number: null,

      // ===== CLEAN & GREEN (PA-specific) =====
      clean_green_land_value: null,
      clean_green_building_value: null,
      clean_green_total_value: null,

      // ===== METADATA =====
      additional_fields: {},
      raw_html: null,
      data_quality_score: 0.0
    };

    // Get all text content from the page
    const bodyText = document.body.innerText;

    // Helper function to extract field value
    const extractField = (patterns, isNumeric = false, isBoolean = false) => {
      for (const pattern of (Array.isArray(patterns) ? patterns : [patterns])) {
        const match = bodyText.match(pattern);
        if (match && match[1]) {
          let value = match[1].trim().replace(/^["']|["']$/g, '');
          if (isBoolean) {
            return value.toLowerCase() === 'yes' || value.toLowerCase() === 'true';
          }
          if (isNumeric) {
            value = value.replace(/,/g, '').replace(/\$/g, '');
            const num = parseFloat(value);
            return isNaN(num) ? null : num;
          }
          return value || null;
        }
      }
      return null;
    };

    // ===== EXTRACT IDENTIFIERS =====
    result.regrid_uuid = extractField([
      /Regrid\s+UUID[:\s]+([a-f0-9-]+)/i,
      /regrid_uuid[:\s]+([a-f0-9-]+)/i
    ]);
    result.regrid_id = result.regrid_uuid;
    result.ll_uuid = result.regrid_uuid;

    result.alt_parcel_id = extractField([
      /First\s+Alternative\s+Parcel\s+ID[:\s]+([^\n]+)/i,
      /Alt(?:ernate)?\s+Parcel\s+ID[:\s]+([^\n]+)/i
    ]);

    result.control_number = extractField([
      /Control\s+Number[:\s]+([^\n]+)/i
    ]);

    // ===== EXTRACT ADDRESS =====
    const fullAddressMatch = bodyText.match(/Full\s+Address\s*\n?\s*([^\n]+(?:,\s*[A-Z]{2}\s+\d{5})?)/i);
    if (fullAddressMatch) {
      const fullAddr = fullAddressMatch[1].trim();
      result.address = fullAddr;

      const addrParts = fullAddr.match(/^(.+?),\s*([^,]+),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/i);
      if (addrParts) {
        result.address = addrParts[1].trim();
        result.city = addrParts[2].trim();
        result.state = addrParts[3].trim();
        result.zip = addrParts[4].trim();
      }
    }

    if (!result.address) {
      result.address = extractField([
        /Parcel\s+Address\s*\n?\s*([^\n]+)/i,
        /Situs\s+Address[:\s]+([^\n]+)/i,
        /Property\s+Address[:\s]+([^\n]+)/i
      ]);
    }

    if (!result.city) {
      result.city = extractField([
        /Parcel\s+Address\s+City\s*\n?\s*([^\n]+)/i,
        /City[:\s]+([^\n]+)/i
      ]);
    }
    if (!result.zip) {
      result.zip = extractField([
        /5\s+Digit\s+Parcel\s+Zip\s+Code\s*\n?\s*(\d{5})/i,
        /Parcel\s+Address\s+Zip\s+Code\s*\n?\s*(\d{5})/i,
        /Zip(?:\s+Code)?[:\s]+(\d{5}(?:-\d{4})?)/i
      ]);
    }

    // ===== EXTRACT OWNER INFORMATION =====
    result.owner_name = extractField([
      /Owner\s+Name\s+\(Assessor\)\s*\n?\s*([^\n]+)/i,
      /Deeded\s+Owner[:\s]+([^\n]+)/i,
      /Owner[:\s]+([^\n]+)/i
    ]);

    result.mailing_address = extractField([
      /Mailing\s+Address\s*\n?\s*([^\n]+)/i
    ]);
    result.mailing_city = extractField([
      /Mailing\s+Address\s+City\s*\n?\s*([^\n]+)/i
    ]);
    result.mailing_state = extractField([
      /Mailing\s+Address\s+State\s*\n?\s*([^\n]+)/i
    ]);
    result.mailing_zip = extractField([
      /Mailing\s+Address\s+ZIP\s+Code\s*\n?\s*(\d{5}(?:-\d{4})?)/i
    ]);

    // ===== EXTRACT PROPERTY CLASSIFICATION =====
    result.property_type = extractField([
      /Property\s+Type\s*\n?\s*([^\n]+)/i
    ]);
    result.property_class = extractField([
      /Zoning\s+Type[:\s]+([^\n]+)/i,
      /Property\s+Class[:\s]+([^\n]+)/i
    ]);
    result.land_use = extractField([
      /Land\s+Use\s+Code:\s+Activity[:\s]+([^\n]+)/i,
      /Land\s+Use[:\s]+([^\n]+)/i
    ]);
    result.zoning = extractField([
      /Zoning\s+Subtype[:\s]+([^\n]+)/i,
      /Zoning[:\s]+([^\n]+)/i
    ]);
    result.parcel_use_code = extractField([
      /Parcel\s+Use\s+Code\s*\n?\s*"?(\d+)"?/i
    ]);

    // ===== EXTRACT LOT INFORMATION =====
    result.lot_size_acres = extractField([
      /Measurements\s*\n?\s*([\d.]+)\s*Acres/i,
      /Deed\s+Acres\s*\n?\s*"?([\d.]+)"?/i,
      /Calculated\s+Parcel\s+Area\s*\n?\s*"?([\d.]+)"?/i,
      /([\d.]+)\s+Acres/i
    ], true);

    result.deed_acres = extractField([
      /Deed\s+Acres\s*\n?\s*"?([\d.]+)"?/i
    ], true);

    result.lot_size_sqft = extractField([
      /Lot\s+Size[:\s]+([\d,]+)\s*(?:sq\s*ft|SF)/i,
      /Square\s+Feet[:\s]+([\d,]+)/i
    ], true);

    result.lot_type = extractField([
      /Lot\s+Type\s*\n?\s*([^\n]+)/i
    ]);

    result.terrain = extractField([
      /Terrain\s*\n?\s*([^\n]+)/i
    ]);

    result.land_description = extractField([
      /Land\s+Description\s*\n?\s*([^\n]+)/i,
      /Legal\s+Description[:\s]+([^\n]+)/i
    ]);

    result.lot_dimensions = extractField([
      /Lot\s+Dimensions[:\s]+([^\n]+)/i
    ]);

    // ===== EXTRACT BUILDING INFORMATION =====
    result.building_sqft = extractField([
      /Regrid\s+Calculated\s+Building\s+Footprint\s+Square\s+Feet\s*\n?\s*"?([\d,]+)"?/i,
      /Building\s+Area[:\s]+([\d,]+)\s*(?:sq\s*ft|SF)/i,
      /Building\s+Sq\s*Ft[:\s]+([\d,]+)/i
    ], true);

    result.year_built = extractField([
      /Year\s+Built[:\s]+(\d{4})/i
    ], true);

    result.bedrooms = extractField([
      /Bedrooms?[:\s]+(\d+)/i
    ], true);

    result.bathrooms = extractField([
      /Bathrooms?[:\s]+([\d.]+)/i
    ], true);

    result.number_of_stories = extractField([
      /Number\s+of\s+Stories\s*\n?\s*"?([\d.]+)"?/i,
      /Stories[:\s]+([\d.]+)/i
    ], true);

    result.building_count = extractField([
      /Regrid\s+Calculated\s+Building\s+Count\s*\n?\s*"?(\d+)"?/i,
      /Building\s+Count[:\s]+(\d+)/i
    ], true);

    result.building_footprint_sqft = extractField([
      /Regrid\s+Calculated\s+Building\s+Footprint\s+Square\s+Feet\s*\n?\s*"?([\d,]+)"?/i
    ], true);

    // ===== EXTRACT VALUATION =====
    result.total_parcel_value = extractField([
      /Total\s+Parcel\s+Value\s*\n?\s*\$?([\d,]+\.?\d*)/i
    ], true);
    result.assessed_value = result.total_parcel_value;

    result.improvement_value = extractField([
      /Improvement\s+Value\s*\n?\s*\$?([\d,]+\.?\d*)/i
    ], true);

    result.land_value = extractField([
      /Land\s+Value\s*\n?\s*\$?([\d,]+\.?\d*)/i
    ], true);

    result.market_value = extractField([
      /Market\s+Value[:\s]+\$?([\d,]+)/i
    ], true);

    result.last_sale_price = extractField([
      /Last\s+Sale\s+Price\s*\n?\s*\$?([\d,]+\.?\d*)/i
    ], true);

    const saleDateMatch = bodyText.match(/Last\s+Sale\s+Date[:\s]+(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}|\d{4}-\d{2}-\d{2})/i);
    if (saleDateMatch) {
      result.last_sale_date = saleDateMatch[1];
    }

    // ===== EXTRACT COORDINATES =====
    result.latitude = extractField([
      /Latitude\s*\n?\s*"?([-\d.]+)"?/i
    ], true);

    result.longitude = extractField([
      /Longitude\s*\n?\s*"?([-\d.]+)"?/i
    ], true);

    if (!result.latitude || !result.longitude) {
      const centroidMatch = bodyText.match(/Centroid\s+Coordinates\s*\n?\s*([-\d.]+)[,\s]+([-\d.]+)/i);
      if (centroidMatch) {
        result.latitude = parseFloat(centroidMatch[1]) || null;
        result.longitude = parseFloat(centroidMatch[2]) || null;
      }
    }

    // ===== EXTRACT UTILITIES =====
    result.water_service = extractField([
      /Water\s*\n?\s*([^\n]+)/i
    ]);

    result.sewer_service = extractField([
      /Sewer\s*\n?\s*([^\n]+)/i
    ]);

    result.gas_availability = extractField([
      /Gas\s+Availability\s*\n?\s*([^\n]+)/i,
      /Gas[:\s]+([^\n]+)/i
    ]);

    result.electric_service = extractField([
      /Electric[:\s]+([^\n]+)/i
    ]);

    result.road_type = extractField([
      /Road\s*\n?\s*([^\n]+)/i,
      /Road\s+Type[:\s]+([^\n]+)/i
    ]);

    // ===== EXTRACT GEOGRAPHIC & CENSUS =====
    const ozMatch = bodyText.match(/Federal\s+Qualified\s+Opportunity\s+Zone\s*\n?\s*(Yes|No)/i);
    if (ozMatch) {
      result.opportunity_zone = ozMatch[1].toLowerCase() === 'yes';
    }

    result.census_tract = extractField([
      /Census\s+2020\s+Tract\s*\n?\s*"?(\d+)"?/i,
      /Census\s+Tract[:\s]+(\d+)/i
    ]);

    result.census_block = extractField([
      /Census\s+2020\s+Block\s*\n?\s*"?(\d+)"?/i
    ]);

    result.census_blockgroup = extractField([
      /Census\s+2020\s+Blockgroup\s*\n?\s*"?(\d+)"?/i
    ]);

    result.neighborhood_code = extractField([
      /Neighborhood\s+Code\s*\n?\s*([^\n]+)/i
    ]);

    // ===== EXTRACT SCHOOL & DISTRICT =====
    result.school_district = extractField([
      /Census\s+Provided\s+Unified\s+School\s+District\s*\n?\s*([^\n]+)/i,
      /School\s+District[:\s]+([^\n]+)/i
    ]);

    result.school_district_code = extractField([
      /School\s+District\s+Code\s*\n?\s*([^\n]+)/i
    ]);

    result.district_number = extractField([
      /District\s+Number\s*\n?\s*([^\n]+)/i
    ]);

    result.ward_number = extractField([
      /Ward\s+Number\s*\n?\s*([^\n]+)/i
    ]);

    result.map_number = extractField([
      /Map\s+Number\s*\n?\s*([^\n]+)/i
    ]);

    // ===== EXTRACT CLEAN & GREEN (PA) =====
    result.clean_green_land_value = extractField([
      /New\s+Clean\s+Green\s+Land\s+Value\s*\n?\s*\$?([\d,]+\.?\d*)/i
    ], true);

    result.clean_green_building_value = extractField([
      /New\s+Clean\s+Green\s+Building\s+Value\s*\n?\s*\$?([\d,]+\.?\d*)/i
    ], true);

    result.clean_green_total_value = extractField([
      /New\s+Clean\s+Green\s+Total\s+Value\s*\n?\s*\$?([\d,]+\.?\d*)/i
    ], true);

    // ===== SAVE RAW HTML FOR DEBUGGING =====
    // Save a subset to not bloat the output
    const propertyPanel = document.querySelector('#property') || document.querySelector('[class*="property-details"]');
    if (propertyPanel) {
      result.raw_html = propertyPanel.innerHTML.substring(0, 50000);
    }

    // ===== CALCULATE DATA QUALITY SCORE =====
    const keyFields = [
      'regrid_uuid', 'address', 'city', 'state', 'zip',
      'owner_name', 'property_type', 'land_use',
      'lot_size_acres', 'total_parcel_value',
      'latitude', 'longitude', 'water_service', 'sewer_service'
    ];

    let populatedCount = 0;
    keyFields.forEach(field => {
      if (result[field] !== null && result[field] !== '' && result[field] !== undefined) {
        populatedCount++;
      }
    });

    result.data_quality_score = Math.round((populatedCount / keyFields.length) * 100) / 100;

    return result;
  });

  return data;
}

(async () => {
  console.log('============================================================');
  console.log('LOCAL TEST: Regrid Screenshot & Data Scraper v17');
  console.log('============================================================');
  console.log(`Test Parcel: ${TEST_PARCEL}`);
  console.log(`County: ${TEST_COUNTY}, State: ${TEST_STATE}`);
  console.log(`Quality Mode: ${QUALITY_MODE}`);
  console.log('------------------------------------------------------------');

  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  console.log(`Output directory: ${OUTPUT_DIR}`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const context = await browser.newContext({
      viewport: settings.viewport,
      deviceScaleFactor: settings.deviceScaleFactor,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();

    // Step 1: Navigate to main app page
    console.log('\n[Step 1] Navigating to Regrid main page...');
    await page.goto('https://app.regrid.com/', { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(3000);

    // Check if we need to log in
    const loginFormVisible = await page.locator('input[placeholder="Email address"]').first().isVisible({ timeout: 5000 }).catch(() => false);

    if (loginFormVisible) {
      console.log('[Step 1] Login form found, logging in...');
      await page.locator('input[placeholder="Email address"]').first().fill(REGRID_EMAIL);
      await page.locator('input[placeholder="Password"]').first().fill(REGRID_PASSWORD);
      await page.locator('input[type="submit"][value="Sign in"]').first().click();
      await page.waitForLoadState('load', { timeout: 30000 });
      await page.waitForTimeout(3000);
      const stillShowingLogin = await page.locator('input[placeholder="Email address"]').first().isVisible({ timeout: 2000 }).catch(() => false);
      if (stillShowingLogin) {
        throw new Error('Login failed - form still visible after submit');
      }
      console.log('[Step 1] Login successful');
    } else {
      console.log('[Step 1] Already logged in or no login required');
    }

    // Step 2: Navigate to county page
    const countyUrl = `https://app.regrid.com/us/${TEST_STATE}/${TEST_COUNTY}`;
    console.log(`\n[Step 2] Navigating to county: ${countyUrl}`);
    await page.goto(countyUrl, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(3000);

    // Step 3: Find and use the search box
    console.log(`\n[Step 3] Searching for parcel: ${TEST_PARCEL}`);
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
          console.log(`[Step 3] Found search box: ${selector}`);
          break;
        }
      } catch (e) {}
    }

    if (!searchBox) throw new Error('Could not find search box');

    await searchBox.click();
    await page.waitForTimeout(500);
    await searchBox.fill(TEST_PARCEL);
    console.log('[Step 3] Entered search query');
    await page.waitForTimeout(2500);

    // Step 4: Click dropdown result
    console.log('\n[Step 4] Looking for search result to click...');
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
          console.log(`[Step 4] Clicked result using: ${selector}`);
          resultClicked = true;
          break;
        }
      } catch (e) {}
    }

    if (!resultClicked) {
      console.log('[Step 4] No clickable result found, using keyboard navigation...');
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(300);
      await page.keyboard.press('Enter');
    }

    // Step 5: Wait for map and Property Details panel
    console.log('\n[Step 5] Waiting for map to zoom to parcel...');
    await page.waitForTimeout(5000);

    // Step 6: Check if Property Details panel is visible
    const hasPropertyDetails = await page.evaluate(() => {
      return document.body.innerText.includes('Property Details');
    });

    if (!hasPropertyDetails) {
      console.log('[Step 6] Property Details panel not found, trying Enter again...');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(3000);
    } else {
      console.log('[Step 6] Property Details panel found');
    }

    // Step 7: Scroll through Property Details panel
    console.log('\n[Step 7] Scrolling through Property Details panel to load all sections...');
    await page.evaluate(() => {
      const panels = document.querySelectorAll('[class*="property"], [class*="panel"], [class*="sidebar"]');
      panels.forEach(panel => {
        if (panel.scrollHeight > panel.clientHeight) {
          panel.scrollTop = panel.scrollHeight;
        }
      });
    });
    await page.waitForTimeout(1000);

    await page.evaluate(() => {
      const panels = document.querySelectorAll('[class*="property"], [class*="panel"], [class*="sidebar"]');
      panels.forEach(panel => {
        panel.scrollTop = 0;
      });
    });
    await page.waitForTimeout(500);

    // Step 8: Extract property data
    console.log('\n[Step 8] Extracting comprehensive property data...');
    await page.waitForTimeout(2000);
    const regridData = await extractPropertyData(page);

    // Log extracted fields count
    const populatedFields = Object.entries(regridData).filter(([k, v]) =>
      v !== null && v !== '' && k !== 'additional_fields' && k !== 'raw_html'
    ).length;
    console.log(`[Step 8] Extracted ${populatedFields} populated fields`);
    console.log('[Step 8] Data quality score:', regridData.data_quality_score);

    // Step 9: Close Property Details panel
    console.log('\n[Step 9] Closing Property Details panel...');
    let panelClosed = false;

    try {
      const closeButton = page.locator('#property > .close').first();
      if (await closeButton.isVisible({ timeout: 2000 })) {
        await closeButton.click();
        await page.waitForTimeout(1000);
        panelClosed = await page.evaluate(() => !document.body.innerText.includes('Property Details'));
        if (panelClosed) {
          console.log('[Step 9] Panel closed using close button');
        }
      }
    } catch (e) {}

    if (!panelClosed) {
      try {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);
        panelClosed = await page.evaluate(() => !document.body.innerText.includes('Property Details'));
        if (panelClosed) {
          console.log('[Step 9] Panel closed using Escape key');
        }
      } catch (e) {}
    }

    if (!panelClosed) {
      console.log('[Step 9] Removing panel from DOM...');
      panelClosed = await page.evaluate(() => {
        const allDivs = document.querySelectorAll('div');
        for (const div of allDivs) {
          const text = div.innerText || '';
          const rect = div.getBoundingClientRect();
          if (text.includes('Property Details') &&
              (text.includes('Ave') || text.includes('St') || text.includes('Rd') || text.includes('Acres') || text.includes('Owner')) &&
              rect.width > 200 && rect.width < 600 && rect.left < 300) {
            let container = div;
            while (container && container.parentElement) {
              const r = container.getBoundingClientRect();
              if (r.height > 500 && r.width > 200 && r.width < 600 && r.left < 200) {
                container.parentElement.removeChild(container);
                return true;
              }
              container = container.parentElement;
            }
          }
        }
        return false;
      });
      if (panelClosed) {
        console.log('[Step 9] Panel removed from DOM successfully');
      }
    }

    await page.waitForTimeout(1000);

    // Step 10: Take screenshot
    console.log('\n[Step 10] Capturing screenshot...');
    const screenshot = await page.screenshot(settings.screenshot);
    const screenshotPath = path.join(OUTPUT_DIR, 'regrid-v17-test-screenshot.png');
    fs.writeFileSync(screenshotPath, screenshot);
    console.log(`[Step 10] Screenshot saved: ${screenshotPath}`);
    console.log(`[Step 10] Screenshot size: ${Math.round(screenshot.length / 1024)} KB`);

    // Step 11: Save extracted data to JSON
    console.log('\n[Step 11] Saving extracted data to JSON...');

    // Create clean data object without raw_html for readability
    const cleanData = { ...regridData };
    delete cleanData.raw_html;

    const result = {
      success: true,
      test_info: {
        parcel_id: TEST_PARCEL,
        county: TEST_COUNTY,
        state: TEST_STATE,
        property_id: TEST_PROPERTY_ID,
        quality_mode: QUALITY_MODE,
        scraped_at: new Date().toISOString(),
        scraper_version: 'v17'
      },
      regrid_data: cleanData,
      panel_closed: panelClosed,
      screenshot_file: 'regrid-v17-test-screenshot.png',
      screenshot_size_kb: Math.round(screenshot.length / 1024)
    };

    const dataPath = path.join(OUTPUT_DIR, 'regrid-v17-test-data.json');
    fs.writeFileSync(dataPath, JSON.stringify(result, null, 2));
    console.log(`[Step 11] Data saved: ${dataPath}`);

    // Save raw HTML separately for debugging
    if (regridData.raw_html) {
      const htmlPath = path.join(OUTPUT_DIR, 'regrid-v17-test-raw-html.html');
      fs.writeFileSync(htmlPath, regridData.raw_html);
      console.log(`[Step 11] Raw HTML saved: ${htmlPath}`);
    }

    // Print summary
    console.log('\n============================================================');
    console.log('TEST COMPLETE - SUMMARY');
    console.log('============================================================');
    console.log('\nPopulated Fields:');
    Object.entries(cleanData).forEach(([key, value]) => {
      if (value !== null && value !== '' && key !== 'additional_fields') {
        const displayValue = typeof value === 'object' ? JSON.stringify(value) : value;
        console.log(`  ${key}: ${displayValue}`);
      }
    });

    console.log('\n------------------------------------------------------------');
    console.log('NULL/EMPTY Fields (not extracted):');
    Object.entries(cleanData).forEach(([key, value]) => {
      if ((value === null || value === '') && key !== 'additional_fields') {
        console.log(`  ${key}: null`);
      }
    });

    console.log('\n============================================================');
    console.log('FILES SAVED:');
    console.log(`  Screenshot: ${screenshotPath}`);
    console.log(`  Data JSON:  ${dataPath}`);
    if (regridData.raw_html) {
      console.log(`  Raw HTML:   ${path.join(OUTPUT_DIR, 'regrid-v17-test-raw-html.html')}`);
    }
    console.log('============================================================');

  } catch (error) {
    console.error('\n[ERROR]', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await browser.close();
    console.log('\nBrowser closed.');
  }
})();

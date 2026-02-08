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

// Test configuration - Using address for more reliable search
const TEST_ADDRESS = '94 Madison Rd, Martinsburg, PA 16662';
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

  // STEP 1: Expand ALL collapsible sections by clicking on collapsed panel headings
  console.log('[TEST] Expanding all collapsible sections...');

  const sectionsExpanded = await page.evaluate(() => {
    let expanded = 0;
    // Find all collapsed panel headings and click them
    const collapsedHeaders = document.querySelectorAll('.panel-heading.collapsed');
    collapsedHeaders.forEach(header => {
      try {
        header.click();
        expanded++;
      } catch(e) {}
    });
    return expanded;
  });
  console.log(`[TEST] Clicked ${sectionsExpanded} collapsed sections`);

  // Wait for sections to expand with animation
  await page.waitForTimeout(2000);

  // STEP 2: Scroll through the panel to ensure all content is loaded
  await page.evaluate(() => {
    const propertyPanel = document.querySelector('#property');
    if (propertyPanel) {
      propertyPanel.scrollTop = propertyPanel.scrollHeight;
    }
  });
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const propertyPanel = document.querySelector('#property');
    if (propertyPanel) {
      propertyPanel.scrollTop = 0;
    }
  });
  await page.waitForTimeout(500);

  const data = await page.evaluate(() => {
    const result = {
      // ===== IDENTIFIERS =====
      regrid_id: null,
      ll_uuid: null,
      regrid_uuid: null,
      alt_parcel_id: null,
      control_number: null,
      parcel_id: null,

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

    // ===== NEW APPROACH: Extract from HTML field structure =====
    // The Regrid page uses .field elements with .field-label and .field-value children
    const fieldsMap = {};
    const fields = document.querySelectorAll('.field');
    fields.forEach(field => {
      const labelEl = field.querySelector('.field-label, .key');
      const valueEl = field.querySelector('.field-value, .value');
      if (labelEl && valueEl) {
        let label = labelEl.innerText.trim().replace(/\s+/g, ' ');
        let value = valueEl.innerText.trim();
        if (label && value) {
          fieldsMap[label] = value;
        }
      }
    });

    // Also extract from Parcel Highlights section
    const highlightsPanel = document.querySelector('#property-highlights');
    if (highlightsPanel) {
      // Get Full Address from the address element
      const addressEl = highlightsPanel.querySelector('address');
      if (addressEl) {
        const fullAddr = addressEl.innerText.replace(/\n/g, ', ').trim();
        fieldsMap['Full Address'] = fullAddr;
      }

      // Get Owner from highlights
      const ownerField = highlightsPanel.querySelector('.field-value.value');
      if (ownerField) {
        const ownerText = ownerField.innerText.trim();
        if (ownerText && !ownerText.includes('Rd') && !ownerText.includes('Ave') && !ownerText.includes('Acres')) {
          fieldsMap['Owner (Highlights)'] = ownerText;
        }
      }

      // Get Measurements
      const measurementEl = highlightsPanel.querySelector('.conversion-value');
      if (measurementEl) {
        fieldsMap['Measurements'] = measurementEl.innerText.trim();
      }
    }

    // Debug: log what we found
    console.log('Fields found:', Object.keys(fieldsMap).length);
    console.log('Sample fields:', JSON.stringify(Object.keys(fieldsMap).slice(0, 10)));

    // ===== Map fieldsMap to result object =====
    // Helper function to get value by partial label match
    const getField = (labels) => {
      for (const label of (Array.isArray(labels) ? labels : [labels])) {
        for (const [key, value] of Object.entries(fieldsMap)) {
          if (key.toLowerCase().includes(label.toLowerCase())) {
            return value;
          }
        }
      }
      return null;
    };

    // Parse numeric value
    const parseNum = (val) => {
      if (!val) return null;
      const num = parseFloat(val.replace(/[,$]/g, ''));
      return isNaN(num) ? null : num;
    };

    // ===== EXTRACT IDENTIFIERS =====
    result.regrid_uuid = getField(['Regrid UUID']);
    result.regrid_id = result.regrid_uuid;
    result.ll_uuid = result.regrid_uuid;
    result.parcel_id = getField(['Parcel ID']);
    result.alt_parcel_id = getField(['Alternative Parcel', 'Alt Parcel']);
    result.control_number = getField(['Control Number']);

    // ===== EXTRACT ADDRESS =====
    const fullAddress = getField(['Full Address']);
    if (fullAddress) {
      // Parse "94 Madison Rd, Martinsburg, PA 16662"
      const addrParts = fullAddress.match(/^(.+?),\s*([^,]+),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)/i);
      if (addrParts) {
        result.address = addrParts[1].trim();
        result.city = addrParts[2].trim();
        result.state = addrParts[3].trim();
        result.zip = addrParts[4].trim();
      } else {
        result.address = fullAddress;
      }
    }
    if (!result.address) result.address = getField(['Parcel Address ']);
    if (!result.city) result.city = getField(['Parcel Address City', 'City']);
    if (!result.zip) result.zip = getField(['Zip Code', 'Parcel Address Zip']);

    // ===== EXTRACT OWNER =====
    result.owner_name = getField(['Owner (Highlights)', 'Owner Name', 'Owner']);
    result.mailing_address = getField(['Mailing Address ']);
    result.mailing_city = getField(['Mailing Address City']);
    result.mailing_state = getField(['Mailing Address State']);
    result.mailing_zip = getField(['Mailing Address ZIP']);

    // ===== EXTRACT PROPERTY CLASSIFICATION =====
    result.property_type = getField(['Property Type']);
    result.property_class = getField(['Zoning Type', 'Property Class']);
    result.land_use = getField(['Land Use']);
    result.zoning = getField(['Zoning Subtype', 'Zoning']);
    result.parcel_use_code = getField(['Parcel Use Code']);

    // ===== EXTRACT LOT INFORMATION =====
    const measurements = getField(['Measurements']);
    if (measurements) {
      const acresMatch = measurements.match(/([\d.]+)\s*Acres/i);
      if (acresMatch) {
        result.lot_size_acres = parseNum(acresMatch[1]);
      }
    }
    result.deed_acres = parseNum(getField(['Deed Acres']));
    result.lot_size_sqft = parseNum(getField(['Lot Size', 'Square Feet']));
    result.lot_type = getField(['Lot Type']);
    result.terrain = getField(['Terrain']);
    result.land_description = getField(['Land Description', 'Legal Description']);
    result.lot_dimensions = getField(['Lot Dimensions']);

    // ===== EXTRACT BUILDING INFORMATION =====
    result.building_sqft = parseNum(getField(['Building Footprint Square Feet', 'Building Area', 'Building Sq']));
    result.year_built = parseNum(getField(['Year Built']));
    result.bedrooms = parseNum(getField(['Bedrooms', 'Bedroom']));
    result.bathrooms = parseNum(getField(['Bathrooms', 'Bathroom']));
    result.number_of_stories = parseNum(getField(['Number of Stories', 'Stories']));
    result.building_count = parseNum(getField(['Building Count']));
    result.building_footprint_sqft = parseNum(getField(['Building Footprint Square Feet']));

    // ===== EXTRACT VALUATION =====
    result.total_parcel_value = parseNum(getField(['Total Parcel Value']));
    result.assessed_value = result.total_parcel_value;
    result.improvement_value = parseNum(getField(['Improvement Value']));
    result.land_value = parseNum(getField(['Land Value']));
    result.market_value = parseNum(getField(['Market Value']));
    result.last_sale_price = parseNum(getField(['Last Sale Price']));
    result.last_sale_date = getField(['Last Sale Date']);

    // ===== EXTRACT COORDINATES =====
    result.latitude = parseNum(getField(['Latitude']));
    result.longitude = parseNum(getField(['Longitude']));
    if (!result.latitude || !result.longitude) {
      const centroid = getField(['Centroid']);
      if (centroid) {
        const coords = centroid.match(/([-\d.]+)[,\s]+([-\d.]+)/);
        if (coords) {
          result.latitude = parseFloat(coords[1]) || null;
          result.longitude = parseFloat(coords[2]) || null;
        }
      }
    }

    // ===== EXTRACT UTILITIES =====
    result.water_service = getField(['Water']);
    result.sewer_service = getField(['Sewer']);
    result.gas_availability = getField(['Gas']);
    result.electric_service = getField(['Electric']);
    result.road_type = getField(['Road']);

    // ===== EXTRACT GEOGRAPHIC & CENSUS =====
    const ozValue = getField(['Opportunity Zone']);
    result.opportunity_zone = ozValue ? ozValue.toLowerCase() === 'yes' : null;
    result.census_tract = getField(['Census 2020 Tract', 'Census Tract']);
    result.census_block = getField(['Census 2020 Block', 'Census Block']);
    result.census_blockgroup = getField(['Census 2020 Blockgroup', 'Blockgroup']);
    result.neighborhood_code = getField(['Neighborhood Code']);

    // ===== EXTRACT SCHOOL & DISTRICT =====
    result.school_district = getField(['Unified School District', 'School District']);
    result.school_district_code = getField(['School District Code']);
    result.district_number = getField(['District Number']);
    result.ward_number = getField(['Ward Number']);
    result.map_number = getField(['Map Number']);

    // ===== EXTRACT CLEAN & GREEN (PA) =====
    result.clean_green_land_value = parseNum(getField(['Clean Green Land Value', 'Clean & Green Land']));
    result.clean_green_building_value = parseNum(getField(['Clean Green Building Value', 'Clean & Green Building']));
    result.clean_green_total_value = parseNum(getField(['Clean Green Total Value', 'Clean & Green Total']));

    // Store all fields for debugging
    result.additional_fields = fieldsMap;

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
  console.log(`Test Address: ${TEST_ADDRESS}`);
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

    // Step 3: Find and use the search box - USE ADDRESS for reliable search
    console.log(`\n[Step 3] Searching for: ${TEST_ADDRESS}`);
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
    // Use address instead of parcel ID for more reliable search
    await searchBox.fill(TEST_ADDRESS);
    console.log('[Step 3] Entered search query');
    await page.waitForTimeout(3000); // Give more time for address lookup

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

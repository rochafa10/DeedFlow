#!/usr/bin/env node
/**
 * Regrid Screenshot & Data Scraper v17
 *
 * IMPROVEMENTS over v16:
 * - Extracts ALL 50+ fields from Regrid Property Details panel
 * - Owner information (name, mailing address)
 * - Sale history (last sale price, date)
 * - Enhanced valuation (total, improvement, land values)
 * - Structure details (stories, building count, footprint)
 * - Lot details (deed acres, lot type, terrain, road)
 * - Utilities (water, sewer, gas, electric)
 * - Geographic/Census data (census tract, block, opportunity zone)
 * - School district information
 * - PA-specific Clean & Green values
 * - Better section-based extraction using collapsible panel structure
 *
 * Usage: node regrid-screenshot-v17.js <parcel_id> <county> <state> <property_id> [quality]
 *   quality: "high" (PNG), "medium" (JPEG 90), "low" (JPEG 75)
 *
 * Output: JSON with success/error, base64 screenshot, and comprehensive regrid_data object
 */

const { chromium } = require('playwright');

const [,, parcel, county, state, propertyId, qualityMode = 'medium'] = process.argv;

if (!parcel) {
  console.error(JSON.stringify({ success: false, error: 'Missing parcel_id argument' }));
  process.exit(1);
}

const REGRID_EMAIL = process.env.REGRID_EMAIL || 'lulu.lopes.sousa@gmail.com';
const REGRID_PASSWORD = process.env.REGRID_PASSWORD || 'Bia@2020';

// Screenshot quality settings
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
  },
  low: {
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    screenshot: { type: 'jpeg', quality: 75, fullPage: false }
  }
};

const settings = QUALITY_SETTINGS[qualityMode] || QUALITY_SETTINGS.medium;
console.error(`[Scraper v17] Using quality mode: ${qualityMode}`);
console.error(`[Scraper v17] Viewport: ${settings.viewport.width}x${settings.viewport.height}, Scale: ${settings.deviceScaleFactor}`);

/**
 * Extract comprehensive property data from Property Details panel
 * Extracts ALL fields from Regrid's 10 collapsible sections
 * Uses HTML structure (field-label/field-value) for reliable extraction
 */
async function extractPropertyData(page) {
  console.error('[Scraper v17] Extracting comprehensive property data from panel...');

  // STEP 1: Expand ALL collapsible sections
  // Regrid uses .panel-collapse.collapse (collapsed) vs .panel-collapse.collapse.in (expanded)
  // Only "Parcel Highlights" is expanded by default - we need to expand all others
  const sectionsExpanded = await page.evaluate(() => {
    let expanded = 0;

    // Method A: Click panel headings whose associated collapse panel lacks the 'in' class
    const headings = document.querySelectorAll('.panel-heading');
    headings.forEach(heading => {
      try {
        const target = heading.nextElementSibling;
        if (target && target.classList.contains('collapse') && !target.classList.contains('in')) {
          heading.click();
          expanded++;
        }
      } catch(e) {}
    });

    // Method B (fallback): Also try data-toggle links inside headings
    if (expanded === 0) {
      document.querySelectorAll('[data-toggle="collapse"]').forEach(toggle => {
        try {
          const targetId = toggle.getAttribute('href') || toggle.getAttribute('data-target');
          if (targetId) {
            const targetEl = document.querySelector(targetId);
            if (targetEl && !targetEl.classList.contains('in')) {
              toggle.click();
              expanded++;
            }
          }
        } catch(e) {}
      });
    }

    return expanded;
  });
  console.error(`[Scraper v17] Clicked ${sectionsExpanded} collapsed section headings`);

  // Wait for click-based expansion animations
  await page.waitForTimeout(3000);

  // Method C (force): Directly add 'in' class to any sections still collapsed
  const forcedOpen = await page.evaluate(() => {
    let forced = 0;
    document.querySelectorAll('.panel-collapse.collapse').forEach(el => {
      if (!el.classList.contains('in')) {
        el.classList.add('in');
        el.style.height = 'auto';
        el.style.display = 'block';
        forced++;
      }
    });
    return forced;
  });
  if (forcedOpen > 0) {
    console.error(`[Scraper v17] Force-expanded ${forcedOpen} additional sections via DOM`);
  }

  // Wait for content to render after force-expansion
  await page.waitForTimeout(1500);

  // STEP 2: Scroll through the panel to ensure all lazy-loaded content appears
  await page.evaluate(() => {
    const propertyPanel = document.querySelector('#property');
    if (propertyPanel) {
      // Scroll to bottom
      propertyPanel.scrollTop = propertyPanel.scrollHeight;
    }
  });
  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    const propertyPanel = document.querySelector('#property');
    if (propertyPanel) {
      // Scroll back to top
      propertyPanel.scrollTop = 0;
    }
  });
  await page.waitForTimeout(500);

  // Verify fields are present after expansion
  const fieldCount = await page.evaluate(() => document.querySelectorAll('.field').length);
  console.error(`[Scraper v17] Found ${fieldCount} .field elements after expansion`);

  // STEP 3: Extract data using HTML field structure
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

    // ===== EXTRACT from HTML field structure =====
    // Regrid uses .field elements with nested .field-label/.key and .field-value/.value children
    // Some fields use deeper nesting: .field-label > .key and .field-value > .value > span
    const fieldsMap = {};

    // Method 1: Standard .field containers
    const fields = document.querySelectorAll('.field');
    fields.forEach(field => {
      const labelEl = field.querySelector('.field-label .key') ||
                      field.querySelector('.field-label') ||
                      field.querySelector('.key');
      const valueEl = field.querySelector('.field-value .value span') ||
                      field.querySelector('.field-value .value') ||
                      field.querySelector('.field-value span') ||
                      field.querySelector('.field-value') ||
                      field.querySelector('.value');
      if (labelEl && valueEl) {
        let label = labelEl.innerText.trim().replace(/\s+/g, ' ');
        let value = valueEl.innerText.trim();
        if (label && value && value !== '--' && value !== 'N/A') {
          fieldsMap[label] = value;
        }
      }
    });

    // Method 2: Also try dl/dt/dd pairs (some Regrid sections use definition lists)
    document.querySelectorAll('dl').forEach(dl => {
      const dts = dl.querySelectorAll('dt');
      const dds = dl.querySelectorAll('dd');
      for (let i = 0; i < Math.min(dts.length, dds.length); i++) {
        const label = dts[i].innerText.trim().replace(/\s+/g, ' ');
        const value = dds[i].innerText.trim();
        if (label && value && value !== '--' && value !== 'N/A' && !fieldsMap[label]) {
          fieldsMap[label] = value;
        }
      }
    });

    // Method 3: Try table rows with key-value pattern
    document.querySelectorAll('table tr').forEach(row => {
      const cells = row.querySelectorAll('td, th');
      if (cells.length === 2) {
        const label = cells[0].innerText.trim().replace(/\s+/g, ' ');
        const value = cells[1].innerText.trim();
        if (label && value && value !== '--' && value !== 'N/A' && !fieldsMap[label]) {
          fieldsMap[label] = value;
        }
      }
    });

    // Also extract from Parcel Highlights section (always expanded by default)
    const highlightsPanel = document.querySelector('#property-highlights') ||
                            document.querySelector('[id*="highlight"]') ||
                            document.querySelector('.panel-collapse.in');
    if (highlightsPanel) {
      // Get Full Address from the address element
      const addressEl = highlightsPanel.querySelector('address');
      if (addressEl) {
        const fullAddr = addressEl.innerText.replace(/\n/g, ', ').trim();
        if (fullAddr) fieldsMap['Full Address'] = fullAddr;
      }

      // Get Owner - try multiple selectors
      const ownerSelectors = [
        '.field-value.value',
        '.field .value',
        '.field-value'
      ];
      for (const sel of ownerSelectors) {
        const ownerFields = highlightsPanel.querySelectorAll(sel);
        for (const of_ of ownerFields) {
          const ownerText = of_.innerText.trim();
          // Owner names typically don't contain common address words
          if (ownerText && ownerText.length > 2 &&
              !ownerText.includes('Acres') && !ownerText.match(/^\d/) &&
              !fieldsMap['Owner (Highlights)']) {
            // Check if it's in a field whose label suggests "owner"
            const parentField = of_.closest('.field');
            if (parentField) {
              const lbl = parentField.querySelector('.field-label, .key');
              if (lbl && lbl.innerText.toLowerCase().includes('owner')) {
                fieldsMap['Owner (Highlights)'] = ownerText;
                break;
              }
            }
          }
        }
        if (fieldsMap['Owner (Highlights)']) break;
      }

      // Get Measurements - try multiple selectors
      const measurementEl = highlightsPanel.querySelector('.conversion-value') ||
                            highlightsPanel.querySelector('.measurement');
      if (measurementEl) {
        fieldsMap['Measurements'] = measurementEl.innerText.trim();
      }

      // Extract all .field elements specifically within highlights
      highlightsPanel.querySelectorAll('.field').forEach(field => {
        const labelEl = field.querySelector('.field-label .key') ||
                        field.querySelector('.field-label') ||
                        field.querySelector('.key');
        const valueEl = field.querySelector('.field-value .value span') ||
                        field.querySelector('.field-value .value') ||
                        field.querySelector('.field-value') ||
                        field.querySelector('.value');
        if (labelEl && valueEl) {
          const label = labelEl.innerText.trim().replace(/\s+/g, ' ');
          const value = valueEl.innerText.trim();
          if (label && value && value !== '--' && !fieldsMap[label]) {
            fieldsMap[label] = value;
          }
        }
      });
    }

    // Debug: count total raw fields found
    result._fieldsMapCount = Object.keys(fieldsMap).length;

    // ===== Helper functions =====
    // Get value by partial label match
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

    // Store all fields for debugging/additional_fields
    result.additional_fields = fieldsMap;

    // ===== CALCULATE DATA QUALITY SCORE =====
    // Score based on key fields being populated
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
  let hadError = false;
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
    console.error('[Scraper v17] Navigating to Regrid main page...');
    await page.goto('https://app.regrid.com/', { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(3000);

    // Check if we need to log in
    const loginFormVisible = await page.locator('input[placeholder="Email address"]').first().isVisible({ timeout: 5000 }).catch(() => false);

    if (loginFormVisible) {
      console.error('[Scraper v17] Login form found, logging in...');
      await page.locator('input[placeholder="Email address"]').first().fill(REGRID_EMAIL);
      await page.locator('input[placeholder="Password"]').first().fill(REGRID_PASSWORD);
      await page.locator('input[type="submit"][value="Sign in"]').first().click();
      await page.waitForLoadState('load', { timeout: 30000 });
      await page.waitForTimeout(3000);
      const stillShowingLogin = await page.locator('input[placeholder="Email address"]').first().isVisible({ timeout: 2000 }).catch(() => false);
      if (stillShowingLogin) {
        throw new Error('Login failed - form still visible after submit');
      }
      console.error('[Scraper v17] Login successful');
    }

    // Step 2: Navigate to county page
    const stateSlug = (state || 'pa').toLowerCase();
    const countySlug = (county || 'blair').toLowerCase().replace(/\s+/g, '-');
    const countyUrl = `https://app.regrid.com/us/${stateSlug}/${countySlug}`;
    console.error(`[Scraper v17] Navigating to county: ${countyUrl}`);
    await page.goto(countyUrl, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(3000);

    // Step 3: Find and use the search box
    console.error(`[Scraper v17] Searching for parcel: ${parcel}`);
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
          console.error(`[Scraper v17] Found search box: ${selector}`);
          break;
        }
      } catch (e) {}
    }

    if (!searchBox) throw new Error('Could not find search box');

    await searchBox.click();
    await page.waitForTimeout(500);
    await searchBox.fill(parcel);
    console.error('[Scraper v17] Entered search query');
    await page.waitForTimeout(2500);

    // Step 4: Click dropdown result
    console.error('[Scraper v17] Looking for search result to click...');
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
          console.error(`[Scraper v17] Clicked result using: ${selector}`);
          resultClicked = true;
          break;
        }
      } catch (e) {}
    }

    if (!resultClicked) {
      console.error('[Scraper v17] No clickable result found, using keyboard navigation...');
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(300);
      await page.keyboard.press('Enter');
    }

    // Step 5: Wait for map to zoom and Property Details panel to appear
    console.error('[Scraper v17] Waiting for map to zoom to parcel...');
    await page.waitForTimeout(5000);

    // Step 6: Check if Property Details panel is visible
    const hasPropertyDetails = await page.evaluate(() => {
      return document.body.innerText.includes('Property Details');
    });

    if (!hasPropertyDetails) {
      console.error('[Scraper v17] Property Details panel not found, trying Enter again...');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(3000);
    }

    // Step 7: Scroll down in the Property Details panel to load all sections
    console.error('[Scraper v17] Scrolling through Property Details panel to load all sections...');
    await page.evaluate(() => {
      const panels = document.querySelectorAll('[class*="property"], [class*="panel"], [class*="sidebar"]');
      panels.forEach(panel => {
        if (panel.scrollHeight > panel.clientHeight) {
          panel.scrollTop = panel.scrollHeight;
        }
      });
    });
    await page.waitForTimeout(1000);

    // Scroll back to top
    await page.evaluate(() => {
      const panels = document.querySelectorAll('[class*="property"], [class*="panel"], [class*="sidebar"]');
      panels.forEach(panel => {
        panel.scrollTop = 0;
      });
    });
    await page.waitForTimeout(500);

    // Step 8: Extract comprehensive property data BEFORE closing panel
    console.error('[Scraper v17] Extracting comprehensive property data...');
    await page.waitForTimeout(2000);
    const regridData = await extractPropertyData(page);

    // Log extracted fields count
    const populatedFields = Object.entries(regridData).filter(([k, v]) =>
      v !== null && v !== '' && k !== 'additional_fields' && k !== 'raw_html'
    ).length;
    console.error(`[Scraper v17] Extracted ${populatedFields} populated fields`);
    console.error('[Scraper v17] Data quality score:', regridData.data_quality_score);

    // Step 8b: Validate state matches expected state (prevent wrong-state matches)
    if (state && regridData.state) {
      const expectedState = state.toUpperCase();
      const actualState = regridData.state.toUpperCase();
      if (actualState !== expectedState) {
        console.error(`[Scraper v17] STATE MISMATCH: Expected ${expectedState}, got ${actualState} - rejecting result`);
        await browser.close();
        console.log(JSON.stringify({
          success: false,
          error: `State mismatch: expected ${expectedState}, got ${actualState}. Regrid matched wrong property.`,
          property_id: propertyId || '',
          parcel_id: parcel,
          expected_state: expectedState,
          actual_state: actualState,
          regrid_address: regridData.address || null,
          regrid_city: regridData.city || null,
          scraper_version: 'v17'
        }));
        process.exit(1);
      }
    }

    // Step 9: Close Property Details panel
    console.error('[Scraper v17] Closing Property Details panel...');
    let panelClosed = false;

    // Method 1: Use the close button selector
    try {
      const closeButton = page.locator('#property > .close').first();
      if (await closeButton.isVisible({ timeout: 2000 })) {
        await closeButton.click();
        await page.waitForTimeout(1000);
        panelClosed = await page.evaluate(() => !document.body.innerText.includes('Property Details'));
        if (panelClosed) {
          console.error('[Scraper v17] Panel closed using close button');
        }
      }
    } catch (e) {
      console.error('[Scraper v17] Close button method failed:', e.message);
    }

    // Method 2: Try Escape key
    if (!panelClosed) {
      try {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);
        panelClosed = await page.evaluate(() => !document.body.innerText.includes('Property Details'));
        if (panelClosed) {
          console.error('[Scraper v17] Panel closed using Escape key');
        }
      } catch (e) {}
    }

    // Method 3: Click on map
    if (!panelClosed) {
      try {
        await page.locator('[role="region"][aria-label*="Map" i]').first().click();
        await page.waitForTimeout(1000);
        panelClosed = await page.evaluate(() => !document.body.innerText.includes('Property Details'));
        if (panelClosed) {
          console.error('[Scraper v17] Panel closed by clicking map');
        }
      } catch (e) {}
    }

    // Method 4: Remove panel from DOM (most reliable - removes panel completely)
    if (!panelClosed) {
      console.error('[Scraper v17] Method 4: Removing panel from DOM...');
      try {
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
          console.error('[Scraper v17] Method 4: Panel removed from DOM successfully');
          await page.waitForTimeout(500);
        }
      } catch (e) {
        console.error('[Scraper v17] Method 4 failed:', e.message);
      }
    }

    await page.waitForTimeout(1000);

    // Step 10: Take screenshot with improved quality
    console.error('[Scraper v17] Capturing screenshot...');
    const screenshot = await page.screenshot(settings.screenshot);

    // Log screenshot size
    const sizeKB = Math.round(screenshot.length / 1024);
    console.error(`[Scraper v17] Screenshot size: ${sizeKB} KB`);

    // Step 11: Return both screenshot and scraped data
    const result = {
      success: true,
      screenshot: screenshot.toString('base64'),
      property_id: propertyId || '',
      parcel_id: parcel,
      regrid_data: regridData,
      panel_closed: panelClosed,
      scraped_at: new Date().toISOString(),
      quality_mode: qualityMode,
      screenshot_size_kb: sizeKB,
      scraper_version: 'v17'
    };

    console.log(JSON.stringify(result));

  } catch (error) {
    hadError = true;
    console.error('[Scraper v17] Error:', error.message);
    console.log(JSON.stringify({
      success: false,
      error: error.message,
      property_id: propertyId || '',
      parcel_id: parcel,
      scraper_version: 'v17'
    }));
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('[Scraper v17] Error closing browser:', closeError.message);
      }
    }
    process.exit(hadError ? 1 : 0);
  }
})().catch((error) => {
  console.error('[Scraper v17] Unhandled error:', error.message);
  console.log(JSON.stringify({
    success: false,
    error: error.message || 'Unknown error',
    property_id: propertyId || '',
    parcel_id: parcel || 'unknown',
    scraper_version: 'v17'
  }));
  process.exit(1);
});

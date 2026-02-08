#!/usr/bin/env node
/**
 * Regrid Screenshot & Data Scraper v18
 *
 * FIXES over v17:
 * 1. Address-based search when available (falls back to parcel ID)
 * 2. Parcel search appends county+state for better targeting
 * 3. Waits for .field elements to appear (fixes 0-field extraction)
 * 4. Uses correct .tt-suggestion selector for typeahead results
 * 5. Location validation - rejects wrong-state coordinates
 * 6. Better login handling with session check
 *
 * Usage: node regrid-screenshot-v18.js <parcel_id> <county> <state> <property_id> [address] [quality]
 *   address: property address for search (optional, use "" to skip)
 *   quality: "high" (PNG), "medium" (JPEG 90), "low" (JPEG 75)
 *
 * Output: JSON with success/error, base64 screenshot, and comprehensive regrid_data object
 */

const { chromium } = require('playwright');

const [,, parcel, county, state, propertyId, address, qualityMode = 'medium'] = process.argv;

if (!parcel) {
  console.error(JSON.stringify({ success: false, error: 'Missing parcel_id argument' }));
  process.exit(1);
}

const REGRID_EMAIL = process.env.REGRID_EMAIL || 'lulu.lopes.sousa@gmail.com';
const REGRID_PASSWORD = process.env.REGRID_PASSWORD || 'Bia@2020';

// State bounding boxes for location validation (approximate)
const STATE_BOUNDS = {
  pa: { minLat: 39.7, maxLat: 42.3, minLon: -80.6, maxLon: -74.7 },
  fl: { minLat: 24.4, maxLat: 31.0, minLon: -87.7, maxLon: -80.0 },
  tx: { minLat: 25.8, maxLat: 36.5, minLon: -106.7, maxLon: -93.5 },
  md: { minLat: 37.9, maxLat: 39.7, minLon: -79.5, maxLon: -75.0 },
  nj: { minLat: 38.9, maxLat: 41.4, minLon: -75.6, maxLon: -73.9 },
};

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
console.error(`[v18] Parcel: ${parcel} | County: ${county} | State: ${state}`);
console.error(`[v18] Address: ${address || '(none)'} | Quality: ${qualityMode}`);

/**
 * Validate that coordinates are within the expected state
 */
function validateLocation(lat, lon, expectedState) {
  if (!lat || !lon || !expectedState) return { valid: true, reason: 'no data to validate' };
  const bounds = STATE_BOUNDS[expectedState.toLowerCase()];
  if (!bounds) return { valid: true, reason: 'unknown state bounds' };
  const inBounds = lat >= bounds.minLat && lat <= bounds.maxLat &&
                   lon >= bounds.minLon && lon <= bounds.maxLon;
  return {
    valid: inBounds,
    reason: inBounds ? 'coordinates within state bounds' : `coordinates (${lat}, ${lon}) outside ${expectedState.toUpperCase()} bounds`
  };
}

/**
 * Extract comprehensive property data from Property Details panel
 */
async function extractPropertyData(page) {
  console.error('[v18] Extracting property data from panel...');

  // STEP 1: Wait for .field elements to appear (critical fix - v17 skipped this)
  let fieldCount = 0;
  try {
    await page.waitForSelector('.field', { timeout: 15000 });
    fieldCount = await page.evaluate(() => document.querySelectorAll('.field').length);
    console.error(`[v18] Found ${fieldCount} .field elements after initial wait`);
  } catch (e) {
    console.error('[v18] No .field elements found after 15s wait, trying expansion anyway...');
  }

  // STEP 2: Expand ALL collapsible sections
  const sectionsExpanded = await page.evaluate(() => {
    let expanded = 0;

    // Method A: Click panel headings whose collapse panel lacks 'in' class
    const headings = document.querySelectorAll('.panel-heading[data-toggle="collapse"]');
    headings.forEach(heading => {
      try {
        const targetId = heading.getAttribute('href') || heading.getAttribute('data-target');
        if (targetId) {
          const target = document.querySelector(targetId);
          if (target && target.classList.contains('collapse') && !target.classList.contains('in')) {
            heading.click();
            expanded++;
          }
        } else {
          // Fallback: check nextElementSibling
          const target = heading.nextElementSibling;
          if (target && target.classList.contains('collapse') && !target.classList.contains('in')) {
            heading.click();
            expanded++;
          }
        }
      } catch(e) {}
    });

    return expanded;
  });
  console.error(`[v18] Clicked ${sectionsExpanded} collapsed sections`);

  // Wait for expansion animations
  if (sectionsExpanded > 0) {
    await page.waitForTimeout(2000);
  }

  // Method C (force): Directly add 'in' class to any still-collapsed sections
  const forcedOpen = await page.evaluate(() => {
    let forced = 0;
    document.querySelectorAll('.panel-collapse.collapse:not(.in)').forEach(el => {
      el.classList.add('in');
      el.style.height = 'auto';
      el.style.display = 'block';
      forced++;
    });
    return forced;
  });
  if (forcedOpen > 0) {
    console.error(`[v18] Force-expanded ${forcedOpen} additional sections`);
    await page.waitForTimeout(1000);
  }

  // STEP 3: Scroll through panel to trigger lazy loading
  await page.evaluate(() => {
    const panel = document.querySelector('#property') || document.querySelector('#waterfall');
    if (panel) {
      panel.scrollTop = panel.scrollHeight;
    }
  });
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    const panel = document.querySelector('#property') || document.querySelector('#waterfall');
    if (panel) { panel.scrollTop = 0; }
  });
  await page.waitForTimeout(500);

  // Re-check field count after expansion
  const finalFieldCount = await page.evaluate(() => document.querySelectorAll('.field').length);
  console.error(`[v18] Total .field elements after expansion: ${finalFieldCount}`);

  // STEP 4: Extract all data
  const data = await page.evaluate(() => {
    const result = {
      regrid_id: null, ll_uuid: null, regrid_uuid: null, alt_parcel_id: null, control_number: null, parcel_id: null,
      address: null, city: null, state: null, zip: null,
      owner_name: null, mailing_address: null, mailing_city: null, mailing_state: null, mailing_zip: null,
      property_type: null, property_class: null, land_use: null, zoning: null, parcel_use_code: null,
      lot_size_sqft: null, lot_size_acres: null, lot_dimensions: null, deed_acres: null, lot_type: null, terrain: null, land_description: null,
      building_sqft: null, year_built: null, bedrooms: null, bathrooms: null, number_of_stories: null, building_count: null, building_footprint_sqft: null,
      assessed_value: null, market_value: null, total_parcel_value: null, improvement_value: null, land_value: null, last_sale_price: null, last_sale_date: null,
      latitude: null, longitude: null,
      water_service: null, sewer_service: null, gas_availability: null, electric_service: null, road_type: null,
      opportunity_zone: null, census_tract: null, census_block: null, census_blockgroup: null, neighborhood_code: null,
      school_district: null, school_district_code: null, district_number: null, ward_number: null, map_number: null,
      clean_green_land_value: null, clean_green_building_value: null, clean_green_total_value: null,
      additional_fields: {}, raw_html: null, data_quality_score: 0.0
    };

    // Build fieldsMap from all .field elements
    const fieldsMap = {};
    document.querySelectorAll('.field').forEach(field => {
      const labelEl = field.querySelector('.field-label .key') ||
                      field.querySelector('.field-label');
      const valueEl = field.querySelector('.field-value .value span') ||
                      field.querySelector('.field-value .value') ||
                      field.querySelector('.field-value span') ||
                      field.querySelector('.field-value');
      if (labelEl && valueEl) {
        let label = labelEl.innerText.trim().replace(/\s+/g, ' ');
        let value = valueEl.innerText.trim();
        if (label && value && value !== '--' && value !== 'N/A') {
          fieldsMap[label] = value;
        }
      }
    });

    // Extract from Parcel Highlights section (special structure)
    const highlightsPanel = document.querySelector('#property-highlights');
    if (highlightsPanel) {
      const addressEl = highlightsPanel.querySelector('address');
      if (addressEl) {
        const fullAddr = addressEl.innerText.replace(/\n/g, ', ').trim();
        if (fullAddr) fieldsMap['Full Address'] = fullAddr;
      }

      // Owner from highlights variant B (.field-value.value direct text)
      highlightsPanel.querySelectorAll('.field').forEach(field => {
        const lbl = field.querySelector('.field-label');
        if (lbl && lbl.innerText.toLowerCase().includes('owner')) {
          const val = field.querySelector('.field-value');
          if (val) fieldsMap['Owner (Highlights)'] = val.innerText.trim();
        }
      });

      // Measurements
      const measurementEl = highlightsPanel.querySelector('.conversion-value');
      if (measurementEl) {
        fieldsMap['Measurements'] = measurementEl.innerText.trim();
      }
    }

    result._fieldsMapCount = Object.keys(fieldsMap).length;

    // Helper: get field by partial label match
    const getField = (labels) => {
      for (const label of (Array.isArray(labels) ? labels : [labels])) {
        for (const [key, value] of Object.entries(fieldsMap)) {
          if (key.toLowerCase().includes(label.toLowerCase())) return value;
        }
      }
      return null;
    };
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

    // ===== EXTRACT LOT =====
    const measurements = getField(['Measurements']);
    if (measurements) {
      const acresMatch = measurements.match(/([\d.]+)\s*Acres/i);
      if (acresMatch) result.lot_size_acres = parseNum(acresMatch[1]);
    }
    result.deed_acres = parseNum(getField(['Deed Acres']));
    result.lot_size_sqft = parseNum(getField(['Lot Size', 'Square Feet']));
    result.lot_type = getField(['Lot Type']);
    result.terrain = getField(['Terrain']);
    result.land_description = getField(['Land Description', 'Legal Description']);
    result.lot_dimensions = getField(['Lot Dimensions']);

    // ===== EXTRACT BUILDING =====
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

    // Store all fields
    result.additional_fields = fieldsMap;

    // ===== DATA QUALITY SCORE =====
    const keyFields = [
      'regrid_uuid', 'address', 'city', 'state', 'zip',
      'owner_name', 'property_type', 'land_use',
      'lot_size_acres', 'total_parcel_value',
      'latitude', 'longitude', 'water_service', 'sewer_service'
    ];
    let populated = 0;
    keyFields.forEach(f => {
      if (result[f] !== null && result[f] !== '' && result[f] !== undefined) populated++;
    });
    result.data_quality_score = Math.round((populated / keyFields.length) * 100) / 100;

    return result;
  });

  return data;
}

(async () => {
  let hadError = false;
  let sessionExpiredDetected = false;

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-extensions',
      '--disable-background-networking',
      '--disable-default-apps',
      '--disable-sync',
      '--no-first-run',
      '--single-process'
    ]
  });

  try {
    const context = await browser.newContext({
      viewport: settings.viewport,
      deviceScaleFactor: settings.deviceScaleFactor,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();

    // Dismiss any dialogs (session timeout, etc.)
    page.on('dialog', async dialog => {
      const msg = dialog.message();
      console.error(`[v18] Dialog: ${msg}`);
      if (msg.toLowerCase().includes('sign in again') || msg.toLowerCase().includes('session')) {
        sessionExpiredDetected = true;
        console.error('[v18] Session expiration detected - will re-authenticate');
      }
      await dialog.accept();
    });

    // Step 1: Navigate and login
    console.error('[v18] Navigating to Regrid...');
    await page.goto('https://app.regrid.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);

    const loginFormVisible = await page.locator('input[placeholder="Email address"]').first().isVisible({ timeout: 5000 }).catch(() => false);
    if (loginFormVisible) {
      console.error('[v18] Logging in...');
      await page.locator('input[placeholder="Email address"]').first().fill(REGRID_EMAIL);
      await page.locator('input[placeholder="Password"]').first().fill(REGRID_PASSWORD);
      await page.locator('input[type="submit"][value="Sign in"]').first().click();
      // Regrid is a SPA - login happens via AJAX, not full page reload
      // waitForLoadState('load') hangs because no page reload occurs
      try {
        await page.waitForLoadState('networkidle', { timeout: 15000 });
      } catch (e) {
        // networkidle may not fire if background requests keep going
        await page.waitForTimeout(5000);
      }
      await page.waitForTimeout(2000);
      const stillLogin = await page.locator('input[placeholder="Email address"]').first().isVisible({ timeout: 2000 }).catch(() => false);
      if (stillLogin) throw new Error('Login failed - form still visible');
      console.error('[v18] Login successful');
    } else {
      console.error('[v18] Already logged in');
    }

    // Step 2: Navigate to county page
    const stateSlug = (state || 'pa').toLowerCase();
    const countySlug = (county || 'blair').toLowerCase().replace(/\s+/g, '-');
    const countyUrl = `https://app.regrid.com/us/${stateSlug}/${countySlug}`;
    console.error(`[v18] Navigating to: ${countyUrl}`);
    await page.goto(countyUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);

    // Step 2b: Handle session expiration - re-authenticate if needed
    const loginFormAfterNav = await page.locator('input[placeholder="Email address"]').first().isVisible({ timeout: 3000 }).catch(() => false);
    if (sessionExpiredDetected || loginFormAfterNav) {
      console.error('[v18] Session expired - re-authenticating...');
      // If login form is not visible, navigate to login page
      if (!loginFormAfterNav) {
        await page.goto('https://app.regrid.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForTimeout(3000);
      }
      // Fill in credentials
      const emailInput = page.locator('input[placeholder="Email address"]').first();
      const emailVisible = await emailInput.isVisible({ timeout: 5000 }).catch(() => false);
      if (emailVisible) {
        await emailInput.fill(REGRID_EMAIL);
        await page.locator('input[placeholder="Password"]').first().fill(REGRID_PASSWORD);
        await page.locator('input[type="submit"][value="Sign in"]').first().click();
        try {
          await page.waitForLoadState('networkidle', { timeout: 15000 });
        } catch (e) {
          await page.waitForTimeout(5000);
        }
        await page.waitForTimeout(2000);
        console.error('[v18] Re-authentication complete');
      } else {
        console.error('[v18] WARNING: Could not find login form for re-auth');
      }
      // Re-navigate to county page
      sessionExpiredDetected = false;
      console.error(`[v18] Re-navigating to: ${countyUrl}`);
      await page.goto(countyUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(3000);
      // Check if session expired AGAIN (account may be locked to another session)
      if (sessionExpiredDetected) {
        console.error('[v18] ERROR: Session expired again after re-auth - account may be in use by another browser');
      }
    }

    // Step 3: Determine search query
    // If address has a house number (high quality), use address for better county-scoped results
    // If address is just a street name (medium quality), prefer parcel search (street-only doesn't match in typeahead)
    // Otherwise, use parcel ID with county+state appended for targeting
    const hasAddress = address && address.trim() && address.trim() !== '""' && address.trim() !== "''";
    const addressHasNumber = hasAddress && /^\d/.test(address.trim());
    const useAddressSearch = hasAddress && addressHasNumber;
    // Strip dashes from parcel for search - Regrid typeahead expects format like "46000025600" not "46-00-00256-00"
    const cleanParcel = parcel.replace(/-/g, '');
    // Leading zero fallback: some counties (e.g. Delaware County PA) store parcels
    // without leading zeros ("9-00-00066-00" not "09-00-00066-00"). Only used as retry.
    const strippedParcel = cleanParcel.replace(/^0+/, '');
    const hasLeadingZeroAlt = !useAddressSearch && strippedParcel !== cleanParcel && strippedParcel.length > 0;
    const searchQuery = useAddressSearch ? address.trim() : cleanParcel;
    console.error(`[v18] Search strategy: ${useAddressSearch ? 'ADDRESS' : 'PARCEL+CONTEXT'}`);
    if (hasAddress && !useAddressSearch) console.error(`[v18] Address "${address.trim()}" has no house number, using parcel search`);
    console.error(`[v18] Search query: ${searchQuery}`);
    if (hasLeadingZeroAlt) console.error(`[v18] Leading zero fallback available: ${strippedParcel}`);

    // Step 4: Find and use search box
    const searchBox = await page.locator('input[placeholder*="Search an address"]').first()
      .or(page.locator('input[placeholder*="Search"]').first());

    // Use JavaScript click + focus to bypass overlay interception on map page
    await page.evaluate(() => {
      const input = document.querySelector('#glmap-search-query') ||
                    document.querySelector('input[placeholder*="Search"]');
      if (input) { input.click(); input.focus(); input.value = ''; }
    });
    await page.waitForTimeout(500);

    // Type via page.keyboard to bypass element-level actionability checks
    // This triggers typeahead key events properly
    for (const char of searchQuery) {
      await page.keyboard.type(char);
      await page.waitForTimeout(40);
    }
    console.error('[v18] Entered search query, waiting for typeahead...');
    await page.waitForTimeout(3000);

    // Step 5: Click the first typeahead suggestion
    let resultClicked = false;

    // Primary: Use .tt-suggestion (confirmed from live Regrid DOM)
    try {
      const suggestion = await page.locator('.tt-suggestion').first();
      if (await suggestion.isVisible({ timeout: 2000 })) {
        // Use JavaScript click to avoid overlay interception
        await page.evaluate(() => {
          const s = document.querySelector('.tt-suggestion');
          if (s) { s.click(); return true; }
          return false;
        });
        resultClicked = true;
        console.error('[v18] Clicked .tt-suggestion result');
      }
    } catch (e) {}

    // Fallback: Other selectors
    if (!resultClicked) {
      const fallbackSelectors = ['.pac-item', '[role="option"]', '.search-result', '.suggestion'];
      for (const sel of fallbackSelectors) {
        try {
          const el = page.locator(sel).first();
          if (await el.isVisible({ timeout: 500 })) {
            await page.evaluate((s) => {
              const el = document.querySelector(s);
              if (el) el.click();
            }, sel);
            resultClicked = true;
            console.error(`[v18] Clicked result: ${sel}`);
            break;
          }
        } catch (e) {}
      }
    }

    // Last resort: keyboard navigation
    if (!resultClicked) {
      console.error('[v18] No clickable result, using keyboard...');
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(300);
      await page.keyboard.press('Enter');
    }

    // Step 6: Wait for Property Details panel to load WITH content
    console.error('[v18] Waiting for property panel to load...');

    // Wait for the #waterfall panel or #property to become visible
    let panelDetected = false;
    try {
      await page.waitForSelector('#waterfall, #property-highlights, .panel-heading', { timeout: 10000 });
      panelDetected = true;
      console.error('[v18] Property panel detected');
    } catch (e) {
      console.error('[v18] Property panel not found after 10s');
    }

    // If panel not found after typeahead click, press Enter (most reliable method)
    if (!panelDetected) {
      console.error('[v18] Panel not found, pressing Enter to select...');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(4000);

      try {
        await page.waitForSelector('#waterfall, #property-highlights, .panel-heading', { timeout: 8000 });
        panelDetected = true;
        console.error('[v18] Property panel appeared after Enter');
      } catch (e2) {
        console.error('[v18] Still no panel after Enter, trying map click...');
        // Quick map click as last resort (3s timeout instead of 30s)
        try {
          const box = await page.evaluate(() => {
            const c = document.querySelector('canvas');
            if (!c) return null;
            const r = c.getBoundingClientRect();
            return { x: r.x, y: r.y, width: r.width, height: r.height };
          });
          if (box) {
            await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.45);
            await page.waitForTimeout(4000);
            console.error('[v18] Clicked map center as fallback');
          }
        } catch (mapErr) {
          console.error(`[v18] Map click fallback failed: ${mapErr.message}`);
        }
      }
    }

    // CRITICAL: Wait for .field elements to actually appear in the panel
    // This is the key fix - v17 didn't wait for AJAX content to load
    let panelHasContent = false;
    for (let attempt = 0; attempt < 5; attempt++) {
      const fc = await page.evaluate(() => document.querySelectorAll('.field').length);
      if (fc > 5) {
        panelHasContent = true;
        console.error(`[v18] Panel content loaded: ${fc} fields (attempt ${attempt + 1})`);
        break;
      }
      console.error(`[v18] Waiting for panel content... (attempt ${attempt + 1}, fields: ${fc})`);
      await page.waitForTimeout(2000);
    }

    if (!panelHasContent) {
      console.error('[v18] WARNING: Panel has few/no .field elements. Data extraction may be incomplete.');
    }

    // Step 6b: LEADING ZERO RETRY - if no panel content and parcel has leading zeros, retry without them
    // Some counties (e.g. Delaware County PA) store parcels without leading zeros in Regrid
    if (!panelHasContent && hasLeadingZeroAlt) {
      console.error(`[v18] LEADING ZERO RETRY: "${cleanParcel}" -> "${strippedParcel}"`);

      // Re-navigate to county page to ensure map is properly centered
      console.error(`[v18] RETRY: Re-navigating to ${countyUrl} to re-center map...`);
      await page.goto(countyUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(3000);

      // Clear search box and enter stripped parcel
      await page.evaluate(() => {
        const input = document.querySelector('#glmap-search-query') ||
                      document.querySelector('input[placeholder*="Search"]');
        if (input) { input.click(); input.focus(); input.value = ''; }
      });
      await page.waitForTimeout(500);

      for (const char of strippedParcel) {
        await page.keyboard.type(char);
        await page.waitForTimeout(40);
      }
      await page.waitForTimeout(3000);

      // Click typeahead result
      let retryClicked = false;
      try {
        if (await page.locator('.tt-suggestion').first().isVisible({ timeout: 2000 })) {
          await page.evaluate(() => { const s = document.querySelector('.tt-suggestion'); if (s) s.click(); });
          retryClicked = true;
          console.error('[v18] RETRY: Clicked typeahead result');
        }
      } catch (e) {}
      if (!retryClicked) {
        await page.keyboard.press('ArrowDown');
        await page.waitForTimeout(300);
        await page.keyboard.press('Enter');
      }

      // Wait for panel
      try {
        await page.waitForSelector('#waterfall, #property-highlights, .panel-heading', { timeout: 10000 });
      } catch (e) {}

      // Wait for content
      for (let attempt = 0; attempt < 5; attempt++) {
        const fc = await page.evaluate(() => document.querySelectorAll('.field').length);
        if (fc > 5) {
          panelHasContent = true;
          console.error(`[v18] RETRY: Panel content loaded (${fc} fields)`);
          break;
        }
        await page.waitForTimeout(2000);
      }

      if (panelHasContent) {
        console.error('[v18] LEADING ZERO RETRY: SUCCESS - found property with stripped parcel');
      } else {
        console.error('[v18] LEADING ZERO RETRY: FAILED - still no content');
      }
    }

    // Step 6c: ADDRESS-TO-PARCEL FALLBACK - if address search failed, try parcel search
    if (!panelHasContent && useAddressSearch) {
      console.error(`[v18] ADDRESS FALLBACK: Address search failed, retrying with parcel "${cleanParcel}"`);

      // Re-navigate to county page
      await page.goto(countyUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(3000);

      // Clear search box and enter parcel
      await page.evaluate(() => {
        const input = document.querySelector('#glmap-search-query') ||
                      document.querySelector('input[placeholder*="Search"]');
        if (input) { input.click(); input.focus(); input.value = ''; }
      });
      await page.waitForTimeout(500);

      for (const char of cleanParcel) {
        await page.keyboard.type(char);
        await page.waitForTimeout(40);
      }
      await page.waitForTimeout(3000);

      // Click typeahead result
      let fbClicked = false;
      try {
        if (await page.locator('.tt-suggestion').first().isVisible({ timeout: 2000 })) {
          await page.evaluate(() => { const s = document.querySelector('.tt-suggestion'); if (s) s.click(); });
          fbClicked = true;
          console.error('[v18] FALLBACK: Clicked typeahead result');
        }
      } catch (e) {}
      if (!fbClicked) {
        await page.keyboard.press('ArrowDown');
        await page.waitForTimeout(300);
        await page.keyboard.press('Enter');
      }

      // Wait for panel + content
      try {
        await page.waitForSelector('#waterfall, #property-highlights, .panel-heading', { timeout: 10000 });
      } catch (e) {}
      for (let attempt = 0; attempt < 5; attempt++) {
        const fc = await page.evaluate(() => document.querySelectorAll('.field').length);
        if (fc > 5) {
          panelHasContent = true;
          console.error(`[v18] FALLBACK: Panel content loaded (${fc} fields)`);
          break;
        }
        await page.waitForTimeout(2000);
      }

      // If parcel search also failed and has leading zero alt, try stripped parcel
      if (!panelHasContent && strippedParcel !== cleanParcel && strippedParcel.length > 0) {
        console.error(`[v18] FALLBACK LEADING ZERO: "${cleanParcel}" -> "${strippedParcel}"`);
        await page.goto(countyUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForTimeout(3000);
        await page.evaluate(() => {
          const input = document.querySelector('#glmap-search-query') ||
                        document.querySelector('input[placeholder*="Search"]');
          if (input) { input.click(); input.focus(); input.value = ''; }
        });
        await page.waitForTimeout(500);
        for (const char of strippedParcel) {
          await page.keyboard.type(char);
          await page.waitForTimeout(40);
        }
        await page.waitForTimeout(3000);
        let fb2Clicked = false;
        try {
          if (await page.locator('.tt-suggestion').first().isVisible({ timeout: 2000 })) {
            await page.evaluate(() => { const s = document.querySelector('.tt-suggestion'); if (s) s.click(); });
            fb2Clicked = true;
          }
        } catch (e) {}
        if (!fb2Clicked) {
          await page.keyboard.press('ArrowDown');
          await page.waitForTimeout(300);
          await page.keyboard.press('Enter');
        }
        try {
          await page.waitForSelector('#waterfall, #property-highlights, .panel-heading', { timeout: 10000 });
        } catch (e) {}
        for (let attempt = 0; attempt < 5; attempt++) {
          const fc = await page.evaluate(() => document.querySelectorAll('.field').length);
          if (fc > 5) {
            panelHasContent = true;
            console.error(`[v18] FALLBACK LEADING ZERO: Panel content loaded (${fc} fields)`);
            break;
          }
          await page.waitForTimeout(2000);
        }
      }

      if (panelHasContent) {
        console.error('[v18] ADDRESS FALLBACK: SUCCESS - found property via parcel search');
      } else {
        console.error('[v18] ADDRESS FALLBACK: FAILED - parcel search also found no content');
      }
    }

    // Step 7: Scroll panel to load all sections
    await page.evaluate(() => {
      const panels = document.querySelectorAll('#property, #waterfall, [class*="sidebar"]');
      panels.forEach(p => { if (p.scrollHeight > p.clientHeight) p.scrollTop = p.scrollHeight; });
    });
    await page.waitForTimeout(1000);
    await page.evaluate(() => {
      const panels = document.querySelectorAll('#property, #waterfall, [class*="sidebar"]');
      panels.forEach(p => { p.scrollTop = 0; });
    });
    await page.waitForTimeout(500);

    // Step 8: Extract data
    console.error('[v18] Extracting property data...');
    let regridData = await extractPropertyData(page);

    // Step 9: Location and state validation
    let locationCheck = validateLocation(regridData.latitude, regridData.longitude, state);
    let stateMatch = !(state && regridData.state && regridData.state.toUpperCase() !== state.toUpperCase());

    // Step 9b: If wrong state/location AND leading zero alternative exists, retry with stripped parcel
    if ((!locationCheck.valid || !stateMatch) && hasLeadingZeroAlt) {
      console.error(`[v18] Wrong state/location. LEADING ZERO RETRY: "${cleanParcel}" -> "${strippedParcel}"`);

      // Re-navigate to county page first - the wrong result may have moved the map to another state
      console.error(`[v18] RETRY: Re-navigating to ${countyUrl} to re-center map...`);
      await page.goto(countyUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(3000);

      // Clear search box and enter stripped parcel
      await page.evaluate(() => {
        const input = document.querySelector('#glmap-search-query') ||
                      document.querySelector('input[placeholder*="Search"]');
        if (input) { input.click(); input.focus(); input.value = ''; }
      });
      await page.waitForTimeout(500);

      for (const char of strippedParcel) {
        await page.keyboard.type(char);
        await page.waitForTimeout(40);
      }
      await page.waitForTimeout(3000);

      // Click typeahead result
      let retryClicked = false;
      try {
        if (await page.locator('.tt-suggestion').first().isVisible({ timeout: 2000 })) {
          await page.evaluate(() => { const s = document.querySelector('.tt-suggestion'); if (s) s.click(); });
          retryClicked = true;
          console.error('[v18] VALIDATION RETRY: Clicked typeahead result');
        }
      } catch (e) {}
      if (!retryClicked) {
        await page.keyboard.press('ArrowDown');
        await page.waitForTimeout(300);
        await page.keyboard.press('Enter');
      }

      // Wait for panel + content
      try {
        await page.waitForSelector('#waterfall, #property-highlights, .panel-heading', { timeout: 10000 });
      } catch (e) {}
      for (let attempt = 0; attempt < 5; attempt++) {
        const fc = await page.evaluate(() => document.querySelectorAll('.field').length);
        if (fc > 5) break;
        await page.waitForTimeout(2000);
      }

      // Scroll panel to load sections
      await page.evaluate(() => {
        const panels = document.querySelectorAll('#property, #waterfall, [class*="sidebar"]');
        panels.forEach(p => { if (p.scrollHeight > p.clientHeight) p.scrollTop = p.scrollHeight; });
      });
      await page.waitForTimeout(1000);
      await page.evaluate(() => {
        const panels = document.querySelectorAll('#property, #waterfall, [class*="sidebar"]');
        panels.forEach(p => { p.scrollTop = 0; });
      });
      await page.waitForTimeout(500);

      // Re-extract and re-validate
      const retryData = await extractPropertyData(page);
      const retryLocation = validateLocation(retryData.latitude, retryData.longitude, state);
      const retryStateMatch = !(state && retryData.state && retryData.state.toUpperCase() !== state.toUpperCase());

      if (retryLocation.valid && retryStateMatch) {
        console.error('[v18] VALIDATION RETRY: SUCCESS - correct state after stripping leading zero');
        regridData = retryData;
        locationCheck = retryLocation;
        stateMatch = true;
      } else {
        console.error('[v18] VALIDATION RETRY: FAILED - still wrong state/location');
      }
    }

    // Final validation - reject if still wrong after all retries
    if (!locationCheck.valid) {
      console.error(`[v18] LOCATION REJECTED: ${locationCheck.reason}`);
      await browser.close();
      console.log(JSON.stringify({
        success: false,
        error: `Wrong location: ${locationCheck.reason}`,
        property_id: propertyId || '',
        parcel_id: parcel,
        expected_state: (state || '').toUpperCase(),
        actual_state: regridData.state || null,
        regrid_address: regridData.address || null,
        regrid_city: regridData.city || null,
        latitude: regridData.latitude,
        longitude: regridData.longitude,
        scraper_version: 'v18'
      }));
      process.exit(1);
    }
    if (!stateMatch) {
      console.error(`[v18] STATE MISMATCH: Expected ${state.toUpperCase()}, got ${(regridData.state || 'null').toUpperCase()}`);
      await browser.close();
      console.log(JSON.stringify({
        success: false,
        error: `State mismatch: expected ${state.toUpperCase()}, got ${(regridData.state || 'null').toUpperCase()}`,
        property_id: propertyId || '',
        parcel_id: parcel,
        expected_state: state.toUpperCase(),
        actual_state: (regridData.state || 'null').toUpperCase(),
        regrid_address: regridData.address || null,
        regrid_city: regridData.city || null,
        scraper_version: 'v18'
      }));
      process.exit(1);
    }
    if (regridData.additional_fields) {
      regridData.additional_fields._location_valid = true;
    }

    const populatedFields = Object.entries(regridData).filter(([k, v]) =>
      v !== null && v !== '' && k !== 'additional_fields' && k !== 'raw_html' && !k.startsWith('_')
    ).length;
    console.error(`[v18] Extracted ${populatedFields} populated fields, quality: ${regridData.data_quality_score}`);
    console.error(`[v18] Fields in additional_fields: ${Object.keys(regridData.additional_fields || {}).length}`);

    // Step 10: Close panel and take screenshot
    console.error('[v18] Closing panel for screenshot...');
    let panelClosed = false;

    // Try close button
    try {
      await page.evaluate(() => {
        const close = document.querySelector('#waterfall .close, #property .close, .mapboxgl-ff .close');
        if (close) { close.click(); return true; }
        return false;
      });
      await page.waitForTimeout(500);
      panelClosed = true;
    } catch (e) {}

    // Try Escape
    if (!panelClosed) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }

    // Fallback: hide panel via DOM
    await page.evaluate(() => {
      const wf = document.querySelector('#waterfall');
      if (wf) wf.style.display = 'none';
    });
    await page.waitForTimeout(500);

    // Take screenshot
    console.error('[v18] Capturing screenshot...');
    const screenshot = await page.screenshot(settings.screenshot);
    const sizeKB = Math.round(screenshot.length / 1024);
    console.error(`[v18] Screenshot: ${sizeKB} KB`);

    // Output
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
      search_strategy: useAddressSearch ? 'address' : 'parcel_context',
      location_valid: locationCheck.valid,
      scraper_version: 'v18'
    };

    console.log(JSON.stringify(result));

  } catch (error) {
    hadError = true;
    console.error('[v18] Error:', error.message);
    console.log(JSON.stringify({
      success: false,
      error: error.message,
      property_id: propertyId || '',
      parcel_id: parcel,
      scraper_version: 'v18'
    }));
  } finally {
    if (browser) {
      try { await browser.close(); } catch (e) {}
    }
    process.exit(hadError ? 1 : 0);
  }
})().catch((error) => {
  console.error('[v18] Unhandled error:', error.message);
  console.log(JSON.stringify({
    success: false,
    error: error.message || 'Unknown error',
    property_id: propertyId || '',
    parcel_id: parcel || 'unknown',
    scraper_version: 'v18'
  }));
  process.exit(1);
});

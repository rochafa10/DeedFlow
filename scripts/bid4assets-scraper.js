/**
 * Bid4Assets Tax Sale Scraper
 *
 * Scrapes PA tax sales from Bid4Assets and compares against our database.
 * Designed to run in the pwrunner container on the VPS.
 *
 * Usage:
 *   node bid4assets-scraper.js [--login] [--state PA]
 *
 * Environment Variables:
 *   BID4ASSETS_EMAIL - Login email (optional, for authenticated scraping)
 *   BID4ASSETS_PASSWORD - Login password (optional)
 *   SUPABASE_URL - Supabase project URL
 *   SUPABASE_SERVICE_KEY - Supabase service role key
 */

const { chromium } = require('playwright');

// Configuration
const CONFIG = {
  baseUrl: 'https://www.bid4assets.com',
  taxSalesUrl: 'https://www.bid4assets.com/county-tax-sales',
  supabaseUrl: process.env.SUPABASE_URL || 'https://oiiwlzobizftprqspbzt.supabase.co',
  supabaseKey: process.env.SUPABASE_SERVICE_KEY || '',
  targetState: process.env.TARGET_STATE || 'PA',
  headless: false, // Bid4Assets blocks headless browsers
  timeout: 60000
};

// State name to code mapping
const STATE_CODES = {
  'Pennsylvania': 'PA',
  'California': 'CA',
  'Washington': 'WA',
  'Florida': 'FL',
  'Texas': 'TX',
  'Nevada': 'NV',
  'Montana': 'MT',
  'Minnesota': 'MN'
};

/**
 * Main scraper function
 */
async function scrapeBid4Assets(shouldLogin = false) {
  console.log('='.repeat(60));
  console.log('BID4ASSETS TAX SALE SCRAPER');
  console.log('='.repeat(60));
  console.log(`Target State: ${CONFIG.targetState}`);
  console.log(`Headless: ${CONFIG.headless}`);
  console.log(`Login: ${shouldLogin}`);
  console.log('');

  const browser = await chromium.launch({
    headless: CONFIG.headless,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });

  const page = await context.newPage();
  page.setDefaultTimeout(CONFIG.timeout);

  try {
    // Step 0: Login if credentials provided
    if (shouldLogin) {
      const email = process.env.BID4ASSETS_EMAIL;
      const password = process.env.BID4ASSETS_PASSWORD;
      if (email && password) {
        await login(page, email, password);
      } else {
        console.log('[0/4] Skipping login - no credentials in environment');
      }
    }

    // Step 1: Navigate to Tax Sales Calendar
    console.log('[1/4] Navigating to Tax Sales Calendar...');
    await page.goto(CONFIG.taxSalesUrl, { waitUntil: 'load', timeout: 60000 });
    // Wait longer for page content to fully render (Bid4Assets has dynamic content)
    await page.waitForTimeout(8000);

    // Debug: take a screenshot and log page info
    const pageTitle = await page.title();
    const bodyLength = await page.evaluate(() => document.body.innerText.length);
    console.log(`      Page title: ${pageTitle}`);
    console.log(`      Body text length: ${bodyLength} chars`);

    // Save a debug screenshot
    try {
      await page.screenshot({ path: 'debug-calendar-page.png', fullPage: true });
      console.log('      Saved debug screenshot: debug-calendar-page.png');
    } catch (e) {
      console.log(`      Screenshot error: ${e.message}`);
    }

    // Wait for the "Auction Calendar" text to appear - this confirms page loaded
    try {
      await page.waitForSelector('text=Auction Calendar', { timeout: 15000 });
      console.log('      Auction Calendar section found.');
    } catch (e) {
      console.log('      Warning: Could not find Auction Calendar section');
    }

    // Wait for h3 headers to appear (month names)
    try {
      await page.waitForSelector('h3', { timeout: 10000 });
      const h3Count = await page.evaluate(() => document.querySelectorAll('h3').length);
      console.log(`      Found ${h3Count} h3 headers.`);
    } catch (e) {
      console.log('      Warning: Could not find h3 elements, page may not have loaded correctly');
    }

    // Also wait for list items
    try {
      await page.waitForSelector('li a[href*="/storefront/"]', { timeout: 10000 });
      const auctionLinks = await page.evaluate(() => document.querySelectorAll('li a[href*="/storefront/"]').length);
      console.log(`      Found ${auctionLinks} auction links.`);
    } catch (e) {
      console.log('      Warning: Could not find auction links');
    }

    console.log('      Tax Sales Calendar loaded.');

    // Step 2: Extract all auctions from the calendar
    console.log('[2/4] Extracting auction data...');
    const auctions = await extractAuctions(page);
    console.log(`      Found ${auctions.length} total auctions.`);

    // Step 3: Filter by target state
    const targetAuctions = auctions.filter(a => a.stateCode === CONFIG.targetState);
    console.log(`      ${targetAuctions.length} auctions in ${CONFIG.targetState}.`);

    // Step 4: Get property counts for each auction
    console.log('[3/4] Getting property counts for each auction...');
    for (let i = 0; i < targetAuctions.length; i++) {
      const auction = targetAuctions[i];
      console.log(`      [${i + 1}/${targetAuctions.length}] ${auction.county} - ${auction.saleType}...`);

      try {
        const details = await getAuctionDetails(page, auction.url);
        auction.propertyCount = details.propertyCount;
        auction.depositAmount = details.depositAmount;
        auction.depositDeadline = details.depositDeadline;
        auction.startDate = details.startDate;
        auction.endDate = details.endDate;
        console.log(`         Properties: ${details.propertyCount || 'N/A'}, Deposit: $${details.depositAmount || 'N/A'}`);
      } catch (err) {
        console.log(`         Error: ${err.message}`);
        auction.propertyCount = null;
      }

      // Small delay to avoid rate limiting
      await page.waitForTimeout(1000);
    }

    // Step 5: Output results
    console.log('[4/4] Results:');
    console.log('');
    console.log('='.repeat(60));
    console.log(`${CONFIG.targetState} TAX SALES ON BID4ASSETS`);
    console.log('='.repeat(60));

    for (const auction of targetAuctions) {
      console.log(`
County: ${auction.county}, ${auction.stateCode}
Sale Type: ${auction.saleType}
Dates: ${auction.dateRange}
Properties: ${auction.propertyCount || 'Unknown'}
Deposit: $${auction.depositAmount || 'Unknown'}
URL: ${auction.url}
`);
    }

    // Return structured data
    return {
      success: true,
      state: CONFIG.targetState,
      auctionCount: targetAuctions.length,
      auctions: targetAuctions,
      scrapedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('Scraper error:', error.message);
    return {
      success: false,
      error: error.message,
      scrapedAt: new Date().toISOString()
    };
  } finally {
    await browser.close();
  }
}

/**
 * Extract all auctions from the calendar page
 */
async function extractAuctions(page) {
  return await page.evaluate(() => {
    const auctions = [];
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];

    // Find all month sections (h3 headers with month names)
    const allH3s = document.querySelectorAll('h3');

    allH3s.forEach(h3 => {
      const monthName = h3.textContent.trim();
      if (!months.includes(monthName)) return;

      // Find the parent container and then the list of auctions
      const parent = h3.parentElement;
      if (!parent) return;

      // Get the list that follows this h3
      const list = parent.querySelector('ul');
      if (!list) return;

      // Process each list item in this month
      const listItems = list.querySelectorAll('li');
      listItems.forEach(item => {
        // Get the link or strong element (strong = upcoming, not yet active)
        const link = item.querySelector('a');
        const strong = item.querySelector('strong');
        const textElement = link || strong;

        if (!textElement) return;

        const text = textElement.textContent.trim();
        const url = link ? link.href : null;

        // Skip if URL exists but doesn't look like a storefront
        if (url && !url.includes('/storefront/')) return;

        // Get date - it's in a sibling element (div or span after the link/strong)
        let dateRange = '';
        // Look at all children for date-like text
        const allChildren = Array.from(item.childNodes);
        for (const child of allChildren) {
          if (child === textElement) continue;
          const childText = (child.textContent || '').trim();
          // Check if it looks like a date
          if (childText.match(/\d+(st|nd|rd|th)/i) ||
              childText.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i)) {
            dateRange = childText;
            break;
          }
        }

        // Fallback: extract date from innerText by removing the link text
        if (!dateRange) {
          const fullText = item.innerText || item.textContent || '';
          const remaining = fullText.replace(text, '').trim();
          if (remaining.match(/\d+(st|nd|rd|th)/i)) {
            dateRange = remaining;
          }
        }

        // Parse county and state from text
        let county = null;
        let stateCode = null;
        let saleType = 'Tax Sale';

        // State codes we're tracking
        const stateRegex = /(PA|CA|WA|FL|TX|NV|MT|MN)/i;

        // Pattern 1: "County Name, ST Sale Type" (e.g., "Columbia County, PA Judicial Sale")
        const commaMatch = text.match(/([^,]+?)(?:\s+County)?,\s*(PA|CA|WA|FL|TX|NV|MT|MN)\s*(.*)/i);
        if (commaMatch) {
          county = commaMatch[1].trim().replace(/\s+County$/i, '');
          stateCode = commaMatch[2].toUpperCase();
          saleType = commaMatch[3].trim() || 'Tax Sale';
        } else {
          // Pattern 2: "MonroePATaxJan26" or "Monroe PA Repository" or "BerksPATaxSaleSep25"
          const noCommaMatch = text.match(/([A-Za-z]+)\s*(PA|CA|WA|FL|TX|NV|MT|MN)\s*(.*)/i);
          if (noCommaMatch) {
            county = noCommaMatch[1].trim();
            stateCode = noCommaMatch[2].toUpperCase();
            // Extract sale type from remaining text
            let remaining = noCommaMatch[3].trim();
            // Clean up patterns like "TaxSaleSep25" or "Tax" or "Repository"
            remaining = remaining.replace(/Tax(?:Sale)?(?:[A-Za-z]{3}\d{2})?/i, '').trim();
            if (remaining.toLowerCase().includes('repository')) {
              saleType = 'Repository Sale';
            } else if (remaining.toLowerCase().includes('judicial')) {
              saleType = 'Judicial Sale';
            } else if (remaining.toLowerCase().includes('upset')) {
              saleType = 'Upset Sale';
            } else if (remaining.toLowerCase().includes('foreclos')) {
              saleType = 'Tax Foreclosure';
            } else if (remaining) {
              saleType = remaining;
            } else {
              saleType = 'Tax Sale';
            }
          }
        }

        if (county && stateCode) {
          // Normalize county name - handle cases like "Berks" from "BerksPATaxSaleSep25"
          county = county.replace(/Tax.*$/i, '').trim();

          auctions.push({
            county,
            stateCode,
            saleType,
            dateRange,
            url,
            month: monthName,
            rawText: text
          });
        }
      });
    });

    return auctions;
  });
}

/**
 * Get detailed information for a specific auction
 */
async function getAuctionDetails(page, auctionUrl) {
  if (!auctionUrl) {
    return { propertyCount: null, depositAmount: null, depositDeadline: null, startDate: null, endDate: null };
  }
  await page.goto(auctionUrl, { waitUntil: 'load', timeout: 60000 });

  // Wait for page to load
  await page.waitForTimeout(3000);

  const details = {
    propertyCount: null,
    depositAmount: null,
    depositDeadline: null,
    startDate: null,
    endDate: null
  };

  // Step 1: Click on "Important Dates" to expand and get dates
  try {
    const importantDatesBtn = await page.$('button:has-text("Important Dates")');
    if (importantDatesBtn) {
      await importantDatesBtn.click();
      await page.waitForTimeout(1000);
    }
  } catch (e) {
    // Try alternative selector
    try {
      await page.click('text=Important Dates');
      await page.waitForTimeout(1000);
    } catch (e2) {
      // Ignore if can't expand
    }
  }

  // Extract dates and other info from page text
  const basicDetails = await page.evaluate(() => {
    const result = {
      propertyCount: null,
      depositAmount: null,
      depositDeadline: null,
      startDate: null,
      endDate: null
    };

    const bodyText = document.body.innerText;

    // Find start date - "Starts January 14, 2026 at 10:00 AM"
    const startsMatch = bodyText.match(/Starts\s*([A-Za-z]+\s+\d+,?\s*\d{4})/i);
    if (startsMatch) {
      result.startDate = startsMatch[1].trim();
    }

    // Find end date - "Ends January 14, 2026"
    const endsMatch = bodyText.match(/Ends\s*([A-Za-z]+\s+\d+,?\s*\d{4})/i);
    if (endsMatch) {
      result.endDate = endsMatch[1].trim();
    }

    // Find deposit deadline - "Deposit Deadline December 26, 2025 at 4:00 PM"
    const deadlineMatch = bodyText.match(/Deposit Deadline\s*([A-Za-z]+\s+\d+,?\s*\d{4})/i);
    if (deadlineMatch) {
      result.depositDeadline = deadlineMatch[1].trim();
    }

    // Find deposit amount - look for "$XXX.XX deposit" or "A single $XXX deposit"
    const depositMatch = bodyText.match(/\$([0-9,]+(?:\.\d{2})?)\s*(?:deposit|processing)/i);
    if (depositMatch) {
      result.depositAmount = parseFloat(depositMatch[1].replace(/,/g, ''));
    }

    // Also try alternative format "A single $500.00 deposit"
    if (!result.depositAmount) {
      const altDepositMatch = bodyText.match(/single\s+\$([0-9,]+(?:\.\d{2})?)/i);
      if (altDepositMatch) {
        result.depositAmount = parseFloat(altDepositMatch[1].replace(/,/g, ''));
      }
    }

    return result;
  });

  Object.assign(details, basicDetails);

  // Step 2: Click on "Auction Folders" to expand and count properties
  try {
    const auctionFoldersBtn = await page.$('button:has-text("Auction Folders")');
    if (auctionFoldersBtn) {
      await auctionFoldersBtn.click();
      await page.waitForTimeout(1500);
    }
  } catch (e) {
    // Try alternative selector
    try {
      await page.click('text=Auction Folders');
      await page.waitForTimeout(1500);
    } catch (e2) {
      // Ignore if can't expand
    }
  }

  // Step 3: Click on the first auction folder to see individual properties
  try {
    // Look for folder items with APN ranges
    const folderItem = await page.$('[cursor=pointer]:has-text("APNs"), [cursor=pointer]:has-text("Closing at")');
    if (folderItem) {
      await folderItem.click();
      await page.waitForTimeout(3000);

      // Count table rows (each row is one property/auction)
      const count = await page.evaluate(() => {
        // Count rows in the auction table (excluding header row)
        const rows = document.querySelectorAll('table tbody tr, table tr[class*="row"]');
        if (rows.length > 0) return rows.length;

        // Alternative: count by Auction ID cells
        const auctionIds = document.querySelectorAll('td:first-child');
        if (auctionIds.length > 0) return auctionIds.length;

        // Fallback: count any list items in auction folders section
        const items = document.querySelectorAll('[class*="auction"] tr, .lot-item');
        return items.length || null;
      });

      if (count) {
        details.propertyCount = count;
      }
    }
  } catch (e) {
    // Ignore errors in property count step
  }

  // Fallback: try to find property count from text patterns
  if (!details.propertyCount) {
    const textCount = await page.evaluate(() => {
      const bodyText = document.body.innerText;

      // Try to find property count - look for "Auctions (XX)" pattern
      const auctionsCountMatch = bodyText.match(/Auctions\s*\((\d+)\)/i);
      if (auctionsCountMatch) {
        return parseInt(auctionsCountMatch[1]);
      }

      // Look for "X lots" or "X properties" or "X parcels" text
      const lotsMatch = bodyText.match(/(\d+)\s+(?:lots?|properties|parcels|items|auctions)/i);
      if (lotsMatch) {
        return parseInt(lotsMatch[1]);
      }

      return null;
    });

    if (textCount) {
      details.propertyCount = textCount;
    }
  }

  return details;
}

/**
 * Compare scraped data with Supabase and record gaps
 */
async function compareAndRecordGaps(auctions) {
  if (!CONFIG.supabaseKey) {
    console.log('\nSkipping database comparison (no SUPABASE_SERVICE_KEY provided)');
    return;
  }

  console.log('\n[5/5] Comparing with database and recording gaps...');

  const headers = {
    'Content-Type': 'application/json',
    'apikey': CONFIG.supabaseKey,
    'Authorization': `Bearer ${CONFIG.supabaseKey}`
  };

  for (const auction of auctions) {
    try {
      // Get county ID
      const countyResponse = await fetch(
        `${CONFIG.supabaseUrl}/rest/v1/rpc/get_or_create_county`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            p_county_name: auction.county,
            p_state_code: auction.stateCode
          })
        }
      );

      const countyId = await countyResponse.json();

      if (countyId && auction.propertyCount) {
        // Get our property count for this county
        const propsResponse = await fetch(
          `${CONFIG.supabaseUrl}/rest/v1/properties?county_id=eq.${countyId}&select=id`,
          { headers }
        );
        const props = await propsResponse.json();
        const ourCount = props?.length || 0;

        // Record gap if there's a discrepancy
        if (auction.propertyCount > ourCount) {
          // Parse sale date from dateRange
          const dateMatch = auction.dateRange.match(/([A-Za-z]+)\s+(\d+)/);
          let saleDate = null;
          if (dateMatch) {
            const month = dateMatch[1];
            const day = dateMatch[2];
            const year = new Date().getFullYear();
            saleDate = new Date(`${month} ${day}, ${year}`).toISOString().split('T')[0];
          }

          await fetch(
            `${CONFIG.supabaseUrl}/rest/v1/rpc/record_research_gap`,
            {
              method: 'POST',
              headers,
              body: JSON.stringify({
                p_county_id: countyId,
                p_external_source: 'bid4assets',
                p_external_property_count: auction.propertyCount,
                p_our_property_count: ourCount,
                p_sale_date: saleDate,
                p_sale_type: auction.saleType.toLowerCase().includes('judicial') ? 'judicial' :
                             auction.saleType.toLowerCase().includes('upset') ? 'upset' : 'repository',
                p_external_url: auction.url
              })
            }
          );

          console.log(`   Recorded gap: ${auction.county} - B4A: ${auction.propertyCount}, Ours: ${ourCount}`);
        }
      }
    } catch (err) {
      console.error(`   Error processing ${auction.county}: ${err.message}`);
    }
  }
}

/**
 * Login to Bid4Assets (for authenticated scraping)
 */
async function login(page, email, password) {
  console.log('[0/4] Logging into Bid4Assets...');

  await page.goto(`${CONFIG.baseUrl}/myaccount/login`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(3000);

  // Use JavaScript to fill form fields directly (most reliable)
  await page.evaluate(({email, password}) => {
    // Find and fill email field
    const emailInput = document.querySelector('input[type="email"]') ||
                       document.querySelector('input[name="email"]') ||
                       document.querySelector('#email') ||
                       Array.from(document.querySelectorAll('input')).find(i =>
                         i.placeholder?.toLowerCase().includes('email') ||
                         i.id?.toLowerCase().includes('email')
                       );
    if (emailInput) {
      emailInput.value = email;
      emailInput.dispatchEvent(new Event('input', { bubbles: true }));
      emailInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Find and fill password field
    const passwordInput = document.querySelector('input[type="password"]');
    if (passwordInput) {
      passwordInput.value = password;
      passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
      passwordInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, {email, password});

  await page.waitForTimeout(500);

  // Click the submit button
  try {
    await page.click('button[type="submit"]', { timeout: 5000 });
  } catch (e) {
    try {
      await page.click('input[type="submit"]', { timeout: 5000 });
    } catch (e2) {
      // Try clicking any button with "Log" text
      await page.click('button >> text=/log/i', { timeout: 5000 });
    }
  }

  // Wait for login to complete
  await page.waitForTimeout(5000);

  // Check if login succeeded
  const loggedIn = await page.evaluate(() => {
    const text = document.body.innerText.toLowerCase();
    return text.includes('logout') ||
           text.includes('my account') ||
           document.querySelector('a[href="/myb4a"]') !== null;
  });

  if (loggedIn) {
    console.log('      Login successful.');
  } else {
    console.log('      Warning: Could not verify login status');
  }
}

// Main execution
(async () => {
  const args = process.argv.slice(2);
  const shouldLogin = args.includes('--login');

  // Override state if provided
  const stateIndex = args.indexOf('--state');
  if (stateIndex !== -1 && args[stateIndex + 1]) {
    CONFIG.targetState = args[stateIndex + 1].toUpperCase();
  }

  try {
    const results = await scrapeBid4Assets(shouldLogin);

    // Compare with database if we have credentials
    if (results.success && results.auctions.length > 0) {
      await compareAndRecordGaps(results.auctions);
    }

    // Output JSON for programmatic use
    console.log('\n--- JSON OUTPUT ---');
    console.log(JSON.stringify(results, null, 2));

    process.exit(results.success ? 0 : 1);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
})();

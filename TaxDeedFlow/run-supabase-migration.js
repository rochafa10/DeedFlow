const { chromium } = require('playwright');

async function runMigration() {
  console.log('Starting Supabase migration script...');
  console.log('A browser window will open. Please log in to Supabase when prompted.\n');

  // Launch browser in non-headless mode
  const browser = await chromium.launch({
    headless: false,
    slowMo: 200
  });

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });
  const page = await context.newPage();

  try {
    // Navigate to Supabase Dashboard - SQL Editor
    console.log('Navigating to Supabase Dashboard SQL Editor...');
    await page.goto('https://supabase.com/dashboard/project/oiiwlzobizftprqspbzt/sql/new');

    // Wait for page to load
    await page.waitForTimeout(3000);

    // Check if we need to login
    const url = page.url();
    console.log('Current URL:', url);

    if (url.includes('sign-in') || url.includes('login') || url.includes('auth')) {
      console.log('\n========================================');
      console.log('*** LOGIN REQUIRED ***');
      console.log('Please log in to Supabase in the browser window.');
      console.log('You can use GitHub, SSO, or Email/Password.');
      console.log('Waiting up to 5 MINUTES for you to complete login...');
      console.log('========================================\n');

      // Wait for navigation away from login page (5 minutes)
      try {
        await page.waitForURL('**/dashboard/project/**', { timeout: 300000 });
        console.log('\nLogin successful! Continuing with migration...\n');
        await page.waitForTimeout(2000);
      } catch (e) {
        console.log('\nLogin timeout after 5 minutes - stopping script.');
        await browser.close();
        return;
      }
    }

    // Wait for SQL Editor to be ready
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'supabase-step1-ready.png', fullPage: false });
    console.log('Screenshot: supabase-step1-ready.png - SQL Editor loaded');

    // SQL Parts to execute
    const sqlParts = [
      {
        name: 'PART 1 - Owner and Sales columns',
        sql: `ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS owner_name TEXT;
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS mailing_address TEXT;
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS mailing_city TEXT;
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS mailing_state TEXT;
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS mailing_zip TEXT;
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS last_sale_price DECIMAL(12,2);
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS last_sale_date DATE;
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS total_parcel_value DECIMAL(12,2);
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS improvement_value DECIMAL(12,2);
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS land_value DECIMAL(12,2);`
      },
      {
        name: 'PART 2 - Structure and Lot columns',
        sql: `ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS number_of_stories DECIMAL(3,1);
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS building_count INTEGER;
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS building_footprint_sqft INTEGER;
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS deed_acres DECIMAL(10,4);
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS lot_type TEXT;
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS terrain TEXT;
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS road_type TEXT;
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS land_description TEXT;
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS parcel_use_code TEXT;
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS gas_availability TEXT;
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS electric_service TEXT;`
      },
      {
        name: 'PART 3 - Geographic and School columns',
        sql: `ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS opportunity_zone BOOLEAN;
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS census_tract TEXT;
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS census_block TEXT;
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS census_blockgroup TEXT;
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS neighborhood_code TEXT;
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS school_district TEXT;
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS school_district_code TEXT;
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS district_number TEXT;
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS ward_number TEXT;
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS map_number TEXT;`
      },
      {
        name: 'PART 4 - Identifiers and PA-specific columns',
        sql: `ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS regrid_uuid TEXT;
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS alt_parcel_id TEXT;
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS control_number TEXT;
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS clean_green_land_value DECIMAL(12,2);
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS clean_green_building_value DECIMAL(12,2);
ALTER TABLE regrid_data ADD COLUMN IF NOT EXISTS clean_green_total_value DECIMAL(12,2);`
      },
      {
        name: 'PART 5 - Create Indexes',
        sql: `CREATE INDEX IF NOT EXISTS idx_regrid_data_owner_name ON regrid_data(owner_name);
CREATE INDEX IF NOT EXISTS idx_regrid_data_mailing_zip ON regrid_data(mailing_zip);
CREATE INDEX IF NOT EXISTS idx_regrid_data_last_sale_price ON regrid_data(last_sale_price);
CREATE INDEX IF NOT EXISTS idx_regrid_data_total_value ON regrid_data(total_parcel_value);
CREATE INDEX IF NOT EXISTS idx_regrid_data_school_district ON regrid_data(school_district);
CREATE INDEX IF NOT EXISTS idx_regrid_data_census_tract ON regrid_data(census_tract);
CREATE INDEX IF NOT EXISTS idx_regrid_data_opportunity_zone ON regrid_data(opportunity_zone);
CREATE INDEX IF NOT EXISTS idx_regrid_data_regrid_uuid ON regrid_data(regrid_uuid);
CREATE INDEX IF NOT EXISTS idx_regrid_data_alt_parcel_id ON regrid_data(alt_parcel_id);`
      }
    ];

    // Execute each SQL part
    for (let i = 0; i < sqlParts.length; i++) {
      const part = sqlParts[i];
      console.log(`\n--- Executing ${part.name} ---`);

      // Navigate to new SQL query if not first
      if (i > 0) {
        await page.goto('https://supabase.com/dashboard/project/oiiwlzobizftprqspbzt/sql/new');
        await page.waitForTimeout(3000);
      }

      try {
        // Wait for the code editor container
        await page.waitForSelector('[data-state="active"]', { timeout: 15000 });
        await page.waitForTimeout(1000);

        // Look for Monaco editor
        const monacoEditor = await page.locator('.monaco-editor').first();
        if (await monacoEditor.count() > 0) {
          await monacoEditor.click();
          await page.waitForTimeout(500);

          // Select all and delete
          await page.keyboard.press('Control+a');
          await page.waitForTimeout(200);
          await page.keyboard.press('Backspace');
          await page.waitForTimeout(200);

          // Type the SQL using clipboard for reliability
          await page.evaluate((sql) => {
            navigator.clipboard.writeText(sql);
          }, part.sql);
          await page.keyboard.press('Control+v');
          await page.waitForTimeout(1000);

          // Take screenshot before running
          await page.screenshot({ path: `supabase-part${i+1}-before.png`, fullPage: false });
          console.log(`Screenshot: supabase-part${i+1}-before.png`);

          // Look for and click the Run button
          // Supabase uses a green "Run" button in the SQL editor
          const runButton = page.locator('button').filter({ hasText: /^Run$/ }).first();

          if (await runButton.count() > 0) {
            await runButton.click();
            console.log('Clicked Run button');
          } else {
            // Try Ctrl+Enter as fallback
            console.log('Run button not found, trying Ctrl+Enter...');
            await page.keyboard.press('Control+Enter');
          }

          // Wait for execution
          await page.waitForTimeout(5000);

          // Take screenshot after running
          await page.screenshot({ path: `supabase-part${i+1}-after.png`, fullPage: false });
          console.log(`Screenshot: supabase-part${i+1}-after.png`);

          // Check for success/error in the results panel
          const pageContent = await page.content();
          if (pageContent.includes('Success') || pageContent.includes('success') || pageContent.includes('rows affected')) {
            console.log(`SUCCESS: ${part.name} completed`);
          } else if (pageContent.includes('error') || pageContent.includes('Error')) {
            console.log(`WARNING: Check screenshot for ${part.name} - possible error`);
          } else {
            console.log(`DONE: ${part.name} executed (check screenshot for result)`);
          }

        } else {
          console.log('Monaco editor not found, trying alternative approach...');

          // Try clicking on the textarea directly
          const textarea = await page.locator('textarea').first();
          if (await textarea.count() > 0) {
            await textarea.fill(part.sql);
            await page.keyboard.press('Control+Enter');
            await page.waitForTimeout(5000);
            await page.screenshot({ path: `supabase-part${i+1}-fallback.png`, fullPage: false });
          }
        }

      } catch (error) {
        console.error(`Error in ${part.name}:`, error.message);
        await page.screenshot({ path: `supabase-part${i+1}-error.png`, fullPage: false });
        console.log(`Error screenshot saved: supabase-part${i+1}-error.png`);
      }
    }

    console.log('\n========================================');
    console.log('=== ALL MIGRATION PARTS EXECUTED ===');
    console.log('========================================');
    console.log('\nScreenshots saved in TaxDeedFlow directory.');
    console.log('Please review the screenshots to verify success.');

    // Final screenshot
    await page.screenshot({ path: 'supabase-migration-final.png', fullPage: false });
    console.log('\nFinal screenshot: supabase-migration-final.png');

    // Keep browser open for 60 seconds for review
    console.log('\nBrowser will close in 60 seconds. Review the results...');
    await page.waitForTimeout(60000);

  } catch (error) {
    console.error('\nFATAL ERROR:', error.message);
    await page.screenshot({ path: 'supabase-fatal-error.png', fullPage: false });
    console.log('Error screenshot saved: supabase-fatal-error.png');
  } finally {
    await browser.close();
    console.log('\nBrowser closed. Migration script finished.');
  }
}

runMigration().catch(console.error);

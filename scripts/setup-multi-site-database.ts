#!/usr/bin/env tsx
/**
 * Setup database tables for multi-site scraping system
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function createScrapingSitesTable() {
  const { error } = await supabase.rpc('create_scraping_sites_table', {});
  
  if (error && !error.message.includes('already exists')) {
    console.error('Error creating scraping_sites table:', error);
    return false;
  }
  
  // Create table directly with SQL if RPC doesn't exist
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS scraping_sites (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      county VARCHAR(100) NOT NULL,
      state VARCHAR(50) NOT NULL,
      url TEXT NOT NULL,
      scraper_type VARCHAR(50) NOT NULL DEFAULT 'generic',
      selectors JSONB DEFAULT '{}',
      headers JSONB DEFAULT '{}',
      active BOOLEAN DEFAULT true,
      priority INTEGER DEFAULT 1,
      last_scraped TIMESTAMPTZ,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_scraping_sites_active ON scraping_sites(active);
    CREATE INDEX IF NOT EXISTS idx_scraping_sites_county ON scraping_sites(county);
    CREATE INDEX IF NOT EXISTS idx_scraping_sites_priority ON scraping_sites(priority);
  `;

  const { error: sqlError } = await supabase.rpc('exec_sql', { sql: createTableSQL });
  
  if (sqlError) {
    console.error('Error creating table with SQL:', sqlError);
    return false;
  }

  return true;
}

async function createSiteStatsTable() {
  const createStatsTableSQL = `
    CREATE TABLE IF NOT EXISTS site_extraction_stats (
      id SERIAL PRIMARY KEY,
      site_name VARCHAR(255) NOT NULL,
      county VARCHAR(100) NOT NULL,
      last_scraped TIMESTAMPTZ NOT NULL,
      auctions_found INTEGER DEFAULT 0,
      success BOOLEAN DEFAULT false,
      scraper_type VARCHAR(50),
      error_message TEXT,
      execution_time_ms INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_site_stats_site_name ON site_extraction_stats(site_name);
    CREATE INDEX IF NOT EXISTS idx_site_stats_county ON site_extraction_stats(county);
    CREATE INDEX IF NOT EXISTS idx_site_stats_last_scraped ON site_extraction_stats(last_scraped);
  `;

  const { error } = await supabase.rpc('exec_sql', { sql: createStatsTableSQL });
  
  if (error) {
    console.error('Error creating stats table:', error);
    return false;
  }

  return true;
}

async function insertDefaultSites() {
  const defaultSites = [
    {
      name: 'Miami-Dade Clerk Foreclosure Sales',
      county: 'Miami-Dade',
      state: 'FL',
      url: 'https://www.miamidadeclerk.gov/public-records/foreclosure-sales',
      scraper_type: 'miami_dade',
      selectors: {
        auction_container: 'table tr, .auction-item, .foreclosure-item',
        case_number: 'td:first-child, .case-number',
        sale_date: 'td:nth-child(2), .sale-date',
        address: 'td:nth-child(3), .property-address',
        value: 'td:nth-child(4), .assessed-value',
        minimum_bid: 'td:nth-child(5), .minimum-bid'
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      active: true,
      priority: 1,
      notes: 'Primary Miami-Dade foreclosure sales calendar'
    },
    {
      name: 'Broward County Tax Deed Sales',
      county: 'Broward',
      state: 'FL',
      url: 'https://www.broward.org/RecordsAndLandmarks/Pages/default.aspx',
      scraper_type: 'generic',
      selectors: {
        auction_container: '.auction, .tax-deed, table tr',
        case_number: '[class*="case"], [id*="case"]',
        sale_date: '[class*="date"], [id*="date"]',
        address: '[class*="address"], [class*="property"]'
      },
      active: true,
      priority: 2,
      notes: 'Broward County tax deed auctions'
    },
    {
      name: 'Palm Beach County Clerk Auctions',
      county: 'Palm Beach',
      state: 'FL',
      url: 'https://www.mypalmbeachclerk.com/public-records/foreclosure-sales',
      scraper_type: 'generic',
      selectors: {
        auction_container: 'table tr, .auction-listing',
        case_number: 'td:first-child, .case-number',
        sale_date: 'td:nth-child(2), .date',
        address: 'td:nth-child(3), .address'
      },
      active: true,
      priority: 3,
      notes: 'Palm Beach County foreclosure auctions'
    },
    {
      name: 'Orange County Comptroller',
      county: 'Orange',
      state: 'FL', 
      url: 'https://www.octaxcol.com/real-property-auctions/',
      scraper_type: 'generic',
      selectors: {
        auction_container: '.auction-item, table tr',
        case_number: '.parcel-number, td:first-child',
        sale_date: '.auction-date, td:nth-child(2)',
        address: '.property-address, td:nth-child(3)'
      },
      active: false,  // Start inactive for testing
      priority: 4,
      notes: 'Orange County tax deed auctions - test configuration'
    }
  ];

  log('\n📝 Inserting default site configurations...', 'cyan');

  for (const site of defaultSites) {
    const { data, error } = await supabase
      .from('scraping_sites')
      .upsert(site, { 
        onConflict: 'name',
        ignoreDuplicates: false 
      })
      .select();

    if (error) {
      log(`❌ Error inserting ${site.name}: ${error.message}`, 'red');
    } else {
      log(`✅ Configured: ${site.name} (${site.county} County)`, 'green');
    }
  }
}

async function createManagementFunctions() {
  const functionsSQL = `
    -- Function to activate/deactivate sites
    CREATE OR REPLACE FUNCTION toggle_site_status(site_name TEXT, new_status BOOLEAN)
    RETURNS VOID AS $$
    BEGIN
      UPDATE scraping_sites 
      SET active = new_status, updated_at = NOW()
      WHERE name = site_name;
    END;
    $$ LANGUAGE plpgsql;

    -- Function to update site selectors
    CREATE OR REPLACE FUNCTION update_site_selectors(site_name TEXT, new_selectors JSONB)
    RETURNS VOID AS $$
    BEGIN
      UPDATE scraping_sites 
      SET selectors = new_selectors, updated_at = NOW()
      WHERE name = site_name;
    END;
    $$ LANGUAGE plpgsql;

    -- Function to get site performance stats
    CREATE OR REPLACE FUNCTION get_site_performance_stats()
    RETURNS TABLE(
      site_name TEXT,
      county TEXT,
      total_runs INTEGER,
      successful_runs INTEGER,
      success_rate NUMERIC,
      avg_auctions_found NUMERIC,
      last_successful_run TIMESTAMPTZ
    ) AS $$
    BEGIN
      RETURN QUERY
      SELECT 
        s.site_name,
        s.county,
        COUNT(*)::INTEGER as total_runs,
        SUM(CASE WHEN s.success THEN 1 ELSE 0 END)::INTEGER as successful_runs,
        ROUND(
          (SUM(CASE WHEN s.success THEN 1 ELSE 0 END)::NUMERIC / COUNT(*)::NUMERIC) * 100, 
          2
        ) as success_rate,
        ROUND(AVG(s.auctions_found), 1) as avg_auctions_found,
        MAX(CASE WHEN s.success THEN s.last_scraped END) as last_successful_run
      FROM site_extraction_stats s
      GROUP BY s.site_name, s.county
      ORDER BY success_rate DESC, avg_auctions_found DESC;
    END;
    $$ LANGUAGE plpgsql;
  `;

  const { error } = await supabase.rpc('exec_sql', { sql: functionsSQL });
  
  if (error) {
    log(`⚠️  Warning: Could not create management functions: ${error.message}`, 'yellow');
    return false;
  }

  return true;
}

async function main() {
  log('\n🗄️  Setting up Multi-Site Scraping Database', 'bright');
  log('=' .repeat(60), 'bright');

  // Create tables
  log('\n📊 Creating database tables...', 'cyan');
  
  const sitesCreated = await createScrapingSitesTable();
  if (sitesCreated) {
    log('✅ scraping_sites table ready', 'green');
  } else {
    log('❌ Failed to create scraping_sites table', 'red');
  }

  const statsCreated = await createSiteStatsTable();
  if (statsCreated) {
    log('✅ site_extraction_stats table ready', 'green');
  } else {
    log('❌ Failed to create site_extraction_stats table', 'red');
  }

  // Insert default sites
  if (sitesCreated) {
    await insertDefaultSites();
  }

  // Create management functions
  log('\n⚙️  Creating management functions...', 'cyan');
  const functionsCreated = await createManagementFunctions();
  if (functionsCreated) {
    log('✅ Management functions created', 'green');
  }

  log('\n📋 Database Setup Complete!', 'bright');
  log('\n📊 Site Management Examples:', 'cyan');
  
  log('\n-- Activate a site', 'yellow');
  log('SELECT toggle_site_status(\'Miami-Dade Clerk Foreclosure Sales\', true);', 'blue');
  
  log('\n-- View site performance', 'yellow');  
  log('SELECT * FROM get_site_performance_stats();', 'blue');
  
  log('\n-- View configured sites', 'yellow');
  log('SELECT name, county, active, scraper_type FROM scraping_sites ORDER BY priority;', 'blue');

  log('\n🎯 Next Steps:', 'cyan');
  log('1. Deploy the multi-site workflow:', 'yellow');
  log('   npm run tsx scripts/deploy-multi-site-workflow.ts', 'blue');
  log('2. Configure credentials in n8n UI', 'yellow');
  log('3. Activate workflow and test', 'yellow');
  log('4. Add more sites via database inserts', 'yellow');

  log('\n💡 To add a new site:', 'magenta');
  log(`INSERT INTO scraping_sites (name, county, state, url, scraper_type, active)`, 'blue');
  log(`VALUES ('New County Clerk', 'SomeCounty', 'FL', 'https://example.com', 'generic', true);`, 'blue');
}

main().catch(console.error);
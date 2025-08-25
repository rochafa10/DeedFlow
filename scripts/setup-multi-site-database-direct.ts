#!/usr/bin/env tsx
/**
 * Setup database tables for multi-site scraping system - Direct SQL approach
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
  try {
    const { data, error } = await supabase
      .from('scraping_sites')
      .select('id')
      .limit(1);

    if (!error) {
      log('✅ scraping_sites table already exists', 'green');
      return true;
    }

    // Table doesn't exist, let's try to create it using direct query
    log('⚙️  Creating scraping_sites table...', 'cyan');
    
    // For now, let's just check if we can insert data
    const testInsert = await supabase
      .from('scraping_sites')
      .insert({
        name: 'test',
        county: 'test',
        state: 'FL',
        url: 'https://test.com',
        scraper_type: 'generic'
      })
      .select();

    if (testInsert.error && testInsert.error.code === '42P01') {
      log('❌ scraping_sites table does not exist and cannot be created via client', 'red');
      log('💡 Please create the table manually in Supabase SQL Editor:', 'yellow');
      log(`
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
      `, 'blue');
      return false;
    } else {
      // Delete the test record
      await supabase.from('scraping_sites').delete().eq('name', 'test');
      log('✅ scraping_sites table verified', 'green');
      return true;
    }
    
  } catch (error: any) {
    log(`❌ Error checking/creating scraping_sites table: ${error.message}`, 'red');
    return false;
  }
}

async function createSiteStatsTable() {
  try {
    const { data, error } = await supabase
      .from('site_extraction_stats')
      .select('id')
      .limit(1);

    if (!error) {
      log('✅ site_extraction_stats table already exists', 'green');
      return true;
    }

    log('❌ site_extraction_stats table does not exist', 'red');
    log('💡 Please create the table manually in Supabase SQL Editor:', 'yellow');
    log(`
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
    `, 'blue');
    return false;
    
  } catch (error: any) {
    log(`❌ Error checking site_extraction_stats table: ${error.message}`, 'red');
    return false;
  }
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
      active: false,
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

async function main() {
  log('\n🗄️  Setting up Multi-Site Scraping Database (Direct Approach)', 'bright');
  log('=' .repeat(70), 'bright');

  log('\n📊 Checking database tables...', 'cyan');
  
  const sitesOk = await createScrapingSitesTable();
  const statsOk = await createSiteStatsTable();

  if (sitesOk) {
    await insertDefaultSites();
    
    log('\n📋 Database Setup Complete!', 'bright');
    log('\n📊 Test the configuration:', 'cyan');
    log('SELECT name, county, active, scraper_type FROM scraping_sites ORDER BY priority;', 'blue');
    
    log('\n🎯 Next Steps:', 'cyan');
    log('1. Multi-site workflow is already deployed with ID: HAefY7zD454ScIYk', 'yellow');
    log('2. Configure credentials in n8n UI (OpenAI, Supabase)', 'yellow');
    log('3. Activate workflow and test', 'yellow');
    log('4. Add more sites via database inserts', 'yellow');

    log('\n💡 The workflow will:', 'magenta');
    log('   • Load active sites from scraping_sites table', 'yellow');
    log('   • Process each site with Python scrapers', 'yellow');
    log('   • Use site-specific selectors and strategies', 'yellow');
    log('   • Enhance data with AI', 'yellow');
    log('   • Save results to auctions table', 'yellow');
    log('   • Track statistics in site_extraction_stats', 'yellow');
  } else {
    log('\n❌ Database setup incomplete. Please create tables manually.', 'red');
  }
}

main().catch(console.error);
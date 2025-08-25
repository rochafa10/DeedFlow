#!/usr/bin/env tsx
/**
 * Simple Counties Insert - Just add records if they don't exist
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

// Major Florida counties with auction URLs
const majorCounties = [
  {
    name: 'Miami-Dade',
    state_code: 'FL',
    tax_collector_url: 'https://www.miamidade.gov/taxcollector/',
    auction_url: 'https://www.miamidadeclerk.gov/public-records/foreclosure-sales',
    is_active: true
  },
  {
    name: 'Broward', 
    state_code: 'FL',
    tax_collector_url: 'https://broward.org/taxcollector/pages/default.aspx',
    auction_url: 'https://broward.org/RecordsAndLandmarks/Pages/default.aspx',
    is_active: true
  },
  {
    name: 'Palm Beach',
    state_code: 'FL', 
    tax_collector_url: 'https://www.pbctax.com/',
    auction_url: 'https://www.mypalmbeachclerk.com/public-records/foreclosure-sales',
    is_active: true
  },
  {
    name: 'Orange',
    state_code: 'FL',
    tax_collector_url: 'https://www.octaxcol.com/',
    auction_url: 'https://www.octaxcol.com/real-property-auctions/',
    is_active: true
  }
];

async function insertCountiesIfNotExist() {
  log(`\n📊 Checking and inserting major Florida counties...`, 'cyan');

  let existingCount = 0;
  let insertedCount = 0;
  let errorCount = 0;

  for (const county of majorCounties) {
    try {
      // Check if county already exists
      const { data: existing } = await supabase
        .from('counties')
        .select('id, name')
        .eq('name', county.name)
        .eq('state_code', 'FL')
        .single();

      if (existing) {
        log(`⚪ ${county.name} already exists (ID: ${existing.id})`, 'blue');
        existingCount++;
      } else {
        // Insert new county
        const { data, error } = await supabase
          .from('counties')
          .insert(county)
          .select();

        if (error) {
          log(`❌ Error inserting ${county.name}: ${error.message}`, 'red');
          errorCount++;
        } else {
          log(`✅ Inserted ${county.name} with auction URL`, 'green');
          insertedCount++;
        }
      }
    } catch (error: any) {
      log(`❌ Exception with ${county.name}: ${error.message}`, 'red');
      errorCount++;
    }
  }

  return { existingCount, insertedCount, errorCount, totalCount: majorCounties.length };
}

async function showExistingCounties() {
  try {
    const { data: counties, error } = await supabase
      .from('counties')
      .select('name, state_code, auction_url, is_active')
      .eq('state_code', 'FL')
      .order('name');

    if (error) {
      log(`⚠️  Could not fetch existing counties: ${error.message}`, 'yellow');
      return;
    }

    if (counties && counties.length > 0) {
      log('\n📋 Florida counties currently in database:', 'cyan');
      counties.forEach(county => {
        const status = county.is_active ? '🟢' : '⚪';
        const url = county.auction_url ? '🔗' : '❓';
        log(`   ${status}${url} ${county.name}`, county.is_active ? 'green' : 'blue');
      });
      log(`\n📊 Total: ${counties.length} Florida counties in database`, 'blue');
    } else {
      log('\n📋 No Florida counties found in database', 'yellow');
    }
  } catch (error: any) {
    log(`❌ Error fetching counties: ${error.message}`, 'red');
  }
}

async function main() {
  log('\n🏛️  Florida Counties Database Setup', 'bright');
  log('=' .repeat(40), 'bright');

  // Show existing counties first
  await showExistingCounties();

  // Insert major counties if they don't exist
  const stats = await insertCountiesIfNotExist();
  
  log('\n📊 Operation Summary:', 'cyan');
  log(`⚪ Already existed: ${stats.existingCount}`, 'blue');
  log(`✅ Successfully inserted: ${stats.insertedCount}`, 'green');
  log(`❌ Errors: ${stats.errorCount}`, 'red');
  log(`📝 Total processed: ${stats.totalCount}`, 'blue');

  if (stats.insertedCount > 0 || stats.existingCount > 0) {
    log('\n🎯 Multi-Site Workflow Status:', 'cyan');
    log('✅ Multi-site workflow deployed (ID: HAefY7zD454ScIYk)', 'green');
    log('✅ Counties table populated with active counties', 'green');
    log('🔄 Next: Configure n8n workflow credentials', 'yellow');
    
    log('\n💡 To complete setup:', 'magenta');
    log('1. Open n8n UI: http://localhost:5678', 'yellow');
    log('2. Configure Supabase credentials in workflow', 'yellow');
    log('3. Configure OpenAI credentials for data enhancement', 'yellow');
    log('4. Activate the Multi-Site Tax Deed Scraper workflow', 'yellow');
    log('5. Test with manual execution', 'yellow');

    log('\n🔗 Major counties configured for scraping:', 'green');
    majorCounties.forEach(county => {
      log(`   • ${county.name}: ${county.auction_url}`, 'yellow');
    });
  }

  // Show final state
  await showExistingCounties();
}

main().catch(console.error);
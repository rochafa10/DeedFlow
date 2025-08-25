#!/usr/bin/env tsx
/**
 * Add Major US Counties - Simple version using existing schema
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

// Major counties with tax deed activity (using existing schema)
const majorCounties = [
  // Texas - Strong tax deed state
  {
    name: 'Harris',
    state_code: 'TX',
    tax_collector_url: 'https://hctax.net/',
    auction_url: 'https://tax.hctx.net/taxsale/',
    is_active: true
  },
  {
    name: 'Dallas', 
    state_code: 'TX',
    tax_collector_url: 'https://www.dallascounty.org/departments/tax/',
    auction_url: 'https://www.dallascounty.org/departments/tax/tax-sales.php',
    is_active: true
  },
  {
    name: 'Tarrant',
    state_code: 'TX',
    tax_collector_url: 'https://www.tarrantcounty.com/en/tax-assessor-collector.html',
    auction_url: 'https://www.tarrantcounty.com/en/tax-assessor-collector/foreclosure-sales.html',
    is_active: true
  },
  
  // California - Major market
  {
    name: 'Los Angeles',
    state_code: 'CA', 
    tax_collector_url: 'https://ttc.lacounty.gov/',
    auction_url: 'https://ttc.lacounty.gov/delinquent-property-tax/',
    is_active: true
  },
  {
    name: 'San Diego',
    state_code: 'CA',
    tax_collector_url: 'https://www.sdttc.com/',
    auction_url: 'https://www.sdttc.com/content/dttc/en/auctions.html',
    is_active: true
  },
  
  // Arizona - Tax deed friendly
  {
    name: 'Maricopa',
    state_code: 'AZ',
    tax_collector_url: 'https://treasurer.maricopa.gov/',
    auction_url: 'https://treasurer.maricopa.gov/Auctions',
    is_active: true
  },
  
  // Georgia - Strong tax deed market
  {
    name: 'Fulton',
    state_code: 'GA',
    tax_collector_url: 'https://www.fultoncountyga.gov/services/taxes-and-revenue',
    auction_url: 'https://www.fultoncountyga.gov/services/taxes-and-revenue/tax-commissioner/tax-sales',
    is_active: true
  },
  {
    name: 'DeKalb',
    state_code: 'GA',
    tax_collector_url: 'https://www.dekalbcountyga.gov/tax-commissioner',
    auction_url: 'https://www.dekalbcountyga.gov/tax-commissioner/tax-sales',
    is_active: true
  },
  
  // North Carolina
  {
    name: 'Mecklenburg',
    state_code: 'NC',
    tax_collector_url: 'https://www.mecktax.com/',
    auction_url: 'https://www.mecktax.com/foreclosure-sales',
    is_active: true
  },
  
  // Additional major counties (inactive initially)
  {
    name: 'Cook',
    state_code: 'IL',
    tax_collector_url: 'https://www.cookcountygov.com/service/property-tax-information',
    auction_url: 'https://www.cookcountyclerk.com/agency/judicial-sales',
    is_active: false // Research needed
  }
];

async function addMajorCounties() {
  log('\n🇺🇸 Adding Major US Counties for Tax Deed Scraping', 'bright');
  log('=' .repeat(60), 'bright');
  
  let insertedCount = 0;
  let existingCount = 0;
  let errorCount = 0;
  
  for (const county of majorCounties) {
    try {
      // Check if exists
      const { data: existing } = await supabase
        .from('counties')
        .select('id, name, state_code')
        .eq('name', county.name)
        .eq('state_code', county.state_code)
        .single();
      
      if (existing) {
        log(`⚪ ${county.state_code}-${county.name} already exists`, 'blue');
        existingCount++;
      } else {
        const { data, error } = await supabase
          .from('counties')
          .insert(county)
          .select();
        
        if (error) {
          log(`❌ Error adding ${county.state_code}-${county.name}: ${error.message}`, 'red');
          errorCount++;
        } else {
          const status = county.is_active ? '🟢' : '⚪';
          log(`${status} Added ${county.state_code}-${county.name}`, 'green');
          insertedCount++;
        }
      }
    } catch (error: any) {
      log(`❌ Exception with ${county.state_code}-${county.name}: ${error.message}`, 'red');
      errorCount++;
    }
  }
  
  return { insertedCount, existingCount, errorCount, totalCount: majorCounties.length };
}

async function showCountysByState() {
  try {
    const { data: counties, error } = await supabase
      .from('counties')
      .select('name, state_code, is_active, auction_url')
      .order('state_code')
      .order('name');
    
    if (error) {
      log(`❌ Error fetching counties: ${error.message}`, 'red');
      return;
    }
    
    if (!counties || counties.length === 0) {
      log('\n📋 No counties found in database', 'yellow');
      return;
    }
    
    // Group by state
    const byState = counties.reduce((acc: any, county) => {
      if (!acc[county.state_code]) acc[county.state_code] = [];
      acc[county.state_code].push(county);
      return acc;
    }, {});
    
    log('\n📊 Counties by State:', 'cyan');
    Object.entries(byState).forEach(([state, stateCounties]: [string, any]) => {
      const active = stateCounties.filter((c: any) => c.is_active).length;
      log(`\n🏛️  ${state} (${stateCounties.length} total, ${active} active):`, 'yellow');
      
      stateCounties.forEach((county: any) => {
        const status = county.is_active ? '🟢' : '⚪';
        const url = county.auction_url ? '🔗' : '❓';
        log(`   ${status}${url} ${county.name}`, county.is_active ? 'green' : 'blue');
      });
    });
    
    const totalCounties = counties.length;
    const activeCounties = counties.filter(c => c.is_active).length;
    log(`\n📈 Summary: ${totalCounties} counties total, ${activeCounties} active`, 'green');
    
  } catch (error: any) {
    log(`❌ Error fetching counties: ${error.message}`, 'red');
  }
}

async function main() {
  // Add major counties
  const stats = await addMajorCounties();
  
  log('\n📊 Addition Summary:', 'cyan');
  log(`✅ Successfully added: ${stats.insertedCount}`, 'green');
  log(`⚪ Already existed: ${stats.existingCount}`, 'blue');
  log(`❌ Errors: ${stats.errorCount}`, 'red');
  log(`📝 Total processed: ${stats.totalCount}`, 'blue');
  
  // Show current state
  await showCountysByState();
  
  if (stats.insertedCount > 0 || stats.existingCount > 0) {
    log('\n🎯 Future County Expansion Strategy:', 'cyan');
    
    log('\n1️⃣ **Priority States for Tax Deeds**:', 'magenta');
    log('   🟢 Active: FL, TX, CA, AZ, GA, NC', 'green');
    log('   🔄 Research: MI, OH, PA, IL, TN, AL, SC, IN', 'yellow');
    
    log('\n2️⃣ **Scaling Methods**:', 'magenta');
    log('   • Research county websites manually', 'yellow');
    log('   • Web scraping for URL discovery', 'yellow');
    log('   • CSV bulk imports (template available)', 'yellow');
    log('   • API integrations where available', 'yellow');
    
    log('\n3️⃣ **Next Steps**:', 'magenta');
    log(`   • ${stats.insertedCount + stats.existingCount} counties ready for testing`, 'yellow');
    log('   • Configure multi-site workflow credentials', 'yellow');
    log('   • Test scraping across multiple states', 'yellow');
    log('   • Gradually activate more counties', 'yellow');
  }
}

main().catch(console.error);
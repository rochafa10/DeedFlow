#!/usr/bin/env tsx
/**
 * Update Counties Table with Florida Counties Data
 * Simple direct Supabase approach
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

// Complete list of Florida counties
const floridaCounties = [
  'Alachua', 'Baker', 'Bay', 'Bradford', 'Brevard', 'Broward', 'Calhoun',
  'Charlotte', 'Citrus', 'Clay', 'Collier', 'Columbia', 'DeSoto', 'Dixie',
  'Duval', 'Escambia', 'Flagler', 'Franklin', 'Gadsden', 'Gilchrist',
  'Glades', 'Gulf', 'Hamilton', 'Hardee', 'Hendry', 'Hernando', 'Highlands',
  'Hillsborough', 'Holmes', 'Indian River', 'Jackson', 'Jefferson', 'Lafayette',
  'Lake', 'Lee', 'Leon', 'Levy', 'Liberty', 'Madison', 'Manatee', 'Marion',
  'Martin', 'Miami-Dade', 'Monroe', 'Nassau', 'Okaloosa', 'Okeechobee',
  'Orange', 'Osceola', 'Palm Beach', 'Pasco', 'Pinellas', 'Polk', 'Putnam',
  'Santa Rosa', 'Sarasota', 'Seminole', 'St. Johns', 'St. Lucie', 'Sumter',
  'Suwannee', 'Taylor', 'Union', 'Volusia', 'Wakulla', 'Walton', 'Washington'
];

async function ensureCountiesTableExists() {
  try {
    // Test if counties table exists by trying a select
    const { data, error } = await supabase
      .from('counties')
      .select('id')
      .limit(1);

    if (error && error.code === '42P01') {
      log('❌ Counties table does not exist', 'red');
      log('💡 Please create the table in Supabase SQL Editor:', 'yellow');
      log(`
CREATE TABLE IF NOT EXISTS counties (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  state VARCHAR(50) NOT NULL DEFAULT 'FL',
  active BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 5,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_counties_active ON counties(active);
CREATE INDEX IF NOT EXISTS idx_counties_state ON counties(state);
CREATE INDEX IF NOT EXISTS idx_counties_priority ON counties(priority);
      `, 'blue');
      return false;
    }

    log('✅ Counties table exists', 'green');
    return true;
  } catch (error: any) {
    log(`❌ Error checking counties table: ${error.message}`, 'red');
    return false;
  }
}

async function updateCountiesData() {
  const countiesData = floridaCounties.map(county => ({
    name: county,
    state: 'FL',
    // Set priority based on major counties
    active: ['Miami-Dade', 'Broward', 'Palm Beach', 'Orange', 'Hillsborough', 'Pinellas', 'Duval'].includes(county),
    priority: getPriorityForCounty(county),
    notes: `${county} County, Florida`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));

  log(`\n📊 Processing ${countiesData.length} Florida counties...`, 'cyan');

  let successCount = 0;
  let errorCount = 0;

  for (const county of countiesData) {
    try {
      const { data, error } = await supabase
        .from('counties')
        .upsert(county, { 
          onConflict: 'name',
          ignoreDuplicates: false 
        })
        .select();

      if (error) {
        log(`❌ Error updating ${county.name}: ${error.message}`, 'red');
        errorCount++;
      } else {
        log(`${county.active ? '🟢' : '⚪'} ${county.name} (Priority: ${county.priority})`, 
            county.active ? 'green' : 'blue');
        successCount++;
      }
    } catch (error: any) {
      log(`❌ Exception updating ${county.name}: ${error.message}`, 'red');
      errorCount++;
    }
  }

  return { successCount, errorCount, totalCount: countiesData.length };
}

function getPriorityForCounty(county: string): number {
  // Major metropolitan areas get highest priority
  if (county === 'Miami-Dade') return 1;
  if (['Broward', 'Palm Beach'].includes(county)) return 2;
  if (['Orange', 'Hillsborough', 'Pinellas', 'Duval'].includes(county)) return 3;
  // Medium-sized counties
  if (['Lee', 'Polk', 'Volusia', 'Brevard', 'Pasco', 'Seminole', 'Manatee', 'Sarasota', 'Lake', 'Marion'].includes(county)) return 4;
  // All other counties
  return 5;
}

async function logUpdate(stats: { successCount: number; errorCount: number; totalCount: number }) {
  try {
    const { error } = await supabase
      .from('extraction_logs')
      .insert({
        workflow_name: 'Counties Table Update',
        county: 'Florida',
        records_processed: stats.successCount,
        confidence_score: 1.0,
        strategy: 'direct_supabase_update',
        created_at: new Date().toISOString()
      });

    if (error) {
      log(`⚠️  Could not log update: ${error.message}`, 'yellow');
    } else {
      log('✅ Update logged successfully', 'green');
    }
  } catch (error: any) {
    log(`⚠️  Could not log update: ${error.message}`, 'yellow');
  }
}

async function main() {
  log('\n🏛️  Updating Florida Counties Table', 'bright');
  log('=' .repeat(50), 'bright');

  // Check if counties table exists
  const tableExists = await ensureCountiesTableExists();
  
  if (!tableExists) {
    log('\n❌ Counties table setup incomplete. Please create the table manually.', 'red');
    return;
  }

  // Update counties data
  const stats = await updateCountiesData();
  
  // Log the update
  await logUpdate(stats);

  log('\n📊 Update Summary:', 'cyan');
  log(`✅ Successful: ${stats.successCount}`, 'green');
  log(`❌ Errors: ${stats.errorCount}`, 'red');
  log(`📝 Total: ${stats.totalCount}`, 'blue');

  if (stats.successCount > 0) {
    log('\n🎯 Counties by Priority:', 'cyan');
    log('   Priority 1: Miami-Dade (Major metro)', 'yellow');
    log('   Priority 2: Broward, Palm Beach (Major metros)', 'yellow');
    log('   Priority 3: Orange, Hillsborough, Pinellas, Duval (Large cities)', 'yellow');
    log('   Priority 4: Medium-sized counties (10 counties)', 'yellow');
    log('   Priority 5: All other counties', 'yellow');

    log('\n💡 Active Counties (enabled for scraping):', 'magenta');
    const activeCounties = floridaCounties.filter(county => 
      ['Miami-Dade', 'Broward', 'Palm Beach', 'Orange', 'Hillsborough', 'Pinellas', 'Duval'].includes(county)
    );
    activeCounties.forEach(county => log(`   🟢 ${county}`, 'green'));

    log('\n🔄 Next Steps:', 'cyan');
    log('1. Update multi-site scraper to use counties table', 'yellow');
    log('2. Configure site URLs for active counties', 'yellow');
    log('3. Test scraping workflows with priority counties', 'yellow');
  }
}

main().catch(console.error);
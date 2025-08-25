#!/usr/bin/env tsx
/**
 * Simple Counties Update - Just insert/update name and state columns
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

// Florida counties
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

async function checkCountiesTableSchema() {
  try {
    // Try to get existing data to understand the schema
    const { data, error } = await supabase
      .from('counties')
      .select('*')
      .limit(1);

    if (error) {
      log(`❌ Error checking schema: ${error.message}`, 'red');
      return null;
    }

    if (data && data.length > 0) {
      log(`✅ Counties table schema:`, 'green');
      Object.keys(data[0]).forEach(column => {
        log(`   • ${column}`, 'blue');
      });
      return Object.keys(data[0]);
    } else {
      log('ℹ️  Counties table is empty', 'yellow');
      return [];
    }
  } catch (error: any) {
    log(`❌ Error checking schema: ${error.message}`, 'red');
    return null;
  }
}

async function insertBasicCounties() {
  const countiesData = floridaCounties.map(county => ({
    name: county,
    state: 'FL'
  }));

  log(`\n📊 Inserting ${countiesData.length} Florida counties (basic fields only)...`, 'cyan');

  let successCount = 0;
  let errorCount = 0;

  for (const county of countiesData) {
    try {
      const { data, error } = await supabase
        .from('counties')
        .upsert(county, { 
          onConflict: 'name',
          ignoreDuplicates: true
        })
        .select();

      if (error) {
        log(`❌ Error inserting ${county.name}: ${error.message}`, 'red');
        errorCount++;
      } else {
        log(`✅ ${county.name}, FL`, 'green');
        successCount++;
      }
    } catch (error: any) {
      log(`❌ Exception inserting ${county.name}: ${error.message}`, 'red');
      errorCount++;
    }
  }

  return { successCount, errorCount, totalCount: countiesData.length };
}

async function main() {
  log('\n🏛️  Simple Florida Counties Update', 'bright');
  log('=' .repeat(40), 'bright');

  // Check current schema
  const schema = await checkCountiesTableSchema();
  
  if (schema === null) {
    log('\n❌ Could not access counties table', 'red');
    return;
  }

  // Insert basic county data
  const stats = await insertBasicCounties();
  
  log('\n📊 Update Summary:', 'cyan');
  log(`✅ Successful: ${stats.successCount}`, 'green');
  log(`❌ Errors: ${stats.errorCount}`, 'red');
  log(`📝 Total: ${stats.totalCount}`, 'blue');

  if (stats.successCount > 0) {
    log('\n💡 Major Florida counties now in database:', 'magenta');
    const majorCounties = ['Miami-Dade', 'Broward', 'Palm Beach', 'Orange', 'Hillsborough', 'Pinellas', 'Duval'];
    majorCounties.forEach(county => log(`   🏙️  ${county}`, 'yellow'));
    
    log('\n🔄 Next Steps:', 'cyan');
    log('1. Multi-site workflow can now query counties table', 'yellow');
    log('2. Add website URLs for each county as needed', 'yellow');
    log('3. Configure scraper settings per county', 'yellow');
  }
}

main().catch(console.error);
#!/usr/bin/env tsx
/**
 * Bulk County Management System
 * Scalable approach for adding 3000+ US counties
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { readFileSync, writeFileSync } from 'fs';

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

// Sample of major US counties by state with population data
const majorCountiesByState = {
  'FL': [
    { name: 'Miami-Dade', population: 2716940 },
    { name: 'Broward', population: 1944375 },
    { name: 'Palm Beach', population: 1492191 },
    { name: 'Hillsborough', population: 1459762 },
    { name: 'Orange', population: 1429908 },
    { name: 'Pinellas', population: 959107 },
    { name: 'Duval', population: 995567 }
  ],
  'CA': [
    { name: 'Los Angeles', population: 9829544 },
    { name: 'San Diego', population: 3286069 },
    { name: 'Orange', population: 3167809 },
    { name: 'Riverside', population: 2458395 },
    { name: 'San Bernardino', population: 2140096 },
    { name: 'Santa Clara', population: 1885508 },
    { name: 'Alameda', population: 1643700 }
  ],
  'TX': [
    { name: 'Harris', population: 4713325 },
    { name: 'Dallas', population: 2613539 },
    { name: 'Tarrant', population: 2110640 },
    { name: 'Bexar', population: 2009324 },
    { name: 'Travis', population: 1290188 },
    { name: 'Collin', population: 1056945 },
    { name: 'Fort Bend', population: 822779 }
  ],
  'NY': [
    { name: 'Kings', population: 2736074 },
    { name: 'Queens', population: 2405464 },
    { name: 'New York', population: 1694263 },
    { name: 'Suffolk', population: 1481093 },
    { name: 'Bronx', population: 1472654 },
    { name: 'Nassau', population: 1395774 },
    { name: 'Westchester', population: 1004457 }
  ]
};

// Tax deed/foreclosure friendly states (states with significant tax deed activity)
const taxDeedStates = [
  'FL', 'TX', 'CA', 'GA', 'AZ', 'NC', 'MI', 'OH', 'PA', 'IL',
  'TN', 'AL', 'SC', 'IN', 'KY', 'MO', 'WI', 'IA', 'MS', 'AR'
];

async function addCountiesByState(stateCode: string, counties: any[], priority: number = 3) {
  log(`\n📊 Adding ${counties.length} counties for ${stateCode}...`, 'cyan');
  
  let insertedCount = 0;
  let existingCount = 0;
  let errorCount = 0;

  for (const countyData of counties) {
    try {
      const county = {
        name: countyData.name,
        state_code: stateCode,
        tax_collector_url: null,
        auction_url: null,
        is_active: false, // Start inactive until URLs are configured
        population: countyData.population || null,
        priority: getPriorityByPopulation(countyData.population || 0)
      };

      // Check if exists first
      const { data: existing } = await supabase
        .from('counties')
        .select('id')
        .eq('name', county.name)
        .eq('state_code', stateCode)
        .single();

      if (existing) {
        log(`⚪ ${stateCode}-${county.name} already exists`, 'blue');
        existingCount++;
      } else {
        const { data, error } = await supabase
          .from('counties')
          .insert(county)
          .select();

        if (error) {
          log(`❌ Error inserting ${stateCode}-${county.name}: ${error.message}`, 'red');
          errorCount++;
        } else {
          log(`✅ Added ${stateCode}-${county.name} (Pop: ${county.population?.toLocaleString()})`, 'green');
          insertedCount++;
        }
      }
    } catch (error: any) {
      log(`❌ Exception with ${stateCode}-${countyData.name}: ${error.message}`, 'red');
      errorCount++;
    }
  }

  return { insertedCount, existingCount, errorCount };
}

function getPriorityByPopulation(population: number): number {
  if (population > 2000000) return 1; // Major metros (2M+)
  if (population > 1000000) return 2; // Large metros (1M-2M)
  if (population > 500000) return 3;  // Medium metros (500K-1M)
  if (population > 100000) return 4;  // Small metros (100K-500K)
  return 5; // Rural/small counties (<100K)
}

async function addMajorUSCounties() {
  log('\n🇺🇸 Adding Major US Counties by State', 'bright');
  log('=' .repeat(50), 'bright');

  let totalStats = { insertedCount: 0, existingCount: 0, errorCount: 0 };

  for (const [stateCode, counties] of Object.entries(majorCountiesByState)) {
    const stats = await addCountiesByState(stateCode, counties);
    totalStats.insertedCount += stats.insertedCount;
    totalStats.existingCount += stats.existingCount;
    totalStats.errorCount += stats.errorCount;
  }

  return totalStats;
}

async function generateCountyTemplate(stateCode: string) {
  // Generate a CSV template for bulk county addition
  const csvContent = `name,state_code,population,tax_collector_url,auction_url,notes
"Example County","${stateCode}",50000,"https://example-county.gov/taxes","https://example-county.gov/auctions","Add real URLs here"
"Another County","${stateCode}",75000,"","","URLs to be researched"`;

  const filename = `counties_template_${stateCode}.csv`;
  writeFileSync(filename, csvContent);
  
  log(`📝 Generated template: ${filename}`, 'yellow');
  log('   • Edit this file with real county data', 'blue');
  log('   • Run: npm run tsx scripts/import-counties-csv.ts', 'blue');
}

async function showCountyStats() {
  try {
    const { data: stats, error } = await supabase
      .from('counties')
      .select('state_code, is_active')
      .order('state_code');

    if (error) {
      log(`❌ Error fetching stats: ${error.message}`, 'red');
      return;
    }

    const stateStats = stats.reduce((acc: any, county) => {
      const state = county.state_code;
      if (!acc[state]) acc[state] = { total: 0, active: 0 };
      acc[state].total++;
      if (county.is_active) acc[state].active++;
      return acc;
    }, {});

    log('\n📊 County Statistics by State:', 'cyan');
    Object.entries(stateStats).forEach(([state, data]: [string, any]) => {
      log(`   ${state}: ${data.total} total, ${data.active} active`, 'blue');
    });

    const totalCounties = stats.length;
    const activeCounties = stats.filter(c => c.is_active).length;
    log(`\n🎯 Overall: ${totalCounties} counties, ${activeCounties} active`, 'green');
  } catch (error: any) {
    log(`❌ Error getting stats: ${error.message}`, 'red');
  }
}

async function main() {
  const command = process.argv[2];

  switch (command) {
    case 'add-major':
      const stats = await addMajorUSCounties();
      log('\n📊 Bulk Addition Summary:', 'cyan');
      log(`✅ Inserted: ${stats.insertedCount}`, 'green');
      log(`⚪ Already existed: ${stats.existingCount}`, 'blue');
      log(`❌ Errors: ${stats.errorCount}`, 'red');
      break;

    case 'template':
      const stateCode = process.argv[3] || 'TX';
      await generateCountyTemplate(stateCode);
      break;

    case 'stats':
      await showCountyStats();
      break;

    default:
      log('\n🏛️  County Management System', 'bright');
      log('=' .repeat(40), 'bright');
      
      log('\n📋 Available Commands:', 'cyan');
      log('• npm run tsx scripts/add-counties-bulk.ts add-major', 'yellow');
      log('  └─ Add major counties for FL, CA, TX, NY', 'blue');
      
      log('• npm run tsx scripts/add-counties-bulk.ts template [STATE]', 'yellow');
      log('  └─ Generate CSV template for bulk import', 'blue');
      
      log('• npm run tsx scripts/add-counties-bulk.ts stats', 'yellow');
      log('  └─ Show current county statistics', 'blue');

      log('\n🎯 Scaling Strategies for 3000+ Counties:', 'cyan');
      
      log('\n1️⃣ **Prioritized Rollout**:', 'magenta');
      log('   • Start with tax deed friendly states', 'yellow');
      log('   • Focus on high-population counties first', 'yellow');
      log('   • Add rural counties as demand grows', 'yellow');

      log('\n2️⃣ **Data Sources for URLs**:', 'magenta');
      log('   • Web scraping county government sites', 'yellow');
      log('   • Public records APIs where available', 'yellow');
      log('   • Manual research for high-priority counties', 'yellow');
      log('   • Crowdsourced data collection', 'yellow');

      log('\n3️⃣ **Automation Approaches**:', 'magenta');
      log('   • CSV bulk imports with validation', 'yellow');
      log('   • API integrations with county data providers', 'yellow');
      log('   • Workflow automation for URL discovery', 'yellow');
      log('   • Regular updates and validation checks', 'yellow');

      log('\n4️⃣ **Management Features Needed**:', 'magenta');
      log('   • County activation/deactivation controls', 'yellow');
      log('   • URL validation and health checks', 'yellow');
      log('   • Priority-based processing queues', 'yellow');
      log('   • Performance metrics per county', 'yellow');

      await showCountyStats();
      break;
  }
}

main().catch(console.error);
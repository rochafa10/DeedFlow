#!/usr/bin/env tsx
/**
 * Import Counties from CSV - For bulk data management
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';

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

function parseCSV(content: string) {
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
  
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.replace(/"/g, '').trim());
    const row: any = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index] || null;
    });
    
    return row;
  });
}

function validateCountyData(county: any): string[] {
  const errors: string[] = [];
  
  if (!county.name) errors.push('County name is required');
  if (!county.state_code) errors.push('State code is required');
  if (county.state_code && county.state_code.length !== 2) {
    errors.push('State code must be 2 characters');
  }
  
  // URL validation
  if (county.tax_collector_url && !county.tax_collector_url.startsWith('http')) {
    errors.push('Tax collector URL must start with http/https');
  }
  if (county.auction_url && !county.auction_url.startsWith('http')) {
    errors.push('Auction URL must start with http/https');
  }
  
  return errors;
}

async function importCountiesFromCSV(filename: string) {
  try {
    log(`\n📂 Reading CSV file: ${filename}`, 'cyan');
    
    const content = readFileSync(filename, 'utf8');
    const counties = parseCSV(content);
    
    log(`📊 Found ${counties.length} counties to process`, 'blue');
    
    let importedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < counties.length; i++) {
      const county = counties[i];
      
      // Validate data
      const validationErrors = validateCountyData(county);
      if (validationErrors.length > 0) {
        log(`❌ Row ${i + 2}: ${validationErrors.join(', ')}`, 'red');
        errorCount++;
        continue;
      }
      
      // Prepare county object
      const countyData = {
        name: county.name,
        state_code: county.state_code.toUpperCase(),
        tax_collector_url: county.tax_collector_url || null,
        auction_url: county.auction_url || null,
        is_active: !!county.auction_url, // Active if has auction URL
        population: county.population ? parseInt(county.population) : null,
        notes: county.notes || null
      };
      
      try {
        // Check if county already exists
        const { data: existing } = await supabase
          .from('counties')
          .select('id')
          .eq('name', countyData.name)
          .eq('state_code', countyData.state_code)
          .single();
        
        if (existing) {
          log(`⚪ ${countyData.state_code}-${countyData.name} already exists`, 'blue');
          skippedCount++;
        } else {
          const { data, error } = await supabase
            .from('counties')
            .insert(countyData)
            .select();
          
          if (error) {
            log(`❌ Error importing ${countyData.state_code}-${countyData.name}: ${error.message}`, 'red');
            errorCount++;
          } else {
            const activeStatus = countyData.is_active ? '🟢' : '⚪';
            log(`${activeStatus} Imported ${countyData.state_code}-${countyData.name}`, 'green');
            importedCount++;
          }
        }
      } catch (error: any) {
        log(`❌ Exception importing ${countyData.state_code}-${countyData.name}: ${error.message}`, 'red');
        errorCount++;
      }
    }
    
    log('\n📊 CSV Import Summary:', 'cyan');
    log(`✅ Imported: ${importedCount}`, 'green');
    log(`⚪ Skipped (already exist): ${skippedCount}`, 'blue');
    log(`❌ Errors: ${errorCount}`, 'red');
    log(`📝 Total processed: ${counties.length}`, 'blue');
    
  } catch (error: any) {
    log(`❌ Error reading CSV file: ${error.message}`, 'red');
  }
}

async function createSampleCSV() {
  const sampleData = `name,state_code,population,tax_collector_url,auction_url,notes
"Cook","IL",5275541,"https://www.cookcountygov.com/service/property-tax-information","https://www.cookcountyclerk.com/agency/judicial-sales","Chicago metro area"
"Maricopa","AZ",4485414,"https://treasurer.maricopa.gov/","https://treasurer.maricopa.gov/Auctions","Phoenix metro area"
"Harris","TX",4713325,"https://hctax.net/","https://tax.hctx.net/taxsale/","Houston metro area"
"San Diego","CA",3286069,"https://www.sdttc.com/","https://www.sdttc.com/content/dttc/en/auctions.html","San Diego metro"
"Dallas","TX",2613539,"https://www.dallascounty.org/departments/tax/","https://www.dallascounty.org/departments/tax/tax-sales.php","Dallas metro area"`;
  
  const filename = 'sample_counties_import.csv';
  require('fs').writeFileSync(filename, sampleData);
  
  log(`📝 Created sample CSV: ${filename}`, 'green');
  log('\n💡 CSV Format Requirements:', 'cyan');
  log('• name: County name (without "County" suffix)', 'blue');
  log('• state_code: 2-letter state code (e.g., TX, CA, FL)', 'blue');
  log('• population: Optional population number', 'blue');
  log('• tax_collector_url: County tax collector website', 'blue');
  log('• auction_url: Tax deed/foreclosure auction site', 'blue');
  log('• notes: Optional description', 'blue');
  
  log('\n🎯 Usage:', 'yellow');
  log(`1. Edit ${filename} with your county data`, 'blue');
  log('2. Run: npm run tsx scripts/import-counties-csv.ts import sample_counties_import.csv', 'blue');
}

async function main() {
  const command = process.argv[2];
  const filename = process.argv[3];
  
  if (command === 'import' && filename) {
    await importCountiesFromCSV(filename);
  } else if (command === 'sample') {
    await createSampleCSV();
  } else {
    log('\n📄 CSV County Import System', 'bright');
    log('=' .repeat(40), 'bright');
    
    log('\n📋 Commands:', 'cyan');
    log('• npm run tsx scripts/import-counties-csv.ts sample', 'yellow');
    log('  └─ Create sample CSV template', 'blue');
    
    log('• npm run tsx scripts/import-counties-csv.ts import <filename.csv>', 'yellow');
    log('  └─ Import counties from CSV file', 'blue');
    
    log('\n💡 Example Workflow:', 'magenta');
    log('1. Create template: npm run tsx scripts/import-counties-csv.ts sample', 'yellow');
    log('2. Edit sample_counties_import.csv with real data', 'yellow');
    log('3. Import: npm run tsx scripts/import-counties-csv.ts import sample_counties_import.csv', 'yellow');
  }
}

main().catch(console.error);
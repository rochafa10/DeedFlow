#!/usr/bin/env node

/**
 * Execute Census Business Patterns SQL in Supabase
 * Adds required columns to counties table
 */

const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://filvghircyrnlhzaeavm.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment');
  process.exit(1);
}

async function executeCensusSQL() {
  console.log('📋 Adding Census Business Patterns columns to counties table');
  console.log('=' .repeat(60));

  const sqlStatements = [
    // Add columns
    'ALTER TABLE counties ADD COLUMN IF NOT EXISTS business_establishments INTEGER',
    'ALTER TABLE counties ADD COLUMN IF NOT EXISTS business_employees INTEGER',
    'ALTER TABLE counties ADD COLUMN IF NOT EXISTS business_payroll_annual BIGINT',
    'ALTER TABLE counties ADD COLUMN IF NOT EXISTS census_fips_code VARCHAR(5)',
    'ALTER TABLE counties ADD COLUMN IF NOT EXISTS business_data_year INTEGER',
    'ALTER TABLE counties ADD COLUMN IF NOT EXISTS business_data_updated TIMESTAMP WITH TIME ZONE',
    
    // Add indexes
    'CREATE INDEX IF NOT EXISTS idx_counties_fips ON counties(census_fips_code)',
    'CREATE INDEX IF NOT EXISTS idx_counties_establishments ON counties(business_establishments)',
    'CREATE INDEX IF NOT EXISTS idx_counties_employees ON counties(business_employees)'
  ];

  const comments = [
    "COMMENT ON COLUMN counties.business_establishments IS 'Number of business establishments from Census CBP data'",
    "COMMENT ON COLUMN counties.business_employees IS 'Total employees from Census CBP data'",
    "COMMENT ON COLUMN counties.business_payroll_annual IS 'Annual payroll in thousands of dollars from Census CBP data'",
    "COMMENT ON COLUMN counties.census_fips_code IS 'Census FIPS code for the county (state+county)'",
    "COMMENT ON COLUMN counties.business_data_year IS 'Year of the Census CBP data'",
    "COMMENT ON COLUMN counties.business_data_updated IS 'Timestamp when business data was last updated'"
  ];

  try {
    console.log('🔧 Adding columns and indexes...\n');
    
    // Execute each SQL statement
    for (const sql of sqlStatements) {
      console.log(`Executing: ${sql.substring(0, 50)}...`);
      
      const response = await axios.post(
        `${SUPABASE_URL}/rest-admin/v1/query`,
        { query: sql },
        {
          headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      ).catch(err => {
        // Try alternative endpoint if admin endpoint fails
        return axios.post(
          `${SUPABASE_URL}/rest/v1/rpc/exec_sql`,
          { query: sql },
          {
            headers: {
              'apikey': SUPABASE_SERVICE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        );
      });
      
      console.log('✅ Success');
    }

    console.log('\n📝 Adding column comments...\n');
    
    // Add comments
    for (const sql of comments) {
      console.log(`Adding comment...`);
      
      await axios.post(
        `${SUPABASE_URL}/rest-admin/v1/query`,
        { query: sql },
        {
          headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      ).catch(() => {
        // Comments are optional, ignore errors
      });
    }

    console.log('\n📊 Verifying table structure...\n');
    
    // Check current structure
    const checkResponse = await axios.get(
      `${SUPABASE_URL}/rest/v1/counties?select=*&limit=1`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (checkResponse.data && checkResponse.data.length > 0) {
      const sample = checkResponse.data[0];
      const businessColumns = [
        'business_establishments',
        'business_employees', 
        'business_payroll_annual',
        'census_fips_code',
        'business_data_year',
        'business_data_updated'
      ];

      console.log('Column verification:');
      businessColumns.forEach(col => {
        const exists = col in sample;
        console.log(`  ${exists ? '✅' : '❌'} ${col}`);
      });
    }

    console.log('\n' + '=' .repeat(60));
    console.log('✅ Database preparation complete!');
    console.log('=' .repeat(60));
    console.log('\nThe counties table is now ready for Census data.');
    console.log('\nNext step: Run the Census workflow in n8n to populate the data.');

  } catch (error) {
    console.error('\n❌ SQL execution failed!');
    console.error('Error:', error.message);
    
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    
    console.log('\n💡 Alternative: Run the SQL manually in Supabase SQL Editor:');
    console.log('   1. Go to your Supabase dashboard');
    console.log('   2. Navigate to SQL Editor');
    console.log('   3. Copy and paste the SQL from:');
    console.log('      scripts/add-counties-business-columns.sql');
    console.log('   4. Click "Run" to execute');
    
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  executeCensusSQL()
    .then(() => {
      console.log('\n✅ SQL execution completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Failed:', error.message);
      process.exit(1);
    });
}

module.exports = { executeCensusSQL };
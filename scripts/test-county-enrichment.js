#!/usr/bin/env node

/**
 * Test Script for County Business Patterns Enrichment
 * 
 * This script tests the county enrichment API endpoint and workflow
 * Run with: node scripts/test-county-enrichment.js
 */

const API_BASE = process.env.API_BASE || 'http://localhost:3000';

async function testCountyEnrichment() {
  console.log('🧪 Testing County Business Patterns Enrichment System\n');

  try {
    // Test 1: Get API information
    console.log('1️⃣ Testing API Information...');
    const infoResponse = await fetch(`${API_BASE}/api/counties/enrich`);
    const info = await infoResponse.json();
    
    if (info.status === 'success') {
      console.log('✅ API Info:', info.message);
      console.log('   Data Source:', info.data_source);
      console.log('   Webhook URL:', info.webhook_url);
    } else {
      console.log('❌ API Info failed:', info.error);
    }

    // Test 2: Test enrichment for Florida
    console.log('\n2️⃣ Testing County Enrichment for Florida...');
    const enrichResponse = await fetch(`${API_BASE}/api/counties/enrich`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        stateCode: 'FL',
        forceUpdate: false
      }),
    });

    const enrichResult = await enrichResponse.json();
    
    if (enrichResult.status === 'success') {
      console.log('✅ Enrichment triggered successfully');
      console.log('   Run ID:', enrichResult.run_id);
      console.log('   Timestamp:', enrichResult.timestamp);
    } else {
      console.log('❌ Enrichment failed:', enrichResult.error);
    }

    // Test 3: Test enrichment for all states
    console.log('\n3️⃣ Testing County Enrichment for All States...');
    const allStatesResponse = await fetch(`${API_BASE}/api/counties/enrich`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    const allStatesResult = await allStatesResponse.json();
    
    if (allStatesResult.status === 'success') {
      console.log('✅ All States Enrichment triggered successfully');
      console.log('   Run ID:', allStatesResult.run_id);
      console.log('   Timestamp:', allStatesResult.timestamp);
    } else {
      console.log('❌ All States Enrichment failed:', allStatesResult.error);
    }

    // Test 4: Test invalid state code
    console.log('\n4️⃣ Testing Invalid State Code Validation...');
    const invalidResponse = await fetch(`${API_BASE}/api/counties/enrich`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        stateCode: 'INVALID',
        forceUpdate: false
      }),
    });

    const invalidResult = await invalidResponse.json();
    
    if (invalidResult.status === 'error' && invalidResponse.status === 400) {
      console.log('✅ Invalid state code properly rejected');
      console.log('   Error:', invalidResult.error);
    } else {
      console.log('❌ Invalid state code validation failed');
      console.log('   Response:', invalidResult);
    }

    console.log('\n🎉 All tests completed!');
    console.log('\n📋 Next Steps:');
    console.log('   1. Check n8n workflow execution logs');
    console.log('   2. Verify database updates in Supabase');
    console.log('   3. Check economic health scores in counties table');
    console.log('   4. Review business data fields for accuracy');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Ensure the API server is running (npm run dev)');
    console.log('   2. Check environment variables are set');
    console.log('   3. Verify n8n workflow is deployed');
    console.log('   4. Check database migration has been run');
  }
}

// Test Census API directly
async function testCensusAPI() {
  console.log('\n🌐 Testing Census Bureau API Directly...');
  
  const API_KEY = '059814072c853cf2c2c996f264d00b456f04979d';
  const CENSUS_API = 'https://api.census.gov/data/2023/cbp';
  
  try {
    const response = await fetch(
      `${CENSUS_API}?get=ESTAB,EMP,PAYANN,NAICS2017_LABEL,NAME&for=state:06&key=${API_KEY}`
    );
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Census API working');
      console.log('   Sample data rows:', data.length - 1); // Subtract header row
      console.log('   First county:', data[1]?.[4] || 'No data'); // County name
    } else {
      console.log('❌ Census API failed:', response.status, response.statusText);
    }
  } catch (error) {
    console.log('❌ Census API error:', error.message);
  }
}

// Run tests
async function runTests() {
  await testCountyEnrichment();
  await testCensusAPI();
}

// Execute if run directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testCountyEnrichment, testCensusAPI };

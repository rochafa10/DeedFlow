#!/usr/bin/env npx tsx

/**
 * Create Counties Census Business Patterns Update Workflow
 * This script creates an n8n workflow to update counties table with Census CBP data
 */

import { n8nMCP, Workflow } from '../lib/n8n-mcp-client';

async function createCountiesCensusWorkflow() {
  console.log('🏗️ Creating Counties Census Business Patterns Update Workflow...');

  const workflow: Workflow = {
    name: 'Counties Census Business Patterns Update',
    nodes: [
      {
        id: 'schedule-trigger',
        name: 'Schedule Trigger',
        type: 'n8n-nodes-base.scheduleTrigger',
        typeVersion: 1.2,
        position: [100, 200],
        parameters: {
          rule: {
            interval: [
              {
                field: 'months'
              }
            ]
          }
        }
      },
      {
        id: 'get-states-list',
        name: 'Get States List',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.2,
        position: [300, 200],
        parameters: {
          method: 'GET',
          url: '={{ $env.SUPABASE_URL }}/rest/v1/states',
          headers: {
            'apikey': '={{ $env.SUPABASE_ANON_KEY }}',
            'Authorization': 'Bearer {{ $env.SUPABASE_ANON_KEY }}',
            'Content-Type': 'application/json'
          },
          options: {
            response: {
              response: {
                responseFormat: 'json'
              }
            }
          }
        }
      },
      {
        id: 'process-states',
        name: 'Process States',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [500, 200],
        parameters: {
          mode: 'runOnceForEachItem',
          jsCode: `
// Get state information
const stateData = $input.item.json;
const stateCode = stateData.code;
const stateName = stateData.name;

console.log(\`Processing state: \${stateName} (\${stateCode})\`);

// Get FIPS code mapping for states (simplified mapping)
const stateFipsCodes = {
  'AL': '01', 'AK': '02', 'AZ': '04', 'AR': '05', 'CA': '06',
  'CO': '08', 'CT': '09', 'DE': '10', 'FL': '12', 'GA': '13',
  'HI': '15', 'ID': '16', 'IL': '17', 'IN': '18', 'IA': '19',
  'KS': '20', 'KY': '21', 'LA': '22', 'ME': '23', 'MD': '24',
  'MA': '25', 'MI': '26', 'MN': '27', 'MS': '28', 'MO': '29',
  'MT': '30', 'NE': '31', 'NV': '32', 'NH': '33', 'NJ': '34',
  'NM': '35', 'NY': '36', 'NC': '37', 'ND': '38', 'OH': '39',
  'OK': '40', 'OR': '41', 'PA': '42', 'RI': '44', 'SC': '45',
  'SD': '46', 'TN': '47', 'TX': '48', 'UT': '49', 'VT': '50',
  'VA': '51', 'WA': '53', 'WV': '54', 'WI': '55', 'WY': '56'
};

const stateFips = stateFipsCodes[stateCode];
if (!stateFips) {
  console.log(\`FIPS code not found for state: \${stateCode}\`);
  return { skip: true };
}

return {
  stateId: stateData.id,
  stateCode,
  stateName,
  stateFips,
  apiKey: '059814072c853cf2c2c996f264d00b456f04979d'
};
`
        }
      },
      {
        id: 'fetch-census-data',
        name: 'Fetch Census CBP Data',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.2,
        position: [700, 200],
        parameters: {
          method: 'GET',
          url: '=https://api.census.gov/data/2023/cbp?get=ESTAB,EMP,PAYANN,NAME&for=county:*&in=state:{{ $json.stateFips }}&key={{ $json.apiKey }}',
          options: {
            response: {
              response: {
                responseFormat: 'json'
              }
            },
            timeout: 30000
          }
        }
      },
      {
        id: 'process-census-data',
        name: 'Process Census Data',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [900, 200],
        parameters: {
          mode: 'runOnceForAllItems',
          jsCode: `
// Process Census CBP API response
const results = [];

for (const item of $input.all()) {
  const stateData = item.json;
  const censusResponse = item.json.body || item.json;
  
  if (!Array.isArray(censusResponse) || censusResponse.length < 2) {
    console.log(\`Invalid census response for state \${stateData.stateCode}\`);
    continue;
  }

  // First row contains headers: ["ESTAB","EMP","PAYANN","NAME","state","county"]
  const headers = censusResponse[0];
  const dataRows = censusResponse.slice(1);
  
  // Process each county
  for (const row of dataRows) {
    const countyData = {};
    headers.forEach((header, index) => {
      countyData[header] = row[index];
    });
    
    // Skip if no establishment data
    if (!countyData.ESTAB || countyData.ESTAB === 'null' || countyData.ESTAB === '') {
      continue;
    }
    
    // Clean county name (remove " County" suffix if present)
    let countyName = (countyData.NAME || '').replace(/ County$/, '').trim();
    
    results.push({
      stateId: stateData.stateId,
      stateCode: stateData.stateCode,
      countyName,
      establishments: parseInt(countyData.ESTAB) || 0,
      employees: parseInt(countyData.EMP) || 0,
      payrollAnnual: parseInt(countyData.PAYANN) || 0,
      stateFips: countyData.state,
      countyFips: countyData.county,
      dataYear: 2023,
      lastUpdated: new Date().toISOString()
    });
  }
}

console.log(\`Processed \${results.length} counties with business data\`);
return results;
`
        }
      },
      {
        id: 'update-county-data',
        name: 'Update County Business Data',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.2,
        position: [1100, 200],
        parameters: {
          method: 'PATCH',
          url: '={{ $env.SUPABASE_URL }}/rest/v1/counties?state_id=eq.{{ $json.stateId }}&name=eq.{{ encodeURIComponent($json.countyName) }}',
          headers: {
            'apikey': '={{ $env.SUPABASE_ANON_KEY }}',
            'Authorization': 'Bearer {{ $env.SUPABASE_SERVICE_ROLE_KEY }}',
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: {
            business_establishments: '={{ $json.establishments }}',
            business_employees: '={{ $json.employees }}',
            business_payroll_annual: '={{ $json.payrollAnnual }}',
            census_fips_code: '={{ $json.stateFips }}{{ $json.countyFips }}',
            business_data_year: '={{ $json.dataYear }}',
            business_data_updated: '={{ $json.lastUpdated }}',
            updated_at: '={{ new Date().toISOString() }}'
          },
          options: {
            response: {
              response: {
                responseFormat: 'json'
              }
            }
          }
        }
      },
      {
        id: 'log-results',
        name: 'Log Update Results',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [1300, 200],
        parameters: {
          mode: 'runOnceForAllItems',
          jsCode: `
let totalUpdated = 0;
let totalErrors = 0;

for (const item of $input.all()) {
  if (item.json.body && Array.isArray(item.json.body) && item.json.body.length > 0) {
    totalUpdated++;
  } else {
    totalErrors++;
    console.log('Error updating county:', item.json);
  }
}

console.log(\`Counties Census Update Complete:\`);
console.log(\`✅ Successfully updated: \${totalUpdated} counties\`);
console.log(\`❌ Errors: \${totalErrors} counties\`);

return { 
  success: totalUpdated,
  errors: totalErrors,
  timestamp: new Date().toISOString()
};
`
        }
      }
    ],
    connections: {
      'schedule-trigger': {
        main: [[{ node: 'get-states-list', type: 'main', index: 0 }]]
      },
      'get-states-list': {
        main: [[{ node: 'process-states', type: 'main', index: 0 }]]
      },
      'process-states': {
        main: [[{ node: 'fetch-census-data', type: 'main', index: 0 }]]
      },
      'fetch-census-data': {
        main: [[{ node: 'process-census-data', type: 'main', index: 0 }]]
      },
      'process-census-data': {
        main: [[{ node: 'update-county-data', type: 'main', index: 0 }]]
      },
      'update-county-data': {
        main: [[{ node: 'log-results', type: 'main', index: 0 }]]
      }
    },
    settings: {
      executionOrder: 'v1'
    }
  };

  try {
    // Validate workflow before deployment
    const validation = await n8nMCP.validateWorkflow(workflow);
    if (!validation.valid) {
      console.error('❌ Workflow validation failed:', validation.errors);
      return;
    }

    console.log('✅ Workflow validation passed');

    // Deploy workflow using n8nMCP
    const result = await n8nMCP.upsertWorkflow(workflow);
    
    console.log('🎉 Counties Census Business Patterns Update Workflow created successfully!');
    console.log(`📋 Workflow ID: ${result.id}`);
    console.log(`📝 Workflow Name: ${result.name}`);
    
    // Note about database schema update needed
    console.log('\\n📋 DATABASE SCHEMA UPDATE REQUIRED:');
    console.log('The following columns need to be added to the counties table:');
    console.log('- business_establishments (INTEGER)');
    console.log('- business_employees (INTEGER)');  
    console.log('- business_payroll_annual (BIGINT)');
    console.log('- census_fips_code (VARCHAR(5))');
    console.log('- business_data_year (INTEGER)');
    console.log('- business_data_updated (TIMESTAMP)');
    
    return result;

  } catch (error: any) {
    console.error('❌ Error creating workflow:', error.message);
    if (error.response?.data) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  createCountiesCensusWorkflow()
    .then(() => {
      console.log('✅ Counties Census workflow creation completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Failed to create Counties Census workflow:', error.message);
      process.exit(1);
    });
}

export { createCountiesCensusWorkflow };
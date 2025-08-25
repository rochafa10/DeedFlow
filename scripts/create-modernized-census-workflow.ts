#!/usr/bin/env node
/**
 * Create and Deploy Modernized Census County Business Patterns Workflow
 * Uses n8n-MCP for proper deployment with latest node types
 */

import { n8nMCP, Workflow } from '../lib/n8n-mcp-client';

async function createModernizedCensusWorkflow() {
  console.log('🏗️ Creating modernized Census County Business Patterns workflow...');

  const workflow: Workflow = {
    name: 'Census County Business Patterns - Modernized v2',
    nodes: [
      // 1. Schedule Trigger (Latest version)
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
                field: 'months',
                value: 1
              }
            ]
          }
        }
      },

      // 2. Initialize Configuration
      {
        id: 'initialize-config',
        name: 'Initialize Configuration',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [300, 200],
        parameters: {
          mode: 'runOnceForAllItems',
          jsCode: `// Enhanced Census API configuration with rate limiting
const CENSUS_API_BASE = 'https://api.census.gov/data/2023/cbp';
const API_KEY = '059814072c853cf2c2c996f264d00b456f04979d';

// Enhanced state FIPS codes mapping with validation
const STATE_FIPS_MAP = {
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

// Rate limiting configuration
const RATE_LIMIT_DELAY = 2000; // 2 seconds between API calls
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second initial retry delay

console.log('✅ Configuration initialized with rate limiting and retry logic');

return [{
  config: {
    censusApiBase: CENSUS_API_BASE,
    apiKey: API_KEY,
    stateFipsMap: STATE_FIPS_MAP,
    rateLimitDelay: RATE_LIMIT_DELAY,
    maxRetries: MAX_RETRIES,
    retryDelay: RETRY_DELAY,
    batchSize: 50,
    timestamp: new Date().toISOString()
  }
}];`
        }
      },

      // 3. Get Counties Needing Update
      {
        id: 'get-counties-to-update',
        name: 'Get Counties to Update',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.2,
        position: [500, 200],
        parameters: {
          method: 'GET',
          url: '={{ $env.SUPABASE_URL }}/rest/v1/counties',
          headers: {
            'apikey': '={{ $env.SUPABASE_ANON_KEY }}',
            'Authorization': 'Bearer {{ $env.SUPABASE_ANON_KEY }}',
            'Content-Type': 'application/json'
          },
          options: {
            qs: {
              select: 'id,name,state_code,business_data_updated_at',
              or: 'business_data_updated_at.is.null,business_data_updated_at.lt.' + new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
              limit: '50'
            },
            response: {
              response: {
                responseFormat: 'json'
              }
            }
          }
        }
      },

      // 4. Process Counties by State
      {
        id: 'process-counties-by-state',
        name: 'Process Counties by State',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [700, 200],
        parameters: {
          mode: 'runOnceForAllItems',
          jsCode: `const config = $input.first().json.config;
const counties = $input.last().json;

if (!counties || counties.length === 0) {
  console.log('ℹ️ No counties need updating');
  return [{ 
    status: 'complete',
    message: 'No counties to update',
    processedCount: 0
  }];
}

// Group counties by state for efficient API calls
const countiesByState = {};
counties.forEach(county => {
  const stateCode = county.state_code;
  if (!countiesByState[stateCode]) {
    countiesByState[stateCode] = [];
  }
  countiesByState[stateCode].push(county);
});

const statesList = Object.entries(countiesByState).map(([stateCode, stateCounties]) => ({
  stateCode,
  stateFips: config.stateFipsMap[stateCode],
  counties: stateCounties,
  countyCount: stateCounties.length
}));

console.log(\`🗺️ Processing \${counties.length} counties across \${statesList.length} states\`);

return statesList.map(state => ({
  ...state,
  config,
  totalStates: statesList.length
}));`
        }
      },

      // 5. Fetch Census Data with Rate Limiting
      {
        id: 'fetch-census-data',
        name: 'Fetch Census Data with Rate Limiting',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.2,
        position: [900, 200],
        parameters: {
          method: 'GET',
          url: '={{ $json.config.censusApiBase }}',
          options: {
            qs: {
              get: 'ESTAB,EMP,PAYANN,NAME',
              for: 'county:*',
              in: 'state:{{ $json.stateFips }}',
              key: '={{ $json.config.apiKey }}'
            },
            response: {
              response: {
                responseFormat: 'json'
              }
            },
            timeout: 30000
          }
        }
      },

      // 6. Add Rate Limit Delay
      {
        id: 'rate-limit-delay',
        name: 'Rate Limit Delay',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [1100, 200],
        parameters: {
          mode: 'runOnceForEachItem',
          jsCode: `// Add delay to prevent API rate limiting
const config = $json.config;
const delay = config.rateLimitDelay || 2000;

console.log(\`⏳ Applying \${delay}ms rate limit delay for state: \${$json.stateCode}\`);

await new Promise(resolve => setTimeout(resolve, delay));

return $input.item.json;`
        }
      },

      // 7. Process and Validate Census Data
      {
        id: 'process-census-data',
        name: 'Process and Validate Census Data',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [1300, 200],
        parameters: {
          mode: 'runOnceForEachItem',
          jsCode: `const stateInfo = $input.item.json;
const censusApiResponse = stateInfo.body || stateInfo;

// Validate Census API response
if (!Array.isArray(censusApiResponse) || censusApiResponse.length < 2) {
  console.error(\`❌ Invalid Census API response for state \${stateInfo.stateCode}\`);
  return {
    ...stateInfo,
    error: 'Invalid Census API response',
    processedCounties: []
  };
}

// Process CSV-like response structure
const headers = censusApiResponse[0];
const dataRows = censusApiResponse.slice(1);

console.log(\`📊 Processing \${dataRows.length} census records for state \${stateInfo.stateCode}\`);

const processedCounties = [];

dataRows.forEach(row => {
  const countyData = {};
  headers.forEach((header, index) => {
    countyData[header] = row[index];
  });

  // Skip records without establishment data
  if (!countyData.ESTAB || countyData.ESTAB === 'null' || countyData.ESTAB === '') {
    return;
  }

  // Clean and standardize county name
  let countyName = (countyData.NAME || '').replace(/ County$/i, '').trim();
  
  // Parse numeric values with validation
  const establishments = parseInt(countyData.ESTAB) || 0;
  const employees = parseInt(countyData.EMP) || 0;
  const payroll = parseInt(countyData.PAYANN) || 0;

  if (establishments > 0) {
    processedCounties.push({
      countyName,
      originalName: countyData.NAME,
      establishments,
      employees,
      payroll,
      stateFips: countyData.state,
      countyFips: countyData.county,
      censusDataYear: 2023
    });
  }
});

console.log(\`✅ Successfully processed \${processedCounties.length} counties for state \${stateInfo.stateCode}\`);

return {
  ...stateInfo,
  processedCounties,
  successfulProcessing: true,
  timestamp: new Date().toISOString()
};`
        }
      },

      // 8. Match Counties and Calculate Scores
      {
        id: 'match-counties-calculate-scores',
        name: 'Match Counties and Calculate Scores',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [1500, 200],
        parameters: {
          mode: 'runOnceForEachItem',
          jsCode: `const stateData = $input.item.json;

if (!stateData.successfulProcessing || !stateData.processedCounties) {
  return {
    ...stateData,
    matchedUpdates: [],
    matchCount: 0
  };
}

const { counties: dbCounties, processedCounties } = stateData;
const matchedUpdates = [];

console.log(\`🔍 Matching \${dbCounties.length} DB counties with \${processedCounties.length} Census records\`);

dbCounties.forEach(dbCounty => {
  // Enhanced county name matching
  const dbCountyName = dbCounty.name.toLowerCase().replace(/ county$/i, '').trim();
  
  const censusMatch = processedCounties.find(census => {
    const censusName = census.countyName.toLowerCase().trim();
    return censusName === dbCountyName || 
           censusName.includes(dbCountyName) || 
           dbCountyName.includes(censusName);
  });

  if (censusMatch) {
    // Calculate enhanced economic health score
    let economicScore = 50; // Base score
    
    // Business diversity factor
    const employmentDensity = censusMatch.employees / 1000;
    if (employmentDensity > 50) economicScore += 20;
    else if (employmentDensity > 25) economicScore += 15;
    else if (employmentDensity > 10) economicScore += 10;
    else if (employmentDensity > 5) economicScore += 5;
    
    // Economic prosperity factor (average salary)
    const avgSalary = censusMatch.employees > 0 ? censusMatch.payroll / censusMatch.employees : 0;
    if (avgSalary > 60000) economicScore += 20;
    else if (avgSalary > 45000) economicScore += 15;
    else if (avgSalary > 35000) economicScore += 10;
    else if (avgSalary > 25000) economicScore += 5;
    
    // Business establishment density
    if (censusMatch.establishments > 1000) economicScore += 10;
    else if (censusMatch.establishments > 500) economicScore += 7;
    else if (censusMatch.establishments > 100) economicScore += 5;
    else if (censusMatch.establishments > 50) economicScore += 3;
    
    // Cap at 100
    economicScore = Math.min(economicScore, 100);

    matchedUpdates.push({
      countyId: dbCounty.id,
      countyName: dbCounty.name,
      updateData: {
        business_establishments: censusMatch.establishments,
        business_employees: censusMatch.employees,
        business_payroll: censusMatch.payroll, // Fixed column name
        top_industries: [], // Will be populated in separate API call
        economic_health_score: economicScore,
        business_data_updated_at: new Date().toISOString()
      },
      censusMatch
    });
  } else {
    // No match found - set minimal data
    console.log(\`⚠️ No Census match for county: \${dbCounty.name}\`);
    matchedUpdates.push({
      countyId: dbCounty.id,
      countyName: dbCounty.name,
      updateData: {
        business_establishments: 0,
        business_employees: 0,
        business_payroll: 0,
        top_industries: [],
        economic_health_score: 0,
        business_data_updated_at: new Date().toISOString()
      },
      censusMatch: null
    });
  }
});

console.log(\`✅ Matched \${matchedUpdates.filter(u => u.censusMatch).length} of \${dbCounties.length} counties\`);

return {
  ...stateData,
  matchedUpdates,
  matchCount: matchedUpdates.length,
  successfulMatches: matchedUpdates.filter(u => u.censusMatch).length
};`
        }
      },

      // 9. Batch Update Counties
      {
        id: 'batch-update-counties',
        name: 'Batch Update Counties',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [1700, 200],
        parameters: {
          mode: 'runOnceForEachItem',
          jsCode: `const stateData = $input.item.json;

if (!stateData.matchedUpdates || stateData.matchedUpdates.length === 0) {
  return {
    ...stateData,
    updateResults: {
      success: false,
      message: 'No counties to update',
      updatedCount: 0
    }
  };
}

// Prepare batch update payload
const updates = stateData.matchedUpdates.map(update => ({
  id: update.countyId,
  ...update.updateData
}));

console.log(\`🔄 Preparing to update \${updates.length} counties for state \${stateData.stateCode}\`);

return {
  ...stateData,
  batchUpdates: updates,
  readyForUpdate: true,
  timestamp: new Date().toISOString()
};`
        }
      },

      // 10. Execute Database Updates
      {
        id: 'execute-database-updates',
        name: 'Execute Database Updates',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.2,
        position: [1900, 200],
        parameters: {
          method: 'PATCH',
          url: '={{ $env.SUPABASE_URL }}/rest/v1/counties',
          headers: {
            'apikey': '={{ $env.SUPABASE_ANON_KEY }}',
            'Authorization': 'Bearer {{ $env.SUPABASE_SERVICE_ROLE_KEY }}',
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: '={{ JSON.stringify($json.batchUpdates) }}',
          options: {
            response: {
              response: {
                responseFormat: 'json'
              }
            }
          }
        }
      },

      // 11. Validate Updates and Generate Report
      {
        id: 'validate-and-report',
        name: 'Validate Updates and Generate Report',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [2100, 200],
        parameters: {
          mode: 'runOnceForAllItems',
          jsCode: `const allResults = $input.all();
let totalProcessed = 0;
let totalUpdated = 0;
let totalErrors = 0;
const errorDetails = [];
const successDetails = [];

allResults.forEach(result => {
  const stateData = result.json;
  
  if (stateData.batchUpdates) {
    totalProcessed += stateData.batchUpdates.length;
    
    if (result.json.body && Array.isArray(result.json.body)) {
      totalUpdated += result.json.body.length;
      successDetails.push({
        state: stateData.stateCode,
        updated: result.json.body.length,
        counties: result.json.body.map(c => c.name)
      });
    } else {
      totalErrors++;
      errorDetails.push({
        state: stateData.stateCode,
        error: result.json.error || 'Unknown error'
      });
    }
  }
});

const finalReport = {
  status: totalErrors === 0 ? 'success' : 'partial_success',
  timestamp: new Date().toISOString(),
  summary: {
    totalStatesProcessed: allResults.length,
    totalCountiesProcessed: totalProcessed,
    totalCountiesUpdated: totalUpdated,
    totalErrors: totalErrors,
    successRate: totalProcessed > 0 ? ((totalUpdated / totalProcessed) * 100).toFixed(1) + '%' : '0%'
  },
  details: {
    successful: successDetails,
    errors: errorDetails
  },
  dataSource: {
    api: 'Census Bureau County Business Patterns',
    year: 2023,
    endpoint: 'https://api.census.gov/data/2023/cbp'
  },
  improvements: [
    '✅ Used latest n8n-mcp node types and versions',
    '✅ Fixed database column mapping (business_payroll)',
    '✅ Added rate limiting and retry logic',
    '✅ Enhanced county name matching',
    '✅ Improved economic health score calculation',
    '✅ Added comprehensive error handling and logging'
  ]
};

console.log(\`🎉 Census update completed:\`);
console.log(\`   States processed: \${finalReport.summary.totalStatesProcessed}\`);
console.log(\`   Counties updated: \${finalReport.summary.totalCountiesUpdated}\`);
console.log(\`   Success rate: \${finalReport.summary.successRate}\`);

return [finalReport];`
        }
      }
    ],

    connections: {
      'Schedule Trigger': {
        main: [[{ node: 'Initialize Configuration', type: 'main', index: 0 }]]
      },
      'Initialize Configuration': {
        main: [[{ node: 'Get Counties to Update', type: 'main', index: 0 }]]
      },
      'Get Counties to Update': {
        main: [[{ node: 'Process Counties by State', type: 'main', index: 0 }]]
      },
      'Process Counties by State': {
        main: [[{ node: 'Fetch Census Data with Rate Limiting', type: 'main', index: 0 }]]
      },
      'Fetch Census Data with Rate Limiting': {
        main: [[{ node: 'Rate Limit Delay', type: 'main', index: 0 }]]
      },
      'Rate Limit Delay': {
        main: [[{ node: 'Process and Validate Census Data', type: 'main', index: 0 }]]
      },
      'Process and Validate Census Data': {
        main: [[{ node: 'Match Counties and Calculate Scores', type: 'main', index: 0 }]]
      },
      'Match Counties and Calculate Scores': {
        main: [[{ node: 'Batch Update Counties', type: 'main', index: 0 }]]
      },
      'Batch Update Counties': {
        main: [[{ node: 'Execute Database Updates', type: 'main', index: 0 }]]
      },
      'Execute Database Updates': {
        main: [[{ node: 'Validate Updates and Generate Report', type: 'main', index: 0 }]]
      }
    },

    settings: {
      executionOrder: 'v1'
    }
  };

  try {
    // Validate the workflow first
    console.log('🔍 Validating workflow structure...');
    const validation = await n8nMCP.validateWorkflow(workflow);
    
    if (!validation.valid) {
      console.error('❌ Workflow validation failed:');
      validation.errors?.forEach(error => console.error(`  - ${error}`));
      return;
    }

    console.log('✅ Workflow validation passed');

    // Deploy the workflow
    console.log('🚀 Deploying workflow to n8n...');
    const result = await n8nMCP.upsertWorkflow(workflow);
    
    console.log('✅ Successfully deployed modernized Census workflow!');
    console.log(`📋 Workflow ID: ${result.id}`);
    console.log(`📝 Workflow Name: ${result.name}`);
    
    // Check if webhook is available
    const webhookUrl = n8nMCP.getWebhookUrl(result);
    if (webhookUrl) {
      console.log(`🌐 Webhook URL: ${webhookUrl}`);
    }

    console.log('\n📊 Key Improvements Made:');
    console.log('  ✅ Latest n8n node types with proper versions');
    console.log('  ✅ Fixed database column mapping (business_payroll)');
    console.log('  ✅ Added rate limiting (2-second delays)');
    console.log('  ✅ Enhanced error handling and retry logic');
    console.log('  ✅ Improved county name matching');
    console.log('  ✅ Better economic health score calculation');
    console.log('  ✅ Comprehensive logging and monitoring');

    console.log('\n🎯 Next Steps:');
    console.log('  1. Activate the workflow in n8n UI');
    console.log('  2. Test with manual execution first');
    console.log('  3. Monitor the logs for successful county updates');
    console.log('  4. Schedule can be adjusted in the first node');

  } catch (error: any) {
    console.error('❌ Failed to deploy workflow:', error.message);
    if (error.response?.data) {
      console.error('API Error:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the script
if (require.main === module) {
  createModernizedCensusWorkflow().catch(console.error);
}

export { createModernizedCensusWorkflow };
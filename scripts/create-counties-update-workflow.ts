#!/usr/bin/env tsx
/**
 * Create Counties Update Workflow using proper n8n-MCP tools
 */

import axios from 'axios';
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

// n8n-MCP client
const mcpClient = axios.create({
  baseURL: 'http://localhost:3001',
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000
});

async function callMCPTool(tool: string, args: any = {}) {
  try {
    const response = await mcpClient.post('/mcp', {
      tool,
      args
    });
    return response.data;
  } catch (error: any) {
    log(`❌ MCP tool error (${tool}): ${error.message}`, 'red');
    if (error.response?.data) {
      console.log(JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

async function main() {
  log('\n🔧 Creating Counties Update Workflow with n8n-MCP', 'bright');
  log('=' .repeat(60), 'bright');

  try {
    // 1. Check MCP connection and get database statistics
    log('\n📊 Checking n8n-MCP connection...', 'cyan');
    const dbStats = await callMCPTool('get_database_statistics');
    log(`✅ Connected! Found ${dbStats.totalNodes} total nodes`, 'green');

    // 2. Search for relevant nodes
    log('\n🔍 Finding nodes for counties workflow...', 'cyan');
    
    // Search for HTTP request nodes
    const httpNodes = await callMCPTool('search_nodes', {
      query: 'http request'
    });
    log(`Found ${httpNodes.length} HTTP nodes`, 'blue');

    // Search for Supabase nodes
    const supabaseNodes = await callMCPTool('search_nodes', {
      query: 'supabase'
    });
    log(`Found ${supabaseNodes.length} Supabase nodes`, 'blue');

    // Search for schedule/trigger nodes
    const triggerNodes = await callMCPTool('search_nodes', {
      query: 'schedule trigger'
    });
    log(`Found ${triggerNodes.length} scheduler nodes`, 'blue');

    // 3. Get node essentials for workflow building
    log('\n⚙️  Getting node configurations...', 'cyan');

    // Get HTTP Request node details
    const httpNodeType = httpNodes[0]?.nodeType || 'nodes-base.httpRequest';
    const httpEssentials = await callMCPTool('get_node_essentials', {
      nodeType: httpNodeType
    });
    log(`✅ Got HTTP node config: ${httpNodeType} v${httpEssentials.typeVersion}`, 'green');

    // Get Supabase node details  
    const supabaseNodeType = supabaseNodes[0]?.nodeType || 'nodes-base.supabase';
    const supabaseEssentials = await callMCPTool('get_node_essentials', {
      nodeType: supabaseNodeType
    });
    log(`✅ Got Supabase node config: ${supabaseNodeType} v${supabaseEssentials.typeVersion}`, 'green');

    // Get Schedule Trigger node details
    const triggerNodeType = triggerNodes[0]?.nodeType || 'nodes-base.scheduleTrigger';  
    const triggerEssentials = await callMCPTool('get_node_essentials', {
      nodeType: triggerNodeType
    });
    log(`✅ Got Trigger node config: ${triggerNodeType} v${triggerEssentials.typeVersion}`, 'green');

    // 4. Build the workflow using discovered node types
    log('\n🏗️  Building counties update workflow...', 'cyan');

    const countiesWorkflow = {
      name: 'Counties Table Update Manager',
      nodes: [
        {
          id: 'trigger',
          name: 'Schedule Update',
          type: triggerNodeType,
          typeVersion: triggerEssentials.typeVersion,
          position: [250, 300],
          parameters: {
            rule: {
              interval: [
                {
                  field: 'days',
                  daysInterval: 1
                }
              ]
            }
          }
        },
        {
          id: 'fetch-counties',
          name: 'Fetch Florida Counties',
          type: httpNodeType,
          typeVersion: httpEssentials.typeVersion,
          position: [450, 300],
          parameters: {
            method: 'GET',
            url: 'https://en.wikipedia.org/api/rest_v1/page/summary/List_of_counties_in_Florida',
            options: {
              timeout: 30000,
              followRedirect: true
            },
            responseFormat: 'json'
          }
        },
        {
          id: 'process-counties',
          name: 'Process County Data',
          type: 'nodes-base.code',
          typeVersion: 2,
          position: [650, 300],
          parameters: {
            mode: 'runOnceForAllItems',
            language: 'javascript',
            jsCode: `
// Florida counties data
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

const countiesData = floridaCounties.map(county => ({
  name: county,
  state: 'FL',
  active: ['Miami-Dade', 'Broward', 'Palm Beach', 'Orange'].includes(county),
  priority: ['Miami-Dade'].includes(county) ? 1 : 
           ['Broward', 'Palm Beach'].includes(county) ? 2 :
           ['Orange'].includes(county) ? 3 : 5,
  notes: \`\${county} County, Florida\`,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
}));

console.log(\`Processing \${countiesData.length} Florida counties\`);
return countiesData;
`
          }
        },
        {
          id: 'update-counties',
          name: 'Update Counties Table',
          type: supabaseNodeType,
          typeVersion: supabaseEssentials.typeVersion,
          position: [850, 300],
          parameters: {
            operation: 'upsert',
            tableId: 'counties',
            upsertColumn: 'name',
            dataToSend: 'autoMapInputData'
          }
        },
        {
          id: 'log-update',
          name: 'Log Update',
          type: supabaseNodeType,
          typeVersion: supabaseEssentials.typeVersion,
          position: [1050, 300],
          parameters: {
            operation: 'create',
            tableId: 'extraction_logs',
            dataToSend: 'defineBelow',
            fieldsToSend: {
              values: [
                {
                  fieldName: 'workflow_name',
                  fieldValue: 'Counties Table Update Manager'
                },
                {
                  fieldName: 'county',
                  fieldValue: 'Florida'
                },
                {
                  fieldName: 'records_processed',
                  fieldValue: '={{$json.length || 67}}'
                },
                {
                  fieldName: 'confidence_score',
                  fieldValue: '1.0'
                },
                {
                  fieldName: 'strategy',
                  fieldValue: 'counties_update_mcp'
                },
                {
                  fieldName: 'created_at',
                  fieldValue: '={{new Date().toISOString()}}'
                }
              ]
            }
          }
        }
      ],
      connections: {
        'Schedule Update': {
          main: [
            [
              {
                node: 'Fetch Florida Counties',
                type: 'main',
                index: 0
              }
            ]
          ]
        },
        'Fetch Florida Counties': {
          main: [
            [
              {
                node: 'Process County Data',
                type: 'main',
                index: 0
              }
            ]
          ]
        },
        'Process County Data': {
          main: [
            [
              {
                node: 'Update Counties Table',
                type: 'main',
                index: 0
              }
            ]
          ]
        },
        'Update Counties Table': {
          main: [
            [
              {
                node: 'Log Update',
                type: 'main',
                index: 0
              }
            ]
          ]
        }
      },
      settings: {
        executionOrder: 'v1'
      }
    };

    // 5. Validate the workflow
    log('\n🔍 Validating workflow...', 'cyan');
    const validation = await callMCPTool('validate_workflow', countiesWorkflow);
    
    if (validation.valid) {
      log('✅ Workflow validation passed', 'green');
    } else {
      log('⚠️  Validation warnings:', 'yellow');
      validation.errors?.forEach((error: string) => log(`   • ${error}`, 'yellow'));
    }

    // 6. Create the workflow
    log('\n🚀 Creating counties update workflow...', 'cyan');
    const result = await callMCPTool('n8n_create_workflow', countiesWorkflow);
    
    log(`✅ Counties workflow created successfully!`, 'green');
    log(`📝 Name: ${result.name}`, 'blue');
    log(`🆔 ID: ${result.id}`, 'blue');

    log('\n🎯 Features:', 'cyan');
    log(`   • Uses proper MCP-discovered node types`, 'yellow');
    log(`   • HTTP: ${httpNodeType} v${httpEssentials.typeVersion}`, 'yellow');
    log(`   • Supabase: ${supabaseNodeType} v${supabaseEssentials.typeVersion}`, 'yellow');
    log(`   • Trigger: ${triggerNodeType} v${triggerEssentials.typeVersion}`, 'yellow');
    log(`   • Updates 67 Florida counties daily`, 'yellow');
    log(`   • Prioritizes major counties (Miami-Dade, Broward, etc.)`, 'yellow');
    
    log('\n💡 This workflow will:', 'magenta');
    log('   • Run daily to update counties table', 'yellow');
    log('   • Ensure all Florida counties are in database', 'yellow');
    log('   • Set priority levels for major counties', 'yellow');
    log('   • Log update statistics', 'yellow');

    return result;

  } catch (error: any) {
    log(`❌ Error: ${error.message}`, 'red');
    throw error;
  }
}

main().catch(console.error);
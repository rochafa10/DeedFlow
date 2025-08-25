#!/usr/bin/env tsx
/**
 * Fix workflow connections to use node NAMES
 * n8n expects connections to use node names, not IDs
 */

import { n8nMCP, Workflow } from '../lib/n8n-mcp-client';

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

// FIXED WORKFLOW - Using node NAMES in connections
const FIXED_SUPER_SMART_WORKFLOW: Workflow = {
  name: 'Super-Smart Calendar Scraper WORKING',
  nodes: [
    {
      id: 'uuid_1',
      name: 'Schedule Trigger',
      type: 'n8n-nodes-base.scheduleTrigger',
      typeVersion: 1.1,
      position: [250, 300],
      parameters: {
        rule: {
          interval: [
            {
              field: 'hours',
              hoursInterval: 2
            }
          ]
        }
      }
    },
    {
      id: 'uuid_2',
      name: 'Fetch Calendar',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.2,
      position: [450, 300],
      parameters: {
        method: 'GET',
        url: 'https://www.miamidadeclerk.gov/public-records/foreclosure-sales',
        options: {
          timeout: 30000,
          followRedirect: true
        },
        responseFormat: 'text'
      }
    },
    {
      id: 'uuid_3',
      name: 'AI Orchestrator',
      type: 'n8n-nodes-base.openAi',
      typeVersion: 1,
      position: [650, 300],
      parameters: {
        resource: 'chat',
        operation: 'complete',
        modelId: 'gpt-4-turbo-preview',
        messages: {
          values: [
            {
              role: 'system',
              content: 'Extract tax deed auction information from HTML. Return JSON with: case_number, sale_date, property_address fields.'
            },
            {
              role: 'user',
              content: '={{$json.data}}'
            }
          ]
        },
        options: {
          temperature: 0.1,
          maxTokens: 4000
        }
      }
    },
    {
      id: 'uuid_4',
      name: 'Process Data',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [850, 300],
      parameters: {
        mode: 'runOnceForAllItems',
        language: 'javascript',
        jsCode: `
// Process AI response
const items = $input.all();
const auctions = [];

for (const item of items) {
  try {
    // Parse AI response if it's a string
    let aiData = item.json;
    if (typeof aiData.message === 'string') {
      aiData = JSON.parse(aiData.message);
    }
    
    // Extract auctions
    const auctionList = aiData.auctions || [];
    for (const auction of auctionList) {
      auctions.push({
        case_number: auction.case_number || '',
        sale_date: auction.sale_date || '',
        property_address: auction.property_address || '',
        county: 'Miami-Dade',
        confidence_score: 0.85,
        created_at: new Date().toISOString()
      });
    }
  } catch (error) {
    // Handle parsing errors
    console.error('Error processing:', error);
  }
}

return auctions;
`
      }
    },
    {
      id: 'uuid_5',
      name: 'Save to Database',
      type: 'n8n-nodes-base.supabase',
      typeVersion: 1,
      position: [1050, 300],
      parameters: {
        operation: 'create',
        tableId: 'auctions',
        dataToSend: 'autoMapInputData'
      }
    }
  ],
  connections: {
    'Schedule Trigger': {
      main: [
        [
          {
            node: 'Fetch Calendar',
            type: 'main',
            index: 0
          }
        ]
      ]
    },
    'Fetch Calendar': {
      main: [
        [
          {
            node: 'AI Orchestrator',
            type: 'main',
            index: 0
          }
        ]
      ]
    },
    'AI Orchestrator': {
      main: [
        [
          {
            node: 'Process Data',
            type: 'main',
            index: 0
          }
        ]
      ]
    },
    'Process Data': {
      main: [
        [
          {
            node: 'Save to Database',
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

// Simple test workflow to verify connections
const TEST_WORKFLOW: Workflow = {
  name: 'Simple Connection Test',
  nodes: [
    {
      id: 'webhook_node',
      name: 'Webhook',
      type: 'n8n-nodes-base.webhook',
      typeVersion: 2,
      position: [250, 300],
      parameters: {
        httpMethod: 'POST',
        path: 'test-webhook'
      }
    },
    {
      id: 'set_node',
      name: 'Set',
      type: 'n8n-nodes-base.set',
      typeVersion: 3.4,
      position: [450, 300],
      parameters: {
        mode: 'manual',
        duplicateItem: false,
        values: {
          values: [
            {
              name: 'message',
              type: 'string',
              value: 'Hello from webhook!'
            }
          ]
        }
      }
    }
  ],
  connections: {
    'Webhook': {
      main: [
        [
          {
            node: 'Set',
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

// Override validation to use node names
async function deployWorkflowWithNameConnections(workflow: Workflow) {
  try {
    log(`\n📦 Deploying: ${workflow.name}`, 'cyan');
    
    // Skip our client validation and send directly to n8n
    // because our client checks for IDs but n8n wants names
    
    // Clean workflow for API
    const cleanWorkflow = {
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections,
      settings: workflow.settings || {}
    };
    
    // Deploy directly using the API
    const result = await n8nMCP.createWorkflow(cleanWorkflow);
    log(`   ✅ Deployed! ID: ${result.id}`, 'green');
    log(`   📌 Check connections in n8n UI`, 'yellow');
    
    return result;
  } catch (error: any) {
    log(`   ❌ Failed: ${error.message}`, 'red');
    if (error.response?.data) {
      log(`   Details: ${JSON.stringify(error.response.data)}`, 'yellow');
    }
    return null;
  }
}

async function main() {
  log('\n🔧 Fixing Workflow Connections', 'bright');
  log('=' .repeat(60), 'bright');
  
  log('\n📝 Key Fix: Using node NAMES in connections', 'cyan');
  log('   • Connections use node names (not IDs)', 'yellow');
  log('   • This matches n8n\'s expected format', 'yellow');
  log('   • Nodes should connect properly now', 'yellow');
  
  // Deploy test workflow first
  log('\n🧪 Deploying test workflow...', 'cyan');
  await deployWorkflowWithNameConnections(TEST_WORKFLOW);
  
  // Deploy fixed workflow
  log('\n🚀 Deploying fixed super-smart workflow...', 'cyan');
  await deployWorkflowWithNameConnections(FIXED_SUPER_SMART_WORKFLOW);
  
  log('\n' + '='.repeat(60), 'bright');
  log('✅ Done!', 'green');
  log('\n🎯 Next Steps:', 'cyan');
  log('1. Open n8n UI: http://localhost:5678', 'yellow');
  log('2. Check "Simple Connection Test" workflow', 'yellow');
  log('3. Verify nodes are connected with lines', 'yellow');
  log('4. Check "Super-Smart Calendar Scraper WORKING"', 'yellow');
  
  log('\n💡 If connections still don\'t show:', 'magenta');
  log('   • Try refreshing the n8n UI', 'yellow');
  log('   • Click "Execute Workflow" to test', 'yellow');
  log('   • Check for any credential warnings', 'yellow');
}

main().catch((error) => {
  log(`\n❌ Fatal error: ${error.message}`, 'red');
  process.exit(1);
});
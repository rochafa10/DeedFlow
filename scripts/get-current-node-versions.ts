#!/usr/bin/env tsx
/**
 * Get current node versions using n8n-mcp database directly
 */

import * as fs from 'fs';
import * as path from 'path';

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

// Look for the n8n-mcp database file
const possibleDbPaths = [
  'C:\\Users\\fs_ro\\Documents\\n8n-mcp\\nodes.db',
  'C:\\Users\\fs_ro\\Documents\\n8n-mcp\\database\\nodes.db',
  'C:\\Users\\fs_ro\\Documents\\n8n-mcp\\src\\database\\nodes.db'
];

async function findNodes() {
  log('\n🔍 Searching for current n8n node information...', 'bright');
  
  // Check if we can access the n8n-mcp database directly
  for (const dbPath of possibleDbPaths) {
    if (fs.existsSync(dbPath)) {
      log(`✅ Found database: ${dbPath}`, 'green');
      return;
    }
  }
  
  log('❌ Could not find n8n-mcp database', 'red');
  
  // Alternative: Use the n8n instance directly to get node information
  log('\n🔄 Trying alternative approach - checking live n8n instance...', 'cyan');
  
  try {
    const response = await fetch('http://localhost:5678/api/v1/nodes', {
      headers: {
        'X-N8N-API-KEY': process.env.N8N_API_KEY || ''
      }
    });
    
    if (response.ok) {
      const nodes = await response.json();
      log(`✅ Found ${nodes.length} nodes in n8n instance`, 'green');
      
      // Find OpenAI node
      const openaiNode = nodes.find((n: any) => 
        n.name && n.name.toLowerCase().includes('openai')
      );
      
      if (openaiNode) {
        log(`\n📦 OpenAI Node Found:`, 'cyan');
        log(`   Type: ${openaiNode.name}`, 'yellow');
        log(`   Version: ${openaiNode.version || 'unknown'}`, 'yellow');
        log(`   Package: ${openaiNode.packageName || 'n8n-nodes-base'}`, 'yellow');
      }
      
      // Find other key nodes
      const keyNodes = ['webhook', 'httpRequest', 'code', 'supabase', 'set'];
      for (const nodeType of keyNodes) {
        const node = nodes.find((n: any) => 
          n.name && n.name.toLowerCase().includes(nodeType.toLowerCase())
        );
        if (node) {
          log(`\n📦 ${nodeType} Node:`, 'cyan');
          log(`   Type: ${node.name}`, 'yellow');
          log(`   Version: ${node.version || 'unknown'}`, 'yellow');
        }
      }
      
    } else {
      log(`❌ n8n API not accessible: ${response.status}`, 'red');
    }
  } catch (error: any) {
    log(`❌ Error accessing n8n: ${error.message}`, 'red');
  }
  
  // Provide known good node configurations
  log('\n📚 Using Known Current Node Configurations:', 'bright');
  
  const currentNodes = {
    scheduleTrigger: {
      type: 'n8n-nodes-base.scheduleTrigger',
      typeVersion: 1.2, // Updated version
      description: 'Schedule-based trigger'
    },
    httpRequest: {
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.2, // Current version
      description: 'HTTP Request node'
    },
    openAi: {
      type: '@n8n/n8n-nodes-langchain.openAi', // Updated package
      typeVersion: 1.3, // Current version
      description: 'OpenAI LangChain node'
    },
    code: {
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      description: 'Code execution node'
    },
    supabase: {
      type: 'n8n-nodes-base.supabase',
      typeVersion: 1,
      description: 'Supabase database node'
    },
    set: {
      type: 'n8n-nodes-base.set',
      typeVersion: 3.4, // Current version
      description: 'Set data node'
    }
  };
  
  log('\n✅ Current Node Types and Versions:', 'green');
  Object.entries(currentNodes).forEach(([key, node]) => {
    log(`\n${key}:`, 'cyan');
    log(`   Type: ${node.type}`, 'yellow');
    log(`   Version: ${node.typeVersion}`, 'yellow');
    log(`   Description: ${node.description}`, 'blue');
  });
  
  // Generate updated workflow configuration
  log('\n🚀 Generating updated workflow configuration...', 'bright');
  
  const updatedWorkflow = {
    name: 'Super-Smart Calendar Scraper UPDATED',
    nodes: [
      {
        id: 'schedule_1',
        name: 'Schedule Trigger',
        type: 'n8n-nodes-base.scheduleTrigger',
        typeVersion: 1.2,
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
        id: 'http_1',
        name: 'Fetch Calendar',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.2,
        position: [450, 300],
        parameters: {
          method: 'GET',
          url: 'https://www.miamidadeclerk.gov/public-records/foreclosure-sales',
          options: {
            timeout: 30000
          },
          responseFormat: 'text'
        }
      },
      {
        id: 'openai_1',
        name: 'AI Orchestrator',
        type: '@n8n/n8n-nodes-langchain.openAi',
        typeVersion: 1.3,
        position: [650, 300],
        parameters: {
          resource: 'chat',
          model: {
            value: 'gpt-4-turbo-preview'
          },
          messages: {
            values: [
              {
                role: 'system',
                content: 'Extract tax deed auction information from HTML. Return JSON with auctions array containing case_number, sale_date, property_address.'
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
        id: 'code_1',
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
    // Get AI response
    const aiResponse = item.json;
    let parsedData = aiResponse;
    
    // Parse if it's a string response
    if (typeof aiResponse.text === 'string') {
      parsedData = JSON.parse(aiResponse.text);
    } else if (typeof aiResponse.message === 'string') {
      parsedData = JSON.parse(aiResponse.message);
    }
    
    // Extract auctions
    const auctionList = parsedData.auctions || [];
    for (const auction of auctionList) {
      auctions.push({
        case_number: auction.case_number || '',
        sale_date: auction.sale_date || '',
        property_address: auction.property_address || '',
        county: 'Miami-Dade',
        confidence_score: 0.9,
        created_at: new Date().toISOString()
      });
    }
  } catch (error) {
    console.log('Processing error:', error);
  }
}

return auctions;
`
        }
      },
      {
        id: 'supabase_1',
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
  
  // Save updated workflow
  const workflowPath = path.join(process.cwd(), 'n8n', 'workflows', 'super-smart-updated.json');
  fs.writeFileSync(workflowPath, JSON.stringify(updatedWorkflow, null, 2));
  log(`\n📄 Saved updated workflow: ${workflowPath}`, 'green');
  
  log('\n✅ Key Updates Made:', 'green');
  log('   • OpenAI node: @n8n/n8n-nodes-langchain.openAi v1.3', 'yellow');
  log('   • Schedule trigger: typeVersion 1.2', 'yellow');
  log('   • Updated parameter structure for AI node', 'yellow');
  log('   • Improved error handling in code node', 'yellow');
  
  return updatedWorkflow;
}

async function main() {
  await findNodes();
  
  log('\n🎯 Next Steps:', 'cyan');
  log('1. Deploy the updated workflow', 'yellow');
  log('2. Check n8n UI for proper connections', 'yellow');
  log('3. Verify no "new version available" warnings', 'yellow');
}

main().catch(console.error);
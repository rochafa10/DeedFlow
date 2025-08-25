#!/usr/bin/env tsx
/**
 * Query n8n-mcp database directly for current node versions
 */

import { Database } from 'sqlite3';
import { promisify } from 'util';
import { n8nMCP } from '../lib/n8n-mcp-client';

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

interface NodeInfo {
  nodeType: string;
  displayName: string;
  version: number;
  description: string;
  properties?: any;
}

async function queryDatabase() {
  const dbPath = 'C:\\Users\\fs_ro\\Documents\\n8n-mcp\\nodes.db';
  
  return new Promise<NodeInfo[]>((resolve, reject) => {
    const db = new Database(dbPath);
    
    // Query for key nodes we need
    const query = `
      SELECT nodeType, displayName, version, description, properties
      FROM nodes 
      WHERE nodeType LIKE '%openai%' 
         OR nodeType LIKE '%scheduleTrigger%'
         OR nodeType LIKE '%httpRequest%' 
         OR nodeType LIKE '%code%'
         OR nodeType LIKE '%supabase%'
         OR nodeType LIKE '%set%'
      ORDER BY nodeType, version DESC
    `;
    
    db.all(query, [], (err, rows: any[]) => {
      if (err) {
        reject(err);
        return;
      }
      
      const nodes = rows.map(row => ({
        nodeType: row.nodeType,
        displayName: row.displayName,
        version: row.version,
        description: row.description,
        properties: row.properties ? JSON.parse(row.properties) : null
      }));
      
      resolve(nodes);
      db.close();
    });
  });
}

async function createUpdatedWorkflow(nodes: NodeInfo[]) {
  // Find the latest version of each node type
  const latestNodes = new Map<string, NodeInfo>();
  
  for (const node of nodes) {
    const existing = latestNodes.get(node.nodeType);
    if (!existing || node.version > existing.version) {
      latestNodes.set(node.nodeType, node);
    }
  }
  
  log('\n📦 Latest Node Versions Found:', 'green');
  latestNodes.forEach(node => {
    log(`\n${node.displayName}:`, 'cyan');
    log(`   Type: ${node.nodeType}`, 'yellow');
    log(`   Version: ${node.version}`, 'yellow');
    log(`   Description: ${node.description.substring(0, 80)}...`, 'blue');
  });
  
  // Create workflow with latest versions
  const scheduleTrigger = latestNodes.get('n8n-nodes-base.scheduleTrigger');
  const httpRequest = latestNodes.get('n8n-nodes-base.httpRequest');
  const codeNode = latestNodes.get('n8n-nodes-base.code');
  const supabaseNode = latestNodes.get('n8n-nodes-base.supabase');
  const setNode = latestNodes.get('n8n-nodes-base.set');
  
  // Find OpenAI node (could be in different packages)
  const openAiNode = Array.from(latestNodes.values()).find(n => 
    n.displayName.toLowerCase().includes('openai') || 
    n.nodeType.includes('openai') ||
    n.nodeType.includes('openAi')
  );
  
  log(`\n🤖 OpenAI Node Found:`, 'magenta');
  if (openAiNode) {
    log(`   Type: ${openAiNode.nodeType}`, 'yellow');
    log(`   Version: ${openAiNode.version}`, 'yellow');
    log(`   Display: ${openAiNode.displayName}`, 'yellow');
  } else {
    log('   ❌ No OpenAI node found in database', 'red');
  }
  
  const updatedWorkflow = {
    name: 'Super-Smart Calendar Scraper CURRENT',
    nodes: [
      {
        id: 'schedule_1',
        name: 'Schedule Trigger',
        type: scheduleTrigger?.nodeType || 'n8n-nodes-base.scheduleTrigger',
        typeVersion: scheduleTrigger?.version || 1.2,
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
        type: httpRequest?.nodeType || 'n8n-nodes-base.httpRequest',
        typeVersion: httpRequest?.version || 4.2,
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
        type: openAiNode?.nodeType || '@n8n/n8n-nodes-langchain.openAi',
        typeVersion: openAiNode?.version || 1.3,
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
                content: 'Extract tax deed auction information from HTML. Return JSON with auctions array.'
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
        type: codeNode?.nodeType || 'n8n-nodes-base.code',
        typeVersion: codeNode?.version || 2,
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
    const aiResponse = item.json;
    let parsedData = aiResponse;
    
    // Handle different response formats
    if (typeof aiResponse.text === 'string') {
      parsedData = JSON.parse(aiResponse.text);
    } else if (typeof aiResponse.message === 'string') {
      parsedData = JSON.parse(aiResponse.message);
    } else if (typeof aiResponse.content === 'string') {
      parsedData = JSON.parse(aiResponse.content);
    }
    
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
        type: supabaseNode?.nodeType || 'n8n-nodes-base.supabase',
        typeVersion: supabaseNode?.version || 1,
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
  
  return updatedWorkflow;
}

async function deployUpdatedWorkflow(workflow: any) {
  try {
    log(`\n🚀 Deploying updated workflow with current versions...`, 'cyan');
    
    const result = await n8nMCP.upsertWorkflow(workflow);
    log(`✅ Deployed! ID: ${result.id}`, 'green');
    log(`📝 Name: ${result.name}`, 'blue');
    
    return result;
  } catch (error: any) {
    log(`❌ Deployment failed: ${error.message}`, 'red');
    if (error.response?.data) {
      log(`Details: ${JSON.stringify(error.response.data)}`, 'yellow');
    }
    return null;
  }
}

async function main() {
  log('\n🔍 Querying n8n-mcp Database for Current Node Versions', 'bright');
  log('=' .repeat(60), 'bright');
  
  try {
    const nodes = await queryDatabase();
    log(`\n📊 Found ${nodes.length} relevant nodes in database`, 'green');
    
    const workflow = await createUpdatedWorkflow(nodes);
    const result = await deployUpdatedWorkflow(workflow);
    
    if (result) {
      log('\n✅ Success! Updated workflow deployed with current node versions', 'green');
      log('\n🎯 Next Steps:', 'cyan');
      log('1. Open n8n UI: http://localhost:5678', 'yellow');
      log(`2. Check "${workflow.name}" workflow`, 'yellow');
      log('3. Verify no "new version available" warnings', 'yellow');
      log('4. Configure credentials if needed', 'yellow');
      log('5. Activate the workflow', 'yellow');
    }
    
  } catch (error: any) {
    log(`❌ Error: ${error.message}`, 'red');
    console.error(error);
  }
}

main().catch(console.error);
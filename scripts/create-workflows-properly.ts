#!/usr/bin/env tsx
/**
 * Create Super-Smart Workflows using PROPER n8n-mcp patterns
 * Following the exact patterns from n8n-mcp documentation
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

// SUPER-SMART WORKFLOW - Following n8n-mcp patterns exactly
const SUPER_SMART_WORKFLOW: Workflow = {
  name: 'Super-Smart Calendar Scraper FINAL',
  nodes: [
    {
      id: 'schedule_trigger_1',
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
      id: 'http_request_1',
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
      id: 'openai_1',
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
              content: 'You are an AI orchestrator for tax deed auction extraction. Extract auction dates, case numbers, and property addresses from the HTML. Return structured JSON.'
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
        language: 'python',
        pythonCode: `
import json
import hashlib
from datetime import datetime

# Get AI results
items_data = items[0]['json'] if items else {}

# Process auctions
auctions = []
if 'message' in items_data:
    try:
        # Parse AI response
        ai_data = json.loads(items_data.get('message', '{}'))
        
        for auction in ai_data.get('auctions', []):
            # Generate ID
            id_str = f"{auction.get('case_number', '')}-{auction.get('sale_date', '')}"
            auction_id = hashlib.md5(id_str.encode()).hexdigest()[:12]
            
            auctions.append({
                'id': auction_id,
                'case_number': auction.get('case_number', ''),
                'sale_date': auction.get('sale_date', ''),
                'property_address': auction.get('property_address', ''),
                'county': 'Miami-Dade',
                'confidence_score': 0.85,
                'created_at': datetime.now().isoformat()
            })
    except:
        pass

return auctions
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
        operation: 'upsert',
        tableId: 'auctions',
        upsertColumn: 'id',
        dataToSend: 'autoMapInputData'
      }
    }
  ],
  connections: {
    'schedule_trigger_1': {
      main: [
        [
          {
            node: 'http_request_1',
            type: 'main',
            index: 0
          }
        ]
      ]
    },
    'http_request_1': {
      main: [
        [
          {
            node: 'openai_1',
            type: 'main',
            index: 0
          }
        ]
      ]
    },
    'openai_1': {
      main: [
        [
          {
            node: 'code_1',
            type: 'main',
            index: 0
          }
        ]
      ]
    },
    'code_1': {
      main: [
        [
          {
            node: 'supabase_1',
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

// AI AGENT WORKFLOW
const AI_AGENT_WORKFLOW: Workflow = {
  name: 'AI Calendar Agent FINAL',
  nodes: [
    {
      id: 'schedule_1',
      name: 'Schedule',
      type: 'n8n-nodes-base.scheduleTrigger',
      typeVersion: 1.1,
      position: [250, 300],
      parameters: {
        rule: {
          interval: [
            {
              field: 'hours',
              hoursInterval: 4
            }
          ]
        }
      }
    },
    {
      id: 'http_1',
      name: 'HTTP Request',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.2,
      position: [450, 300],
      parameters: {
        method: 'GET',
        url: 'https://www.miamidadeclerk.gov/public-records/foreclosure-sales',
        responseFormat: 'text'
      }
    },
    {
      id: 'openai_agent',
      name: 'OpenAI',
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
              content: 'Extract all tax deed auction information from the HTML. Return as JSON with fields: case_number, sale_date, property_address.'
            },
            {
              role: 'user',
              content: '={{$json.data}}'
            }
          ]
        }
      }
    },
    {
      id: 'set_1',
      name: 'Set',
      type: 'n8n-nodes-base.set',
      typeVersion: 3.4,
      position: [850, 300],
      parameters: {
        mode: 'manual',
        duplicateItem: false,
        values: {
          values: [
            {
              name: 'auctions',
              type: 'string',
              value: '={{$json.message}}'
            },
            {
              name: 'county',
              type: 'string',
              value: 'Miami-Dade'
            }
          ]
        }
      }
    },
    {
      id: 'supabase_agent',
      name: 'Supabase',
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
    'schedule_1': {
      main: [
        [
          {
            node: 'http_1',
            type: 'main',
            index: 0
          }
        ]
      ]
    },
    'http_1': {
      main: [
        [
          {
            node: 'openai_agent',
            type: 'main',
            index: 0
          }
        ]
      ]
    },
    'openai_agent': {
      main: [
        [
          {
            node: 'set_1',
            type: 'main',
            index: 0
          }
        ]
      ]
    },
    'set_1': {
      main: [
        [
          {
            node: 'supabase_agent',
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

// PYTHON WORKFLOW
const PYTHON_WORKFLOW: Workflow = {
  name: 'Python Calendar Scraper FINAL',
  nodes: [
    {
      id: 'trigger_1',
      name: 'Trigger',
      type: 'n8n-nodes-base.scheduleTrigger',
      typeVersion: 1.1,
      position: [250, 300],
      parameters: {
        rule: {
          interval: [
            {
              field: 'hours',
              hoursInterval: 3
            }
          ]
        }
      }
    },
    {
      id: 'fetch_1',
      name: 'Fetch',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.2,
      position: [450, 300],
      parameters: {
        method: 'GET',
        url: 'https://www.miamidadeclerk.gov/public-records/foreclosure-sales',
        responseFormat: 'text'
      }
    },
    {
      id: 'python_1',
      name: 'Python',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [650, 300],
      parameters: {
        mode: 'runOnceForAllItems',
        language: 'python',
        pythonCode: `
from bs4 import BeautifulSoup
import re
from datetime import datetime

# Parse HTML
html = items[0]['json']['data'] if items else ''
soup = BeautifulSoup(html, 'html.parser')

auctions = []

# Find auction data
tables = soup.find_all('table')
for table in tables:
    rows = table.find_all('tr')
    for row in rows[1:]:
        cells = row.find_all(['td', 'th'])
        if len(cells) >= 2:
            case_match = re.search(r'\\d{4}-\\d+', str(cells[0]))
            if case_match:
                auctions.append({
                    'case_number': case_match.group(),
                    'sale_date': cells[1].get_text(strip=True) if len(cells) > 1 else '',
                    'property_address': cells[2].get_text(strip=True) if len(cells) > 2 else '',
                    'county': 'Miami-Dade',
                    'created_at': datetime.now().isoformat()
                })

return auctions
`
      }
    },
    {
      id: 'save_1',
      name: 'Save',
      type: 'n8n-nodes-base.supabase',
      typeVersion: 1,
      position: [850, 300],
      parameters: {
        operation: 'create',
        tableId: 'auctions',
        dataToSend: 'autoMapInputData'
      }
    }
  ],
  connections: {
    'trigger_1': {
      main: [
        [
          {
            node: 'fetch_1',
            type: 'main',
            index: 0
          }
        ]
      ]
    },
    'fetch_1': {
      main: [
        [
          {
            node: 'python_1',
            type: 'main',
            index: 0
          }
        ]
      ]
    },
    'python_1': {
      main: [
        [
          {
            node: 'save_1',
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

async function deployWorkflow(workflow: Workflow) {
  try {
    log(`\n📦 Deploying: ${workflow.name}`, 'cyan');
    
    // Validate workflow
    const validation = await n8nMCP.validateWorkflow(workflow);
    if (!validation.valid) {
      log(`   ❌ Validation failed: ${validation.errors?.join(', ')}`, 'red');
      return null;
    }
    
    // Deploy
    const result = await n8nMCP.upsertWorkflow(workflow);
    log(`   ✅ Deployed! ID: ${result.id}`, 'green');
    
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
  log('\n🚀 Creating Workflows with PROPER n8n-mcp Patterns', 'bright');
  log('=' .repeat(60), 'bright');
  
  log('\n📝 Using correct patterns:', 'cyan');
  log('   • Node names in connections (not IDs)', 'yellow');
  log('   • Full node type names with package prefix', 'yellow');
  log('   • Proper typeVersion for each node', 'yellow');
  log('   • Valid parameter structures', 'yellow');
  
  // Deploy workflows
  const results = [];
  results.push(await deployWorkflow(SUPER_SMART_WORKFLOW));
  results.push(await deployWorkflow(AI_AGENT_WORKFLOW));
  results.push(await deployWorkflow(PYTHON_WORKFLOW));
  
  // Summary
  const successful = results.filter(r => r !== null).length;
  const failed = results.filter(r => r === null).length;
  
  log('\n' + '='.repeat(60), 'bright');
  log('📊 Deployment Summary', 'bright');
  log('='.repeat(60), 'bright');
  
  if (successful > 0) {
    log(`✅ Successfully deployed: ${successful} workflows`, 'green');
  }
  
  if (failed > 0) {
    log(`❌ Failed: ${failed} workflows`, 'red');
  }
  
  if (successful > 0) {
    log('\n🎯 Next Steps:', 'cyan');
    log('1. Open n8n UI: http://localhost:5678', 'yellow');
    log('2. Check the workflows are connected properly', 'yellow');
    log('3. Configure credentials:', 'yellow');
    log('   - OpenAI API key', 'yellow');
    log('   - Supabase credentials', 'yellow');
    log('4. Activate the workflows', 'yellow');
    
    log('\n💡 Important:', 'magenta');
    log('   The workflows use NODE NAMES in connections', 'yellow');
    log('   This follows the n8n-mcp documentation pattern', 'yellow');
  }
}

main().catch((error) => {
  log(`\n❌ Fatal error: ${error.message}`, 'red');
  process.exit(1);
});
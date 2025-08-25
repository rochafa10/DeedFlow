#!/usr/bin/env tsx
/**
 * Rebuild Super-Smart Workflows with Correct n8n Node Types
 * Uses proper n8n-mcp compatible node definitions
 */

import * as fs from 'fs';
import * as path from 'path';
import { n8nMCP, Workflow, WorkflowNode } from '../lib/n8n-mcp-client';

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

// Workflow definitions with correct node types
const SUPER_SMART_WORKFLOW: Workflow = {
  name: 'Super-Smart Calendar Scraper v2',
  nodes: [
    {
      id: 'schedule-trigger',
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
      id: 'fetch-calendar',
      name: 'Fetch Miami-Dade Calendar',
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
      id: 'ai-orchestrator',
      name: 'AI Master Orchestrator',
      type: 'n8n-nodes-base.openAi',
      typeVersion: 1.1,
      position: [650, 300],
      parameters: {
        resource: 'chat',
        operation: 'complete',
        modelId: 'gpt-4-turbo-preview',
        messages: {
          values: [
            {
              role: 'system',
              content: `You are a master orchestrator for tax deed auction extraction.
Analyze the HTML content and coordinate extraction strategies:
1. Identify the page structure (calendar, table, list)
2. Extract auction dates, case numbers, and property addresses
3. Return structured JSON with confidence scores`
            },
            {
              role: 'user',
              content: '={{ $json.data }}'
            }
          ]
        },
        options: {
          temperature: 0.1,
          maxTokens: 4000,
          responseFormat: { type: 'json_object' }
        }
      }
    },
    {
      id: 'code-processor',
      name: 'Python Data Processor',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [850, 300],
      parameters: {
        language: 'python',
        pythonCode: `
import json
import re
from datetime import datetime, timedelta
import hashlib

# Process AI extraction results
data = items[0]['json']
ai_results = data.get('ai_results', {})

# Enhanced extraction with confidence scoring
def extract_auctions(ai_data):
    auctions = []
    
    for item in ai_data.get('auctions', []):
        # Generate deterministic ID
        id_string = f"{item.get('case_number', '')}-{item.get('sale_date', '')}"
        auction_id = hashlib.md5(id_string.encode()).hexdigest()[:12]
        
        # Process and validate each auction
        auction = {
            'id': auction_id,
            'case_number': item.get('case_number', '').strip(),
            'sale_date': item.get('sale_date'),
            'property_address': item.get('property_address', '').strip(),
            'assessed_value': item.get('assessed_value', 0),
            'minimum_bid': item.get('minimum_bid', 0),
            'confidence_score': item.get('confidence', 0.5),
            'extraction_method': 'ai_orchestrated',
            'county': 'Miami-Dade',
            'created_at': datetime.now().isoformat()
        }
        
        # Validate required fields
        if auction['case_number'] and auction['sale_date']:
            auctions.append(auction)
    
    return auctions

# Extract and process
processed_auctions = extract_auctions(ai_results)

# Calculate metrics
total_found = len(processed_auctions)
avg_confidence = sum(a['confidence_score'] for a in processed_auctions) / total_found if total_found > 0 else 0

return {
    'auctions': processed_auctions,
    'metrics': {
        'total_found': total_found,
        'avg_confidence': avg_confidence,
        'extraction_time': datetime.now().isoformat()
    }
}
`
      }
    },
    {
      id: 'supabase-upsert',
      name: 'Save to Supabase',
      type: 'n8n-nodes-base.supabase',
      typeVersion: 1,
      position: [1050, 300],
      parameters: {
        operation: 'upsert',
        tableId: 'auctions',
        upsertColumn: 'id',
        dataToSend: 'defineBelow',
        fieldsToSend: {
          values: [
            { fieldName: 'id', fieldValue: '={{ $json.id }}' },
            { fieldName: 'case_number', fieldValue: '={{ $json.case_number }}' },
            { fieldName: 'sale_date', fieldValue: '={{ $json.sale_date }}' },
            { fieldName: 'property_address', fieldValue: '={{ $json.property_address }}' },
            { fieldName: 'assessed_value', fieldValue: '={{ $json.assessed_value }}' },
            { fieldName: 'minimum_bid', fieldValue: '={{ $json.minimum_bid }}' },
            { fieldName: 'confidence_score', fieldValue: '={{ $json.confidence_score }}' },
            { fieldName: 'county', fieldValue: '={{ $json.county }}' },
            { fieldName: 'created_at', fieldValue: '={{ $json.created_at }}' }
          ]
        }
      }
    },
    {
      id: 'log-extraction',
      name: 'Log Extraction Results',
      type: 'n8n-nodes-base.supabase',
      typeVersion: 1,
      position: [1050, 450],
      parameters: {
        operation: 'create',
        tableId: 'extraction_logs',
        dataToSend: 'defineBelow',
        fieldsToSend: {
          values: [
            { fieldName: 'workflow_name', fieldValue: 'Super-Smart Calendar Scraper' },
            { fieldName: 'county', fieldValue: 'Miami-Dade' },
            { fieldName: 'records_processed', fieldValue: '={{ $json.metrics.total_found }}' },
            { fieldName: 'confidence_score', fieldValue: '={{ $json.metrics.avg_confidence }}' },
            { fieldName: 'strategy', fieldValue: 'ai_orchestrated_python' },
            { fieldName: 'created_at', fieldValue: '={{ $json.metrics.extraction_time }}' }
          ]
        }
      }
    }
  ],
  connections: {
    'schedule-trigger': {
      main: [[{ node: 'fetch-calendar', type: 'main', index: 0 }]]
    },
    'fetch-calendar': {
      main: [[{ node: 'ai-orchestrator', type: 'main', index: 0 }]]
    },
    'ai-orchestrator': {
      main: [[{ node: 'code-processor', type: 'main', index: 0 }]]
    },
    'code-processor': {
      main: [
        [{ node: 'supabase-upsert', type: 'main', index: 0 }],
        [{ node: 'log-extraction', type: 'main', index: 0 }]
      ]
    }
  },
  settings: {
    executionOrder: 'v1'
  }
};

const AI_AGENT_WORKFLOW: Workflow = {
  name: 'AI Calendar Scraper Agent v2',
  nodes: [
    {
      id: 'schedule-trigger',
      name: 'Schedule Trigger',
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
      id: 'fetch-calendar',
      name: 'Fetch Calendar Page',
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
      id: 'ai-agent',
      name: 'AI Extraction Agent',
      type: 'n8n-nodes-base.openAi',
      typeVersion: 1.1,
      position: [650, 300],
      parameters: {
        resource: 'chat',
        operation: 'complete',
        modelId: 'gpt-4-turbo-preview',
        messages: {
          values: [
            {
              role: 'system',
              content: `You are an AI agent specialized in extracting tax deed auction data.
Extract all auction information including:
- Case numbers
- Sale dates and times
- Property addresses
- Assessed values
- Minimum bid amounts
Return as structured JSON.`
            },
            {
              role: 'user',
              content: '={{ $json.data }}'
            }
          ]
        },
        options: {
          temperature: 0.1,
          responseFormat: { type: 'json_object' }
        }
      }
    },
    {
      id: 'transform-data',
      name: 'Transform Data',
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
              value: '={{ $json.auctions }}'
            },
            {
              name: 'extraction_metadata',
              type: 'json',
              value: '={{ { "method": "ai_agent", "timestamp": $now.toISO() } }}'
            }
          ]
        }
      }
    },
    {
      id: 'save-to-supabase',
      name: 'Save Auctions',
      type: 'n8n-nodes-base.supabase',
      typeVersion: 1,
      position: [1050, 300],
      parameters: {
        operation: 'upsert',
        tableId: 'auctions',
        upsertColumn: 'case_number',
        dataToSend: 'autoMapInputData'
      }
    }
  ],
  connections: {
    'schedule-trigger': {
      main: [[{ node: 'fetch-calendar', type: 'main', index: 0 }]]
    },
    'fetch-calendar': {
      main: [[{ node: 'ai-agent', type: 'main', index: 0 }]]
    },
    'ai-agent': {
      main: [[{ node: 'transform-data', type: 'main', index: 0 }]]
    },
    'transform-data': {
      main: [[{ node: 'save-to-supabase', type: 'main', index: 0 }]]
    }
  },
  settings: {
    executionOrder: 'v1'
  }
};

const PYTHON_ENHANCED_WORKFLOW: Workflow = {
  name: 'Python-Enhanced Calendar Scraper v2',
  nodes: [
    {
      id: 'schedule-trigger',
      name: 'Schedule Trigger',
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
      id: 'fetch-calendar',
      name: 'Fetch Calendar',
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
      id: 'python-extractor',
      name: 'Python HTML Parser',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [650, 300],
      parameters: {
        language: 'python',
        pythonCode: `
from bs4 import BeautifulSoup
import re
from datetime import datetime
import json

# Parse HTML
html_content = items[0]['json']['data']
soup = BeautifulSoup(html_content, 'html.parser')

auctions = []

# Strategy 1: Find tables
tables = soup.find_all('table')
for table in tables:
    rows = table.find_all('tr')
    for row in rows[1:]:  # Skip header
        cells = row.find_all(['td', 'th'])
        if len(cells) >= 3:
            case_match = re.search(r'\\d{4}-\\d+', str(cells[0]))
            if case_match:
                auction = {
                    'case_number': case_match.group(),
                    'sale_date': cells[1].get_text(strip=True) if len(cells) > 1 else '',
                    'property_address': cells[2].get_text(strip=True) if len(cells) > 2 else '',
                    'extraction_method': 'table_parser'
                }
                auctions.append(auction)

# Strategy 2: Find divs with calendar class
calendar_divs = soup.find_all('div', class_=re.compile('calendar|auction|sale'))
for div in calendar_divs:
    text = div.get_text()
    case_matches = re.findall(r'\\d{4}-\\d+', text)
    for case in case_matches:
        auction = {
            'case_number': case,
            'extraction_method': 'div_parser'
        }
        auctions.append(auction)

# Deduplicate by case number
unique_auctions = {a['case_number']: a for a in auctions}.values()

return [{
    'auctions': list(unique_auctions),
    'total_found': len(unique_auctions),
    'extraction_time': datetime.now().isoformat()
}]
`
      }
    },
    {
      id: 'save-results',
      name: 'Save to Supabase',
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
    'schedule-trigger': {
      main: [[{ node: 'fetch-calendar', type: 'main', index: 0 }]]
    },
    'fetch-calendar': {
      main: [[{ node: 'python-extractor', type: 'main', index: 0 }]]
    },
    'python-extractor': {
      main: [[{ node: 'save-results', type: 'main', index: 0 }]]
    }
  },
  settings: {
    executionOrder: 'v1'
  }
};

async function deployWorkflow(workflow: Workflow) {
  try {
    log(`\n📦 Deploying: ${workflow.name}`, 'cyan');
    
    // Validate workflow first
    const validation = await n8nMCP.validateWorkflow(workflow);
    if (!validation.valid) {
      log(`   ❌ Validation failed: ${validation.errors?.join(', ')}`, 'red');
      return null;
    }
    
    // Deploy using upsert
    const result = await n8nMCP.upsertWorkflow(workflow);
    log(`   ✅ Deployed successfully! ID: ${result.id}`, 'green');
    
    // Check for webhook URL
    const webhookUrl = n8nMCP.getWebhookUrl(result);
    if (webhookUrl) {
      log(`   🔗 Webhook URL: ${webhookUrl}`, 'blue');
    }
    
    return result;
  } catch (error: any) {
    log(`   ❌ Deployment failed: ${error.message}`, 'red');
    if (error.response?.data) {
      log(`   Details: ${JSON.stringify(error.response.data, null, 2)}`, 'yellow');
    }
    return null;
  }
}

async function saveWorkflowFiles() {
  const workflowDir = path.join(process.cwd(), 'n8n', 'workflows');
  
  if (!fs.existsSync(workflowDir)) {
    fs.mkdirSync(workflowDir, { recursive: true });
  }
  
  const workflows = [
    { name: 'super-smart-calendar-scraper-v2.json', data: SUPER_SMART_WORKFLOW },
    { name: 'ai-calendar-scraper-agent-v2.json', data: AI_AGENT_WORKFLOW },
    { name: 'python-enhanced-calendar-scraper-v2.json', data: PYTHON_ENHANCED_WORKFLOW }
  ];
  
  for (const { name, data } of workflows) {
    const filePath = path.join(workflowDir, name);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    log(`   📄 Saved: ${name}`, 'green');
  }
}

async function main() {
  log('\n🚀 Rebuilding Super-Smart Workflows with Correct Node Types', 'bright');
  log('=' .repeat(60), 'bright');
  
  // Save workflow files
  log('\n📄 Saving workflow files...', 'cyan');
  await saveWorkflowFiles();
  
  // Deploy workflows
  log('\n🔄 Deploying workflows to n8n...', 'cyan');
  
  const results = [];
  results.push(await deployWorkflow(SUPER_SMART_WORKFLOW));
  results.push(await deployWorkflow(AI_AGENT_WORKFLOW));
  results.push(await deployWorkflow(PYTHON_ENHANCED_WORKFLOW));
  
  // Summary
  const successful = results.filter(r => r !== null).length;
  const failed = results.filter(r => r === null).length;
  
  log('\n' + '='.repeat(60), 'bright');
  log('📊 Deployment Summary', 'bright');
  log('='.repeat(60), 'bright');
  log(`✅ Successful: ${successful}`, 'green');
  if (failed > 0) {
    log(`❌ Failed: ${failed}`, 'red');
  }
  
  if (successful > 0) {
    log('\n🎯 Next Steps:', 'cyan');
    log('1. Open n8n UI: http://localhost:5678', 'yellow');
    log('2. Configure credentials:', 'yellow');
    log('   - OpenAI API key', 'yellow');
    log('   - Supabase credentials', 'yellow');
    log('3. Activate workflows (toggle switch)', 'yellow');
    log('4. Test with: npm run n8n:test', 'yellow');
    log('5. Monitor with: npm run n8n:monitor', 'yellow');
  }
}

main().catch((error) => {
  log(`\n❌ Fatal error: ${error.message}`, 'red');
  process.exit(1);
});
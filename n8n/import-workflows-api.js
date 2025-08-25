#!/usr/bin/env node

/**
 * n8n Workflow Import Script
 * Directly imports workflows to n8n using the API
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Configuration from n8n-mcp .env
const N8N_API_URL = 'http://localhost:5678';
const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmMDYwNjYyMC01YmU3LTQ3Y2QtYWE5MS0xZmU3ZmMyMDAzYjciLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU2MTM1MjU1fQ.UQHnMwQbLd_AgP0sm3FwpLrSmUmJ8qsLxpHI9O6uPY4';

// Workflow files to import
const WORKFLOWS = [
  {
    file: 'property-enrichment-supabase.json',
    name: 'Tax Deed - Property Enrichment (Supabase)',
    active: true
  },
  {
    file: 'inspection-report-workflow.json',
    name: 'Tax Deed - Inspection Report Generator',
    active: true
  },
  {
    file: 'auction-scraper-workflow.json',
    name: 'Tax Deed - Auction Scraper (Scheduled)',
    active: false // Start inactive for scheduled workflows
  },
  {
    file: 'miami-dade-scraper-detailed.json',
    name: 'Miami-Dade Tax Deed Scraper (Detailed)',
    active: false // Start inactive for scheduled workflows
  },
  {
    file: 'county-business-patterns-enrichment.json',
    name: 'Tax Deed - County Business Patterns Enrichment',
    active: false // Start inactive for safety
  }
];

// Helper function to make API requests
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(N8N_API_URL + path);
    const options = {
      method: method,
      hostname: url.hostname,
      port: url.port || 5678,
      path: url.pathname + url.search,
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    const protocol = url.protocol === 'https:' ? https : http;
    const req = protocol.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`API Error ${res.statusCode}: ${parsed.message || responseData}`));
          }
        } catch (e) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(responseData);
          } else {
            reject(new Error(`API Error ${res.statusCode}: ${responseData}`));
          }
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Import a single workflow
async function importWorkflow(workflowConfig) {
  const workflowPath = path.join(__dirname, 'workflows', workflowConfig.file);
  
  console.log(`\n📄 Importing: ${workflowConfig.name}`);
  console.log(`   File: ${workflowConfig.file}`);
  
  // Check if file exists
  if (!fs.existsSync(workflowPath)) {
    console.error(`   ❌ File not found: ${workflowPath}`);
    return null;
  }
  
  // Read workflow file
  let workflowData;
  try {
    const fileContent = fs.readFileSync(workflowPath, 'utf8');
    workflowData = JSON.parse(fileContent);
  } catch (error) {
    console.error(`   ❌ Error reading file: ${error.message}`);
    return null;
  }
  
  // Update workflow name and active status
  workflowData.name = workflowConfig.name;
  workflowData.active = workflowConfig.active || false;
  
  // Create workflow via API
  try {
    const result = await makeRequest('POST', '/api/v1/workflows', workflowData);
    console.log(`   ✅ Created workflow with ID: ${result.id}`);
    
    // Extract webhook URL if it exists
    if (result.nodes) {
      const webhookNode = result.nodes.find(n => n.type === 'n8n-nodes-base.webhook');
      if (webhookNode) {
        const webhookPath = webhookNode.parameters?.path || webhookNode.webhookId;
        const webhookUrl = `${N8N_API_URL}/webhook/${result.id}/${webhookPath}`;
        console.log(`   🔗 Webhook URL: ${webhookUrl}`);
        return { ...result, webhookUrl };
      }
    }
    
    return result;
  } catch (error) {
    console.error(`   ❌ Error creating workflow: ${error.message}`);
    return null;
  }
}

// Main import function
async function importAllWorkflows() {
  console.log('=====================================');
  console.log('n8n Workflow Import Script');
  console.log('=====================================');
  console.log(`n8n API: ${N8N_API_URL}`);
  console.log(`API Key: ${N8N_API_KEY.substring(0, 20)}...`);
  
  // Test API connection
  console.log('\n🔍 Testing n8n API connection...');
  try {
    const workflows = await makeRequest('GET', '/api/v1/workflows');
    console.log(`✅ Connected! Found ${workflows.data?.length || 0} existing workflows`);
  } catch (error) {
    console.error(`❌ Failed to connect to n8n API: ${error.message}`);
    console.error('Please ensure:');
    console.error('1. n8n is running at http://localhost:5678');
    console.error('2. API is enabled in n8n settings');
    console.error('3. API key is valid');
    process.exit(1);
  }
  
  // Import each workflow
  const results = [];
  for (const workflow of WORKFLOWS) {
    const result = await importWorkflow(workflow);
    if (result) {
      results.push(result);
    }
  }
  
  // Summary
  console.log('\n=====================================');
  console.log('Import Summary');
  console.log('=====================================');
  console.log(`✅ Successfully imported: ${results.length}/${WORKFLOWS.length} workflows`);
  
  if (results.length > 0) {
    console.log('\n📝 Update your .env.local with these webhook URLs:\n');
    results.forEach(r => {
      if (r.webhookUrl) {
        const envName = r.name.includes('Enrichment') ? 'N8N_ENRICHMENT_WEBHOOK' :
                       r.name.includes('Inspection') ? 'N8N_INSPECTION_WEBHOOK' :
                       r.name.includes('Auction') ? 'N8N_AUCTION_SCRAPER' :
                       'N8N_WORKFLOW_WEBHOOK';
        console.log(`${envName}=${r.webhookUrl}`);
      }
    });
  }
  
  console.log('\n✨ Import complete!');
  console.log('Next steps:');
  console.log('1. Go to n8n UI: http://localhost:5678');
  console.log('2. Configure Supabase credentials for each workflow');
  console.log('3. Activate workflows as needed');
}

// Run the import
importAllWorkflows().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
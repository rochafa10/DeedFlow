#!/usr/bin/env node

/**
 * Direct Deployment of County Business Patterns Enrichment Workflow
 * Uses the same approach as the existing import script
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Configuration from n8n-mcp .env
const N8N_API_URL = 'http://localhost:5678';
const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmMDYwNjYyMC01YmU3LTQ3Y2QtYWE5MS0xZmU3ZmMyMDAzYjciLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU2MTM1MjU1fQ.UQHnMwQbLd_AgP0sm3FwpLrSmUmJ8qsLxpHI9O6uPY4';

const WORKFLOW_FILE = path.join(__dirname, 'n8n-workflows/workflows/tax-deed-county-business-patterns-simple.json');

// Helper function to make API requests (same as import script)
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

async function deployCountyWorkflow() {
  console.log('🚀 Deploying County Business Patterns Enrichment Workflow\n');
  
  try {
    // Read workflow file
    if (!fs.existsSync(WORKFLOW_FILE)) {
      throw new Error(`Workflow file not found: ${WORKFLOW_FILE}`);
    }
    
    const workflowData = JSON.parse(fs.readFileSync(WORKFLOW_FILE, 'utf8'));
    console.log('✅ Workflow file loaded successfully');
    console.log(`   Name: ${workflowData.name}`);
    console.log(`   Total nodes: ${workflowData.nodes.length}`);
    
    // Test API connection first
    console.log('\n🔍 Testing n8n API connection...');
    try {
      const workflows = await makeRequest('GET', '/api/v1/workflows');
      console.log(`✅ Connected! Found ${workflows.data?.length || 0} existing workflows`);
    } catch (error) {
      throw new Error(`Failed to connect to n8n API: ${error.message}`);
    }
    
    // Deploy workflow
    console.log('\n📤 Deploying workflow to n8n...');
    const result = await makeRequest('POST', '/api/v1/workflows', workflowData);
    
    console.log('✅ Workflow deployed successfully!');
    console.log(`   Workflow ID: ${result.id}`);
    
    // Extract webhook URL
    if (result.nodes) {
      const webhookNode = result.nodes.find(n => n.type === 'n8n-nodes-base.webhook');
      if (webhookNode) {
        const webhookPath = webhookNode.parameters?.path || webhookNode.webhookId;
        const webhookUrl = `${N8N_API_URL}/webhook/${result.id}/${webhookPath}`;
        console.log(`   🔗 Webhook URL: ${webhookUrl}`);
        
        // Save deployment info
        const deploymentInfo = {
          workflow_id: result.id,
          name: workflowData.name,
          webhook_url: webhookUrl,
          n8n_url: `${N8N_API_URL}/workflow/${result.id}`,
          deployed_at: new Date().toISOString(),
          status: 'deployed'
        };
        
        const deploymentFile = path.join(__dirname, 'county-enrichment-deployment.json');
        fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
        console.log(`\n📝 Deployment info saved to: ${deploymentFile}`);
        
        console.log('\n🎉 Deployment Complete!');
        console.log('\n📋 Next Steps:');
        console.log('   1. Visit the workflow in n8n UI:');
        console.log(`      ${deploymentInfo.n8n_url}`);
        console.log('   2. Configure Supabase credentials');
        console.log('   3. Activate the workflow when ready');
        console.log('   4. Test with the webhook URL:');
        console.log(`      ${deploymentInfo.webhook_url}`);
        
        return result;
      }
    }
    
    console.log('⚠️  Could not determine webhook URL');
    return result;
    
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Ensure n8n is running at:', N8N_API_URL);
    console.log('   2. Check if the API key is correct');
    console.log('   3. Verify the workflow file exists');
    console.log('   4. Check n8n logs for any errors');
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  deployCountyWorkflow().catch(console.error);
}

module.exports = { deployCountyWorkflow };

#!/usr/bin/env node

/**
 * Deploy County Business Patterns Enrichment Workflow to n8n
 * 
 * This script deploys the county enrichment workflow to your n8n instance
 * Run with: node deploy-county-enrichment.js
 */

const fs = require('fs');
const path = require('path');

// Configuration
const N8N_BASE_URL = process.env.N8N_BASE_URL || 'http://localhost:5678';
const N8N_API_KEY = process.env.N8N_API_KEY || 'your-api-key';
const WORKFLOW_FILE = path.join(__dirname, 'n8n-workflows/workflows/tax-deed-county-business-patterns-simple.json');

async function deployWorkflow() {
  console.log('🚀 Deploying County Business Patterns Enrichment Workflow to n8n...\n');

  try {
    // Read workflow file
    if (!fs.existsSync(WORKFLOW_FILE)) {
      throw new Error(`Workflow file not found: ${WORKFLOW_FILE}`);
    }

    const workflowData = JSON.parse(fs.readFileSync(WORKFLOW_FILE, 'utf8'));
    console.log('✅ Workflow file loaded successfully');
    console.log(`   Name: ${workflowData.name}`);
    console.log(`   Total nodes: ${workflowData.nodes.length}`);

    // Check if n8n is accessible
    console.log('\n🔍 Checking n8n instance accessibility...');
    const healthResponse = await fetch(`${N8N_BASE_URL}/healthz`);
    
    if (!healthResponse.ok) {
      throw new Error(`n8n instance not accessible at ${N8N_BASE_URL}`);
    }
    console.log('✅ n8n instance is accessible');

    // Deploy workflow using n8n API
    console.log('\n📤 Deploying workflow to n8n...');
    
    const deployResponse = await fetch(`${N8N_BASE_URL}/api/v1/workflows`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': N8N_API_KEY
      },
      body: JSON.stringify(workflowData)
    });

    if (!deployResponse.ok) {
      const errorText = await deployResponse.text();
      throw new Error(`Failed to deploy workflow: ${deployResponse.status} ${deployResponse.statusText}\n${errorText}`);
    }

    const deployedWorkflow = await deployResponse.json();
    console.log('✅ Workflow deployed successfully!');
    console.log(`   Workflow ID: ${deployedWorkflow.id}`);
    console.log(`   Webhook URL: ${N8N_BASE_URL}/webhook/${deployedWorkflow.id}/county-enrichment`);
    console.log(`   Status: ${deployedWorkflow.active ? 'Active' : 'Inactive'}`);

    // Create deployment info file
    const deploymentInfo = {
      workflow_id: deployedWorkflow.id,
      name: workflowData.name,
      webhook_path: "county-enrichment",
      webhook_url: `${N8N_BASE_URL}/webhook/${deployedWorkflow.id}/county-enrichment`,
      n8n_url: `${N8N_BASE_URL}/workflow/${deployedWorkflow.id}`,
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
    console.log('   2. Review and configure the workflow');
    console.log('   3. Activate the workflow when ready');
    console.log('   4. Test with the webhook URL:');
    console.log(`      ${deploymentInfo.webhook_url}`);
    console.log('\n🔧 To activate the workflow:');
    console.log('   1. Open the workflow in n8n UI');
    console.log('   2. Click the "Active" toggle switch');
    console.log('   3. Save the workflow');

  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Ensure n8n is running at:', N8N_BASE_URL);
    console.log('   2. Check if N8N_API_KEY is set correctly');
    console.log('   3. Verify the workflow file exists');
    console.log('   4. Check n8n logs for any errors');
    process.exit(1);
  }
}

// Test the workflow before deployment
async function testWorkflow() {
  console.log('🧪 Testing workflow configuration...\n');
  
  try {
    const workflowData = JSON.parse(fs.readFileSync(WORKFLOW_FILE, 'utf8'));
    
    // Validate workflow structure
    const requiredFields = ['name', 'nodes', 'connections'];
    for (const field of requiredFields) {
      if (!workflowData[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    // Validate nodes
    if (!Array.isArray(workflowData.nodes) || workflowData.nodes.length === 0) {
      throw new Error('Workflow must have at least one node');
    }
    
    // Check for webhook trigger
    const webhookNode = workflowData.nodes.find(node => node.type === 'n8n-nodes-base.webhook');
    if (!webhookNode) {
      throw new Error('Workflow must have a webhook trigger node');
    }
    
    console.log('✅ Workflow validation passed');
    console.log(`   Total nodes: ${workflowData.nodes.length}`);
    console.log(`   Webhook path: ${webhookNode.parameters?.path || 'N/A'}`);
    
    return true;
  } catch (error) {
    console.error('❌ Workflow validation failed:', error.message);
    return false;
  }
}

// Main execution
async function main() {
  console.log('🏗️  County Business Patterns Enrichment Workflow Deployment\n');
  
  // Test workflow first
  const isValid = await testWorkflow();
  if (!isValid) {
    process.exit(1);
  }
  
  // Deploy workflow
  await deployWorkflow();
}

// Execute if run directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { deployWorkflow, testWorkflow };

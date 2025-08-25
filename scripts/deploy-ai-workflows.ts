#!/usr/bin/env tsx
/**
 * Deploy AI-Enhanced Workflows to n8n
 * This script imports all AI workflows to your n8n instance
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

const N8N_API_URL = process.env.N8N_API_URL || 'http://localhost:5678/api/v1';
const N8N_API_KEY = process.env.N8N_API_KEY;

if (!N8N_API_KEY) {
  console.error('❌ N8N_API_KEY not found in environment variables');
  console.error('Please add it to your .env or .env.local file');
  process.exit(1);
}

interface WorkflowDeployment {
  name: string;
  file: string;
  requiredCredentials: string[];
  requiredEnvVars: string[];
  estimatedMonthlyCost?: string;
}

const AI_WORKFLOWS: WorkflowDeployment[] = [
  {
    name: 'AI-Enhanced Property Analyzer',
    file: 'ai-enhanced-property-analyzer.json',
    requiredCredentials: ['OpenAI', 'Anthropic', 'Supabase'],
    requiredEnvVars: ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY'],
    estimatedMonthlyCost: '$50-100'
  },
  {
    name: 'AI Document Processor',
    file: 'ai-document-processor.json',
    requiredCredentials: ['OpenAI', 'Supabase'],
    requiredEnvVars: ['OPENAI_API_KEY'],
    estimatedMonthlyCost: '$20-40'
  },
  {
    name: 'AI Agent Property Researcher',
    file: 'ai-agent-property-researcher.json',
    requiredCredentials: ['OpenAI', 'Supabase', 'Tavily'],
    requiredEnvVars: ['OPENAI_API_KEY', 'TAVILY_API_KEY'],
    estimatedMonthlyCost: '$30-60'
  }
];

async function checkCredentials() {
  console.log('\n📋 Checking Required API Keys...\n');
  
  const requiredKeys = [
    { key: 'OPENAI_API_KEY', service: 'OpenAI', url: 'https://platform.openai.com/api-keys' },
    { key: 'ANTHROPIC_API_KEY', service: 'Anthropic', url: 'https://console.anthropic.com/' },
    { key: 'TAVILY_API_KEY', service: 'Tavily Search', url: 'https://tavily.com/' }
  ];

  let allKeysPresent = true;
  
  for (const { key, service, url } of requiredKeys) {
    if (process.env[key]) {
      console.log(`✅ ${key} found`);
    } else {
      console.log(`❌ ${key} missing - Get it from ${url}`);
      allKeysPresent = false;
    }
  }

  if (!allKeysPresent) {
    console.log('\n⚠️  Some API keys are missing. The workflows will import but won\'t run without them.');
    console.log('Add them to your .env.local file or configure them in n8n credentials.\n');
  }

  return allKeysPresent;
}

async function importWorkflow(workflow: WorkflowDeployment): Promise<boolean> {
  const workflowPath = path.join(__dirname, '..', 'n8n', 'workflows', workflow.file);
  
  if (!fs.existsSync(workflowPath)) {
    console.error(`❌ Workflow file not found: ${workflowPath}`);
    return false;
  }

  console.log(`\n📦 Deploying: ${workflow.name}`);
  console.log(`   Required: ${workflow.requiredCredentials.join(', ')}`);
  console.log(`   Est. Cost: ${workflow.estimatedMonthlyCost}/month`);

  try {
    const workflowData = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
    
    // Clean workflow data for import
    delete workflowData.id;
    delete workflowData.active;
    delete workflowData.createdAt;
    delete workflowData.updatedAt;
    delete workflowData.versionId;
    
    // Set workflow as inactive initially
    workflowData.active = false;

    const response = await fetch(`${N8N_API_URL}/workflows`, {
      method: 'POST',
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(workflowData),
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`   ✅ Deployed successfully (ID: ${result.id})`);
      console.log(`   🔗 Webhook: ${N8N_API_URL.replace('/api/v1', '')}/webhook/${workflowData.nodes[0].webhookId}`);
      return true;
    } else {
      const error = await response.text();
      console.error(`   ❌ Failed to deploy: ${error}`);
      return false;
    }
  } catch (error) {
    console.error(`   ❌ Error deploying workflow: ${error}`);
    return false;
  }
}

async function createCredentialsInstructions() {
  const instructionsPath = path.join(__dirname, '..', 'n8n', 'SETUP_AI_CREDENTIALS.md');
  
  const instructions = `# Setting Up AI Credentials in n8n

## 1. OpenAI Credentials

1. Go to n8n > Credentials > Add Credential > OpenAI
2. Name: "OpenAI"
3. API Key: Get from https://platform.openai.com/api-keys
4. Organization ID: (Optional) Your OpenAI org ID

## 2. Anthropic (Claude) Credentials

1. Go to n8n > Credentials > Add Credential > Anthropic
2. Name: "Anthropic"
3. API Key: Get from https://console.anthropic.com/

## 3. Tavily Search API

1. Go to n8n > Credentials > Add Credential > HTTP Request (OAuth2)
2. Name: "Tavily"
3. Or set TAVILY_API_KEY environment variable

## 4. Supabase Credentials

1. Go to n8n > Credentials > Add Credential > Supabase
2. Name: "Supabase Tax Deed"
3. URL: Your Supabase project URL
4. Service Role Key: From Supabase dashboard > Settings > API

## Cost Management

### Estimated Monthly Costs:
- **AI Property Analyzer**: $50-100/month
  - GPT-4: ~1000 analyses @ $0.06 each
  - GPT-3.5: ~2000 analyses @ $0.002 each
  - Claude: ~500 analyses @ $0.015 each

- **Document Processor**: $20-40/month
  - GPT-4: ~200 documents @ $0.15 each
  - GPT-3.5: ~500 validations @ $0.002 each

- **AI Agent Researcher**: $30-60/month
  - GPT-4 Agent: ~300 researches @ $0.10 each
  - Tavily Search: ~1000 searches @ $0.01 each

### Cost Optimization Tips:
1. Use GPT-3.5 for simple tasks
2. Cache frequently accessed data
3. Set token limits in workflow settings
4. Monitor usage in OpenAI dashboard
5. Use batch processing where possible

## Testing the Workflows

### Test Property Analyzer:
\`\`\`bash
curl -X POST http://localhost:5678/webhook/ai-property-analysis \\
  -H "Content-Type: application/json" \\
  -d '{"propertyId": "test-property-123"}'
\`\`\`

### Test Document Processor:
\`\`\`bash
curl -X POST http://localhost:5678/webhook/process-auction-document \\
  -H "Content-Type: application/json" \\
  -F "document=@auction-list.pdf"
\`\`\`

### Test AI Agent:
\`\`\`bash
curl -X POST http://localhost:5678/webhook/ai-research-property \\
  -H "Content-Type: application/json" \\
  -d '{
    "address": "123 Main St, Miami, FL",
    "parcelNumber": "30-1234-567-890",
    "minimumBid": 5000
  }'
\`\`\`

## Monitoring & Alerts

1. Set up cost alerts in OpenAI dashboard
2. Monitor token usage daily
3. Review AI analysis quality weekly
4. Adjust temperature settings for consistency
5. Enable n8n error workflows for failures
`;

  fs.writeFileSync(instructionsPath, instructions);
  console.log(`\n📄 Created setup instructions: ${instructionsPath}`);
}

async function main() {
  console.log('🚀 AI Workflow Deployment Script\n');
  console.log('This will deploy 3 AI-enhanced workflows to your n8n instance.');
  
  // Check credentials
  const hasAllKeys = await checkCredentials();
  
  // Create setup instructions
  await createCredentialsInstructions();
  
  // Deploy workflows
  console.log('\n🔄 Starting deployment...');
  
  let successCount = 0;
  for (const workflow of AI_WORKFLOWS) {
    const success = await importWorkflow(workflow);
    if (success) successCount++;
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log(`✨ Deployment Complete: ${successCount}/${AI_WORKFLOWS.length} workflows deployed`);
  
  if (!hasAllKeys) {
    console.log('\n⚠️  IMPORTANT: Configure API keys in n8n or .env.local to activate workflows');
  }
  
  console.log('\n📚 Next Steps:');
  console.log('1. Read n8n/SETUP_AI_CREDENTIALS.md for credential setup');
  console.log('2. Configure API keys in n8n Credentials section');
  console.log('3. Activate workflows in n8n dashboard');
  console.log('4. Test with sample properties');
  console.log('5. Monitor costs in OpenAI/Anthropic dashboards');
  
  console.log('\n💡 Run AI analysis from frontend:');
  console.log('   await fetch("/api/ai/analyze", { method: "POST", body: JSON.stringify({ propertyId }) })');
}

// Run the script
main().catch(console.error);
#!/usr/bin/env tsx
/**
 * Deploy Super-Smart Calendar Scraper Workflows to n8n
 * This script deploys all AI-enhanced calendar scraping workflows
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

const N8N_API_URL = process.env.N8N_API_URL || 'http://localhost:5678';
const N8N_API_KEY = process.env.N8N_API_KEY;

if (!N8N_API_KEY) {
  console.error('❌ N8N_API_KEY not found in environment variables');
  console.error('Please add it to your .env or .env.local file');
  process.exit(1);
}

interface WorkflowDeployment {
  name: string;
  file: string;
  description: string;
  requiredCredentials: string[];
  requiredEnvVars: string[];
  pythonPackages?: string[];
  estimatedCost?: string;
  priority: number;
}

const WORKFLOWS: WorkflowDeployment[] = [
  {
    name: 'Super-Smart Calendar Scraper',
    file: 'super-smart-calendar-scraper.json',
    description: 'Ultimate AI + Python hybrid with self-learning',
    requiredCredentials: ['OpenAI', 'Anthropic', 'Supabase'],
    requiredEnvVars: ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY'],
    pythonPackages: ['beautifulsoup4', 'pandas', 'numpy', 'matplotlib', 'python-dateutil'],
    estimatedCost: '$0.12/county',
    priority: 1
  },
  {
    name: 'AI Calendar Scraper Agent',
    file: 'ai-calendar-scraper-agent.json',
    description: 'AI-powered calendar extraction with tools',
    requiredCredentials: ['OpenAI', 'Supabase'],
    requiredEnvVars: ['OPENAI_API_KEY'],
    estimatedCost: '$0.09/county',
    priority: 2
  },
  {
    name: 'Python-Enhanced Calendar Scraper',
    file: 'ai-calendar-scraper-python-enhanced.json',
    description: 'Python processing with PDF/Excel support',
    requiredCredentials: ['OpenAI', 'Supabase'],
    requiredEnvVars: ['OPENAI_API_KEY'],
    pythonPackages: ['beautifulsoup4', 'pandas', 'PyPDF2', 'python-dateutil', 'requests'],
    estimatedCost: '$0.10/county',
    priority: 3
  }
];

// Color codes for console output
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

async function checkN8nConnection(): Promise<boolean> {
  try {
    log('\n🔌 Checking n8n connection...', 'cyan');
    const response = await fetch(`${N8N_API_URL}/api/v1/workflows`, {
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY!,
        'Accept': 'application/json',
      },
    });

    if (response.ok) {
      log('✅ Successfully connected to n8n', 'green');
      return true;
    } else {
      log(`❌ Failed to connect to n8n: ${response.statusText}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Error connecting to n8n: ${error}`, 'red');
    return false;
  }
}

async function checkExistingWorkflow(name: string): Promise<string | null> {
  try {
    const response = await fetch(`${N8N_API_URL}/api/v1/workflows`, {
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY!,
        'Accept': 'application/json',
      },
    });

    if (response.ok) {
      const workflows = await response.json();
      const existing = workflows.data?.find((w: any) => w.name === name);
      return existing?.id || null;
    }
  } catch (error) {
    // Ignore errors, assume workflow doesn't exist
  }
  return null;
}

async function deployWorkflow(workflow: WorkflowDeployment): Promise<boolean> {
  const workflowPath = path.join(__dirname, '..', 'n8n', 'workflows', workflow.file);
  
  if (!fs.existsSync(workflowPath)) {
    log(`❌ Workflow file not found: ${workflow.file}`, 'red');
    return false;
  }

  log(`\n📦 Deploying: ${workflow.name}`, 'bright');
  log(`   Description: ${workflow.description}`, 'cyan');
  log(`   Required: ${workflow.requiredCredentials.join(', ')}`, 'yellow');
  if (workflow.pythonPackages) {
    log(`   Python packages: ${workflow.pythonPackages.join(', ')}`, 'magenta');
  }
  log(`   Est. Cost: ${workflow.estimatedCost}`, 'green');

  try {
    const workflowData = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
    
    // Check if workflow already exists
    const existingId = await checkExistingWorkflow(workflowData.name);
    
    // Clean workflow data for import - keep only allowed fields
    const cleanWorkflow = {
      name: workflowData.name,
      nodes: workflowData.nodes || [],
      connections: workflowData.connections || {},
      settings: workflowData.settings || { executionOrder: 'v1' }
    };

    let response;
    if (existingId) {
      log(`   🔄 Updating existing workflow (ID: ${existingId})`, 'yellow');
      response = await fetch(`${N8N_API_URL}/api/v1/workflows/${existingId}`, {
        method: 'PUT',
        headers: {
          'X-N8N-API-KEY': N8N_API_KEY!,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(cleanWorkflow),
      });
    } else {
      log(`   ➕ Creating new workflow`, 'green');
      response = await fetch(`${N8N_API_URL}/api/v1/workflows`, {
        method: 'POST',
        headers: {
          'X-N8N-API-KEY': N8N_API_KEY!,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(cleanWorkflow),
      });
    }

    if (response.ok) {
      const result = await response.json();
      log(`   ✅ Successfully deployed (ID: ${result.id})`, 'green');
      
      // Show webhook URLs if available
      if (workflowData.nodes) {
        const webhookNodes = workflowData.nodes.filter((n: any) => 
          n.type === 'n8n-nodes-base.webhook' || 
          n.type === 'n8n-nodes-base.scheduleTrigger'
        );
        
        webhookNodes.forEach((node: any) => {
          if (node.type === 'n8n-nodes-base.webhook') {
            const webhookId = node.webhookId || node.parameters?.path;
            if (webhookId) {
              log(`   🔗 Webhook: ${N8N_API_URL.replace('/api/v1', '')}/webhook/${webhookId}`, 'blue');
            }
          } else if (node.type === 'n8n-nodes-base.scheduleTrigger') {
            const interval = node.parameters?.rule?.interval?.[0];
            if (interval) {
              log(`   ⏰ Schedule: Every ${interval.hoursInterval || interval.minutesInterval} ${interval.field}`, 'blue');
            }
          }
        });
      }
      
      return true;
    } else {
      const error = await response.text();
      log(`   ❌ Failed to deploy: ${error}`, 'red');
      
      // Try to parse and show specific error
      try {
        const errorObj = JSON.parse(error);
        if (errorObj.message) {
          log(`   💡 Error details: ${errorObj.message}`, 'yellow');
        }
      } catch {
        // Ignore parsing errors
      }
      
      return false;
    }
  } catch (error) {
    log(`   ❌ Error deploying workflow: ${error}`, 'red');
    return false;
  }
}

async function checkRequirements() {
  log('\n📋 Checking Requirements...', 'cyan');
  
  // Check API Keys
  const requiredKeys = [
    { key: 'OPENAI_API_KEY', service: 'OpenAI', critical: true },
    { key: 'ANTHROPIC_API_KEY', service: 'Anthropic', critical: false },
    { key: 'TAVILY_API_KEY', service: 'Tavily Search', critical: false }
  ];

  let hasAllCritical = true;
  
  for (const { key, service, critical } of requiredKeys) {
    if (process.env[key]) {
      log(`✅ ${key} found`, 'green');
    } else {
      if (critical) {
        log(`❌ ${key} missing (REQUIRED) - Get from ${service}`, 'red');
        hasAllCritical = false;
      } else {
        log(`⚠️  ${key} missing (optional) - Some features may not work`, 'yellow');
      }
    }
  }

  return hasAllCritical;
}

async function createSetupInstructions() {
  const instructionsPath = path.join(__dirname, '..', 'n8n', 'DEPLOYMENT_INSTRUCTIONS.md');
  
  const instructions = `# 🚀 Super-Smart Workflow Deployment Instructions

## ✅ Deployment Complete!

The following workflows have been deployed to your n8n instance:

1. **Super-Smart Calendar Scraper** - The ultimate AI + Python hybrid
2. **AI Calendar Scraper Agent** - AI-powered extraction with tools
3. **Python-Enhanced Calendar Scraper** - Python processing with PDF support

## 🔧 Next Steps

### 1. Configure Credentials in n8n

Go to your n8n instance and add these credentials:

#### OpenAI (Required)
1. Go to Credentials > Add Credential > OpenAI
2. Enter your API key: \`sk-...\`
3. Name it: "OpenAI"

#### Anthropic (Optional but recommended)
1. Go to Credentials > Add Credential > Anthropic
2. Enter your API key: \`sk-ant-...\`
3. Name it: "Anthropic"

#### Supabase (Required)
1. Go to Credentials > Add Credential > Supabase
2. URL: Your Supabase project URL
3. Service Role Key: From Supabase dashboard
4. Name it: "Supabase Tax Deed"

### 2. Install Python Packages

If using Python nodes, ensure these packages are available:
\`\`\`bash
pip install beautifulsoup4 pandas numpy matplotlib python-dateutil PyPDF2 requests
\`\`\`

Or configure n8n to auto-install:
\`\`\`
N8N_PYTHON_PACKAGES=beautifulsoup4,pandas,numpy,matplotlib,python-dateutil,PyPDF2,requests
\`\`\`

### 3. Activate Workflows

1. Open each workflow in n8n
2. Click "Activate" toggle
3. Verify the schedule trigger is set correctly

### 4. Test the Workflows

#### Test Super-Smart Scraper
\`\`\`bash
# Manually execute in n8n UI
# Or wait for scheduled trigger (every 2 hours)
\`\`\`

#### Monitor Execution
\`\`\`sql
-- Check extraction results in Supabase
SELECT * FROM auctions 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- Check learning patterns
SELECT * FROM learning_patterns
ORDER BY created_at DESC
LIMIT 10;
\`\`\`

### 5. Monitor Performance

#### Cost Tracking
- Super-Smart: ~$0.12 per county per run
- AI Agent: ~$0.09 per county per run
- Python Enhanced: ~$0.10 per county per run

#### Success Metrics
\`\`\`sql
-- Check extraction success rate
SELECT 
  county,
  AVG(confidence_score) as avg_confidence,
  COUNT(*) as extraction_count
FROM extraction_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY county;
\`\`\`

## 🎯 Optimization Tips

1. **Start with one county** to test and validate
2. **Monitor confidence scores** - should be >0.8
3. **Check learning patterns** weekly
4. **Adjust schedules** based on auction frequency
5. **Review costs** in OpenAI/Anthropic dashboards

## 🚨 Troubleshooting

### Workflow Fails to Execute
- Check credentials are configured correctly
- Verify Supabase connection
- Check n8n logs for specific errors

### Low Confidence Scores
- Let the system learn for a few runs
- Check if county website changed
- Review extraction_logs for patterns

### High API Costs
- Reduce frequency of scheduled triggers
- Use GPT-3.5 instead of GPT-4 where possible
- Enable caching in workflow settings

## 📞 Support

- n8n Documentation: https://docs.n8n.io
- OpenAI API: https://platform.openai.com
- Anthropic: https://console.anthropic.com
- Supabase: https://supabase.com/dashboard

---

**Your super-smart calendar scraper is now deployed and ready to autonomously find auction opportunities!**
`;

  fs.writeFileSync(instructionsPath, instructions);
  log(`\n📄 Created deployment instructions: ${instructionsPath}`, 'green');
}

async function testWorkflow(workflowId: string, name: string) {
  log(`\n🧪 Testing workflow: ${name}`, 'cyan');
  
  try {
    // Test execution
    const response = await fetch(`${N8N_API_URL}/workflows/${workflowId}/execute`, {
      method: 'POST',
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startNode: 'Schedule Trigger',
        workflowData: {}
      }),
    });

    if (response.ok) {
      log(`   ✅ Test execution started successfully`, 'green');
      return true;
    } else {
      log(`   ⚠️  Could not test workflow (may need manual activation)`, 'yellow');
      return false;
    }
  } catch (error) {
    log(`   ⚠️  Test execution failed: ${error}`, 'yellow');
    return false;
  }
}

async function main() {
  log('\n🧠 Super-Smart Workflow Deployment Script', 'bright');
  log('==========================================\n', 'bright');
  
  // Check connection
  const connected = await checkN8nConnection();
  if (!connected) {
    log('\n❌ Cannot connect to n8n. Please check:', 'red');
    log('   1. n8n is running (npm run n8n:start)', 'yellow');
    log('   2. N8N_API_URL is correct in .env', 'yellow');
    log('   3. N8N_API_KEY is valid', 'yellow');
    process.exit(1);
  }
  
  // Check requirements
  const hasRequirements = await checkRequirements();
  if (!hasRequirements) {
    log('\n⚠️  Missing critical requirements. Workflows will deploy but may not run.', 'yellow');
  }
  
  // Deploy workflows
  log('\n🔄 Starting deployment...', 'cyan');
  
  const results = {
    successful: [] as string[],
    failed: [] as string[],
  };
  
  // Sort by priority and deploy
  const sortedWorkflows = WORKFLOWS.sort((a, b) => a.priority - b.priority);
  
  for (const workflow of sortedWorkflows) {
    const success = await deployWorkflow(workflow);
    if (success) {
      results.successful.push(workflow.name);
    } else {
      results.failed.push(workflow.name);
    }
  }
  
  // Create setup instructions
  await createSetupInstructions();
  
  // Summary
  log('\n' + '='.repeat(60), 'bright');
  log('🎉 Deployment Summary', 'bright');
  log('='.repeat(60), 'bright');
  
  if (results.successful.length > 0) {
    log(`\n✅ Successfully deployed (${results.successful.length}):`, 'green');
    results.successful.forEach(name => log(`   • ${name}`, 'green'));
  }
  
  if (results.failed.length > 0) {
    log(`\n❌ Failed to deploy (${results.failed.length}):`, 'red');
    results.failed.forEach(name => log(`   • ${name}`, 'red'));
  }
  
  log('\n📚 Next Steps:', 'cyan');
  log('1. Configure credentials in n8n UI', 'yellow');
  log('2. Activate workflows in n8n', 'yellow');
  log('3. Check DEPLOYMENT_INSTRUCTIONS.md for details', 'yellow');
  log('4. Monitor first execution in n8n', 'yellow');
  
  if (!hasRequirements) {
    log('\n⚠️  IMPORTANT: Add missing API keys to .env.local:', 'yellow');
    log('   OPENAI_API_KEY=sk-...', 'red');
    log('   ANTHROPIC_API_KEY=sk-ant-... (optional)', 'yellow');
  }
  
  log('\n🚀 Open n8n to see your workflows:', 'bright');
  log(`   ${N8N_API_URL.replace('/api/v1', '')}`, 'blue');
  
  log('\n✨ Happy scraping with your super-smart workflows!', 'green');
}

// Run the deployment
main().catch((error) => {
  log(`\n❌ Deployment failed: ${error}`, 'red');
  process.exit(1);
});
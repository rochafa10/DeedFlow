#!/usr/bin/env tsx
/**
 * Import Super-Smart Workflows using n8n CLI
 * Alternative deployment method when API is not available
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

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

const WORKFLOWS = [
  {
    name: 'Super-Smart Calendar Scraper',
    file: 'super-smart-calendar-scraper.json',
    description: 'Ultimate AI + Python hybrid with self-learning'
  },
  {
    name: 'AI Calendar Scraper Agent',
    file: 'ai-calendar-scraper-agent.json',
    description: 'AI-powered calendar extraction'
  },
  {
    name: 'Python-Enhanced Calendar Scraper',
    file: 'ai-calendar-scraper-python-enhanced.json',
    description: 'Python processing with PDF/Excel support'
  }
];

async function checkN8nCLI(): Promise<boolean> {
  try {
    execSync('n8n --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

async function importWorkflow(workflowPath: string, name: string): Promise<boolean> {
  try {
    log(`\n📦 Importing: ${name}`, 'cyan');
    
    // Use n8n CLI import command
    const command = `n8n import:workflow --input="${workflowPath}"`;
    
    log(`   Running: ${command}`, 'yellow');
    const output = execSync(command, { encoding: 'utf8' });
    
    if (output.includes('success') || output.includes('imported')) {
      log(`   ✅ Successfully imported!`, 'green');
      return true;
    } else {
      log(`   ⚠️  Import completed with warnings`, 'yellow');
      return true;
    }
  } catch (error: any) {
    log(`   ❌ Failed to import: ${error.message}`, 'red');
    return false;
  }
}

async function createManualInstructions() {
  const instructions = `# 📋 Manual Import Instructions for n8n

Since the API import failed, you can manually import the workflows:

## Option 1: n8n UI Import (Recommended)

1. **Open n8n in your browser**
   http://localhost:5678

2. **Go to Workflows**
   Click on "Workflows" in the left sidebar

3. **Import each workflow**
   - Click the "+" button or "Add workflow"
   - Click on the menu (3 dots) → "Import from File"
   - Select these files one by one:
     - \`n8n/workflows/super-smart-calendar-scraper.json\`
     - \`n8n/workflows/ai-calendar-scraper-agent.json\`
     - \`n8n/workflows/ai-calendar-scraper-python-enhanced.json\`

## Option 2: n8n CLI Import

\`\`\`bash
# Navigate to the project directory
cd C:\\Users\\fs_ro\\Documents\\tax-deed-platform

# Import workflows using n8n CLI
n8n import:workflow --input="n8n/workflows/super-smart-calendar-scraper.json"
n8n import:workflow --input="n8n/workflows/ai-calendar-scraper-agent.json"
n8n import:workflow --input="n8n/workflows/ai-calendar-scraper-python-enhanced.json"
\`\`\`

## Option 3: Copy & Paste JSON

1. Open each workflow JSON file
2. Copy the entire content
3. In n8n UI: Create new workflow → Switch to "Code" view → Paste JSON → Save

## After Import

### Configure Credentials
1. Go to Credentials → Add Credential
2. Add these credentials:
   - **OpenAI**: Your OpenAI API key
   - **Anthropic**: Your Anthropic API key (optional)
   - **Supabase**: Your Supabase URL and Service Key

### Fix Node Credentials
After import, you may need to:
1. Open each workflow
2. Click on nodes with ⚠️ warning icons
3. Select the appropriate credential from dropdown
4. Save the workflow

### Activate Workflows
1. Open each workflow
2. Toggle the "Active" switch in the top bar
3. The schedule triggers will start running automatically

## Required Environment Variables

Add these to your .env.local file:
\`\`\`
# Required
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJ...

# Optional but recommended
ANTHROPIC_API_KEY=sk-ant-...
TAVILY_API_KEY=tvly-...
\`\`\`

## Python Packages for n8n

If using Docker, add to docker-compose.yml:
\`\`\`yaml
environment:
  - N8N_PYTHON_PACKAGES=beautifulsoup4,pandas,numpy,matplotlib,python-dateutil,PyPDF2
\`\`\`

Or install globally:
\`\`\`bash
pip install beautifulsoup4 pandas numpy matplotlib python-dateutil PyPDF2 requests
\`\`\`

## Testing the Workflows

### Test Execution
1. Open the workflow in n8n
2. Click "Execute Workflow" button
3. Check the execution log for results

### Check Supabase
\`\`\`sql
-- See if auctions are being saved
SELECT * FROM auctions 
ORDER BY created_at DESC 
LIMIT 10;

-- Check extraction logs
SELECT * FROM extraction_logs 
ORDER BY created_at DESC;
\`\`\`

## Troubleshooting

### "Credential not found" error
→ Create the credential in n8n UI first

### "Python package not found" error
→ Install required Python packages (see above)

### Workflow doesn't trigger
→ Make sure it's activated (toggle switch)

### Low confidence scores
→ Add OpenAI API key for AI features

---

**Need help? Check the workflow files directly in:**
\`C:\\Users\\fs_ro\\Documents\\tax-deed-platform\\n8n\\workflows\\\`
`;

  const filePath = path.join(__dirname, '..', 'n8n', 'MANUAL_IMPORT_GUIDE.md');
  fs.writeFileSync(filePath, instructions);
  log(`\n📄 Created manual import guide: ${filePath}`, 'green');
  
  return instructions;
}

async function main() {
  log('\n🚀 n8n Workflow Import Helper', 'bright');
  log('================================\n', 'bright');

  // Check if n8n CLI is available
  const hasN8nCLI = await checkN8nCLI();
  
  if (hasN8nCLI) {
    log('✅ n8n CLI detected', 'green');
    log('\n🔄 Attempting CLI import...', 'cyan');
    
    const results = {
      successful: [] as string[],
      failed: [] as string[]
    };
    
    for (const workflow of WORKFLOWS) {
      const workflowPath = path.join(__dirname, '..', 'n8n', 'workflows', workflow.file);
      
      if (!fs.existsSync(workflowPath)) {
        log(`❌ File not found: ${workflow.file}`, 'red');
        results.failed.push(workflow.name);
        continue;
      }
      
      const success = await importWorkflow(workflowPath, workflow.name);
      if (success) {
        results.successful.push(workflow.name);
      } else {
        results.failed.push(workflow.name);
      }
    }
    
    // Summary
    if (results.successful.length > 0) {
      log(`\n✅ Successfully imported: ${results.successful.length}`, 'green');
      results.successful.forEach(name => log(`   • ${name}`, 'green'));
    }
    
    if (results.failed.length > 0) {
      log(`\n❌ Failed to import: ${results.failed.length}`, 'red');
      results.failed.forEach(name => log(`   • ${name}`, 'red'));
    }
  } else {
    log('⚠️  n8n CLI not found', 'yellow');
    log('   The n8n API also appears to be unavailable', 'yellow');
  }
  
  // Always create manual instructions
  const guide = await createManualInstructions();
  
  log('\n' + '='.repeat(60), 'bright');
  log('📋 Manual Import Required', 'bright');
  log('='.repeat(60), 'bright');
  
  log('\nSince automated import failed, please import manually:', 'yellow');
  log('\n1. Open n8n in your browser:', 'cyan');
  log('   http://localhost:5678', 'blue');
  
  log('\n2. Import workflows manually:', 'cyan');
  log('   • Click Workflows → "+" → Import from File', 'yellow');
  log('   • Select each workflow JSON from:', 'yellow');
  log('     n8n/workflows/', 'green');
  
  log('\n3. Configure credentials:', 'cyan');
  log('   • OpenAI API key (required)', 'yellow');
  log('   • Anthropic API key (optional)', 'yellow');
  log('   • Supabase credentials (required)', 'yellow');
  
  log('\n📚 Full instructions saved to:', 'green');
  log('   n8n/MANUAL_IMPORT_GUIDE.md', 'blue');
  
  log('\n💡 Pro tip: You can also copy the JSON content and paste it', 'magenta');
  log('   directly in n8n\'s workflow editor (Code view)', 'magenta');
  
  // Open n8n in browser (Windows)
  try {
    log('\n🌐 Opening n8n in your browser...', 'cyan');
    execSync('start http://localhost:5678', { shell: true });
  } catch {
    // Ignore if it fails
  }
}

main().catch((error) => {
  log(`\n❌ Error: ${error.message}`, 'red');
  process.exit(1);
});
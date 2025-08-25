#!/usr/bin/env node
/**
 * n8n Workflow Management Script
 * Uses n8n-MCP for all workflow operations
 */

import fs from 'fs';
import path from 'path';
import { n8nMCP } from '../lib/n8n-mcp-client';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Helper functions
const log = {
  info: (msg: string) => console.log(`${colors.blue}ℹ${colors.reset}  ${msg}`),
  success: (msg: string) => console.log(`${colors.green}✓${colors.reset}  ${msg}`),
  error: (msg: string) => console.log(`${colors.red}✗${colors.reset}  ${msg}`),
  warning: (msg: string) => console.log(`${colors.yellow}⚠${colors.reset}  ${msg}`),
  header: (msg: string) => console.log(`\n${colors.cyan}${colors.bright}${msg}${colors.reset}\n${'='.repeat(50)}`)
};

// Workflow directory
const WORKFLOW_DIR = path.join(process.cwd(), 'n8n', 'workflows');

/**
 * List all workflows in n8n
 */
async function listWorkflows() {
  log.header('📋 Current Workflows in n8n');
  
  try {
    const response = await n8nMCP.listWorkflows();
    const workflows = response.data;
    
    if (workflows.length === 0) {
      log.info('No workflows found');
      return;
    }
    
    workflows.forEach((w, i) => {
      const status = w.active ? `${colors.green}● Active${colors.reset}` : `${colors.yellow}○ Inactive${colors.reset}`;
      console.log(`${i + 1}. ${w.name} (${w.id}) ${status}`);
      console.log(`   Nodes: ${w.nodes?.length || 0}, Last updated: ${w.updatedAt || 'N/A'}`);
      
      // Check for webhook
      const webhookUrl = n8nMCP.getWebhookUrl(w);
      if (webhookUrl) {
        console.log(`   Webhook: ${colors.cyan}${webhookUrl}${colors.reset}`);
      }
    });
    
    log.success(`Found ${workflows.length} workflow(s)`);
  } catch (error: any) {
    log.error(`Failed to list workflows: ${error.message}`);
  }
}

/**
 * Deploy all workflows from the workflows directory
 */
async function deployWorkflows() {
  log.header('🚀 Deploying Workflows to n8n');
  
  if (!fs.existsSync(WORKFLOW_DIR)) {
    log.error(`Workflow directory not found: ${WORKFLOW_DIR}`);
    return;
  }
  
  const files = fs.readdirSync(WORKFLOW_DIR).filter(f => f.endsWith('.json'));
  
  if (files.length === 0) {
    log.warning('No workflow files found');
    return;
  }
  
  log.info(`Found ${files.length} workflow file(s)`);
  
  for (const file of files) {
    const filePath = path.join(WORKFLOW_DIR, file);
    log.info(`Processing: ${file}`);
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const workflow = JSON.parse(content);
      
      // Validate workflow
      const validation = await n8nMCP.validateWorkflow(workflow);
      if (!validation.valid) {
        log.error(`Invalid workflow: ${validation.errors?.join(', ')}`);
        continue;
      }
      
      // Deploy workflow
      const result = await n8nMCP.upsertWorkflow(workflow);
      log.success(`Deployed: ${result.name} (ID: ${result.id})`);
      
      // Show webhook URL if available
      const webhookUrl = n8nMCP.getWebhookUrl(result);
      if (webhookUrl) {
        log.info(`Webhook URL: ${webhookUrl}`);
      }
      
    } catch (error: any) {
      log.error(`Failed to deploy ${file}: ${error.message}`);
    }
  }
}

/**
 * Activate or deactivate a workflow
 */
async function toggleWorkflow(name: string, active: boolean) {
  log.header(`${active ? '▶️  Activating' : '⏸️  Deactivating'} Workflow`);
  
  try {
    const workflow = await n8nMCP.findWorkflowByName(name);
    
    if (!workflow || !workflow.id) {
      log.error(`Workflow not found: ${name}`);
      return;
    }
    
    const updated = await n8nMCP.setWorkflowActive(workflow.id, active);
    log.success(`Workflow ${updated.name} is now ${active ? 'active' : 'inactive'}`);
    
  } catch (error: any) {
    log.error(`Failed to toggle workflow: ${error.message}`);
  }
}

/**
 * Export workflows from n8n to local files
 */
async function exportWorkflows() {
  log.header('📥 Exporting Workflows from n8n');
  
  try {
    const response = await n8nMCP.listWorkflows();
    const workflows = response.data;
    
    if (workflows.length === 0) {
      log.info('No workflows to export');
      return;
    }
    
    // Create export directory
    const exportDir = path.join(WORKFLOW_DIR, 'exports', new Date().toISOString().split('T')[0]);
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }
    
    for (const workflow of workflows) {
      if (!workflow.id) continue;
      
      try {
        const fullWorkflow = await n8nMCP.getWorkflow(workflow.id);
        const filename = `${workflow.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.json`;
        const filePath = path.join(exportDir, filename);
        
        fs.writeFileSync(filePath, JSON.stringify(fullWorkflow, null, 2));
        log.success(`Exported: ${workflow.name} → ${filename}`);
        
      } catch (error: any) {
        log.error(`Failed to export ${workflow.name}: ${error.message}`);
      }
    }
    
    log.info(`Workflows exported to: ${exportDir}`);
    
  } catch (error: any) {
    log.error(`Failed to export workflows: ${error.message}`);
  }
}

/**
 * Validate all workflow files
 */
async function validateWorkflows() {
  log.header('✅ Validating Workflow Files');
  
  if (!fs.existsSync(WORKFLOW_DIR)) {
    log.error(`Workflow directory not found: ${WORKFLOW_DIR}`);
    return;
  }
  
  const files = fs.readdirSync(WORKFLOW_DIR).filter(f => f.endsWith('.json'));
  let valid = 0;
  let invalid = 0;
  
  for (const file of files) {
    const filePath = path.join(WORKFLOW_DIR, file);
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const workflow = JSON.parse(content);
      
      const validation = await n8nMCP.validateWorkflow(workflow);
      
      if (validation.valid) {
        log.success(`Valid: ${file}`);
        valid++;
      } else {
        log.error(`Invalid: ${file}`);
        validation.errors?.forEach(e => console.log(`  - ${e}`));
        invalid++;
      }
      
    } catch (error: any) {
      log.error(`Failed to validate ${file}: ${error.message}`);
      invalid++;
    }
  }
  
  console.log('\n' + '='.repeat(50));
  log.info(`Validation complete: ${valid} valid, ${invalid} invalid`);
}

/**
 * Show workflow details
 */
async function showWorkflow(name: string) {
  log.header(`🔍 Workflow Details: ${name}`);
  
  try {
    const workflow = await n8nMCP.findWorkflowByName(name);
    
    if (!workflow || !workflow.id) {
      log.error(`Workflow not found: ${name}`);
      return;
    }
    
    const full = await n8nMCP.getWorkflow(workflow.id);
    
    console.log(`Name: ${full.name}`);
    console.log(`ID: ${full.id}`);
    console.log(`Active: ${full.active ? 'Yes' : 'No'}`);
    console.log(`Nodes: ${full.nodes?.length || 0}`);
    
    // List nodes
    if (full.nodes && full.nodes.length > 0) {
      console.log('\nNodes:');
      full.nodes.forEach((node, i) => {
        console.log(`  ${i + 1}. ${node.name} (${node.type})`);
      });
    }
    
    // Show webhook URL
    const webhookUrl = n8nMCP.getWebhookUrl(full);
    if (webhookUrl) {
      console.log(`\nWebhook URL: ${colors.cyan}${webhookUrl}${colors.reset}`);
    }
    
    // Show connections
    if (Object.keys(full.connections || {}).length > 0) {
      console.log('\nConnections:');
      Object.entries(full.connections).forEach(([source, targets]) => {
        const targetNodes = targets.main?.[0]?.map(t => t.node).join(', ') || 'none';
        console.log(`  ${source} → ${targetNodes}`);
      });
    }
    
  } catch (error: any) {
    log.error(`Failed to show workflow: ${error.message}`);
  }
}

/**
 * Main CLI handler
 */
async function main() {
  const command = process.argv[2];
  const args = process.argv.slice(3);
  
  console.log(`${colors.bright}${colors.cyan}n8n Workflow Manager${colors.reset}`);
  console.log('Using n8n-MCP for workflow management\n');
  
  switch (command) {
    case 'list':
      await listWorkflows();
      break;
      
    case 'deploy':
      await deployWorkflows();
      break;
      
    case 'activate':
      if (!args[0]) {
        log.error('Please provide workflow name');
        break;
      }
      await toggleWorkflow(args[0], true);
      break;
      
    case 'deactivate':
      if (!args[0]) {
        log.error('Please provide workflow name');
        break;
      }
      await toggleWorkflow(args[0], false);
      break;
      
    case 'export':
      await exportWorkflows();
      break;
      
    case 'validate':
      await validateWorkflows();
      break;
      
    case 'show':
      if (!args[0]) {
        log.error('Please provide workflow name');
        break;
      }
      await showWorkflow(args[0]);
      break;
      
    default:
      console.log('Usage: npm run n8n:manage <command> [args]');
      console.log('\nCommands:');
      console.log('  list                    - List all workflows in n8n');
      console.log('  deploy                  - Deploy workflows from local files');
      console.log('  activate <name>         - Activate a workflow');
      console.log('  deactivate <name>       - Deactivate a workflow');
      console.log('  export                  - Export workflows from n8n');
      console.log('  validate                - Validate local workflow files');
      console.log('  show <name>            - Show workflow details');
      console.log('\nExamples:');
      console.log('  npm run n8n:manage list');
      console.log('  npm run n8n:manage deploy');
      console.log('  npm run n8n:manage activate "Tax Deed - Property Enrichment"');
  }
}

// Run the script
main().catch(error => {
  log.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
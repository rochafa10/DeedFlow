#!/usr/bin/env node

/**
 * n8n MCP Server
 *
 * Provides tools for Claude to trigger n8n workflows via webhooks,
 * reducing token usage by offloading repetitive tasks.
 *
 * Environment Variables Required:
 * - N8N_BASE_URL: Base URL of your n8n instance (e.g., https://your-n8n.app.n8n.cloud)
 * - N8N_API_KEY: n8n API key for authentication (optional, for API calls)
 *
 * Webhook URLs are configured per workflow in the WORKFLOWS object below.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// ============================================
// CONFIGURATION - Update these with your n8n webhook URLs
// ============================================

const N8N_BASE_URL = process.env.N8N_BASE_URL || 'https://your-n8n-instance.app.n8n.cloud';
const N8N_API_KEY = process.env.N8N_API_KEY || '';

// Workflow webhook URLs - Update these after creating workflows in n8n
const WORKFLOWS = {
  'data-integrity-check': {
    webhookUrl: `${N8N_BASE_URL}/webhook/data-integrity-check`,
    description: 'Run database integrity audit - checks orphaned records, flag mismatches, pipeline gaps'
  },
  'pdf-parser': {
    webhookUrl: `${N8N_BASE_URL}/webhook/pdf-parser`,
    description: 'Parse property list PDF - extracts properties and stores in Supabase'
  },
  'batch-orchestrator': {
    webhookUrl: `${N8N_BASE_URL}/webhook/batch-orchestrator`,
    description: 'Manage batch jobs - get next batch, update progress, handle completion'
  },
  'regrid-scraper': {
    webhookUrl: `${N8N_BASE_URL}/webhook/regrid-scraper`,
    description: 'Scrape property data from Regrid - extracts data and captures screenshots'
  },
  'county-research': {
    webhookUrl: `${N8N_BASE_URL}/webhook/county-research`,
    description: 'Research county tax auction info - uses Perplexity + Google Custom Search'
  }
};

// ============================================
// MCP SERVER SETUP
// ============================================

const server = new Server(
  {
    name: 'n8n-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ============================================
// TOOL DEFINITIONS
// ============================================

const tools = [
  {
    name: 'trigger_n8n_workflow',
    description: `Trigger an n8n workflow via webhook. Available workflows:
- data-integrity-check: Run database audit
- pdf-parser: Parse property list PDFs
- batch-orchestrator: Manage batch processing jobs
- regrid-scraper: Scrape Regrid property data
- county-research: Research county tax auctions

Returns execution status and any immediate results.`,
    inputSchema: {
      type: 'object',
      properties: {
        workflow_id: {
          type: 'string',
          description: 'Workflow ID to trigger (e.g., "regrid-scraper", "pdf-parser")',
          enum: Object.keys(WORKFLOWS)
        },
        payload: {
          type: 'object',
          description: 'Data to send to the workflow (varies by workflow type)',
          properties: {
            county_id: { type: 'string', description: 'UUID of county for county-specific operations' },
            county_name: { type: 'string', description: 'County name (e.g., "Blair")' },
            state_code: { type: 'string', description: 'State code (e.g., "PA")' },
            document_id: { type: 'string', description: 'UUID of document for PDF parsing' },
            property_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of property UUIDs for batch operations'
            },
            batch_size: { type: 'number', description: 'Number of items per batch' },
            job_id: { type: 'string', description: 'Batch job UUID for progress updates' },
            action: {
              type: 'string',
              description: 'Action for batch orchestrator',
              enum: ['get_next_batch', 'update_progress', 'pause', 'resume', 'complete']
            }
          }
        },
        wait_for_completion: {
          type: 'boolean',
          description: 'If true, wait for workflow to complete and return results. Default: true',
          default: true
        }
      },
      required: ['workflow_id']
    }
  },
  {
    name: 'list_n8n_workflows',
    description: 'List all available n8n workflows and their descriptions',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'check_n8n_health',
    description: 'Check if n8n instance is reachable and workflows are configured',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  }
];

// ============================================
// TOOL HANDLERS
// ============================================

async function triggerWorkflow(workflowId, payload = {}, waitForCompletion = true) {
  const workflow = WORKFLOWS[workflowId];

  if (!workflow) {
    return {
      success: false,
      error: `Unknown workflow: ${workflowId}`,
      available_workflows: Object.keys(WORKFLOWS)
    };
  }

  try {
    const response = await fetch(workflow.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(N8N_API_KEY && { 'Authorization': `Bearer ${N8N_API_KEY}` })
      },
      body: JSON.stringify({
        ...payload,
        triggered_by: 'claude-mcp',
        triggered_at: new Date().toISOString()
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Workflow request failed: ${response.status} ${response.statusText}`,
        details: errorText
      };
    }

    // n8n webhook responses vary - try to parse JSON, fall back to text
    let result;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      result = await response.json();
    } else {
      result = { message: await response.text() };
    }

    return {
      success: true,
      workflow_id: workflowId,
      workflow_description: workflow.description,
      result: result,
      executed_at: new Date().toISOString()
    };

  } catch (error) {
    return {
      success: false,
      error: `Failed to trigger workflow: ${error.message}`,
      workflow_id: workflowId,
      webhook_url: workflow.webhookUrl
    };
  }
}

async function listWorkflows() {
  const workflows = Object.entries(WORKFLOWS).map(([id, config]) => ({
    workflow_id: id,
    description: config.description,
    webhook_url: config.webhookUrl
  }));

  return {
    total_workflows: workflows.length,
    workflows: workflows,
    usage: 'Use trigger_n8n_workflow with workflow_id and optional payload'
  };
}

async function checkHealth() {
  const results = {
    n8n_base_url: N8N_BASE_URL,
    api_key_configured: !!N8N_API_KEY,
    workflows_configured: Object.keys(WORKFLOWS).length,
    checks: []
  };

  // Try to reach each webhook (HEAD request to minimize load)
  for (const [id, config] of Object.entries(WORKFLOWS)) {
    try {
      const response = await fetch(config.webhookUrl, {
        method: 'HEAD',
        timeout: 5000
      });
      results.checks.push({
        workflow_id: id,
        status: response.ok ? 'reachable' : `error: ${response.status}`,
        url: config.webhookUrl
      });
    } catch (error) {
      results.checks.push({
        workflow_id: id,
        status: `unreachable: ${error.message}`,
        url: config.webhookUrl
      });
    }
  }

  const reachable = results.checks.filter(c => c.status === 'reachable').length;
  results.summary = `${reachable}/${results.workflows_configured} workflows reachable`;
  results.healthy = reachable === results.workflows_configured;

  return results;
}

// ============================================
// REQUEST HANDLERS
// ============================================

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result;

    switch (name) {
      case 'trigger_n8n_workflow':
        result = await triggerWorkflow(
          args.workflow_id,
          args.payload || {},
          args.wait_for_completion !== false
        );
        break;

      case 'list_n8n_workflows':
        result = await listWorkflows();
        break;

      case 'check_n8n_health':
        result = await checkHealth();
        break;

      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };

  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error.message
          }, null, 2)
        }
      ],
      isError: true
    };
  }
});

// ============================================
// START SERVER
// ============================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('n8n MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

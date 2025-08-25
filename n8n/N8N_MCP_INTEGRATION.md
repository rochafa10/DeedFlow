# 🔗 n8n-MCP Integration Guide for Tax Deed Platform

## Overview
n8n-MCP (Model Context Protocol) is the crucial bridge between your Tax Deed Platform and n8n automation. It provides programmatic access to create, update, and manage n8n workflows.

## Architecture

```
Tax Deed Platform (Next.js)
        ↓
    n8n-MCP Server (MCP Protocol)
        ↓
    n8n Instance (Workflows)
        ↓
    Supabase (Database)
```

## 🚀 Setup n8n-MCP Integration

### Step 1: Ensure n8n-MCP is Built and Configured

```bash
# Navigate to n8n-mcp
cd C:\Users\fs_ro\Documents\n8n-mcp

# Build the project
npm run build

# Verify configuration in .env
cat .env | grep N8N_API
```

Current configuration:
- **N8N_API_URL**: http://localhost:5678
- **N8N_API_KEY**: Available in .env

### Step 2: Start n8n-MCP Server

```bash
# Option 1: Start in HTTP mode for API access
npm run start:http

# Option 2: Start with n8n integration
npm run start:n8n

# Option 3: Start in development mode
npm run dev:http
```

### Step 3: Create Integration Layer in Tax Deed Platform

Create `lib/n8n-mcp-client.ts`:

```typescript
import axios from 'axios';

export class N8nMCPClient {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = process.env.N8N_MCP_URL || 'http://localhost:3001';
    this.apiKey = process.env.N8N_API_KEY || '';
  }

  // Create workflow
  async createWorkflow(workflow: any) {
    const response = await axios.post(
      `${this.baseUrl}/api/workflows`,
      workflow,
      {
        headers: {
          'X-N8N-API-KEY': this.apiKey,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  }

  // Update workflow
  async updateWorkflow(id: string, workflow: any) {
    const response = await axios.put(
      `${this.baseUrl}/api/workflows/${id}`,
      workflow,
      {
        headers: {
          'X-N8N-API-KEY': this.apiKey,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  }

  // Get workflow
  async getWorkflow(id: string) {
    const response = await axios.get(
      `${this.baseUrl}/api/workflows/${id}`,
      {
        headers: {
          'X-N8N-API-KEY': this.apiKey
        }
      }
    );
    return response.data;
  }

  // List workflows
  async listWorkflows() {
    const response = await axios.get(
      `${this.baseUrl}/api/workflows`,
      {
        headers: {
          'X-N8N-API-KEY': this.apiKey
        }
      }
    );
    return response.data;
  }

  // Execute workflow
  async executeWorkflow(id: string, data?: any) {
    const response = await axios.post(
      `${this.baseUrl}/api/workflows/${id}/execute`,
      data,
      {
        headers: {
          'X-N8N-API-KEY': this.apiKey,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  }
}
```

### Step 4: Add Environment Variables

Add to `.env.local`:

```env
# n8n-MCP Integration
N8N_MCP_URL=http://localhost:3001
N8N_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmMDYwNjYyMC01YmU3LTQ3Y2QtYWE5MS0xZmU3ZmMyMDAzYjciLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU2MTM1MjU1fQ.UQHnMwQbLd_AgP0sm3FwpLrSmUmJ8qsLxpHI9O6uPY4
```

## 📝 Workflow Management Commands

### Using n8n-MCP Tools

n8n-MCP provides these tools for workflow management:

| Tool | Purpose | Example |
|------|---------|---------|
| `n8n_create_workflow` | Create new workflow | Creates workflow with nodes and connections |
| `n8n_update_full_workflow` | Update entire workflow | Replaces workflow completely |
| `n8n_update_partial_workflow` | Update workflow parts | Updates specific nodes/connections |
| `n8n_delete_workflow` | Delete workflow | Removes workflow from n8n |
| `n8n_list_workflows` | List all workflows | Returns all workflows with metadata |
| `n8n_get_workflow` | Get workflow details | Returns complete workflow data |
| `n8n_validate_workflow` | Validate workflow | Checks workflow for errors |
| `n8n_trigger_webhook_workflow` | Trigger webhook | Executes webhook workflow |

### Create Workflow via n8n-MCP

```javascript
// Example: Create property enrichment workflow
const workflow = {
  name: "Tax Deed - Property Enrichment",
  nodes: [
    {
      id: "webhook_1",
      name: "Webhook",
      type: "n8n-nodes-base.webhook",
      typeVersion: 1,
      position: [250, 300],
      parameters: {
        httpMethod: "POST",
        path: "property-enrichment"
      }
    },
    {
      id: "supabase_1",
      name: "Update Property",
      type: "n8n-nodes-base.supabase",
      typeVersion: 1,
      position: [450, 300],
      parameters: {
        resource: "database",
        operation: "update",
        table: "properties"
      }
    }
  ],
  connections: {
    "webhook_1": {
      main: [[{ node: "supabase_1", type: "main", index: 0 }]]
    }
  }
};

// Create via n8n-MCP
const client = new N8nMCPClient();
const created = await client.createWorkflow(workflow);
console.log('Created workflow:', created.id);
```

## 🔄 Automated Workflow Updates

### Step 1: Create Update Script

`scripts/update-n8n-workflows.js`:

```javascript
const fs = require('fs');
const path = require('path');
const { N8nMCPClient } = require('../lib/n8n-mcp-client');

async function updateWorkflows() {
  const client = new N8nMCPClient();
  
  // Read workflow definitions
  const workflowDir = path.join(__dirname, '../n8n/workflows');
  const files = fs.readdirSync(workflowDir);
  
  for (const file of files) {
    if (file.endsWith('.json')) {
      const workflow = JSON.parse(
        fs.readFileSync(path.join(workflowDir, file), 'utf8')
      );
      
      // Check if workflow exists
      const existing = await client.listWorkflows();
      const found = existing.data?.find(w => w.name === workflow.name);
      
      if (found) {
        // Update existing
        await client.updateWorkflow(found.id, workflow);
        console.log(`Updated: ${workflow.name}`);
      } else {
        // Create new
        await client.createWorkflow(workflow);
        console.log(`Created: ${workflow.name}`);
      }
    }
  }
}

updateWorkflows();
```

### Step 2: Add npm Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "n8n:update": "node scripts/update-n8n-workflows.js",
    "n8n:validate": "node scripts/validate-n8n-workflows.js",
    "n8n:deploy": "npm run n8n:validate && npm run n8n:update"
  }
}
```

## 🎯 Use Cases

### 1. Dynamic Workflow Creation

Create workflows based on user input:

```typescript
// API Route: /api/n8n/create-custom-workflow
export async function POST(request: Request) {
  const { propertyType, county } = await request.json();
  
  const client = new N8nMCPClient();
  
  // Generate custom workflow for specific property type
  const workflow = generateWorkflowForPropertyType(propertyType, county);
  
  const result = await client.createWorkflow(workflow);
  
  return Response.json({ 
    success: true, 
    workflowId: result.id,
    webhookUrl: result.webhookUrl 
  });
}
```

### 2. Workflow Status Monitoring

```typescript
// Check workflow health
export async function GET(request: Request) {
  const client = new N8nMCPClient();
  const workflows = await client.listWorkflows();
  
  const status = workflows.data.map(w => ({
    name: w.name,
    active: w.active,
    nodes: w.nodes?.length || 0,
    lastExecuted: w.updatedAt
  }));
  
  return Response.json({ workflows: status });
}
```

### 3. Batch Workflow Updates

```typescript
// Update all workflows with new Supabase schema
export async function updateAllWorkflows() {
  const client = new N8nMCPClient();
  const workflows = await client.listWorkflows();
  
  for (const workflow of workflows.data) {
    // Update Supabase nodes with new table structure
    const updated = updateSupabaseNodes(workflow);
    await client.updateWorkflow(workflow.id, updated);
  }
}
```

## 🛠️ Development Workflow

### Local Development

1. **Start n8n**: `n8n start`
2. **Start n8n-MCP**: `cd n8n-mcp && npm run start:http`
3. **Start Tax Deed Platform**: `npm run dev`

### Workflow Development Process

1. **Design** workflow in n8n UI
2. **Export** workflow JSON
3. **Save** to `n8n/workflows/` directory
4. **Test** locally
5. **Deploy** via n8n-MCP: `npm run n8n:deploy`

### CI/CD Integration

```yaml
# .github/workflows/deploy-n8n.yml
name: Deploy n8n Workflows

on:
  push:
    paths:
      - 'n8n/workflows/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci
      - run: npm run n8n:validate
      - run: npm run n8n:deploy
        env:
          N8N_API_KEY: ${{ secrets.N8N_API_KEY }}
          N8N_MCP_URL: ${{ secrets.N8N_MCP_URL }}
```

## 🔍 Troubleshooting

### Common Issues

1. **n8n-MCP not responding**
   - Check if built: `cd n8n-mcp && npm run build`
   - Check logs: `npm run dev:http`

2. **API Key invalid**
   - Regenerate in n8n: Settings → API
   - Update in n8n-mcp `.env`
   - Update in tax-deed-platform `.env.local`

3. **Workflow creation fails**
   - Validate JSON structure
   - Check node types and versions
   - Ensure credentials configured

### Debug Mode

Enable debug logging:

```javascript
// In n8n-mcp
export MCP_LOG_LEVEL=debug

// In tax-deed-platform
export DEBUG=n8n:*
```

## 📚 Key Files

### n8n-MCP Project
- `/src/services/n8n-api-client.ts` - API client
- `/src/mcp/tool-docs/workflow_management/` - Workflow tools
- `/.env` - Configuration

### Tax Deed Platform
- `/n8n/workflows/` - Workflow definitions
- `/lib/n8n-mcp-client.ts` - Integration client
- `/scripts/update-n8n-workflows.js` - Update script

## 🎯 Best Practices

1. **Version Control**: Keep workflows in Git
2. **Testing**: Validate workflows before deployment
3. **Naming**: Use consistent naming convention
4. **Documentation**: Document each workflow's purpose
5. **Error Handling**: Implement proper error handling
6. **Monitoring**: Track workflow executions
7. **Backup**: Export workflows regularly

## 🚦 Quick Commands

```bash
# Start everything
cd n8n-mcp && npm run start:http &
cd tax-deed-platform && npm run dev &

# Update all workflows
npm run n8n:deploy

# Validate workflows
npm run n8n:validate

# Check workflow status
curl http://localhost:3001/api/workflows

# Create new workflow
node scripts/create-workflow.js
```

---

**Remember**: n8n-MCP is the bridge for ALL programmatic n8n operations. Always use it for:
- Creating workflows
- Updating workflows
- Managing credentials
- Monitoring executions
- Validating configurations
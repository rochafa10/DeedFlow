# 🚀 n8n-MCP Quick Reference

## ✅ Current Setup

### Workflows Deployed
- ✅ **Tax Deed - Property Enrichment (Supabase)** - ID: tmxPvXnEUXsTYmEG
- ✅ **Tax Deed - Inspection Report Generator** - ID: 0f3LItcWohcYso3y  
- ✅ **Miami-Dade Tax Deed Scraper** - ID: Oh0ZR9opUm0MQ99M
- ✅ **Tax Deed Platform - Complete System** - ID: gjjOpJ4pT3hbzBrK

### Key Commands

```bash
# List all workflows
npm run n8n:list

# Deploy workflows from files
npm run n8n:deploy

# Validate workflow files
npm run n8n:validate

# Export workflows from n8n
npm run n8n:export

# Show specific workflow details
npm run n8n:manage show "Tax Deed - Property Enrichment"

# Activate a workflow
npm run n8n:manage activate "Tax Deed - Property Enrichment"

# Deactivate a workflow
npm run n8n:manage deactivate "Tax Deed - Property Enrichment"
```

## 🔧 n8n-MCP Integration

### Using in Code

```typescript
import { n8nMCP } from '@/lib/n8n-mcp-client';

// List workflows
const workflows = await n8nMCP.listWorkflows();

// Create workflow
const workflow = await n8nMCP.createWorkflow({
  name: "My Workflow",
  nodes: [...],
  connections: {...}
});

// Update workflow
await n8nMCP.updateWorkflow(workflowId, updates);

// Execute workflow
await n8nMCP.executeWorkflow(workflowId, data);

// Trigger webhook
await n8nMCP.triggerWebhook('property-enrichment', {
  propertyId: 'test-001'
});
```

### API Routes Example

```typescript
// app/api/n8n/workflows/route.ts
import { n8nMCP } from '@/lib/n8n-mcp-client';

export async function GET() {
  const workflows = await n8nMCP.listWorkflows();
  return Response.json(workflows);
}

export async function POST(request: Request) {
  const workflow = await request.json();
  const created = await n8nMCP.createWorkflow(workflow);
  return Response.json(created);
}
```

## 📁 Project Structure

```
tax-deed-platform/
├── n8n/
│   ├── workflows/           # Workflow JSON files
│   ├── N8N_MCP_INTEGRATION.md
│   └── QUICK_REFERENCE.md   # This file
├── lib/
│   └── n8n-mcp-client.ts   # n8n-MCP client
├── scripts/
│   └── manage-n8n-workflows.ts  # Management CLI
└── .env                     # n8n API credentials
```

## 🔗 Webhook URLs

```env
# Property Enrichment
http://localhost:5678/webhook/property-enrichment-supabase

# Inspection Report
http://localhost:5678/webhook/inspection-report

# Financial Analysis
http://localhost:5678/webhook/financial-analysis

# Complete System
http://localhost:5678/webhook/tax-deed-platform
```

## 🛠️ Troubleshooting

### API Key Issues
```bash
# Check API key in n8n
Settings → API → Copy API Key

# Update .env file
N8N_API_KEY=your-new-key
```

### Workflow Not Activating
1. Check Supabase credentials configured
2. Look for red error nodes
3. Check execution logs

### n8n-MCP Not Working
```bash
# Rebuild n8n-MCP
cd ../n8n-mcp
npm run build

# Start n8n-MCP server
npm run start:http
```

## 🎯 Common Tasks

### Add New Workflow
1. Create JSON in `n8n/workflows/`
2. Run `npm run n8n:deploy`
3. Configure credentials in n8n UI
4. Activate workflow

### Update Existing Workflow
1. Edit JSON file
2. Run `npm run n8n:deploy`
3. Workflow auto-updates

### Debug Workflow
1. Check execution history in n8n
2. Look at node outputs
3. Check error details

## 💡 Tips

- **Always** use n8n-MCP for programmatic updates
- **Test** workflows locally before deploying
- **Export** workflows regularly for backup
- **Document** webhook URLs in .env.local
- **Monitor** execution logs for errors

## 📞 Support

- n8n UI: http://localhost:5678
- n8n Docs: https://docs.n8n.io
- n8n-MCP: ../n8n-mcp/README.md
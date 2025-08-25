# 🤖 AI Assistant Instructions (Cursor, Kilocode, Claude, etc.)

## ⚠️ CRITICAL: n8n Automation Management

### YOU MUST KNOW THIS:
This project uses **n8n-MCP** (located at `../n8n-mcp`) for ALL n8n workflow automation management.

### ❌ NEVER DO THIS:
- Edit n8n workflows directly in the n8n UI
- Manually import/export workflow JSON files to n8n
- Use the n8n API directly
- Assume workflows will persist without n8n-MCP

### ✅ ALWAYS DO THIS:
- Use n8n-MCP client: `lib/n8n-mcp-client.ts`
- Run workflow commands: `npm run n8n:*`
- Edit workflow files in: `n8n/workflows/`
- Deploy changes via: `npm run n8n:deploy`

## 📁 Project Dependencies

```
C:\Users\fs_ro\Documents\
├── tax-deed-platform\    ← You are here
│   ├── n8n\             ← Workflow definitions
│   ├── lib\
│   │   └── n8n-mcp-client.ts  ← n8n-MCP integration
│   └── scripts\
│       └── manage-n8n-workflows.ts  ← Management CLI
└── n8n-mcp\             ← REQUIRED DEPENDENCY
    ├── src\
    │   └── services\
    │       └── n8n-api-client.ts  ← Core API client
    └── .env             ← n8n API credentials
```

## 🔧 Working with n8n Workflows

### To List Workflows:
```bash
npm run n8n:list
```

### To Update/Create Workflows:
1. Edit JSON file in `n8n/workflows/`
2. Run: `npm run n8n:deploy`

### To Activate Workflow:
```bash
npm run n8n:manage activate "Workflow Name"
```

### In Code:
```typescript
import { n8nMCP } from '@/lib/n8n-mcp-client';

// Create workflow
await n8nMCP.createWorkflow(workflow);

// Update workflow
await n8nMCP.updateWorkflow(id, changes);

// Trigger webhook
await n8nMCP.triggerWebhook('webhook-path', data);
```

## 📚 Must-Read Documentation

1. **[`n8n/N8N_MCP_INTEGRATION.md`](n8n/N8N_MCP_INTEGRATION.md)** - Complete integration guide
2. **[`n8n/QUICK_REFERENCE.md`](n8n/QUICK_REFERENCE.md)** - Command reference
3. **[`AUTOMATION_MAPPING.md`](AUTOMATION_MAPPING.md)** - All automation touchpoints

## 🎯 Key Files for n8n Work

| File | Purpose | When to Edit |
|------|---------|--------------|
| `lib/n8n-mcp-client.ts` | n8n-MCP client | Adding new n8n operations |
| `n8n/workflows/*.json` | Workflow definitions | Updating workflow logic |
| `scripts/manage-n8n-workflows.ts` | CLI management | Adding management commands |
| `.env` | API credentials | Updating n8n API key |

## 🚨 Common Mistakes to Avoid

### ❌ Wrong Way:
```javascript
// DON'T: Direct n8n API call
fetch('http://localhost:5678/api/v1/workflows', {...})

// DON'T: Manual workflow import
n8n import:workflow workflow.json

// DON'T: Edit in n8n UI and expect it to persist
```

### ✅ Right Way:
```javascript
// DO: Use n8n-MCP client
import { n8nMCP } from '@/lib/n8n-mcp-client';
await n8nMCP.createWorkflow(workflow);

// DO: Use npm scripts
npm run n8n:deploy

// DO: Edit JSON files and deploy
```

## 🔍 Debugging n8n Issues

### Check n8n-MCP is available:
```bash
ls ../n8n-mcp
# Should show the n8n-mcp project files
```

### Check n8n connection:
```bash
npm run n8n:list
# Should list all workflows
```

### If n8n-MCP is missing:
```bash
cd ..
git clone https://github.com/czlonkowski/n8n-mcp.git
cd n8n-mcp
npm install
npm run build
```

## 📝 Workflow Update Process

1. **Locate workflow file**: `n8n/workflows/[workflow-name].json`
2. **Make changes** to the JSON
3. **Validate**: `npm run n8n:validate`
4. **Deploy**: `npm run n8n:deploy`
5. **Activate if needed**: `npm run n8n:manage activate "[Workflow Name]"`

## 🔗 API Routes Using n8n

These routes interact with n8n workflows:

- `/api/properties/enrich` → Property Enrichment Workflow
- `/api/financial/analyze` → Financial Analysis Workflow
- `/api/inspections/generate` → Inspection Report Workflow
- `/api/webhook` → Generic webhook proxy

All use webhook URLs defined in `.env.local`:
```env
N8N_ENRICHMENT_WEBHOOK=http://localhost:5678/webhook/...
N8N_INSPECTION_WEBHOOK=http://localhost:5678/webhook/...
N8N_FINANCIAL_WEBHOOK=http://localhost:5678/webhook/...
```

## ⚡ Quick Commands

```bash
# View all workflows
npm run n8n:list

# Deploy all workflows
npm run n8n:deploy

# Validate workflows
npm run n8n:validate

# Export workflows from n8n
npm run n8n:export

# Show specific workflow
npm run n8n:manage show "Workflow Name"

# Activate workflow
npm run n8n:manage activate "Workflow Name"

# Deactivate workflow
npm run n8n:manage deactivate "Workflow Name"
```

## 🆘 Help & Support

- **n8n-MCP Documentation**: `../n8n-mcp/README.md`
- **n8n UI**: http://localhost:5678
- **Integration Guide**: `n8n/N8N_MCP_INTEGRATION.md`
- **Quick Reference**: `n8n/QUICK_REFERENCE.md`

---

**REMEMBER**: n8n-MCP is the ONLY way to manage n8n workflows programmatically. Never bypass it!
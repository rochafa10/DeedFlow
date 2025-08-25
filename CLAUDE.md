# 🤖 CLAUDE AI ASSISTANT INSTRUCTIONS

## CRITICAL: n8n Workflow Development Rules

### ⚠️ ALWAYS Use n8n-mcp Integration

This project uses n8n-mcp server for ALL n8n operations. NEVER create workflows with raw JSON or outdated node types.

### ✅ CORRECT Approach - Use n8n-mcp Client

```typescript
// ALWAYS import and use the n8n-mcp client
import { n8nMCP } from './lib/n8n-mcp-client';

// Use proper node types with full package prefix
const node = {
  type: 'n8n-nodes-base.httpRequest',  // ✅ CORRECT
  // NOT: 'httpRequest' or 'httpRequestV3'
}
```

### ❌ INCORRECT Approaches to AVOID

1. **Creating raw workflow JSON files without validation**
2. **Using node types without package prefix**
3. **Creating duplicate workflow versions**
4. **Not using the n8n-mcp client functions**

### 🔄 CRITICAL: Use LATEST Node Versions

ALWAYS use the most current node versions to avoid "new version available" warnings:

```typescript
// LATEST NODE VERSIONS (as of n8n 1.107+)
{
  type: 'n8n-nodes-base.scheduleTrigger',
  typeVersion: 1.2  // LATEST (not 1.1)
},
{
  type: 'n8n-nodes-base.httpRequest', 
  typeVersion: 4.2  // LATEST (not 3.x or 4.1)
},
{
  type: '@n8n/n8n-nodes-langchain.openAi',  // CORRECT package
  typeVersion: 1.5  // LATEST (not 1.0 or n8n-nodes-base.openAi)
},
{
  type: 'n8n-nodes-base.code',
  typeVersion: 2    // LATEST
},
{
  type: 'n8n-nodes-base.set',
  typeVersion: 3.4  // LATEST (not 3.0)
}
```

### 📋 Correct Node Type Reference

Always use these exact node type formats:

```typescript
// Triggers
'n8n-nodes-base.scheduleTrigger'
'n8n-nodes-base.webhook'
'n8n-nodes-base.emailReadImap'

// Core Nodes  
'n8n-nodes-base.httpRequest'
'n8n-nodes-base.code'
'n8n-nodes-base.set'
'n8n-nodes-base.if'
'n8n-nodes-base.merge'
'n8n-nodes-base.splitInBatches'

// AI Nodes (LATEST VERSIONS)
'@n8n/n8n-nodes-langchain.openAi'  // v1.5+ (NOT n8n-nodes-base.openAi)
'@n8n/n8n-nodes-langchain.agent'
'@n8n/n8n-nodes-langchain.chainLlm'

// Database
'n8n-nodes-base.supabase'
'n8n-nodes-base.postgres'
'n8n-nodes-base.mongodb'

// Communications
'n8n-nodes-base.slack'
'n8n-nodes-base.gmail'
'n8n-nodes-base.telegram'
```

### 🛠️ Workflow Creation Template

```typescript
// TEMPLATE: Always use this structure
import { n8nMCP, Workflow } from '../lib/n8n-mcp-client';

async function createWorkflow() {
  const workflow: Workflow = {
    name: 'My Workflow',
    nodes: [
      {
        id: 'unique-id',  // Use kebab-case IDs
        name: 'Node Name',
        type: 'n8n-nodes-base.httpRequest', // Full type
        typeVersion: 4.2,  // Include version
        position: [x, y],
        parameters: {}
      }
    ],
    connections: {
      'Node Name': {  // Use node NAMES in connections (NOT IDs)
        main: [[{ node: 'Target Node Name', type: 'main', index: 0 }]]
      }
    },
    settings: {
      executionOrder: 'v1'  // Minimal settings only
    }
  };

  // ALWAYS validate before deploying
  const validation = await n8nMCP.validateWorkflow(workflow);
  if (!validation.valid) {
    console.error('Validation errors:', validation.errors);
    return;
  }

  // Deploy using n8nMCP
  const result = await n8nMCP.upsertWorkflow(workflow);
}
```

### 📁 File Organization Rules

1. **One workflow per feature** - Don't create multiple versions
2. **Use versioning in workflow name** - Not in filename
3. **Keep workflows in `/n8n/workflows/`** - Single location
4. **Document in README.md** - Not in multiple guides

### 🔍 Before Creating Any n8n Workflow

1. **Check existing workflows** first:
   ```bash
   npm run n8n:list
   ```

2. **Use n8n-mcp tools** to discover nodes:
   ```typescript
   // Check n8n-mcp documentation
   // Path: /n8n-mcp/docs/mcp-tools-documentation.md
   ```

3. **Validate with n8nMCP.validateWorkflow()** before deploying

4. **Test with minimal nodes first** - Add complexity gradually

### 🚫 Common Mistakes to Avoid

1. **Creating workflows without n8n-mcp client**
   ```javascript
   // ❌ WRONG
   const workflow = { nodes: [...] };
   fs.writeFileSync('workflow.json', JSON.stringify(workflow));
   
   // ✅ CORRECT
   await n8nMCP.upsertWorkflow(workflow);
   ```

2. **Using incorrect node types**
   ```javascript
   // ❌ WRONG
   type: 'httpRequest'
   type: 'openAi'
   
   // ✅ CORRECT
   type: 'n8n-nodes-base.httpRequest'
   type: 'n8n-nodes-base.openAi'
   ```

3. **Creating duplicate workflows**
   ```javascript
   // ❌ WRONG
   'workflow-v1.json'
   'workflow-v2.json'
   'workflow-final.json'
   
   // ✅ CORRECT
   // Use upsertWorkflow to update existing
   await n8nMCP.upsertWorkflow(updatedWorkflow);
   ```

### 📚 Essential References

- **n8n-mcp Client**: `/lib/n8n-mcp-client.ts`
- **n8n-mcp Docs**: `/n8n-mcp/docs/mcp-tools-documentation.md`
- **Workflow Manager**: `/scripts/manage-n8n-workflows.ts`
- **Active Workflows**: `/n8n/workflows/README.md`

### 🎯 Workflow Development Checklist

- [ ] Used n8n-mcp client functions
- [ ] Used correct node type format (with package prefix)
- [ ] Validated workflow before deploying
- [ ] No duplicate files created
- [ ] Updated single README.md if needed
- [ ] Tested with `npm run n8n:test`

## Remember

**This project integrates with n8n-mcp server. All n8n operations MUST go through the n8n-mcp client to ensure compatibility and prevent errors.**

---
Last Updated: 2025-01-25
Critical for: All AI assistants working on this project
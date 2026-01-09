# Context Save - Session January 8, 2026

## Session Summary

This session focused on **n8n MCP integration** to reduce token usage by offloading repetitive tasks to n8n workflows.

---

## What Was Accomplished

### 1. n8n MCP Server Installed
- **Package**: `n8n-mcp` from https://github.com/czlonkowski/n8n-mcp
- **Location**: User-level MCP config (`~/.claude.json`)
- **Status**: Configured and ready (restart required to activate)

### 2. n8n Configuration
```json
"n8n-mcp": {
  "command": "npx",
  "args": ["n8n-mcp"],
  "env": {
    "MCP_MODE": "stdio",
    "LOG_LEVEL": "error",
    "DISABLE_CONSOLE_OUTPUT": "true",
    "N8N_API_URL": "https://n8n.lfb-investments.com",
    "N8N_API_KEY": "[configured]"
  }
}
```

### 3. Files Created
| File | Purpose |
|------|---------|
| `N8N-MCP-SYSTEM-PROMPT.md` | Expert system prompt for n8n workflow building |
| `n8n-mcp-server/package.json` | Custom MCP server (superseded by czlonkowski/n8n-mcp) |
| `n8n-mcp-server/index.js` | Custom MCP server (superseded by czlonkowski/n8n-mcp) |

### 4. Files Updated
| File | Changes |
|------|---------|
| `CLAUDE.md` | Added n8n MCP to tools list, added n8n Workflow Automation section |
| `~/.claude.json` | Added n8n-mcp server configuration |

---

## Current MCP Server Status

| Server | Status | Purpose |
|--------|--------|---------|
| supabase | Connected | Database operations |
| playwright | Connected | Web automation |
| perplexity | Connected | AI research |
| google-search | Failed | PDF/URL finding (needs fix) |
| filesystem | Connected | File access |
| memory | Connected | Knowledge graph |
| fetch | Failed | URL fetching (needs fix) |
| **n8n-mcp** | **Configured** | **Workflow automation (needs restart)** |

---

## n8n MCP Capabilities (After Restart)

### Documentation Tools (7)
- `tools_documentation` - Best practices guide
- `search_nodes` - Search 1,084 n8n nodes
- `get_node` - Get node details and examples
- `validate_node` - Validate node configuration
- `validate_workflow` - Validate complete workflow
- `search_templates` - Search 2,709 workflow templates
- `get_template` - Get template JSON

### Management Tools (13) - Requires API key (configured)
- `n8n_list_workflows` - List all workflows
- `n8n_create_workflow` - Create new workflow
- `n8n_get_workflow` - Get workflow details
- `n8n_update_full_workflow` - Replace entire workflow
- `n8n_update_partial_workflow` - Batch updates with diff operations
- `n8n_delete_workflow` - Delete workflow
- `n8n_validate_workflow` - Validate deployed workflow
- `n8n_autofix_workflow` - Auto-fix common errors
- `n8n_workflow_versions` - Version history/rollback
- `n8n_deploy_template` - Deploy template to instance
- `n8n_test_workflow` - Trigger execution
- `n8n_executions` - Manage execution records
- `n8n_health_check` - Verify API connectivity

---

## n8n Instance Details

- **URL**: https://n8n.lfb-investments.com
- **API Key**: Configured in MCP settings
- **Purpose**: Automate Tax Deed Flow tasks

---

## Planned n8n Workflows

### Priority 1: Data Integrity Check
- **Trigger**: Schedule (daily) or webhook
- **Actions**: Query Supabase for orphaned records, flag mismatches, pipeline gaps
- **Output**: Summary JSON or email alert
- **Token Savings**: 80%

### Priority 2: PDF Parser
- **Trigger**: Webhook with document_id
- **Actions**: Download PDF, extract text, apply regex, UPSERT to Supabase
- **Output**: Property count, success/fail status
- **Token Savings**: 98%

### Priority 3: Batch Job Orchestrator
- **Trigger**: Webhook from Claude
- **Actions**: Get next batch, route to processing, update progress
- **Output**: Batch status
- **Token Savings**: 90%

### Priority 4: Regrid Scraper
- **Trigger**: Webhook with property_ids
- **Actions**: Navigate to Regrid, extract data, capture screenshot, upload to storage
- **Output**: Success count, failed IDs
- **Token Savings**: 99%

### Priority 5: County Research
- **Trigger**: Webhook with county_name, state
- **Actions**: Perplexity API call, Google Custom Search, parse results, UPSERT
- **Output**: Research summary for verification
- **Token Savings**: 80%

---

## Expected Token Savings

| Task | Current (Claude) | With n8n | Savings |
|------|------------------|----------|---------|
| Data integrity audits | 1,000 tokens | 200 tokens | 80% |
| PDF parsing | 2,000 tokens | 40 tokens | 98% |
| Batch orchestration | 500 tokens | 50 tokens | 90% |
| Regrid scraping | 1,500 tokens | 15 tokens | 99% |
| County research | 3,000 tokens | 600 tokens | 80% |

**Overall: ~99% token reduction on offloaded tasks**

---

## Next Steps After Restart

### Immediate (Test Connection)
1. Restart Claude Code
2. Run `n8n_health_check` to verify API connectivity
3. Run `n8n_list_workflows` to see existing workflows
4. Test `search_templates({query: 'supabase'})` to find relevant templates

### Short-term (Build Workflows)
1. Create Data Integrity Check workflow
2. Create Batch Job Orchestrator workflow
3. Test with actual data

### Medium-term (Full Integration)
1. Create PDF Parser workflow
2. Create Regrid Scraper workflow
3. Create County Research workflow
4. Update agent prompts to use n8n triggers

---

## Pending Database Work

From previous sessions:

| Task | Count | Priority |
|------|-------|----------|
| Properties missing Regrid data | 7,358 | High |
| Properties missing address | 6,221 | Medium |
| Properties missing amount | 3,711 | Medium |
| Regrid records needing validation | 17 | Low |
| Critical/Consistency issues | 0 | OK |

---

## Key Commands for Next Session

### Test n8n Connection
```
"Check n8n health"
"List n8n workflows"
"Search n8n templates for supabase"
```

### Build First Workflow
```
"Create n8n workflow for data integrity check"
"Search templates for scheduled database audit"
```

### Continue Batch Processing
```
"Show pending work summary"
"Resume batch job"
```

---

## Files Reference

### Project Structure
```
TAX DEED FLOW/
├── CLAUDE.md                      # Main project instructions (updated)
├── N8N-MCP-SYSTEM-PROMPT.md       # n8n expert system prompt (new)
├── CONTEXT-SAVE.md                # This file (new)
├── BATCH-PROCESSING-GUIDE.md      # Batch processing docs
├── AGENT-SYSTEM-PROMPT.md         # Research agent prompt
├── PARSER-AGENT-UNIFIED.md        # Parser agent prompt
├── REGRID-SCRAPER-AGENT.md        # Regrid scraper prompt
├── agents/
│   └── DATA-INTEGRITY-AGENT.md    # Data integrity agent
├── skills/
│   └── SKILL-property-visual-validator.md
└── n8n-mcp-server/                # Custom MCP (superseded)
    ├── package.json
    └── index.js
```

### Config File
- `~/.claude.json` - Contains n8n-mcp configuration

---

## Session Stats

- **Started**: January 8, 2026
- **Focus**: n8n MCP integration for token reduction
- **Outcome**: n8n MCP configured, documentation created, ready for testing

---

## Resume Command

After restart, say:
```
"Test n8n connection and list workflows"
```

Or to continue previous work:
```
"Show pending work and resume batch processing"
```

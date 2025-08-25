# n8n Workflow Integration

## ⚠️ IMPORTANT: Use n8n-MCP for ALL Operations

This project uses **n8n-MCP server** for workflow management. All n8n operations MUST go through the n8n-MCP client.

## Quick Start

```bash
# List current workflows
npm run n8n:list

# Deploy workflows (uses n8n-MCP)
npm run n8n:deploy

# Rebuild with correct node types
npm run n8n:rebuild

# Test workflows
npm run n8n:test

# Monitor performance
npm run n8n:monitor
```

## Active Workflows

### Calendar Scrapers (v2)
- **Super-Smart Calendar Scraper v2** (ID: op0k3oumrAgYlt35)
  - AI + Python hybrid with self-learning
  - Runs every 2 hours
  
- **AI Calendar Scraper Agent v2** (ID: YktiYFYsflGVbTk5)
  - Pure AI extraction
  - Runs every 4 hours
  
- **Python-Enhanced Calendar Scraper v2** (ID: XGKKG6uiJ3rpqYR7)
  - Python HTML parsing
  - Runs every 3 hours

### Property Analysis
- **AI Enhanced Property Analyzer** - Property valuation
- **AI Agent Property Researcher** - Research automation
- **Property Enrichment Supabase** - Data enrichment

### Document Processing  
- **AI Document Processor** - PDF/document extraction
- **Inspection Report Workflow** - Report generation

## Installation

### 1. Install n8n (if not already installed)

```bash
# Using npm
npm install -g n8n

# Or using Docker
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```

### 2. Start n8n

```bash
n8n start
```

Access n8n at: http://localhost:5678

### 3. Deploy Workflows

```bash
# Deploy all workflows using n8n-MCP
npm run n8n:deploy

# Or rebuild with latest node types
npm run n8n:rebuild
```

## Configuration

### Required Credentials in n8n UI

1. **OpenAI**
   - Type: OpenAI
   - API Key: Your OpenAI API key

2. **Supabase**
   - Type: Supabase  
   - URL: `https://filvghircyrnlhzaeavm.supabase.co`
   - Service Role Key: (from .env.local)

3. **Anthropic** (Optional)
   - Type: Anthropic
   - API Key: Your Anthropic API key

### Environment Variables (.env.local)

```env
# n8n Configuration
N8N_API_URL=http://localhost:5678
N8N_API_KEY=your-n8n-api-key

# AI Services
OPENAI_API_KEY=your-openai-key

# Already configured in .env.local
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=...
```

## Development Rules

### ✅ ALWAYS
- Use `n8nMCP` client from `/lib/n8n-mcp-client.ts`
- Use full node type names: `n8n-nodes-base.httpRequest`
- Validate workflows before deploying
- Keep one workflow per feature

### ❌ NEVER
- Create raw JSON workflow files without validation
- Use node types without package prefix
- Create duplicate workflow versions
- Edit workflows outside of n8n-MCP

## Testing Workflows

```bash
# Test all workflows
npm run n8n:test

# Monitor performance
npm run n8n:monitor

# Manual webhook test
curl -X POST http://localhost:5678/webhook/your-webhook-path \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

## File Structure

```
n8n/
├── workflows/          # Active workflow files (v2)
│   ├── super-smart-calendar-scraper-v2.json
│   ├── ai-calendar-scraper-agent-v2.json
│   ├── python-enhanced-calendar-scraper-v2.json
│   └── README.md
├── workflows-archive/  # Deprecated workflows
└── README.md          # This file
```

## Workflow Features

Each workflow includes:
- **Schedule Triggers** - Automated execution
- **HTTP Requests** - Fetch county calendars
- **AI Processing** - OpenAI GPT-4 extraction
- **Python Processing** - BeautifulSoup parsing
- **Supabase Integration** - Data persistence
- **Error Handling** - Retry logic and logging

## Troubleshooting

### "Workflow has unrecognized nodes"
```bash
# You're using incorrect node types
npm run n8n:rebuild
```

### "Cannot deploy workflows"
```bash
# Check n8n is running
curl http://localhost:5678/api/v1/workflows

# Verify API key
echo $N8N_API_KEY

# Use n8n-MCP deployment
npm run n8n:deploy
```

### "Duplicate workflows appearing"
```bash
# Clean up old workflows
npx tsx scripts/cleanup-workflows.ts
```

### "Supabase not updating"
- Verify credentials in n8n UI
- Check workflow execution logs
- Ensure tables exist in Supabase

## NPM Scripts Reference

| Command | Description |
|---------|-------------|
| `npm run n8n:list` | List all workflows |
| `npm run n8n:deploy` | Deploy workflows from files |
| `npm run n8n:rebuild` | Rebuild with correct node types |
| `npm run n8n:test` | Test workflow functionality |
| `npm run n8n:monitor` | Real-time monitoring dashboard |
| `npm run n8n:validate` | Validate workflow files |
| `npm run n8n:export` | Export workflows from n8n |

## For AI Assistants

**⚠️ CRITICAL: Read `/CLAUDE.md` for mandatory instructions on using n8n-MCP correctly.**

Never create workflows without using the n8n-MCP client functions. All node types must include the full package prefix.
# n8n Workflows Directory

## Active Workflows (Using Correct n8n-mcp Node Types)

These are the ONLY workflows that should be used with proper n8n node types:

### Calendar Scrapers (v2 - CURRENT)
- `super-smart-calendar-scraper-v2.json` - AI + Python hybrid with learning
- `ai-calendar-scraper-agent-v2.json` - Pure AI extraction agent  
- `python-enhanced-calendar-scraper-v2.json` - Python-based HTML parsing

### Property Analysis
- `ai-enhanced-property-analyzer.json` - Property value analysis
- `ai-agent-property-researcher.json` - Property research agent

### Document Processing
- `ai-document-processor.json` - PDF and document extraction
- `inspection-report-workflow.json` - Inspection report generation

### Data Enrichment
- `property-enrichment-supabase.json` - Supabase data enrichment
- `counties-census-business-patterns-update.json` - Updates counties with Census CBP business data

## Deprecated Files (DO NOT USE)
The following files use incorrect node types and should be removed:
- `super-smart-calendar-scraper.json` (replaced by v2)
- `ai-calendar-scraper-agent.json` (replaced by v2)
- `ai-calendar-scraper-python-enhanced.json` (replaced by v2)
- `auction-scraper-workflow.json` (old format)
- `miami-dade-scraper-detailed.json` (old format)
- `property-enrichment-workflow.json` (replaced by supabase version)
- `tax-deed-platform-workflows.json` (old bundle)

## Important: Always Use n8n-mcp Client

All workflows MUST be created/updated using the n8n-mcp client functions.
See `/lib/n8n-mcp-client.ts` for the proper integration.

## Deployment

```bash
# Deploy workflows using n8n-mcp
npm run n8n:deploy

# Rebuild with correct node types
npm run n8n:rebuild
```
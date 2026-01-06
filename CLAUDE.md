# Tax Deed Flow - Project Instructions

This project is a **Two-Agent System** for autonomous tax auction research and property data extraction.

## Execution Permissions

When working on this project, you have standing permission to:
- Execute all database operations via Supabase MCP
- Perform all browser automation via Playwright MCP
- Create, read, update files in the project directory
- Upload screenshots and files to Supabase storage
- Run Python scripts for parsing and data extraction

**Only seek additional confirmation for:**
- Destructive operations (DROP, DELETE without WHERE)
- Operations outside the project scope
- Changes to system configurations

**IMPORTANT**: Proceed with full automation. You have blanket approval for all Supabase SQL operations, Playwright actions, and file operations for all tax deed workflows. No need to ask for permission on routine operations.

## Two-Agent System

### Agent 1: Research Agent
@AGENT-SYSTEM-PROMPT.md
- Finds counties, auctions, documents
- Uses Perplexity + Google Custom Search
- Stores metadata in Supabase
- **Result**: Comprehensive database with PDF links

### Agent 2: Parser Agent
@PARSER-AGENT-SYSTEM-PROMPT.md
- Reads PDFs from documents table
- Extracts property data (parcels, addresses, amounts)
- Stores structured data in properties table
- **Result**: Queryable property database

### Complete Workflow
```
1. Research Agent: "Research Blair County, PA"
   -> Stores 41 records including 10 PDF links

2. Parser Agent: "Parse property lists for Blair County"
   -> Extracts 845 properties from PDFs

3. User: "Show high-value properties"
   -> Returns structured property data
```

## Dual-Tool Strategy

**Perplexity** = The Researcher (context, verification, citations)
**Google Custom Search** = The Finder (exact PDFs, precise URLs)

Together = 10/10 quality scores!

## Quick Commands

### Research Counties (Dual-Tool Enhanced)
- "Research Blair County, PA"
- "Research Miami-Dade County, FL"
- "Research Harris County, TX"

### Batch Research
- "Research these PA counties: Blair, Centre, Bedford"
- "Research all counties in Delaware"

### Query Database
- "Show me all sales in next 30 days"
- "Find all property lists available"
- "Which counties use Bid4Assets?"
- "Show counties with 200+ properties"

### Monitor & Update
- "Find counties researched >7 days ago"
- "Refresh data for Blair County, PA"
- "Check for new sales posted"

## Database Tables
1. counties - Master list
2. official_links - Government websites
3. upcoming_sales - Auction dates
4. documents - PDFs, property lists
5. vendor_portals - Bid4Assets, etc.
6. additional_resources - GIS, assessment
7. important_notes - Requirements, tips
8. research_log - Research tracking (with dual-tool citations)

## UPSERT Functions (Duplicate Prevention)

**ALWAYS use UPSERT functions instead of direct INSERT!**

| Function | Purpose |
|----------|---------|
| `upsert_official_link()` | Official websites, contacts |
| `upsert_upcoming_sale()` | Auction dates |
| `upsert_document()` | PDFs, property lists |
| `upsert_vendor_portal()` | Bid4Assets, etc. |
| `upsert_additional_resource()` | GIS, assessment offices |
| `upsert_important_note()` | Requirements, tips |
| `refresh_county_research()` | Clean old data before refresh |
| `clean_duplicate_records()` | Remove any stragglers |

**Only use direct INSERT for:** `research_log` (always want new entries)

**Expected Behavior:**
```
Research #1: 42 records created
Research #2: 43 records (42 UPDATED + 1 new research_log)
Research #3: 44 records (NOT 126 duplicates!)
```

## MCP Tools Available
- **Supabase** - Database operations
- **Perplexity** - Overview, context, verification (PRIMARY)
- **Google Custom Search** - PDFs, exact URLs, documents (SECONDARY)
- **Playwright** - Web automation
- **Web Search** - Fallback/validation

## Tool Selection Guide

| Need | Use |
|------|-----|
| County overview | Perplexity |
| Property list PDF | Google Custom Search |
| Sale dates | Perplexity |
| Registration forms | Google Custom Search |
| Vendor portal URL | Google Custom Search |
| Verify information | Perplexity |
| Legal notices | Google Custom Search |

## Research Workflow
1. **Perplexity** - Get comprehensive overview
2. **Google Custom Search** - Find all PDFs/documents
3. **Perplexity** - Verify critical dates
4. **Google Custom Search** - Find any missing docs
5. **Supabase** - Store everything with citations

## Expected Quality with Both Tools
- Documents Found: 7-10 (vs 3-4 single tool)
- Quality Score: 10/10 consistently
- Citations: Full attribution from both sources
- Accuracy: 95%+
- PDF Links: Direct URLs (not summaries)

## Parser Agent Commands

### Parse Properties
- "Parse property lists for Blair County, PA"
- "Parse all unparsed property lists"
- "Re-parse failed documents"

### Check Parsing Status
- "Show parsing status for all counties"
- "Find documents that need parsing"

## Property Queries

After parsing, query the data:
```sql
-- High-value properties
SELECT * FROM vw_properties_complete
WHERE total_due > 5000 ORDER BY total_due DESC;

-- Properties by county
SELECT * FROM vw_properties_complete
WHERE county_name = 'Blair' ORDER BY total_due DESC;

-- Parsing summary
SELECT * FROM vw_parsing_summary ORDER BY completed_at DESC;
```

## Parser Agent Tables
| Table | Purpose |
|-------|---------|
| `properties` | Extracted property data (parcel, address, amounts) |
| `parsing_jobs` | Track parsing progress |
| `parsing_errors` | Log parsing errors |

## Parser Agent Functions
| Function | Purpose |
|----------|---------|
| `get_unparsed_documents()` | Find PDFs needing parsing |
| `create_parsing_job()` | Start new parsing job |
| `upsert_property()` | Insert/update property data |
| `complete_parsing_job()` | Mark job complete |
| `fail_parsing_job()` | Mark job failed |

## Complete Database Schema (11 Tables)

**Research Agent (8 tables):**
counties, official_links, upcoming_sales, documents, vendor_portals, additional_resources, important_notes, research_log

**Parser Agent (3 tables):**
properties, parsing_jobs, parsing_errors

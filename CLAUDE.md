# Tax Deed Flow - Project Instructions

This project is a **Multi-Agent System** for autonomous tax auction research and property data extraction, coordinated by a **Master Orchestrator Agent**.

## Web Application

@APP-SPECIFICATION.md

A comprehensive web application specification is available for building the Tax Deed Flow UI. It includes:
- Complete database schema (17 tables)
- All page layouts and components
- API endpoints and real-time features
- UI/UX design system
- Technology stack (Next.js, Supabase, shadcn/ui)

---

## Master Orchestrator Agent

@agents/MASTER-ORCHESTRATOR-AGENT.md

The Master Orchestrator is the **central coordinator** for all 11 agents in the system. It handles:
- Autonomous work delegation based on priority
- Pipeline efficiency optimization
- Session planning for Max $200 context limits
- n8n workflow integration for routine tasks

### Orchestrator Commands
```
"Start orchestration session"      -> Begin session, get work plan
"Show pipeline status"             -> Full pipeline overview
"What should we work on?"          -> Get prioritized recommendations
"End session"                      -> Complete with summary
"Check bottlenecks"                -> Find pipeline blockages
```

### Orchestrator SQL Functions
```sql
-- Start a session
SELECT start_orchestration_session('full_pipeline', 'manual');

-- Get prioritized work queue
SELECT * FROM get_orchestrator_work_queue();

-- Get recommended session plan (150 properties, 3 agents max)
SELECT * FROM get_session_plan(150, 3);

-- Create agent assignment
SELECT create_agent_assignment(session_id, 'REGRID_SCRAPER', 'regrid_scraping', county_id, 2, 50, 'n8n');

-- Check session status
SELECT * FROM get_orchestration_status();

-- Detect bottlenecks
SELECT * FROM detect_bottlenecks();

-- End session
SELECT * FROM end_orchestration_session(session_id, 'completed');
```

### Orchestrator Tables
| Table | Purpose |
|-------|---------|
| `orchestration_sessions` | Track orchestration runs |
| `agent_assignments` | Track work delegated to agents |
| `pipeline_metrics` | Track throughput over time |
| `orchestrator_priority_rules` | Configurable priority rules |

### n8n Orchestrator Workflows
| Workflow | ID | Trigger | Purpose |
|----------|-----|---------|---------|
| TDF - Data Integrity Check | 5xZIPh2TIGYKdnZI | Webhook/Schedule | Run audit, generate work queues |
| TDF - Daily Pipeline Review | RotWjv6Ld7l6hA6d | Schedule (6AM) | Morning summary, priorities |
| TDF - Progress Tracker | eMmEyG00XFCF0LMr | Schedule (15 min) | Monitor active batches |

---

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

---

## DigitalOcean Agent

@agents/DIGITALOCEAN-AGENT.md

The DigitalOcean Agent manages all infrastructure on your DigitalOcean account:
- Droplet management (create, resize, restart, snapshot)
- Docker container operations on the VPS
- DNS and domain management
- Firewall and networking configuration
- Monitoring and billing

### DigitalOcean API Access (Preferred)
```bash
# Set your API token
export DIGITALOCEAN_TOKEN="dop_v1_xxxxxxxxxxxxxxxxxxxx"

# Use the API utility script
node scripts/digitalocean-api.js droplets      # List all droplets
node scripts/digitalocean-api.js droplet <id>  # Get droplet details
node scripts/digitalocean-api.js reboot <id>   # Reboot droplet
node scripts/digitalocean-api.js snapshot <id> "backup-name"  # Create snapshot
node scripts/digitalocean-api.js billing       # Check billing
node scripts/digitalocean-api.js help          # See all commands
```

### Quick Commands
```
"List all droplets"           -> Show droplet status
"Restart n8n droplet"         -> Reboot the VPS
"Create snapshot before upgrade"  -> Backup current state
"Deploy script to pwrunner"   -> Deploy to container
"Show billing status"         -> Check costs
```

---

## VPS Access (DigitalOcean Droplet)

### VPS Details
- **IP Address**: 192.241.153.13
- **Provider**: DigitalOcean
- **Droplet Name**: n8n-droplet
- **Droplet ID**: 517414136
- **Region**: nyc1 (New York 1)
- **Size**: s-2vcpu-4gb (2 vCPU, 4GB RAM, 80GB disk)
- **Access Methods**:
  1. **API (Preferred)** - Use DIGITALOCEAN_TOKEN with scripts/digitalocean-api.js
  2. **Web Console** - Browser login to cloud.digitalocean.com

### How to Access VPS via Browser (Fallback)
1. Navigate to https://cloud.digitalocean.com/login
2. Click "Sign In with Google" (user's Google account is linked)
3. Go to Droplets → Select the droplet → Click "Console" or "Access"
4. Use the web-based terminal to run commands

### Docker Containers on VPS
| Container | Container ID | Purpose | Port |
|-----------|--------------|---------|------|
| n8n-production-pwrunner-1 | f3dce7c59905 | Playwright screenshot service | 3001 |
| n8n-production-n8n-1 | 996f73a2c068 | n8n workflow automation (v2.4.8) | 5678 |
| n8n-production-nginx-1 | bfb0652376e4 | Reverse proxy | 80, 443 |
| n8n-production-cloudflared-1 | 4bf66773574a | Cloudflare tunnel | - |

### ⚠️ CRITICAL: Deploying Scripts to Docker Container

**VNC Console has issues with special characters (`:`, `|`, `>`, `https://`). Use this proven method:**

#### Step 1: Upload script to 0x0.st (from local machine)
```bash
curl -k -F "file=@scripts/your-script.js" https://0x0.st
# Returns: https://0x0.st/XXXX.js (save the XXXX.js part)
```

#### Step 2: Access VNC Console via Playwright
```
Navigate to: https://cloud.digitalocean.com/droplets/517414136/console
Click on canvas to activate, press Enter for prompt
```

#### Step 3: Download DIRECTLY INTO the container (key insight!)
```bash
# Use wget WITHOUT https:// - download directly into container
# Use container ID, not name, to avoid colon issues
docker exec f3dce7c59905 wget -O /app/scripts/your-script.js 0x0.st/XXXX.js
```

#### Step 4: Verify
```bash
docker exec f3dce7c59905 ls -la /app/scripts/
```

### Why This Works
- `wget` auto-adds `http://` if no protocol specified (avoids colon issue)
- Using container ID avoids the `container:/path` colon issue
- File goes directly into container (no `docker cp` needed)

### What Does NOT Work via VNC
- ❌ `curl https://...` - colon breaks URL
- ❌ `docker cp file container:/path` - colon breaks path
- ❌ `cat file | docker exec -i` - pipe becomes backslash
- ❌ Heredocs with special chars - various issues

### Common Docker Commands (use Container ID)
```bash
# List containers
docker ps

# View container logs
docker logs f3dce7c59905 --tail 50

# Restart container
docker restart f3dce7c59905

# Execute command in container
docker exec f3dce7c59905 ls -la /app/scripts/

# Download file directly into container
docker exec f3dce7c59905 wget -O /app/scripts/script.js 0x0.st/XXXX.js
```

## Core Agents

### Research Agent (Agent 1)
@AGENT-SYSTEM-PROMPT.md
- Finds counties, auctions, documents
- Uses Perplexity + Google Custom Search
- Stores metadata in Supabase
- **Result**: Comprehensive database with PDF links

### Parser Agent (Agent 2)
@PARSER-AGENT-UNIFIED.md
- Reads PDFs from documents table
- Uses multi-method approach (Universal Parser, Playwright, Custom Python, Manual)
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
- **n8n-mcp** - Workflow automation (see @N8N-MCP-SYSTEM-PROMPT.md)

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

## Batch Processing (MANDATORY for Large Jobs)

**CRITICAL**: ALL agents must use batch processing to avoid context/rate limits on your Max $200 plan!

See @BATCH-PROCESSING-GUIDE.md for full documentation.

### Session Start Checklist
```sql
-- Always run this first!
SELECT * FROM get_pending_work_summary();
```

### Batch Commands (Work for ALL Agents)
```
"Start [job_type] for [County] in batches of [size]"
"Resume batch job"
"Show batch job status"
"Pause batch job"
```

### Supported Job Types
| Job Type | Batch Size | Per Session | Agent |
|----------|------------|-------------|-------|
| `regrid_scraping` | 50 | ~150 | Regrid Scraper |
| `visual_validation` | 100 | ~300 | Visual Validator |
| `property_condition` | 25 | ~75 | Agent 6 |
| `environmental_research` | 25 | ~75 | Agent 7 |
| `title_research` | 20 | ~60 | Agent 5 |
| `bid_strategy` | 50 | ~150 | Agent 9 |
| `pdf_parsing` | 5 | ~15 | Parser Agent |
| `county_research` | 10 | ~30 | Research Agent |

### Quick SQL Reference
```sql
-- Check what needs to be done
SELECT * FROM get_pending_work_summary();

-- Start a job
SELECT create_batch_job('regrid_scraping', county_id, 50);

-- Get next batch
SELECT * FROM get_next_batch('job-uuid');

-- Pause/Resume
SELECT pause_batch_job('job-uuid');
SELECT resume_batch_job('job-uuid');

-- Check status
SELECT * FROM vw_active_batch_jobs;
```

### Session Workflow
1. **Start**: `SELECT * FROM get_pending_work_summary();`
2. **Work**: Process 2-4 batches (~100-200 items)
3. **Pause**: `SELECT pause_batch_job('job-uuid');`
4. **Next session**: `"Resume batch job"`

---

## Complete Database Schema (17 Tables)

**Research Agent (8 tables):**
counties, official_links, upcoming_sales, documents, vendor_portals, additional_resources, important_notes, research_log

**Parser Agent (3 tables):**
properties, parsing_jobs, parsing_errors

**Visual Validation (1 table):**
property_visual_validation

**Batch Processing (1 table):**
batch_jobs

**Orchestration (4 tables):**
orchestration_sessions, agent_assignments, pipeline_metrics, orchestrator_priority_rules

---

## Data Integrity & Auditing

**IMPORTANT**: Run data audit regularly to catch issues early!

### Quick Audit Commands
```
"Run data audit"
"Show pipeline status by county"
"Check for missing data"
"Find orphaned records"
```

### Audit Views
```sql
-- Full system audit
SELECT * FROM run_data_audit();

-- Pipeline status per county
SELECT * FROM vw_property_pipeline_status;

-- Properties missing data
SELECT * FROM vw_properties_missing_data LIMIT 50;

-- Regrid data quality
SELECT * FROM vw_regrid_data_quality;

-- System health overview
SELECT * FROM vw_system_health;
```

### Fix Functions
```sql
-- Fix flag mismatches
SELECT fix_regrid_flags();
SELECT fix_screenshot_flags();

-- Clean orphaned records
SELECT * FROM clean_orphaned_records();
```

### Current Status (as of last audit)
| Issue | Count | Severity |
|-------|-------|----------|
| Properties missing Regrid | 7,358 | Gap |
| Properties missing address | 6,221 | Gap |
| Properties missing amount | 3,711 | Gap |
| Regrid needing validation | 17 | Gap |
| Critical/Consistency issues | 0 | OK |

See @agents/DATA-INTEGRITY-AGENT.md for full auditing workflow.

---

## Auction Monitor Agent (Agent 10)

@agents/AUCTION-MONITOR-AGENT.md

Tracks upcoming auctions, extracts rules and requirements, monitors deadlines, and generates investor briefings.

### Quick Commands
```
"Find upcoming auctions"                -> List all auctions in next 90 days
"Get auction rules for Blair County"    -> Extract bidder requirements
"Show registration deadlines"           -> Deadlines needing action
"Generate auction briefing for [County]" -> Create investor summary
"What auctions are in the next 30 days?" -> Filtered auction list
```

### Auction Monitor SQL
```sql
-- Get upcoming auctions with details
SELECT * FROM get_upcoming_auctions_detailed(90);

-- Get registration deadlines
SELECT * FROM get_registration_deadlines();

-- View active alerts
SELECT * FROM vw_active_auction_alerts;

-- Generate alerts (run daily)
SELECT generate_auction_alerts();

-- Get auction calendar
SELECT * FROM vw_auction_calendar;

-- Upsert auction rules
SELECT upsert_auction_rules(county_id, 'repository', ...);

-- Acknowledge alert
SELECT acknowledge_auction_alert(alert_id);
```

### Auction Monitor Tables
| Table | Purpose |
|-------|---------|
| `auction_rules` | Registration, deposit, bidding, payment requirements |
| `auction_alerts` | Deadline warnings, new auction notifications |
| `auction_summaries` | Investor briefings and analysis |

### Alert Types
| Alert Type | Trigger | Severity |
|------------|---------|----------|
| `auction_imminent` | Auction within 7 days | critical |
| `registration_deadline` | Registration closes in 3 days | warning |
| `new_auction` | New sale discovered | info |
| `property_list_available` | New property list posted | info |

---

## Skills Available

### Property Visual Validator
@skills/SKILL-property-visual-validator.md
- Analyzes images from Regrid, Google Maps, Zillow
- Filters out non-investable properties (cemeteries, lakes, utility strips)
- Auto-rejects: cemeteries, water bodies, utility properties, landlocked, sliver lots
- Flags for review: vacant lots, industrial areas, irregular shapes

**Visual Validation Commands:**
- "Validate properties for Blair County"
- "Check which properties are investable"
- "Show rejected properties"
- "Show properties needing manual review"

**Visual Validation Queries:**
```sql
-- Get investable properties
SELECT * FROM vw_investable_properties;

-- Get rejected properties (audit)
SELECT * FROM vw_rejected_properties;

-- Get properties needing manual review
SELECT * FROM vw_caution_properties;

-- Get properties not yet validated
SELECT * FROM get_properties_needing_visual_validation('county-uuid', 50);
```

**Visual Validation Functions:**
| Function | Purpose |
|----------|---------|
| `upsert_visual_validation()` | Store validation results |
| `get_properties_needing_visual_validation()` | Find unvalidated properties |

---

## n8n Workflow Automation

**n8n MCP** is available for automating repetitive tasks and reducing token usage.

See @N8N-MCP-SYSTEM-PROMPT.md for the full n8n expert system prompt.

### n8n Instance
- **URL**: https://n8n.lfb-investments.com
- **API**: Configured via n8n-mcp

### n8n Commands
```
"List n8n workflows"
"Create workflow for [task]"
"Trigger [workflow name]"
"Check workflow execution status"
```

### Key n8n Tools
| Tool | Purpose |
|------|---------|
| `n8n_list_workflows` | List all workflows |
| `n8n_create_workflow` | Create new workflow |
| `n8n_test_workflow` | Trigger workflow execution |
| `n8n_health_check` | Verify API connectivity |
| `search_templates` | Find workflow templates (2,709 available) |
| `search_nodes` | Search 1,084 n8n nodes |

### Workflows to Build
1. **Data Integrity Check** - Daily audit via scheduled trigger
2. **PDF Parser** - Webhook-triggered document parsing
3. **Regrid Scraper** - Batch property scraping
4. **County Research** - Automated research pipeline

### n8n Best Practices
- **Templates first** - Always search templates before building
- **Parallel execution** - Run independent tools simultaneously
- **Multi-level validation** - validate_node -> validate_workflow
- **Never trust defaults** - Explicitly set ALL parameters

---

## Pipeline Workflow (Full)

```
1. Research Agent: Find counties & documents
   -> Stores PDFs in documents table

2. Parser Agent: Extract properties from PDFs
   -> Stores properties in properties table

3. Regrid Scraper: Enrich with land data & screenshots
   -> Stores data in regrid_data table

4. Visual Validator: Filter non-investable properties
   -> REJECT: Skip cemeteries, lakes, utility strips
   -> CAUTION: Flag for manual review
   -> APPROVED: Continue pipeline

5. Property Condition Agent (Agent 6): Assess condition
   -> Only for APPROVED properties

6. Environmental Agent (Agent 7): Check risks
7. Title Research (Agent 5): Search liens
8. Bid Strategy (Agent 9): Calculate max bid
9. Auction Monitoring (Agent 10): Watch sales
10. Post-Sale (Agent 11): Manage acquisition
```

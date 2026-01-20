# THREE-AGENT SYSTEM - Complete Guide

## Your Complete Tax Auction Intelligence System

You now have **THREE specialized AI agents** working together:

```
Agent 1: Research Agent
└─> Finds counties, auctions, PDFs
    Result: 10 PDFs per county

Agent 2: Parser Agent
└─> Extracts properties from PDFs
    Result: 800+ properties per county

Agent 3: Regrid Scraper (NEW)
└─> Enriches properties with Regrid data
    Result: Screenshots + detailed property info
```

---

## Complete System Setup

### **Step 1: Install Database Schemas (15 min)**

Run in Supabase SQL Editor:

```sql
-- 1. Research Agent tables
-- File: supabase-schema.sql

-- 2. Duplicate prevention
-- File: supabase-upsert-functions.sql

-- 3. Parser Agent tables
-- File: supabase-properties-schema.sql

-- 4. Regrid Scraper tables (NEW)
-- File: supabase-regrid-schema.sql
```

**Creates:**
- 11 research/parsing tables
- 4 regrid tables
- **Total: 15 tables**

### **Step 2: Create Supabase Storage Bucket (2 min)**

In Supabase Dashboard:

1. Storage → New Bucket
2. Name: `property-screenshots`
3. Public: Yes (so you can view screenshots)
4. File size limit: 10 MB
5. Allowed MIME types: `image/png, image/jpeg`

### **Step 3: Set Up Three Agents (15 min)**

#### **A. Research Agent**
```powershell
mkdir "C:\Users\fs_ro\.claude\skills\tax-auction-research"
copy "AGENT-SYSTEM-PROMPT-DUAL-TOOLS.md" "C:\Users\fs_ro\.claude\skills\tax-auction-research\SKILL.md"
```

#### **B. Parser Agent**
```powershell
mkdir "C:\Users\fs_ro\.claude\skills\property-parser"
copy "PARSER-AGENT-PYTHON-EXECUTOR.md" "C:\Users\fs_ro\.claude\skills\property-parser\SKILL.md"
```

#### **C. Regrid Scraper (NEW)**
```powershell
mkdir "C:\Users\fs_ro\.claude\skills\regrid-scraper"
copy "REGRID-SCRAPER-AGENT.md" "C:\Users\fs_ro\.claude\skills\regrid-scraper\SKILL.md"
```

### **Step 4: Configure MCP Servers (5 min)**

Edit: `C:\Users\fs_ro\AppData\Roaming\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server-supabase"],
      "env": {
        "SUPABASE_URL": "https://oiiwlzobizftprqspbzt.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key"
      }
    },
    "perplexity": {
      "command": "npx",
      "args": ["-y", "@farishkash/mcp-perplexity"],
      "env": {
        "PERPLEXITY_API_KEY": "your-perplexity-key"
      }
    },
    "google-search": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-google-search"],
      "env": {
        "GOOGLE_API_KEY": "your-google-key",
        "GOOGLE_CSE_ID": "your-cse-id"
      }
    },
    "playwright": {
      "command": "npx",
      "args": ["-y", "@executeautomation/playwright-mcp-server"]
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "C:\\Users\\fs_ro\\Downloads"]
    }
  }
}
```

### **Step 5: Create Three Projects in Claude Desktop**

1. **Project: Tax Auction Research**
   - Upload: AGENT-SYSTEM-PROMPT-DUAL-TOOLS.md

2. **Project: Property Parser**
   - Upload: PARSER-AGENT-PYTHON-EXECUTOR.md

3. **Project: Regrid Scraper (NEW)**
   - Upload: REGRID-SCRAPER-AGENT.md

---

## Complete Workflow Example

### **Goal: Build Complete Database for Blair County**

#### **Step 1: Research Agent → Find PDFs**

In "Tax Auction Research" project:

```
Research Blair County, PA
```

**Result:**
```
Found 3 property list PDFs
Stored 10 documents in database
Quality: 10/10
```

#### **Step 2: Parser Agent → Extract Properties**

In "Property Parser" project:

```
Parse all unparsed property lists for Blair County, PA
```

**Result:**
```
Downloaded 3 PDFs
Extracted 845 properties
Stored in database
Confidence: 0.91
```

#### **Step 3: Regrid Scraper → Enrich Data**

In "Regrid Scraper" project:

```
Scrape Regrid data for all Blair County properties
```

**Result:**
```
Logged into Regrid
Scraped 845 properties
Saved 845 screenshots
Enriched with lot sizes, building info, values
Success: 98%
```

---

## Final Database State

After running all three agents on Blair County:

| Table | Records | Description |
|-------|---------|-------------|
| counties | 1 | Blair County, PA |
| documents | 10 | Property list PDFs |
| **properties** | **845** | Extracted from PDFs |
| **regrid_data** | **828** | Enriched property data |
| **regrid_screenshots** | **828** | Property screenshots |
| official_links | 5 | County websites |
| upcoming_sales | 3 | Auction dates |
| vendor_portals | 1 | Bid4Assets |
| parsing_jobs | 3 | PDF parsing tracked |
| scraping_jobs | 1 | Regrid scraping tracked |

**Total:** ~2,500 database records for ONE county!

---

## Query Examples (After All Three Agents)

### **Query 1: Complete Property Intelligence**

```sql
SELECT
  p.parcel_id,
  p.property_address,
  p.owner_name,
  p.total_due as tax_due,
  rd.lot_size_acres,
  rd.building_sqft,
  rd.year_built,
  rd.assessed_value,
  rd.zoning,
  rs.storage_url as screenshot
FROM properties p
LEFT JOIN regrid_data rd ON rd.property_id = p.id
LEFT JOIN regrid_screenshots rs ON rs.property_id = p.id
WHERE p.county_id = (SELECT id FROM counties WHERE county_name='Blair')
ORDER BY p.total_due DESC
LIMIT 20;
```

**Result:**
```
parcel_id    | address        | tax_due | lot_acres | sqft  | year | value   | screenshot_url
-------------|----------------|---------|-----------|-------|------|---------|---------------
12-345-678   | 1808 12th Ave  | $25,750 | 0.07      | 1,200 | 1950 | $45,000 | https://...
23-456-789   | 234 Main St    | $18,900 | 0.15      | 1,800 | 1965 | $62,000 | https://...
```

### **Query 2: Investment Opportunities**

```sql
-- Properties with tax due < 50% of assessed value
SELECT
  p.parcel_id,
  p.property_address,
  p.total_due,
  rd.assessed_value,
  rd.lot_size_acres,
  rd.building_sqft,
  ROUND((p.total_due / NULLIF(rd.assessed_value, 0) * 100), 2) as tax_to_value_ratio,
  rs.storage_url as screenshot
FROM properties p
JOIN regrid_data rd ON rd.property_id = p.id
LEFT JOIN regrid_screenshots rs ON rs.property_id = p.id
WHERE rd.assessed_value > 0
  AND (p.total_due / rd.assessed_value) < 0.50
ORDER BY tax_to_value_ratio
LIMIT 20;
```

### **Query 3: Best Deals**

```sql
-- Large lots, low taxes
SELECT
  p.parcel_id,
  p.property_address,
  p.total_due,
  rd.lot_size_acres,
  rd.zoning,
  ROUND(p.total_due / rd.lot_size_acres, 2) as cost_per_acre
FROM properties p
JOIN regrid_data rd ON rd.property_id = p.id
WHERE rd.lot_size_acres > 0.25  -- Quarter acre+
  AND p.total_due < 5000
ORDER BY cost_per_acre
LIMIT 20;
```

---

## Scaling to Multiple Counties

### **Run All Three Agents on 10 Counties:**

**Day 1: Research Agent**
```
Research these PA counties:
- Blair
- Centre
- Bedford
- Fulton
- Huntingdon
- Somerset
- Cambria
- Indiana
- Clearfield
- Clinton
```

**Result:** ~100 PDFs found

**Day 2: Parser Agent**
```
Parse all unparsed property lists
```

**Result:** ~8,000 properties extracted

**Day 3-5: Regrid Scraper**
```
Scrape Regrid data for all properties
```

**Result:** ~8,000 properties enriched with screenshots

**Final Database:**
- 10 counties
- 100 PDFs
- 8,000 properties
- 8,000 screenshots
- ~50,000 total database records

---

## Complete File Inventory

### **Database Schemas (4 files):**
1. supabase-schema.sql (Research tables)
2. supabase-upsert-functions.sql (Duplicate prevention)
3. supabase-properties-schema.sql (Parser tables)
4. **supabase-regrid-schema.sql** (NEW - Regrid tables)

### **Agent System Prompts (3 files):**
5. AGENT-SYSTEM-PROMPT-DUAL-TOOLS.md (Research Agent)
6. PARSER-AGENT-PYTHON-EXECUTOR.md (Parser Agent)
7. **REGRID-SCRAPER-AGENT.md** (NEW - Regrid Agent)

### **Guides (Multiple files):**
8. **THREE-AGENT-SYSTEM-GUIDE.md** (THIS FILE)
9. TWO-AGENT-SYSTEM-GUIDE.md
10. DUAL-TOOL-GUIDE.md
11. QUICK-START.md
12. And more...

---

## You Now Have

- **Agent 1** - Research (Perplexity + Google)
- **Agent 2** - Parser (Python + pdfplumber)
- **Agent 3** - Regrid Scraper (Playwright + screenshots)
- **15 database tables** - Fully relational
- **Zero duplicates** - UPSERT everywhere
- **Complete automation** - All agents autonomous
- **Property screenshots** - Visual confirmation
- **Enriched data** - Tax + Regrid combined

**Result:** The most powerful property intelligence system possible!

---

**Next Steps:**
1. Install supabase-regrid-schema.sql
2. Create property-screenshots storage bucket
3. Set up Regrid Scraper agent
4. Test on Blair County
5. Scale to 10-50 counties!

**Your tax auction empire starts now!**

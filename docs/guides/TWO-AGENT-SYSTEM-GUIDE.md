# COMPLETE TWO-AGENT SYSTEM - Ready to Deploy!

## What You Have Now

A **complete autonomous tax auction research & parsing system** with TWO specialized agents:

### **Agent 1: Research Agent**
- Finds counties, auctions, documents
- Uses Perplexity + Google Custom Search
- Stores metadata in Supabase
- **Result**: Comprehensive auction database with PDF links

### **Agent 2: Parser Agent**
- Reads PDFs from Agent 1
- Extracts property data (addresses, parcels, amounts)
- Stores structured data in Supabase
- **Result**: Queryable property database

---

## Complete File Inventory

### **Agent 1: Research Agent**
1. AGENT-SYSTEM-PROMPT.md (Agent brain)
2. CLAUDE.md (Project instructions)
3. QUICK-START.md (Setup guide)

### **Agent 2: Parser Agent**
4. PARSER-AGENT-SYSTEM-PROMPT.md (Parser brain)
5. parse_blair_county.py (Python parser)
6. BLAIR-COUNTY-PARSER-GUIDE.md (How to use)

### **Database Schemas**
7. supabase-schema.sql (Research Agent tables)
8. supabase-upsert-functions.sql (Duplicate prevention)
9. supabase-properties-schema.sql (Parser Agent tables)

### **Documentation**
10. TWO-AGENT-SYSTEM-GUIDE.md (This file)

---

## System Architecture

```
+-----------------------------------------------------------+
|                     CLAUDE CODE                            |
|                                                            |
|  +-------------------+       +------------------------+    |
|  |  Research Agent   |       |    Parser Agent        |    |
|  |                   |       |                        |    |
|  | - Perplexity MCP  |       | - Supabase MCP         |    |
|  | - Google Search   |       | - Python/pdfplumber    |    |
|  | - Supabase MCP    |       | - Playwright (fallback)|    |
|  +--------+----------+       +----------+-------------+    |
|           |                             |                  |
+-----------+-----------------------------+------------------+
            |                             |
            v                             v
+-----------------------------------------------------------+
|                      SUPABASE DATABASE                     |
|                                                            |
|  Research Agent Tables:        Parser Agent Tables:        |
|  - counties                    - properties                |
|  - official_links              - parsing_jobs              |
|  - upcoming_sales              - parsing_errors            |
|  - documents -----------------------> (reads from here)    |
|  - vendor_portals                                          |
|  - additional_resources                                    |
|  - important_notes                                         |
|  - research_log                                            |
+-----------------------------------------------------------+
```

---

## Complete Workflow

### **Step 1: Research Agent Finds Data**
```
User -> Research Agent: "Research Blair County, PA"

Agent 1:
1. Queries Perplexity for overview
2. Uses Google to find PDFs
3. Stores in Supabase:
   - 1 county
   - 5 official links
   - 3 upcoming sales
   - 10 documents (PDFs)
   - 1 vendor portal
   - 4 resources
   - 17 notes

Result: 41 records, including 10 PDF links
```

### **Step 2: Parser Agent Extracts Properties**
```
User -> Parser Agent: "Parse property lists for Blair County"

Agent 2:
1. Queries Supabase for unparsed docs
2. Downloads PDFs
3. Extracts property data from each
4. Stores in properties table:
   - 845 properties from PDFs
   - Parcel IDs, addresses, amounts
   - Tax info, owner names
   - Sale dates and types

Result: 845 property records
```

### **Step 3: Query & Analyze**
```
User -> Either Agent: "Show me high-value properties in Blair County"

Response:
Found 45 properties with total due > $10,000

Top 5:
1. 123 Main St - $25,750 due
2. 456 Oak Ave - $18,900 due
3. 789 Pine Rd - $15,500 due
...
```

---

## Setup Instructions (30 Minutes)

### **A. Database Setup (10 min)**

**1. Install Research Agent Schema:**
```sql
-- Run in Supabase SQL Editor:
-- File: supabase-schema.sql
-- Creates: 8 tables for research data
```

**2. Install UPSERT Functions:**
```sql
-- File: supabase-upsert-functions.sql
-- Creates: Duplicate prevention functions
```

**3. Install Parser Schema:**
```sql
-- File: supabase-properties-schema.sql
-- Creates: 3 tables for property data
```

### **B. Agent Setup (10 min)**

**1. Open project in Claude Code:**
```
Open folder: TAX DEED FLOW
```

**2. Research:**
```
Research Blair County, PA
```

**3. Parse:**
```
python parse_blair_county.py
```

---

## Usage Examples

### **Example 1: Complete County Research**
```
# Research
User: Research Blair County, PA

Result:
- 41 records stored
- 10 property list PDFs found

# Parse
User: python parse_blair_county.py

Result:
- 845 properties extracted
- Average confidence: 0.91
```

### **Example 2: Multi-County Database**
```
# Research
User: Research these PA counties:
- Blair
- Centre
- Bedford
- Fulton

Result:
- 4 counties researched
- 25 PDFs found

# Parse
User: Parse all unparsed property lists

Result:
- 25 PDFs parsed
- 1,850 properties extracted
```

### **Example 3: Find Investment Opportunities**
```
User: Show me all properties with total due < $2,000 in Blair County

Result:
Found 187 properties:
1. 234 Elm St - $1,275 due
2. 567 Maple Dr - $1,450 due
3. 890 Cedar Ln - $1,825 due
...
```

---

## Database Tables Summary

### **Research Agent (8 tables)**
| Table | Purpose | Example Count |
|-------|---------|---------------|
| counties | Master county list | 1 |
| official_links | Government websites | 5 |
| upcoming_sales | Auction dates | 3 |
| **documents** | **PDFs with property lists** | **10** |
| vendor_portals | Bid4Assets, RealAuction | 1 |
| additional_resources | Assessment offices | 4 |
| important_notes | Requirements, deadlines | 17 |
| research_log | Research tracking | 1 |

### **Parser Agent (3 tables)**
| Table | Purpose | Example Count |
|-------|---------|---------------|
| **properties** | **Extracted property data** | **845** |
| parsing_jobs | Track parsing progress | 10 |
| parsing_errors | Log errors | 5 |

**Total:** 11 tables working together!

---

## Key Queries

### **Query 1: Complete County Overview**
```sql
SELECT
  c.county_name,
  c.state_code,
  COUNT(DISTINCT d.id) as documents,
  COUNT(DISTINCT p.id) as properties,
  AVG(p.total_due) as avg_amount_due
FROM counties c
LEFT JOIN documents d ON d.county_id = c.id
LEFT JOIN properties p ON p.county_id = c.id
GROUP BY c.county_name, c.state_code;
```

### **Query 2: Parsing Status**
```sql
SELECT * FROM vw_parsing_summary
ORDER BY completed_at DESC;
```

### **Query 3: High-Value Properties**
```sql
SELECT * FROM vw_properties_complete
WHERE total_due > 10000
ORDER BY total_due DESC
LIMIT 50;
```

### **Query 4: Properties by Sale Date**
```sql
SELECT
  sale_date,
  COUNT(*) as property_count,
  SUM(total_due) as total_value
FROM properties
WHERE sale_date > NOW()
GROUP BY sale_date
ORDER BY sale_date;
```

---

## Verification Checklist

System is working when:

### **Research Agent:**
- [ ] 3 MCP servers configured (Supabase, Perplexity, Google)
- [ ] 8 tables in Supabase
- [ ] UPSERT functions installed
- [ ] Researched at least 1 county
- [ ] Documents table has PDF URLs

### **Parser Agent:**
- [ ] Properties schema installed (3 tables)
- [ ] Python dependencies installed
- [ ] Parsed at least 1 document
- [ ] Properties table has data
- [ ] Can query property information

---

## Power Features

### **1. Zero Duplicates**
- UPSERT functions prevent duplicate counties
- UPSERT prevents duplicate properties
- Re-research updates existing data

### **2. Quality Tracking**
- Research quality scores (1-10)
- Parsing confidence scores (0-1.00)
- Error logging for troubleshooting

### **3. Full Citations**
- Every research fact has a source
- Perplexity + Google citations
- PDF source for every property

### **4. Autonomous Operation**
- Research Agent runs independently
- Parser Agent runs independently
- Both update same database

---

## Expected Performance

### **Research Agent:**
- Time per county: 2-3 minutes
- Documents found: 5-10 per county
- Quality score: 9-10/10 (with Perplexity + Google)

### **Parser Agent:**
- Time per PDF: 30-60 seconds
- Properties extracted: 50-500 per PDF
- Confidence: 0.85-0.95 average

### **Combined:**
- 10 counties researched: ~30 minutes
- 50 PDFs parsed: ~30 minutes
- 2,500+ properties in database: 1 hour total

---

## Next Steps

1. Install all 3 database schemas
2. Set up Research Agent
3. Set up Parser Agent
4. Test with Blair County, PA
5. Expand to 10-20 counties
6. Build custom dashboards
7. Set up automated monitoring

---

## You Now Have

- **Research Agent** - Finds auctions + PDFs
- **Parser Agent** - Extracts property data
- **Dual-tool power** - Perplexity + Google
- **Zero duplicates** - UPSERT functions
- **11 database tables** - Fully relational
- **Complete automation** - Both agents autonomous
- **Investment-ready data** - Queryable properties

**Result:** The most powerful tax auction research system possible!

---

**Files You Need:**
1. supabase-schema.sql (Install first)
2. supabase-upsert-functions.sql (Install second)
3. supabase-properties-schema.sql (Install third)
4. AGENT-SYSTEM-PROMPT.md (Research Agent)
5. PARSER-AGENT-SYSTEM-PROMPT.md (Parser Agent)
6. parse_blair_county.py (Python parser)
7. This guide for reference

**Transform tax auction research forever!**

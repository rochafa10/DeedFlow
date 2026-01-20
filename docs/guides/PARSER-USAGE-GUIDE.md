# Property Parser Agent - Usage Guide

## What This Agent Does

Takes the PDFs found by the Research Agent and extracts actual property data:
- Parcel IDs
- Addresses
- Owner names
- Tax amounts
- Total amounts due

Stores everything in the `properties` table for analysis.

---

## Two-Agent System

```
Agent 1: Research Agent (Already Working!)
└─> Finds: Counties, Documents (PDFs), Sales, Contacts
    Result: 10 PDF links in documents table

Agent 2: Parser Agent (NEW!)
└─> Reads: documents table
    Downloads: PDFs
    Extracts: Property data
    Stores: properties table
    Result: 568 properties from those 10 PDFs
```

---

## Quick Setup (15 Minutes)

### **Step 1: Install Properties Schema (5 min)**

Run in Supabase:

**File**: `supabase-properties-schema.sql`

This creates:
- `properties` table (stores property data)
- `parsing_jobs` table (tracks progress)
- `parsing_errors` table (logs errors)
- Helper functions for parsing

### **Step 2: Install Parser Agent (5 min)**

Copy to Claude Desktop skills:
```powershell
mkdir "C:\Users\fs_ro\.claude\skills\property-parser"
copy "PARSER-AGENT-SYSTEM-PROMPT.md" "C:\Users\fs_ro\.claude\skills\property-parser\SKILL.md"
```

### **Step 3: Create Parser Project (2 min)**

In Claude Desktop:
1. New Project → "Property List Parser"
2. Add Content → Upload `PARSER-AGENT-SYSTEM-PROMPT.md`
3. Make sure Supabase MCP + Filesystem MCP are enabled

### **Step 4: TEST! (3 min)**

In Parser project:
```
Parse property list for Blair County, PA
```

**Expected:**
```
Finding unparsed documents...
Found: 2026 Repository Property List

Downloading PDF...
Downloaded: 12 pages

Extracting properties...
Page 1: 45 properties
Page 2: 48 properties
...
Page 12: 32 properties

COMPLETE:
568 properties extracted
Stored in database
Quality: 9/10
```

---

## How It Works

### **Agent Workflow:**

```
1. Query Supabase: "What PDFs need parsing?"
   └─> Returns: List of unparsed property_list documents

2. For each PDF:
   a. Create parsing job
   b. Download PDF from URL
   c. Extract tables/text using pdfplumber
   d. Parse each row → extract fields
   e. Validate data (parcel ID, amounts)
   f. Store in properties table using UPSERT
   g. Complete parsing job

3. Report results
```

---

## What Gets Extracted

### **From This PDF Row:**
```
Parcel ID     | Address           | Owner      | Tax Due   | Total Due
--------------|-------------------|------------|-----------|----------
123-456-789   | 123 Main St       | John Doe   | $1,250.50 | $1,575.75
```

### **To This Database Record:**
```sql
{
  parcel_id: '123-456-789',
  property_address: '123 Main St, Altoona, PA 16601',
  owner_name: 'John Doe',
  tax_amount: 1250.50,
  total_due: 1575.75,
  tax_year: 2025,
  sale_type: 'repository',
  sale_date: '2026-03-11 10:00:00',
  parsing_confidence: 0.92
}
```

---

## Usage Examples

### **Example 1: Parse One County**
```
Parse all property lists for Blair County, PA
```

**Result:**
```
Found 2 unparsed documents:
1. 2026 Repository Property List (568 properties)
2. 2025 Upset Sale List (187 properties)

Parsing both...
755 total properties extracted
```

### **Example 2: Parse All Counties**
```
Parse all unparsed property lists
```

**Result:**
```
Found 15 unparsed documents across 5 counties

Blair, PA: 3 documents → 845 properties
Centre, PA: 2 documents → 310 properties
Bedford, PA: 1 document → 127 properties
...

1,750 total properties extracted
```

### **Example 3: Re-Parse Failed Documents**
```
Find and re-parse any failed parsing jobs
```

**Result:**
```
Found 2 failed jobs:
1. Centre County - PDF download failed
2. Bedford County - Malformed table

Retrying...
Both successful on retry
```

### **Example 4: Check Parsing Status**
```
Show me parsing status for all counties
```

**Result:**
```
Blair, PA:
  - Documents: 3
  - Parsed: 3 (100%)
  - Properties: 845
  - Avg Confidence: 0.91

Centre, PA:
  - Documents: 2
  - Parsed: 2 (100%)
  - Properties: 310
  - Avg Confidence: 0.88

...
```

---

## Query Examples

After parsing, query the data:

### **Query 1: High-Value Properties**
```sql
SELECT * FROM vw_properties_complete
WHERE total_due > 5000
ORDER BY total_due DESC
LIMIT 20;
```

### **Query 2: Properties by City**
```sql
SELECT city, COUNT(*) as count, AVG(total_due) as avg_due
FROM properties
WHERE county_name = 'Blair' AND state_code = 'PA'
GROUP BY city
ORDER BY count DESC;
```

### **Query 3: Upcoming Sales**
```sql
SELECT * FROM vw_properties_complete
WHERE sale_date > NOW()
  AND sale_status = 'upcoming'
ORDER BY sale_date
LIMIT 50;
```

### **Query 4: Low Tax Properties**
```sql
SELECT * FROM vw_properties_complete
WHERE total_due < 1000
  AND property_type = 'residential'
ORDER BY total_due;
```

---

## Database Schema

### **properties Table**
```
Columns:
- parcel_id (TEXT) - "123-456-789"
- property_address (TEXT) - "123 Main St"
- owner_name (TEXT) - "John Doe"
- tax_amount (NUMERIC) - 1250.50
- total_due (NUMERIC) - 1575.75
- tax_year (INTEGER) - 2025
- sale_type (TEXT) - "repository"
- sale_date (TIMESTAMP) - "2026-03-11"
- parsing_confidence (NUMERIC) - 0.92
```

### **parsing_jobs Table**
```
Tracks parsing progress:
- document_id
- status (pending/processing/completed/failed)
- properties_extracted
- confidence_avg
- error_message
```

---

## Troubleshooting

### **Issue: "No unparsed documents found"**

**Solution:** Research Agent needs to find documents first!
```
# In Research Agent project:
Research Blair County, PA

# Then in Parser project:
Parse property lists for Blair County, PA
```

### **Issue: "PDF download failed"**

**Causes:**
- URL is broken
- PDF was removed
- Network timeout

**Solution:**
```sql
-- Check document URL
SELECT title, url FROM documents WHERE id = 'document-uuid';

-- Re-run Research Agent to get updated URL
```

### **Issue: "No properties extracted"**

**Causes:**
- PDF is scanned image (needs OCR)
- Table format not recognized
- Unusual PDF structure

**Solution:**
```
Try OCR parsing for [document title]
```

### **Issue: "Low confidence scores"**

**Review:**
```sql
SELECT * FROM properties
WHERE parsing_confidence < 0.70
LIMIT 10;

-- Check raw_text field for issues
```

---

## Expected Results

### **Blair County, PA Example:**

```
Documents in database: 3
- 2026 Repository Property List
- 2025 Upset Sale Results
- 2025 Judicial Sale List

After parsing:
- Properties extracted: 845
- Average confidence: 0.91
- High confidence (>0.90): 780 (92%)
- Medium confidence: 60 (7%)
- Low confidence: 5 (1%)

Time to parse all 3: ~5 minutes
```

### **10 Counties Example:**

```
Total documents: 25
Total properties: ~3,500
Parsing time: ~20 minutes
Average confidence: 0.88
Storage: ~15MB in database
```

---

## Advanced Usage

### **Custom Parsing Rules**

```
For Blair County documents, parcel IDs are always format XX-XXX-XXX.X
For Centre County, extract lot and block separately
```

### **Batch Processing**

```
Parse the next 50 unparsed documents across all counties
```

### **Quality Check**

```
Show me properties with confidence < 0.80 that need manual review
```

### **Export Data**

```
Export all Blair County properties to CSV
```

---

## Two-Agent Workflow

### **Complete Workflow Example:**

```
Day 1 - Research Agent:
User: "Research Blair County, PA"
Agent: Found 3 property list PDFs
       Stored URLs in database

Day 1 - Parser Agent:
User: "Parse property lists for Blair County"
Agent: Parsed all 3 PDFs
       Extracted 845 properties
       Stored in database

Day 1 - Analysis:
User: "Show me properties with total due > $10,000"
Agent: Found 45 high-value properties
       [Lists properties with details]
```

---

## Success Checklist

Parser Agent is working when:

- [x] Properties schema installed (3 tables)
- [x] Parser agent skill installed
- [x] Test parse completed successfully
- [x] Properties table has data
- [x] Parsing jobs show "completed" status
- [x] Can query properties by county

---

## Summary

With the **Property Parser Agent**, you:

- Convert PDFs → Structured data automatically
- Extract 500+ properties from one PDF in minutes
- Store everything in queryable database
- Track parsing quality and confidence
- Handle errors gracefully
- Enable investment analysis

**Next:**
1. Install properties schema
2. Set up parser agent
3. Parse your first document
4. Query the property data!

**Transform PDFs into investment opportunities!**

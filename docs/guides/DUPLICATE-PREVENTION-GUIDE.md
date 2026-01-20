# Duplicate Prevention Guide for Tax Auction Agent

## The Problem

When you research the same county twice:
```
Research Blair County, PA  → Stores 41 records
Research Blair County, PA  → Would create 41 MORE records (82 total!)
```

**We need to prevent this!**

---

## The Solution: Multi-Layer Protection

### **Layer 1: Database UPSERT Functions**
Smart functions that UPDATE existing records or INSERT new ones.

### **Layer 2: Agent Smart Logic**
Agent checks for existing county before researching.

### **Layer 3: Cleanup Functions**
Periodic deduplication to catch any stragglers.

---

## Setup Instructions

### **Step 1: Install UPSERT Functions (5 min)**

Run this SQL in your Supabase project:

**File**: `supabase-upsert-functions.sql`

This creates:
- `upsert_official_link()` - Updates or inserts official links
- `upsert_upcoming_sale()` - Updates or inserts sales
- `upsert_document()` - Updates or inserts documents
- `upsert_vendor_portal()` - Updates or inserts vendor portals
- `upsert_additional_resource()` - Updates or inserts resources
- `upsert_important_note()` - Updates or inserts notes
- `refresh_county_research()` - Smart refresh before re-research
- `clean_duplicate_records()` - Cleanup function

### **Step 2: Agent Auto-Uses UPSERT**

The agent will automatically:
1. Check if county exists
2. Use UPSERT functions when inserting
3. Update `last_researched_at` timestamp

---

## How UPSERT Works

### **Example: Official Link**

```sql
-- First research
SELECT upsert_official_link(
  county_id,
  'tax_claim_bureau',
  'https://blairco.org/tax-claim',
  'Blair County Tax Claim Bureau',
  '814-317-2361',
  'taxclaim@blairco.org'
);
-- Result: NEW record inserted

-- Second research (same URL)
SELECT upsert_official_link(
  county_id,
  'tax_claim_bureau',
  'https://blairco.org/tax-claim',
  'Blair County Tax Claim Bureau',
  '814-317-2361',
  'taxclaim@blairco.org'
);
-- Result: EXISTING record UPDATED (no duplicate!)
```

---

## Agent Behavior on Re-Research

### **Scenario 1: Fresh Research (County Never Researched)**
```
Agent:
1. Creates county via get_or_create_county()
2. Inserts all data using UPSERT functions
3. Result: 41 records created
```

### **Scenario 2: Re-Research (County Exists)**
```
Agent:
1. Finds existing county
2. Runs refresh_county_research() to clean old data
3. Uses UPSERT functions for all inserts
4. Result:
   - Existing records UPDATED (if URL matches)
   - New records INSERTED (if new documents found)
   - Old records KEPT (if still relevant)
   - Total: Still ~41 records (not 82!)
```

### **Scenario 3: Partial Update (New Document Added)**
```
Agent:
1. County exists with 10 documents
2. New property list published
3. UPSERT adds 1 NEW document
4. Result: 11 documents (not 20!)
```

---

## UPSERT Logic by Table

| Table | Matches On | Behavior |
|-------|------------|----------|
| **official_links** | URL OR (link_type + title) | Update existing, insert if new |
| **upcoming_sales** | Sale type + Date (±7 days) | Update date/details, insert if new |
| **documents** | URL OR title | Update metadata, insert if new |
| **vendor_portals** | Vendor name | Update URLs, insert if new |
| **additional_resources** | URL OR (type + title) | Update title, insert if new |
| **important_notes** | Type + 70% text similarity | Update text, insert if new |

---

## Cleanup Functions

### **Manual Cleanup (Run Periodically)**

```sql
-- Find and remove duplicates across all tables
SELECT * FROM clean_duplicate_records();
```

**Result:**
```
table_name           | duplicates_removed
---------------------|-------------------
official_links       | 2
documents            | 5
vendor_portals       | 0
additional_resources | 1
important_notes      | 3
```

### **Refresh Before Re-Research**

```sql
-- Clean old data before researching county again
SELECT refresh_county_research(
  (SELECT id FROM counties WHERE county_name = 'Blair' AND state_code = 'PA'),
  TRUE,   -- Keep documents (they're valuable historical records)
  FALSE   -- Delete old notes (we'll get fresh ones)
);
```

**This removes:**
- Sales older than 30 days
- Old notes (if FALSE)
- Old documents (if FALSE)

---

## Agent Workflow (With UPSERT)

```
User: Research Blair County, PA

Agent Step 1: Check if exists
└─> Query: SELECT id FROM counties WHERE county_name='Blair' AND state_code='PA'
    Result: Found ID (county exists!)

Agent Step 2: Refresh old data
└─> SQL: SELECT refresh_county_research(county_id, TRUE, FALSE)
    Removes: Old sales, old notes
    Keeps: Documents, official links

Agent Step 3: Research with Perplexity + Google
└─> Finds: 10 documents, 3 sales, 5 official links

Agent Step 4: UPSERT all data
├─> upsert_official_link() × 5
│   Result: 3 updated, 2 new
├─> upsert_upcoming_sale() × 3
│   Result: 2 updated, 1 new
├─> upsert_document() × 10
│   Result: 7 updated, 3 new
├─> upsert_vendor_portal() × 1
│   Result: 1 updated
├─> upsert_additional_resource() × 4
│   Result: 4 updated
└─> upsert_important_note() × 17
    Result: 10 updated, 7 new

Agent Step 5: Update timestamp
└─> UPDATE counties SET last_researched_at = NOW()

Final Result: 41 records total (not 82!)
- Existing records updated with new info
- New records added where appropriate
- No duplicates created
```

---

## Checking for Duplicates

### **Query 1: Find Duplicate Documents**
```sql
SELECT
  county_id,
  url,
  COUNT(*) as count,
  STRING_AGG(title, ' | ') as titles
FROM documents
GROUP BY county_id, url
HAVING COUNT(*) > 1
ORDER BY count DESC;
```

### **Query 2: Find Duplicate Official Links**
```sql
SELECT
  c.county_name,
  c.state_code,
  ol.url,
  COUNT(*) as count
FROM official_links ol
JOIN counties c ON c.id = ol.county_id
GROUP BY c.county_name, c.state_code, ol.url
HAVING COUNT(*) > 1;
```

### **Query 3: Find Similar Notes**
```sql
SELECT
  county_id,
  note_type,
  note_text,
  COUNT(*) OVER (PARTITION BY county_id, note_type, LEFT(note_text, 50)) as similar_count
FROM important_notes
WHERE COUNT(*) OVER (PARTITION BY county_id, note_type, LEFT(note_text, 50)) > 1;
```

---

## Best Practices

### **DO:**
- Run `clean_duplicate_records()` weekly
- Use UPSERT functions for all inserts
- Check `last_researched_at` before re-researching
- Use `refresh_county_research()` for major updates

### **DON'T:**
- Use direct INSERT without checking for duplicates
- Research same county multiple times in same day
- Delete all data before re-research (loses history)
- Ignore the `updated_at` timestamps

---

## Expected Behavior

### **First Research:**
```
Counties: 0 → 1
Official Links: 0 → 5
Upcoming Sales: 0 → 3
Documents: 0 → 10
Vendor Portals: 0 → 1
Resources: 0 → 4
Notes: 0 → 17
Research Log: 0 → 1
TOTAL: 0 → 41 records
```

### **Second Research (Same Day):**
```
Counties: 1 → 1 (updated)
Official Links: 5 → 5 (updated)
Upcoming Sales: 3 → 3 (updated)
Documents: 10 → 10 (updated)
Vendor Portals: 1 → 1 (updated)
Resources: 4 → 4 (updated)
Notes: 17 → 17 (updated)
Research Log: 1 → 2 (new entry)
TOTAL: 41 → 42 records (only research log added!)
```

### **Third Research (New Document Published):**
```
Counties: 1 → 1
Official Links: 5 → 5
Upcoming Sales: 3 → 3
Documents: 10 → 11 (1 new document added!)
Vendor Portals: 1 → 1
Resources: 4 → 4
Notes: 17 → 18 (1 new note about new doc)
Research Log: 2 → 3
TOTAL: 42 → 44 records (2 new: document + note)
```

---

## Testing

### **Test 1: Double Research**
```sql
-- Research 1
SELECT get_or_create_county('Blair', 'PA');
-- Insert 41 records using UPSERT

-- Research 2 (immediately after)
SELECT get_or_create_county('Blair', 'PA');
-- Should update existing 41 records, not create 41 new ones

-- Verify
SELECT COUNT(*) FROM documents WHERE county_id = (
  SELECT id FROM counties WHERE county_name = 'Blair' AND state_code = 'PA'
);
-- Expected: 10 (not 20!)
```

### **Test 2: Cleanup**
```sql
-- Manually create duplicate
INSERT INTO documents (county_id, document_type, title, url)
SELECT county_id, document_type, title, url
FROM documents LIMIT 1;

-- Clean
SELECT * FROM clean_duplicate_records();
-- Should report: documents | 1

-- Verify
SELECT COUNT(*) FROM documents GROUP BY url HAVING COUNT(*) > 1;
-- Expected: 0 rows (no duplicates)
```

---

## Summary

With UPSERT functions:
- No duplicates when re-researching
- Existing records get updated
- New information gets added
- Historical data preserved
- Database stays clean

**Total records after 10 re-searches: Still ~41-45 (not 410!)**

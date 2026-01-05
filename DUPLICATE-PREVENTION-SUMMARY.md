# DUPLICATE PREVENTION - Complete Solution

## **The Problem You Identified**

```
Research Blair County, PA  → 41 records created
Research Blair County, PA  → 41 MORE records (82 total!)
Research Blair County, PA  → 41 MORE records (123 total!)
```

**This is BAD!** We need UPSERT, not INSERT.

---

## **The Complete Solution**

### **3-Layer Protection System:**

1. **UPSERT Functions** (Database level)
2. **Smart Agent Logic** (Application level)
3. **Cleanup Functions** (Maintenance level)

---

## Quick Setup (10 Minutes)

### **Step 1: Install UPSERT Functions (5 min)**

Run in Supabase SQL Editor:

**File:** `supabase-upsert-functions.sql`

This creates 7 critical functions:
- `upsert_official_link()`
- `upsert_upcoming_sale()`
- `upsert_document()`
- `upsert_vendor_portal()`
- `upsert_additional_resource()`
- `upsert_important_note()`
- `refresh_county_research()`
- `clean_duplicate_records()`

### **Step 2: Verify Installation (1 min)**

```sql
-- Check functions installed
SELECT routine_name
FROM information_schema.routines
WHERE routine_name LIKE 'upsert%'
   OR routine_name LIKE 'refresh%'
   OR routine_name LIKE 'clean%';
```

**Expected:** 8 functions listed

### **Step 3: Agent Automatically Uses Them (0 min)**

The agent instructions include using UPSERT functions by default.

### **Step 4: Test It! (4 min)**

```sql
-- Research 1
SELECT get_or_create_county('Blair', 'PA');
-- [Agent stores 41 records]

-- Check count
SELECT
  (SELECT COUNT(*) FROM documents WHERE county_id =
    (SELECT id FROM counties WHERE county_name='Blair' AND state_code='PA')) as docs,
  (SELECT COUNT(*) FROM official_links WHERE county_id =
    (SELECT id FROM counties WHERE county_name='Blair' AND state_code='PA')) as links;
-- Expected: docs=10, links=5

-- Research 2 (SAME county, immediately after)
SELECT get_or_create_county('Blair', 'PA');
-- [Agent stores using UPSERT]

-- Check count AGAIN
SELECT
  (SELECT COUNT(*) FROM documents WHERE county_id =
    (SELECT id FROM counties WHERE county_name='Blair' AND state_code='PA')) as docs,
  (SELECT COUNT(*) FROM official_links WHERE county_id =
    (SELECT id FROM counties WHERE county_name='Blair' AND state_code='PA')) as links;
-- Expected: STILL docs=10, links=5 (NOT doubled!)
```

---

## How It Works

### **UPSERT Logic**

```
IF record exists (matching URL or title)
  THEN update it with new information
ELSE
  insert as new record
END
```

### **Example: Document**

```sql
-- First time
SELECT upsert_document(
  county_id,
  'property_list',
  '2026 Repository List',
  'https://example.com/2026-list.pdf'
);
-- Result: NEW record inserted (id: 123)

-- Second time (SAME URL)
SELECT upsert_document(
  county_id,
  'property_list',
  '2026 Repository List - Updated',  -- Changed title
  'https://example.com/2026-list.pdf'  -- SAME URL
);
-- Result: Record 123 UPDATED (not duplicated!)
```

---

## Expected Behavior

### **Scenario 1: First Research**
```
Blair County, PA - Never researched before

Agent stores:
1 county
5 official links
3 upcoming sales
10 documents
1 vendor portal
4 resources
17 notes
1 research log

TOTAL: 42 records
```

### **Scenario 2: Second Research (Same Day)**
```
Blair County, PA - Already researched today

Agent uses UPSERT:
1 county (UPDATED timestamp)
5 official links (5 UPDATED)
3 upcoming sales (3 UPDATED)
10 documents (10 UPDATED)
1 vendor portal (1 UPDATED)
4 resources (4 UPDATED)
17 notes (17 UPDATED)
1 research log (1 NEW entry)

TOTAL: 43 records (only +1 for new research log!)
NOT 84 records!
```

### **Scenario 3: Third Research (New Document Published)**
```
Blair County, PA - Researched again, new property list found

Agent uses UPSERT:
County updated
5 links updated
3 sales updated
10 documents updated
1 NEW document added (new property list!)
1 vendor updated
4 resources updated
17 notes updated
1 NEW note (about new document)
1 NEW research log

TOTAL: 46 records (+3 from scenario 2)
NOT 126 records!
```

---

## Cleanup & Maintenance

### **Weekly Cleanup (Recommended)**

```sql
-- Remove any duplicates that slipped through
SELECT * FROM clean_duplicate_records();
```

**Result:**
```
table_name           | duplicates_removed
---------------------|-------------------
official_links       | 0
documents            | 0
vendor_portals       | 0
additional_resources | 0
important_notes      | 0

No duplicates found!
```

### **Monthly Refresh**

```sql
-- Remove very old sales and stale data
SELECT refresh_county_research(
  (SELECT id FROM counties WHERE county_name = 'Blair' AND state_code = 'PA'),
  TRUE,   -- Keep documents
  FALSE   -- Remove old notes (get fresh ones on next research)
);
```

---

## Files You Have

1. **supabase-upsert-functions.sql** - Install these first!
2. **DUPLICATE-PREVENTION-GUIDE.md** - Complete explanation
3. **AGENT-UPSERT-INSTRUCTIONS.md** - How agent uses functions
4. **DUPLICATE-PREVENTION-SUMMARY.md** - This file

---

## Verification Checklist

After setup, verify:

- [ ] UPSERT functions installed (8 functions)
- [ ] Researched same county twice
- [ ] Record count stayed ~same (not doubled)
- [ ] Research log has 2 entries (1 per research)
- [ ] No duplicate documents (query returned 0)
- [ ] `last_researched_at` updated

---

## Quick Reference

### **Agent Should Use:**

```sql
-- CORRECT (UPSERT)
SELECT upsert_document(...);
SELECT upsert_official_link(...);
SELECT upsert_upcoming_sale(...);

-- WRONG (Creates duplicates)
INSERT INTO documents (...);
INSERT INTO official_links (...);
INSERT INTO upcoming_sales (...);
```

### **Only Direct INSERT For:**

```sql
-- OK (Always want new entries)
INSERT INTO research_log (...);
```

---

## Real-World Example

### **You Research Blair County 5 Times in a Week:**

**Without UPSERT:**
```
Day 1: 42 records
Day 2: 84 records (42 duplicates!)
Day 3: 126 records (84 duplicates!)
Day 4: 168 records (126 duplicates!)
Day 5: 210 records (168 duplicates!)

Total: 210 records (only ~42 are unique!)
```

**With UPSERT:**
```
Day 1: 42 records
Day 2: 43 records (+1 research log)
Day 3: 44 records (+1 research log)
Day 4: 45 records (+1 research log)
Day 5: 46 records (+1 research log)

Total: 46 records (all unique!)
```

---

## Summary

- **UPSERT functions prevent duplicates**
- **Agent automatically uses them**
- **Cleanup functions remove stragglers**
- **Database stays clean & accurate**
- **Re-research updates existing data**

**Result:**
- 10 re-researches = ~50 records (not 420!)
- Clean, accurate, up-to-date database
- No manual cleanup needed

---

## Need Help?

**Check if functions installed:**
```sql
SELECT routine_name FROM information_schema.routines
WHERE routine_name LIKE '%upsert%';
```

**Find duplicates:**
```sql
SELECT county_id, url, COUNT(*)
FROM documents
GROUP BY county_id, url
HAVING COUNT(*) > 1;
```

**Clean duplicates:**
```sql
SELECT * FROM clean_duplicate_records();
```

---

**Files to install:**
1. `supabase-upsert-functions.sql` (RUN THIS FIRST!)
2. `DUPLICATE-PREVENTION-GUIDE.md` (READ THIS)
3. `AGENT-UPSERT-INSTRUCTIONS.md` (REFERENCE)

**Your database will thank you!**

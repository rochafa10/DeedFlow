# Agent Instructions: Using UPSERT Functions

## **CRITICAL: Agent Must Use UPSERT Functions**

When storing data in Supabase, **ALWAYS use UPSERT functions** instead of direct INSERT to prevent duplicates.

---

## **UPSERT Functions Available**

### **1. upsert_official_link()**
```sql
SELECT upsert_official_link(
  county_id,              -- UUID from get_or_create_county()
  'tax_claim_bureau',     -- link_type
  'https://example.com',  -- url
  'Office Name',          -- title (optional)
  '555-1234',            -- phone (optional)
  'email@county.gov'     -- email (optional)
);
```

### **2. upsert_upcoming_sale()**
```sql
SELECT upsert_upcoming_sale(
  county_id,                    -- UUID
  'repository',                 -- sale_type
  '2026-03-11 10:00:00',       -- sale_date
  '2026-02-25 16:00:00',       -- registration_deadline (optional)
  'Bid4Assets',                -- platform (optional)
  10000,                       -- deposit_required (optional)
  568,                         -- property_count (optional)
  'Online',                    -- sale_location (optional)
  'online'                     -- bidding_method (optional)
);
```

### **3. upsert_document()**
```sql
SELECT upsert_document(
  county_id,                           -- UUID
  'property_list',                     -- document_type
  '2026 Repository Property List',     -- title
  'https://example.com/list.pdf',      -- url
  'pdf',                               -- file_format (optional)
  '2026-01-15',                        -- publication_date (optional)
  2026,                                -- year (optional)
  568                                  -- property_count (optional)
);
```

### **4. upsert_vendor_portal()**
```sql
SELECT upsert_vendor_portal(
  county_id,                              -- UUID
  'Bid4Assets',                           -- vendor_name
  'https://bid4assets.com/blair-pa',      -- county_specific_url (optional)
  'https://bid4assets.com/register',      -- registration_url (optional)
  TRUE                                    -- is_primary (optional)
);
```

### **5. upsert_additional_resource()**
```sql
SELECT upsert_additional_resource(
  county_id,                        -- UUID
  'assessment',                     -- resource_type
  'County Assessment Office',       -- title
  'https://assessment.county.gov'   -- url
);
```

### **6. upsert_important_note()**
```sql
SELECT upsert_important_note(
  county_id,                                    -- UUID
  'deadline',                                   -- note_type
  'Registration required by Feb 25, 2026',     -- note_text
  8                                            -- priority (1-10, optional)
);
```

---

## **Complete Research Workflow**

```sql
-- STEP 1: Get or Create County
DO $$
DECLARE
  v_county_id UUID;
BEGIN
  -- Get county ID (creates if doesn't exist)
  SELECT get_or_create_county('Blair', 'PA') INTO v_county_id;

  -- STEP 2: Refresh old data (optional but recommended)
  PERFORM refresh_county_research(v_county_id, TRUE, FALSE);

  -- STEP 3: Insert Official Links (UPSERT)
  PERFORM upsert_official_link(
    v_county_id, 'tax_claim_bureau',
    'https://blairco.org/tax-claim',
    'Blair County Tax Claim Bureau',
    '814-317-2361', 'taxclaim@blairco.org'
  );

  PERFORM upsert_official_link(
    v_county_id, 'tax_sale_page',
    'https://blairco.org/tax-claim/sales',
    'Tax Sale Information', NULL, NULL
  );

  -- STEP 4: Insert Upcoming Sales (UPSERT)
  PERFORM upsert_upcoming_sale(
    v_county_id, 'repository',
    '2026-03-11 10:00:00', '2026-02-25 16:00:00',
    'Bid4Assets', 10000, 568, 'Online', 'online'
  );

  -- STEP 5: Insert Documents (UPSERT)
  PERFORM upsert_document(
    v_county_id, 'property_list',
    '2026 Repository Property List',
    'https://blairco.org/getmedia/2026-repo-list.pdf',
    'pdf', '2026-01-15', 2026, 568
  );

  PERFORM upsert_document(
    v_county_id, 'registration_form',
    'Bidder Registration Instructions',
    'https://blairco.org/registration.pdf',
    'pdf', '2026-01-10', 2026, NULL
  );

  -- STEP 6: Insert Vendor Portal (UPSERT)
  PERFORM upsert_vendor_portal(
    v_county_id, 'Bid4Assets',
    'https://bid4assets.com/blair-county-pa',
    'https://bid4assets.com/blair-county-pa/register',
    TRUE
  );

  -- STEP 7: Insert Additional Resources (UPSERT)
  PERFORM upsert_additional_resource(
    v_county_id, 'assessment',
    'Blair County Assessment Office',
    'https://blairco.org/assessment'
  );

  -- STEP 8: Insert Important Notes (UPSERT)
  PERFORM upsert_important_note(
    v_county_id, 'deadline',
    'Registration deadline: February 25, 2026 at 4:00 PM', 9
  );

  PERFORM upsert_important_note(
    v_county_id, 'deposit',
    '$10,000 deposit required via wire transfer', 8
  );

  -- STEP 9: Insert Research Log
  INSERT INTO research_log (
    county_id, researcher, sources_checked, data_quality_score, notes
  ) VALUES (
    v_county_id,
    'claude-agent',
    ARRAY[
      'Perplexity: Blair County PA overview',
      'Google: Property list PDFs',
      'Official: blairco.org/tax-claim'
    ],
    10,
    'Complete research with Perplexity + Google Custom Search'
  );

  -- STEP 10: Update county timestamp
  PERFORM update_county_research_timestamp(v_county_id);

END $$;
```

---

## **Agent Checklist**

Before inserting data, agent should:

1. **Get County ID**
   ```sql
   SELECT get_or_create_county('County Name', 'ST');
   ```

2. **Optionally Refresh Old Data**
   ```sql
   SELECT refresh_county_research(county_id, TRUE, FALSE);
   ```

3. **Use UPSERT for All Inserts**
   - `upsert_official_link()` for official links
   - `upsert_upcoming_sale()` for sales
   - `upsert_document()` for documents
   - `upsert_vendor_portal()` for vendor portals
   - `upsert_additional_resource()` for resources
   - `upsert_important_note()` for notes

4. **Insert Research Log** (always new)
   ```sql
   INSERT INTO research_log (...)
   ```

5. **Update Timestamp**
   ```sql
   SELECT update_county_research_timestamp(county_id);
   ```

---

## **Example: Agent Response**

```
User: Research Blair County, PA

Agent: RESEARCHING: Blair County, PA

Step 1: Getting county ID...
County ID: 550e8400-e29b-41d4-a716-446655440000

Step 2: Refreshing old data...
Removed 2 old sales, kept 10 documents

Step 3: Researching via Perplexity + Google...
Found comprehensive information

Step 4: Storing data using UPSERT functions...
├─ Official Links: 5 (3 updated, 2 new)
├─ Upcoming Sales: 3 (2 updated, 1 new)
├─ Documents: 10 (7 updated, 3 new)
├─ Vendor Portals: 1 (1 updated)
├─ Resources: 4 (4 updated)
└─ Important Notes: 17 (10 updated, 7 new)

Step 5: Updating research log...
New research entry added

COMPLETE: 41 records total
Quality Score: 10/10

No duplicates created!
```

---

## **Troubleshooting**

### **Issue: "Function does not exist"**

**Solution:** Run `supabase-upsert-functions.sql` first!

```sql
-- Check if functions exist
SELECT routine_name
FROM information_schema.routines
WHERE routine_name LIKE 'upsert%';
```

### **Issue: Duplicates Still Created**

**Solution:** Clean them up!

```sql
-- Remove duplicates
SELECT * FROM clean_duplicate_records();
```

### **Issue: Old Data Not Removed**

**Solution:** Use refresh function

```sql
SELECT refresh_county_research(county_id, FALSE, FALSE);
-- This removes old documents and notes
```

---

## **Monitoring**

### **Query: Check Last Research Date**
```sql
SELECT
  county_name,
  state_code,
  last_researched_at,
  NOW() - last_researched_at as age
FROM counties
ORDER BY last_researched_at DESC;
```

### **Query: Find Counties Needing Refresh**
```sql
SELECT county_name, state_code, last_researched_at
FROM counties
WHERE last_researched_at < NOW() - INTERVAL '7 days'
ORDER BY last_researched_at;
```

### **Query: Count Records Per County**
```sql
SELECT
  c.county_name,
  COUNT(DISTINCT ol.id) as official_links,
  COUNT(DISTINCT us.id) as upcoming_sales,
  COUNT(DISTINCT d.id) as documents,
  COUNT(DISTINCT vp.id) as vendor_portals,
  COUNT(DISTINCT ar.id) as resources,
  COUNT(DISTINCT in.id) as notes
FROM counties c
LEFT JOIN official_links ol ON c.id = ol.county_id
LEFT JOIN upcoming_sales us ON c.id = us.county_id
LEFT JOIN documents d ON c.id = d.county_id
LEFT JOIN vendor_portals vp ON c.id = vp.county_id
LEFT JOIN additional_resources ar ON c.id = ar.county_id
LEFT JOIN important_notes in ON c.id = in.county_id
GROUP BY c.county_name
ORDER BY c.county_name;
```

---

## **Summary**

**ALWAYS use UPSERT functions to:**
- Prevent duplicate records
- Update existing information
- Add new information
- Keep database clean
- Preserve historical data

**Never use direct INSERT for:**
- official_links
- upcoming_sales
- documents
- vendor_portals
- additional_resources
- important_notes

**Only use direct INSERT for:**
- research_log (always want new entries)

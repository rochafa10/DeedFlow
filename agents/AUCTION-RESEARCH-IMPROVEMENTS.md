# Auction Research Workflow Improvements

## Problem Identified
Monroe County, PA has 1,421 properties for a Feb 10, 2026 judicial sale according to Tax Sale Resources, but our system shows 0 properties. This indicates gaps in our research workflow.

---

## Gap Analysis

| Data Source | What They Have | What We're Missing |
|-------------|----------------|-------------------|
| **Tax Sale Resources** | 1,421 properties, sale dates, aggregate amounts | We don't cross-check against their data |
| **Legal Notices** | Newspaper advertisements (required by PA law) | We don't monitor legal notice databases |
| **Bid4Assets** | Auction listings with property counts | We don't have automated monitoring |
| **Court Filings** | Judicial sale petitions filed with courts | We don't monitor court dockets |

---

## Recommended Improvements

### 1. Tax Sale Resources Integration (Verification Layer)

**Purpose:** Cross-check our findings against Tax Sale Resources to identify gaps.

**Implementation:**
```
# Manual verification process
1. Monthly: Check taxsaleresources.com/research/auctions
2. Filter by State: Pennsylvania
3. Compare their sale dates and property counts against our database
4. Flag any sales where:
   - We have 0 properties but they have >0
   - Our counts differ by >10%
```

**Automation Potential:**
- Tax Sale Resources has an API (paid subscription)
- Could integrate for automatic gap detection

### 2. Legal Notice Monitoring

**Purpose:** Catch sales when they're legally advertised in newspapers.

**PA Legal Notice Sources:**
- **Pennsylvania Press Association**: https://pa-press.org/public-notices/
- **PNJ Classifieds** (PA legal notices): https://www.pnjclassifieds.com/
- **County-specific newspapers**: Pocono Record (Monroe County)

**Implementation:**
```
# Monitoring schedule
1. Weekly: Search for "tax sale" OR "judicial sale" OR "upset sale"
2. Filter by county names in our database
3. Extract sale dates and property list URLs
4. Add to documents table for parsing
```

### 3. Bid4Assets Monitoring (Requires Account)

**Purpose:** Monitor vendor platform for PA tax sales.

**Implementation:**
```
# Bid4Assets monitoring
URL: https://www.bid4assets.com/
Required: Create free account for browsing

Counties using Bid4Assets:
- Monroe County (Sheriff Sales)
- Blair County
- Multiple PA counties

Monitoring steps:
1. Login to Bid4Assets
2. Search > Pennsylvania > Tax Sales
3. Export upcoming auctions
4. Compare against our database
```

### 4. Increased Research Frequency

**Current:** County websites checked during initial research
**Proposed:** Weekly checks for counties with upcoming sales in 30 days

**Priority Counties (by auction proximity):**
```sql
SELECT c.county_name, us.sale_date
FROM upcoming_sales us
JOIN counties c ON us.county_id = c.id
WHERE us.sale_date BETWEEN NOW() AND NOW() + INTERVAL '30 days'
ORDER BY us.sale_date;
```

---

## n8n Workflow Enhancements

### Workflow 1: Tax Sale Resources Gap Check (Weekly)

```yaml
Trigger: Schedule - Every Monday 6 AM
Steps:
  1. HTTP Request: Fetch Tax Sale Resources PA auctions page
  2. Parse HTML: Extract county, sale date, property count
  3. Supabase Query: Get our data for same counties
  4. Compare: Flag gaps where TSR count > 0 but ours = 0
  5. Alert: Send notification for manual review
```

### Workflow 2: Legal Notice Monitor (Weekly)

```yaml
Trigger: Schedule - Every Wednesday 6 AM
Steps:
  1. HTTP Request: Search PA Press Association for tax sales
  2. Parse Results: Extract county, dates, notice URLs
  3. Supabase Check: Is this sale already in our database?
  4. If New: Add to upcoming_sales, queue for research
  5. If Existing: Update with new info, check for property list URL
```

### Workflow 3: Property List Finder (Daily)

```yaml
Trigger: Schedule - Daily 8 AM
Steps:
  1. Supabase Query: Find sales with 0 properties, sale within 30 days
  2. For each county:
     a. Navigate to official tax claim website
     b. Search for property list links
     c. If found: Add to documents table, trigger parser
  3. Report: Summary of found/not found lists
```

---

## Data Sources Priority Matrix

| Source | Reliability | Cost | Automation | Priority |
|--------|-------------|------|------------|----------|
| County Official Websites | High | Free | Medium | 1 |
| Tax Sale Resources | High | $$ | API Available | 2 |
| Legal Notice Databases | High | Free/$ | Medium | 3 |
| Bid4Assets | High | Free (account) | Playwright | 4 |
| Court Filings (PACER equiv) | Medium | $ | Low | 5 |

---

## Monroe County Specific Fix

### Immediate Action
1. Check Monroe County Tax Claim Bureau for any posted 2026 lists
2. Contact county directly: tjohnson@monroecountypa.gov, 570.517.3180
3. Check Pocono Record newspaper for legal notices
4. Monitor Tax Sale Resources for when list becomes available

### Database Update Needed
```sql
-- Update Monroe County sale with notes
UPDATE upcoming_sales
SET
  property_count = 1421,  -- Per Tax Sale Resources
  status = 'confirmed'
WHERE county_id = (SELECT id FROM counties WHERE county_name = 'Monroe' AND state_code = 'PA')
  AND sale_type = 'judicial'
  AND sale_date::date = '2026-02-10';
```

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Properties found vs Tax Sale Resources | ~50% | >95% |
| Sales with property lists | Unknown | >80% within 14 days of sale |
| Gap detection time | Manual | <24 hours automated |
| Counties monitored weekly | 0 | All with sales in 30 days |

---

## Implementation Timeline

| Week | Task |
|------|------|
| 1 | Set up Tax Sale Resources manual verification process |
| 2 | Create n8n workflow for gap detection |
| 3 | Set up legal notice monitoring |
| 4 | Implement Bid4Assets monitoring with Playwright |
| 5 | Review and optimize based on gaps found |

---

## Implementation Status (January 26, 2026)

### Completed

1. **Database: Research Gaps Table** ✅
   - Created `research_gaps` table to track discrepancies
   - Function `record_research_gap()` for automated gap recording
   - View `vw_open_research_gaps` for monitoring

2. **n8n Workflow Updated** ✅
   - Workflow: `TDF - Tax Auction Research Agent` (ID: 48zvrtwvoxqrh8v8)
   - Added **RecordResearchGap** tool (new)
   - Enhanced system prompt with multi-source verification:
     - Tax Sale Resources verification
     - Bid4Assets checking
     - Legal notice searching
   - Agent now instructed to cross-check ALL sources

3. **Monroe County Gap Recorded** ✅
   ```sql
   -- View the gap
   SELECT * FROM vw_open_research_gaps;

   -- Result: Monroe County, PA
   -- External: 1,421 properties (Tax Sale Resources)
   -- Our count: 0
   -- Gap: 100%
   -- Status: open
   ```

### Pending

- [ ] Create Bid4Assets account for automated monitoring
- [ ] Tax Sale Resources API subscription (for automated verification)
- [ ] Legal notice monitoring workflow (separate n8n workflow)
- [ ] Property list finder workflow

### How to Use the New System

**Check for open gaps:**
```sql
SELECT * FROM vw_open_research_gaps;
```

**Record a new gap manually:**
```sql
SELECT record_research_gap(
  county_id,           -- UUID
  'tax_sale_resources', -- Source
  1000,                -- Their count
  50,                  -- Our count
  '2026-03-15',        -- Sale date
  'judicial',          -- Sale type
  'https://url.com'    -- Source URL
);
```

**Close a gap after resolution:**
```sql
UPDATE research_gaps
SET status = 'resolved',
    resolution_notes = 'Property list obtained and parsed',
    resolved_at = NOW()
WHERE id = 'gap-uuid';
```

---

*Document created: January 25, 2026*
*Last updated: January 26, 2026*

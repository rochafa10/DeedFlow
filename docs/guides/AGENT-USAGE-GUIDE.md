# Tax Auction Agent - Usage Guide

## What Is This Agent?

An autonomous AI agent that researches county tax auctions across the US and automatically stores all findings in your Supabase database.

## What Can It Do?

### ✅ Single County Research
```
You: Research Blair County, PA

Agent:
🔍 Searches for official sources
📄 Finds all documents and property lists
💾 Stores 20-30 records in database
✅ Reports findings with quality score
```

### ✅ Multi-County Batch Processing
```
You: Research these counties:
     - Blair, PA
     - Centre, PA
     - Bedford, PA

Agent:
Processes all 3 counties sequentially
Stores 60-90+ total records
Provides summary report
```

### ✅ Database Queries
```
You: Show me all sales in next 30 days

Agent:
Queries Supabase
Returns formatted results
Includes all key details
```

### ✅ Data Maintenance
```
You: Find counties needing refresh

Agent:
Queries last_researched_at
Lists stale counties
Offers to refresh automatically
```

## Command Examples

### Research Commands

#### Basic Research
```
Research Blair County, PA
Find tax auctions in Allegheny County
Get property lists for Philadelphia County
```

#### State-Wide Research
```
Research all counties in Delaware
Find tax sales across New Jersey
Build database for Rhode Island counties
```

#### Specific Queries
```
Find next sale date for Blair County, PA
Get registration deadline for Centre County
Show property count for Allegheny County sale
```

### Database Commands

#### Query Sales
```
Show all upcoming sales in Pennsylvania
List sales in next 30 days
Find sales with 200+ properties
Which counties have March sales?
```

#### Query Documents
```
Show all property lists for PA counties
Find registration forms available
List PDF documents from 2026
```

#### Query Counties
```
How many counties are in the database?
Which counties use Bid4Assets?
Show counties researched this week
List all Florida counties
```

#### Data Quality
```
Show counties with quality score > 8
Find counties with incomplete data
Which counties need more documents?
```

### Maintenance Commands

#### Update Data
```
Refresh Blair County, PA
Update all PA counties researched >30 days ago
Re-research counties with quality score < 6
```

#### Monitor Changes
```
Check for new sales posted
Find updated property lists
Compare current vs previous research
```

#### Cleanup
```
Find broken links in database
Identify outdated information
Remove duplicate entries
```

## Usage Patterns

### Pattern 1: Build Initial Database

**Day 1**: Start with your target states
```
Research these PA counties:
- Blair
- Centre
- Bedford
- Fulton
- Huntingdon

[Agent processes all 5]
✅ 5 counties, ~140 records stored
```

**Day 2-5**: Expand coverage
```
Add these PA counties:
[List 10 more counties]

[Agent processes batch]
✅ 15 total counties now
```

**Week 2**: Add other states
```
Research these FL counties:
- Miami-Dade
- Broward
- Palm Beach

[Agent adapts to FL system]
✅ Multi-state database active
```

### Pattern 2: Weekly Maintenance

**Every Monday**:
```
You: Show me counties researched >7 days ago

Agent: Found 8 counties:
       1. Blair, PA (12 days)
       2. Centre, PA (9 days)
       ...

You: Refresh all 8

Agent: [Updates each county]
       ✅ All refreshed
       Changes detected:
       - Blair: Property count 550 → 568
       - Centre: New legal notice added
```

### Pattern 3: Find Opportunities

**Looking for properties**:
```
You: Find all sales with 300+ properties in next 60 days

Agent: Found 5 sales:
       
       1. Allegheny, PA - Mar 15, 2026
          Properties: 523
          Deposit: $10,000
          Platform: RealAuction
          Registration: Mar 1
       
       2. Philadelphia, PA - Apr 3, 2026
          Properties: 789
          Deposit: $10,000
          Platform: Online + In-person
          Registration: Mar 20
       
       [3 more...]
```

**Filter by criteria**:
```
You: Show me PA repository sales only

Agent: Found 3 repository sales:
       - Blair: Mar 11 (550 properties)
       - Huntingdon: Apr 8 (89 properties)
       - Bedford: May 6 (127 properties)
```

### Pattern 4: Deep Dive Research

**Comprehensive county analysis**:
```
You: Give me everything about Blair County, PA tax auctions

Agent: 📊 BLAIR COUNTY, PA - COMPLETE ANALYSIS
       
       System: PA Upset→Judicial→Repository
       Last Updated: 2 days ago
       Quality Score: 9/10
       
       🏢 OFFICIAL CONTACTS:
       Tax Claim Bureau: 814-317-2361
       Email: taxclaim@blairco.org
       Website: [URL]
       
       📅 UPCOMING SALES (2):
       1. Repository Sale - Mar 11, 2026
       2. Upset Sale - Nov 2026 (TBD)
       
       📄 DOCUMENTS (7):
       - 2026 Repository Property List (PDF)
       - 2026 Repository Property List (Excel)
       - Legal Advertisement (PDF)
       - Registration Instructions (PDF)
       - Bidder Application (PDF)
       - Terms & Conditions (PDF)
       - 2025 Upset Results (PDF)
       
       🔗 VENDOR:
       Bid4Assets: [URL]
       
       ⚠️ IMPORTANT:
       - $10,000 deposit required
       - Registration deadline: Feb 25, 2026
       - Full payment due 10 days after sale
       - Properties sold as-is
```

## Advanced Usage

### Comparative Analysis
```
You: Compare tax auction systems in PA, FL, and TX

Agent: [Provides detailed comparison table]
       
       | State | System | Timing | Deposit | Platform |
       |-------|--------|--------|---------|----------|
       | PA    | 3-tier | Annual | $10K    | Online   |
       | FL    | Liens  | May-Jun| Varies  | Online   |
       | TX    | Deeds  | Monthly| $100    | In-person|
       
       [Detailed explanation of each system]
```

### Trend Analysis
```
You: Has Blair County's property count changed over time?

Agent: Analyzing research_log...
       
       Blair County Property Trends:
       - 2024 Repo: 487 properties
       - 2025 Upset: 502 properties
       - 2025 Repo: 550 properties (completed)
       - 2026 Repo: 568 properties (upcoming)
       
       Trend: +16% increase year-over-year
```

### Export Data
```
You: Export all PA county data to CSV

Agent: Querying database...
       Creating CSV export...
       
       ✅ Export complete: pa_counties_2026.csv
       
       Included:
       - 15 counties
       - 287 total records
       - All sales, documents, links
       
       [Provides download link or file]
```

## Tips for Best Results

### 🎯 Be Specific
✅ "Research Blair County, PA"
❌ "Research Blair"

✅ "Show sales in next 30 days"
❌ "Show sales soon"

### 📊 Use Exact Property Names
✅ "Show me Blair County's property_count"
❌ "How many properties does Blair have?"

### 🔄 Request Batch Operations
✅ "Research these 10 counties: [list]"
❌ [Asking for each county one by one]

### ⏱️ Set Update Schedules
✅ "Refresh counties >7 days old weekly"
✅ "Check for new sales every Monday"

## Understanding Agent Output

### Quality Scores

**9-10 (Excellent)**
- Complete official website found
- All upcoming sales documented
- 5+ documents available
- Contact info complete
- Vendor portal identified

**7-8 (Good)**
- Official website found
- Main sales documented
- 3+ documents
- Basic contact info

**5-6 (Acceptable)**
- Basic website found
- Limited sale info
- 1-2 documents

**1-4 (Poor)**
- Missing critical information
- No official sources
- Outdated data

### Document Types

- **property_list**: Excel/PDF with properties for sale
- **legal_notice**: Official auction advertisement
- **registration_form**: Bidder application
- **terms**: Terms and conditions of sale
- **results**: Past sale results
- **instructions**: How-to guides

### Sale Statuses

- **scheduled**: Future sale, not yet occurred
- **completed**: Past sale, results may be available
- **cancelled**: Sale was cancelled
- **TBD**: Date to be determined

## Troubleshooting

### "I can't find information for this county"

**Agent Response**:
```
⚠️ Limited data found for [County], [State]

Searched:
✓ Official .gov sites
✓ Vendor portals
✓ State websites
✗ No active tax sale program found

Possible reasons:
- County may not hold tax sales
- Information not published online
- Recent website changes

Recommendation: Call county directly
Phone: [If found]

Stored: Basic county record with notes
Quality Score: 3/10
```

### "This information seems outdated"

**Agent Response**:
```
⚠️ Data may be outdated

Last Research: 45 days ago
Latest Document: 2024-11-15
Current Date: 2026-01-04

Recommendation: Refresh data

Shall I re-research [County] now?
```

### "Some links are broken"

**Agent Response**:
```
⚠️ Found 2 broken links:

1. Property List PDF: 404 Error
2. Registration Form: Page moved

Action Taken:
✓ Noted in database
✓ Searched for alternatives
✓ Updated with working links where found

Remaining valid links: 5
```

## Integration with Other Tools

### Export to Excel
```
You: Create Excel file with all PA sales

Agent: [Generates Excel]
       Sheet 1: Counties
       Sheet 2: Upcoming Sales
       Sheet 3: Documents
       Sheet 4: Contacts
```

### Calendar Integration
```
You: Add all sale dates to calendar

Agent: Creating calendar events...
       ✅ Added 12 sales to calendar
       - Reminders set for registration deadlines
       - Links to property lists included
```

### Email Alerts
```
You: Email me when Blair County posts new documents

Agent: ✅ Monitoring Blair County
       Will notify when:
       - New documents added
       - Property count changes
       - Sale dates announced
```

## Next Steps

1. **Start Small**: Research 1-2 counties
2. **Verify Quality**: Check quality scores
3. **Expand Coverage**: Add 5-10 more counties
4. **Set Schedule**: Weekly refresh routine
5. **Use Queries**: Find opportunities
6. **Export Data**: Share with team

Your autonomous Tax Auction Research Agent is ready to work! 🚀

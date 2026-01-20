# Centre County, PA - Research Baseline for n8n Comparison

## Purpose
This document captures the expected output from researching Centre County, PA using the Claude Research Agent. The n8n AI Agent workflow should produce equivalent results.

## Research Date
January 11, 2026

## County Information
- **County ID**: `ed760e64-a3bb-4fdb-a063-0a36752a3fc4`
- **County Name**: Centre
- **State**: PA (Pennsylvania)

---

## Expected Output Summary

| Table | Record Count |
|-------|--------------|
| official_links | 1 |
| upcoming_sales | 1 |
| documents | 10 |
| vendor_portals | 0 |
| additional_resources | 3 |
| important_notes | 5 |
| research_log | 1+ |

**Total Records**: 20+ (excluding research_log)

---

## Detailed Expected Data

### 1. Official Links (1 record)

| Field | Expected Value |
|-------|----------------|
| link_type | tax_claim_bureau |
| title | Centre County Tax Claim Bureau |
| url | https://centrecountypa.gov/430/Tax-Claim-Bureau |
| phone | (814) 355-6805 |
| email | tcc@centrecountypa.gov |

### 2. Upcoming Sales (1 record)

| Field | Expected Value |
|-------|----------------|
| sale_type | upset |
| sale_date | 2026-09-15 10:00:00 (estimated) |
| platform | In-Person |
| location | Front lawn of Willowbank Building, 420 Holmes Street, Bellefonte, PA 16823 |
| status | scheduled |

**Note**: Centre County uses IN-PERSON ONLY auctions. No online vendor platform.

### 3. Documents (10 records)

| document_type | title | year | url |
|---------------|-------|------|-----|
| property_list | Centre County Repository List | 2024 | https://centrecountypa.gov/DocumentCenter/View/18127/CENTRE-COUNTY-REPOSITORY-LIST-AS-OF-DECEMBER-21 |
| sale_results | 2025 Centre County Upset Sale Results | 2025 | https://centrecountypa.gov/DocumentCenter/View/32706/2025-Centre-County-Upset-Sale-Results |
| sale_results | 2024 Centre County Upset Sale Results | 2024 | https://centrecountypa.gov/DocumentCenter/View/27768/8-9-24--TS_AdvertSaleList |
| registration | Individual Bidder Affidavit | 2025 | https://centrecountypa.gov/DocumentCenter/View/21798/Individual-Bidder-Affidavit |
| registration | LLC Bidder Affidavit | 2025 | https://centrecountypa.gov/DocumentCenter/View/21799/LLC-Bidder-Affidavit |
| registration | Corporate Bidder Affidavit - Non LLC | 2025 | https://centrecountypa.gov/DocumentCenter/View/21797/Corporate-Bidder-Affidavit---Non-LLC |
| registration | Bidder Affidavit Guidance | 2025 | https://centrecountypa.gov/DocumentCenter/View/21796/Bidder-Affidavit-Guidance |
| legal_notice | Upset and Judicial Sale Conditions and Instructions | 2025 | https://centrecountypa.gov/DocumentCenter/View/21800/UPSET-AND-JUDICIAL-SALE-CONDITIONS-AND-INSTRUCTIONS |
| legal_notice | Act 33 of 2021 (Bidders) | 2021 | https://centrecountypa.gov/DocumentCenter/View/25615/Act-33-of-2021-Bidders |
| other | Excess Funds List | 2023 | https://centrecountypa.gov/DocumentCenter/View/26473/12-22-23-overbid-money |

### 4. Vendor Portals (0 records)

Centre County does NOT use an online auction platform. All sales are conducted in-person.

### 5. Additional Resources (3 records)

| resource_type | title | url |
|---------------|-------|-----|
| assessment | Centre County Tax Assessment | https://centrecountypa.gov/423/Tax-Assessment |
| gis | Centre County Online Information System | https://webia.centrecountypa.gov/ |
| payment | Pay Real Estate Taxes Online | https://cc.centrecountypa.gov/ |

### 6. Important Notes (5 records)

| note_type | priority | note_text |
|-----------|----------|-----------|
| auction_format | 9 | Centre County tax sales are conducted IN-PERSON ONLY at the Willowbank Building, 420 Holmes Street, Bellefonte. No online auction platform is used. |
| deadline | 10 | Bidder registration must be submitted 10 business days before the sale (by 5:00 PM). Late registrations are NOT accepted per PA statute. |
| payment | 8 | Payment must be Cash, Money Order, or Certified Check payable to "Tax Claim Bureau of Centre County". NO personal checks accepted. |
| platform | 7 | Auction Platform: Bid4Assets |
| system | 5 | PA Tax Sale System: Upset Sale -> Judicial Sale -> Repository Sale |

**Note**: The "platform: Bid4Assets" note appears to be from a previous research session and may be inaccurate for Centre County specifically.

---

## Key Research Findings

### Contact Information
- **Office**: Tax Claim Bureau
- **Director**: Jennifer Pettina
- **Address**: 420 Holmes Street, Bellefonte, PA 16823
- **Phone**: (814) 355-6805
- **Email**: tcc@centrecountypa.gov

### Auction Format
- **Type**: IN-PERSON ONLY
- **Location**: Front lawn of Willowbank Building
- **Platform**: None (no online bidding)

### PA Tax Sale System (3-tier)
1. **Upset Sale** - First attempt, liens survive
2. **Judicial Sale** - Second attempt, title cleared
3. **Repository Sale** - Unsold properties, ongoing

### Key Deadlines
- Registration: 10 business days before sale (by 5:00 PM)
- Late registrations NOT accepted

### Payment Methods
- Cash
- Money Order
- Certified Check (payable to "Tax Claim Bureau of Centre County")
- NO personal checks

---

## Quality Metrics

| Metric | Value |
|--------|-------|
| Data Quality Score | 9/10 (0.90) |
| Sources Checked | 4 |
| Documents Found | 10 |
| Research Method | Perplexity + Playwright |

---

## n8n Workflow Requirements

The n8n AI Agent workflow should:

1. **Accept input**: County name and state code
2. **Research using Perplexity**: Get overview, contacts, sale information
3. **Extract document URLs**: Either via web scraping or search
4. **Store data in Supabase**: Using the same UPSERT functions
5. **Produce comparable output**: Same record counts and data quality

### Required n8n Nodes
- `@n8n/n8n-nodes-langchain.agent` - AI Agent
- `n8n-nodes-base.perplexityTool` - Research tool
- `n8n-nodes-base.supabaseTool` - Database storage
- `n8n-nodes-base.httpRequest` - Optional for web scraping

### Success Criteria
The n8n workflow produces results with:
- [ ] Same official link (Tax Claim Bureau with contact info)
- [ ] Same or similar upcoming sale information
- [ ] 8+ documents found (acceptable: 6-12)
- [ ] Identifies IN-PERSON auction format
- [ ] Stores all data to Supabase correctly
- [ ] Data quality score >= 8/10

---

## Comparison Checklist

After running n8n workflow, compare:

- [ ] Official link URL matches
- [ ] Contact phone/email matches
- [ ] Upcoming sale date/location matches
- [ ] Document count is similar (±2)
- [ ] Repository list found
- [ ] Bidder affidavits found
- [ ] Sale conditions document found
- [ ] IN-PERSON format identified
- [ ] Registration deadline captured
- [ ] Payment methods captured

---

*Generated by Claude Research Agent - January 11, 2026*

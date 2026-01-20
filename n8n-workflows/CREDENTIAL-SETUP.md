# n8n Tax Research Agent - Credential Setup Guide

## Workflow Information
- **Workflow ID**: `48zvrtwvoxqrh8v8`
- **Workflow Name**: TDF - Tax Auction Research Agent
- **Webhook Path**: `/webhook/tax-research`

---

## Required Credentials

### 1. OpenAI API Key
**Node**: OpenAI GPT-4

1. Go to n8n Credentials
2. Create new credential: **OpenAI Account**
3. Enter your OpenAI API key
4. Connect to the "OpenAI GPT-4" node

### 2. Perplexity API Key
**Node**: Perplexity Research

1. Go to n8n Credentials
2. Create new credential: **Perplexity API**
3. Enter your Perplexity API key
4. Connect to the "Perplexity Research" node

### 3. Supabase HTTP Header Auth
**Nodes**: All 6 Supabase HTTP Request Tool nodes

1. Go to n8n Credentials
2. Create new credential: **Header Auth**
3. Configure as follows:
   - **Name**: `apikey`
   - **Value**: `<your-supabase-anon-key>` (starts with `eyJ...`)
4. Connect to ALL 6 Supabase tool nodes:
   - Get/Create County
   - Upsert Official Link
   - Upsert Upcoming Sale
   - Upsert Document
   - Upsert Resource
   - Upsert Important Note

### Supabase Details
- **Project URL**: `https://oiiwlzobizftprqspbzt.supabase.co`
- **Anon Key**: Get from Supabase Dashboard > Settings > API

---

## Testing the Workflow

### Activate the Workflow
1. Open the workflow in n8n
2. Toggle the "Active" switch to ON
3. Copy the webhook URL (shown when active)

### Test Request
```bash
curl -X POST "https://n8n.lfb-investments.com/webhook/tax-research" \
  -H "Content-Type: application/json" \
  -d '{
    "county": "Centre",
    "state": "PA"
  }'
```

### Expected Response
```json
{
  "county_info": {
    "name": "Centre",
    "state": "PA",
    "county_id": "ed760e64-a3bb-4fdb-a063-0a36752a3fc4"
  },
  "official_contact": {
    "bureau_name": "Centre County Tax Claim Bureau",
    "phone": "(814) 355-6805",
    "email": "tcc@centrecountypa.gov",
    "website": "https://centrecountypa.gov/430/Tax-Claim-Bureau"
  },
  "upcoming_sales": [...],
  "documents_found": 10,
  "auction_format": "in-person",
  "key_notes": [...],
  "data_quality_score": 9
}
```

---

## Comparison with Claude Baseline

After running the n8n workflow with Centre County, PA, compare results to:
**Baseline File**: `CENTRE-COUNTY-BASELINE.md`

### Expected Record Counts
| Table | Expected | n8n Result |
|-------|----------|------------|
| official_links | 1 | ___ |
| upcoming_sales | 1 | ___ |
| documents | 10 | ___ |
| vendor_portals | 0 | ___ |
| additional_resources | 3 | ___ |
| important_notes | 5 | ___ |

### Success Criteria
- [ ] Official link URL matches baseline
- [ ] Contact phone/email matches
- [ ] Upcoming sale date/location matches
- [ ] Document count is similar (8-12)
- [ ] IN-PERSON format identified
- [ ] Registration deadline captured
- [ ] Payment methods captured

---

## Troubleshooting

### Common Issues

1. **401 Unauthorized from Supabase**
   - Check that `apikey` header auth credential is set correctly
   - Verify the anon key is valid

2. **OpenAI rate limit**
   - Add delay between calls or use a higher tier API key

3. **Perplexity timeout**
   - Increase timeout in node settings
   - Try `sonar` model instead of `sonar-pro`

4. **Empty response**
   - Check webhook is receiving the POST body correctly
   - Verify JSON format in request

---

## Workflow Architecture

```
Webhook Trigger (POST /tax-research)
       │
       ▼
Tax Research Agent (AI Agent)
       │
       ├── OpenAI GPT-4 (Language Model)
       ├── Simple Memory (Context Window)
       │
       └── Tools:
           ├── Perplexity Research (Web Research)
           ├── Get/Create County (Supabase RPC)
           ├── Upsert Official Link (Supabase RPC)
           ├── Upsert Upcoming Sale (Supabase RPC)
           ├── Upsert Document (Supabase RPC)
           ├── Upsert Resource (Supabase RPC)
           └── Upsert Important Note (Supabase RPC)
```

---

*Created: January 11, 2026*

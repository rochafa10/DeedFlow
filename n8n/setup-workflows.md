# 🚀 n8n Workflow Setup Guide - Tax Deed Platform

## ✅ Prerequisites Verified
- n8n is running at http://localhost:5678 ✓
- Workflows are ready in `/n8n/workflows/` ✓
- Supabase database is configured ✓

## 📋 Step-by-Step Setup Instructions

### Step 1: Access n8n Interface
Open your browser and go to: **http://localhost:5678**

### Step 2: Create Supabase Credentials

1. In n8n, click **Credentials** in the left sidebar
2. Click **Add Credential** → Search for **"Supabase"**
3. Configure with these settings:

```
Credential Name: Supabase Tax Deed
Host: https://[YOUR_PROJECT_REF].supabase.co
Service Role Key: [YOUR_SERVICE_ROLE_KEY]
```

Get your credentials from `.env.local`:
- Host: Use your NEXT_PUBLIC_SUPABASE_URL
- Service Role Key: Use your SUPABASE_SERVICE_ROLE_KEY

### Step 3: Import Workflows

Import these workflows in order:

#### A. Property Enrichment Workflow
1. Click **Workflows** → **Add Workflow** → **Import from File**
2. Select: `C:\Users\fs_ro\Documents\tax-deed-platform\n8n\workflows\property-enrichment-supabase.json`
3. After import, note the webhook URL shown
4. Click **Active** toggle to enable

#### B. Financial Analysis Workflow  
1. Import: `financial-analysis-workflow.json` (if exists)
2. Note webhook URL
3. Activate workflow

#### C. Inspection Report Workflow
1. Import: `inspection-report-workflow.json`
2. Note webhook URL
3. Activate workflow

#### D. Auction Scraper Workflow
1. Import: `auction-scraper-workflow.json`
2. Note webhook URL (if applicable)
3. Activate workflow
4. Verify schedule is set to "Every 6 hours"

#### E. Miami-Dade Detailed Scraper
1. Import: `miami-dade-scraper-detailed.json`
2. Note webhook URL (if applicable)
3. Activate workflow
4. Verify schedule is set to "Daily at 9 AM"

### Step 4: Configure Environment Variables

Add these to your `.env.local` file with the actual webhook IDs from n8n:

```env
# n8n Webhook URLs (update with your actual webhook IDs)
N8N_ENRICHMENT_WEBHOOK=http://localhost:5678/webhook/[WEBHOOK_ID]/property-enrichment-supabase
N8N_FINANCIAL_WEBHOOK=http://localhost:5678/webhook/[WEBHOOK_ID]/financial-analysis  
N8N_INSPECTION_WEBHOOK=http://localhost:5678/webhook/[WEBHOOK_ID]/inspection-report
N8N_AUCTION_SCRAPER=http://localhost:5678/webhook/[WEBHOOK_ID]/auction-scraper

# External API Keys (optional but recommended)
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

### Step 5: Update Workflow Credentials

For each imported workflow:
1. Open the workflow in n8n
2. Find any **Supabase** nodes (purple/blue colored)
3. Click on each Supabase node
4. In "Credential for Supabase API", select **"Supabase Tax Deed"**
5. Save the workflow

### Step 6: Test Workflows

Test each workflow to ensure it's working:

#### Test Property Enrichment
```bash
curl -X POST http://localhost:5678/webhook/[YOUR_WEBHOOK_ID]/property-enrichment-supabase \
  -H "Content-Type: application/json" \
  -d '{
    "propertyId": "test-001",
    "parcelNumber": "30-1234-567-890",
    "county": "Miami-Dade",
    "state": "FL",
    "address": "123 Test St, Miami, FL 33101"
  }'
```

#### Test Inspection Report
```bash
curl -X POST http://localhost:5678/webhook/[YOUR_WEBHOOK_ID]/inspection-report \
  -H "Content-Type: application/json" \
  -d '{
    "propertyId": "test-001",
    "inspectorName": "Test Inspector",
    "propertyAccess": "full"
  }'
```

### Step 7: Verify Database Updates

After testing, check your Supabase database:
1. Go to your Supabase project
2. Check these tables for new data:
   - `enrichment_logs` - Should have test enrichment records
   - `inspections` - Should have test inspection records
   - `scraping_logs` - Will have logs after scraper runs

## 🔧 Troubleshooting

### Workflow Won't Activate
- Check if all Supabase nodes have credentials selected
- Look for red error indicators on nodes
- Check n8n logs in the console

### Webhook Returns 404
- Ensure workflow is activated (toggle is ON)
- Verify webhook URL matches exactly
- Check workflow execution logs

### Database Not Updating
- Verify Supabase credentials are correct
- Check table names match your schema
- Look at workflow execution history for errors

### API Errors
- External APIs may require additional setup
- Google Maps needs API key configuration
- Some county sites block automated access

## 📊 Workflow Status Dashboard

| Workflow | Type | Schedule | Primary Function | Status |
|----------|------|----------|-----------------|--------|
| Property Enrichment | Webhook | On-demand | Enrich property data | 🟡 Ready to import |
| Financial Analysis | Webhook | On-demand | Calculate ROI | 🟡 Ready to import |
| Inspection Report | Webhook | On-demand | Generate reports | 🟡 Ready to import |
| Auction Scraper | Scheduled | Every 6 hours | Scrape auctions | 🟡 Ready to import |
| Miami-Dade Scraper | Scheduled | Daily 9 AM | Scrape Miami-Dade | 🟡 Ready to import |

## 🎯 Next Steps After Import

1. **Manual Execution Test**: Run each workflow manually first
2. **Check Logs**: Review execution logs for any errors
3. **Update Frontend**: Add webhook URLs to your Next.js app
4. **Monitor**: Set up error notifications in n8n

## 📝 Notes
- Scheduled workflows will start running automatically once activated
- Webhook workflows wait for incoming requests
- All workflows log activities to Supabase
- Browser automation workflows may need additional setup

---
Ready to import? Start with Step 1 above!
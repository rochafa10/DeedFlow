# 🚀 n8n Workflows Deployment Guide - Tax Deed Platform

## Overview
This guide provides step-by-step instructions for deploying and configuring n8n workflows for the Tax Deed Platform with Supabase integration.

## Prerequisites
- n8n instance running (locally or cloud)
- Supabase project with tables created
- API keys for external services

## 📁 Workflow Files

### Core Workflows
1. **property-enrichment-supabase.json** - Property data enrichment with external APIs
2. **financial-analysis-workflow.json** - Multi-strategy investment analysis  
3. **inspection-report-workflow.json** - Property inspection report generator
4. **auction-scraper-workflow.json** - Scheduled auction data scraper

### Legacy Workflows (for reference)
- property-enrichment-workflow.json (older version)
- tax-deed-enrich-property.json (from n8n-mcp)
- tax-deed-financial-analysis.json (from n8n-mcp)

## 🔧 Configuration Steps

### Step 1: Set Up Supabase Credentials in n8n

1. Open n8n interface (http://localhost:5678)
2. Go to **Settings** → **Credentials**
3. Click **Add Credential** → Search for "Supabase"
4. Configure with your Supabase details:
   ```
   Name: Supabase Tax Deed
   Host: https://[YOUR_PROJECT_ID].supabase.co
   Service Role Key: [YOUR_SERVICE_ROLE_KEY]
   ```
5. Save credentials

### Step 2: Configure Environment Variables

Add these to your n8n environment:
```env
# Google Maps API (for geocoding and imagery)
GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Property Data API (optional - for enrichment)
PROPERTY_DATA_API_KEY=your_property_api_key

# Notification Webhook (optional)
NOTIFICATION_WEBHOOK_URL=https://your-notification-service.com/webhook
```

### Step 3: Import Workflows

1. In n8n, click **Workflows** → **Import from File**
2. Import each workflow file in this order:
   - property-enrichment-supabase.json
   - financial-analysis-workflow.json  
   - inspection-report-workflow.json
   - auction-scraper-workflow.json

3. After importing, each workflow will have a unique webhook ID

### Step 4: Update Frontend Environment Variables

Update your `.env.local` with the new webhook URLs:
```env
# n8n Webhook URLs (update with your actual IDs)
N8N_ENRICHMENT_WEBHOOK=http://localhost:5678/webhook/[ENRICHMENT_ID]/property-enrichment-supabase
N8N_FINANCIAL_WEBHOOK=http://localhost:5678/webhook/[FINANCIAL_ID]/financial-analysis
N8N_INSPECTION_WEBHOOK=http://localhost:5678/webhook/[INSPECTION_ID]/inspection-report
N8N_MAIN_WEBHOOK=http://localhost:5678/webhook/[MAIN_ID]/tax-deed-platform
```

### Step 5: Activate Workflows

1. Open each imported workflow in n8n
2. Click the **Active** toggle to enable it
3. For scheduled workflows (auction-scraper), verify the schedule settings

### Step 6: Configure External APIs

#### Google Maps API
1. Get API key from [Google Cloud Console](https://console.cloud.google.com)
2. Enable these APIs:
   - Geocoding API
   - Maps Static API
3. Add key to n8n environment variables

#### Property Data APIs (Optional)
For production, consider integrating:
- **Datafiniti** - Property data API
- **RentBerry** - Rental estimates
- **Melissa Data** - Address verification
- **CoreLogic** - Property records

## 🧪 Testing Workflows

### Test Property Enrichment
```bash
curl -X POST http://localhost:5678/webhook/[ENRICHMENT_ID]/property-enrichment-supabase \
  -H "Content-Type: application/json" \
  -d '{
    "propertyId": "test-001",
    "parcelNumber": "25-45-22-001",
    "county": "Miami-Dade",
    "state": "FL",
    "address": "123 Main St, Miami, FL 33101"
  }'
```

### Test Financial Analysis
```bash
curl -X POST http://localhost:5678/webhook/[FINANCIAL_ID]/financial-analysis \
  -H "Content-Type: application/json" \
  -d '{
    "propertyId": "test-001",
    "marketValue": 200000,
    "repairCosts": 50000,
    "exitStrategy": "flip"
  }'
```

### Test Inspection Report
```bash
curl -X POST http://localhost:5678/webhook/[INSPECTION_ID]/inspection-report \
  -H "Content-Type: application/json" \
  -d '{
    "propertyId": "test-001",
    "inspectorName": "John Doe",
    "propertyAccess": "full"
  }'
```

### Test Auction Scraper (Manual Run)
1. Open the auction-scraper workflow in n8n
2. Click **Execute Workflow** to run manually
3. Check execution logs for results

## 📊 Workflow Features

### Property Enrichment Workflow
- **Inputs**: Property ID, parcel number, address
- **External APIs**: 
  - Google Geocoding (coordinates)
  - FEMA Flood Maps (flood zone)
  - Property data APIs (details)
- **Outputs**: 
  - Property scoring (0-100)
  - Classification (A/B/C)
  - Valuation estimates
  - Risk factors
- **Database Updates**: 
  - properties table
  - property_valuations table
  - enrichment_logs table

### Financial Analysis Workflow
- **Inputs**: Property ID, market value, repair costs, exit strategy
- **Strategies**: Fix & Flip, BRRRR, Wholesale, Rental
- **Calculations**:
  - ROI and profit projections
  - Optimal bid ranges
  - Sensitivity analysis
- **Database Updates**:
  - financial_analyses table
  - property_valuations table

### Inspection Report Workflow
- **Inputs**: Property ID, inspector name, access level
- **Features**:
  - 28-point inspection checklist
  - Repair cost estimates by category
  - Condition scoring algorithm
  - HTML report generation
- **Database Updates**:
  - inspections table
  - inspection_items table

### Auction Scraper Workflow
- **Schedule**: Every 6 hours
- **Counties**: Miami-Dade, Broward, Palm Beach, Hillsborough, Orange
- **Features**:
  - Auction date extraction
  - Property list parsing
  - Automatic property creation
- **Database Updates**:
  - auctions table
  - properties table
  - scraping_logs table

## 🔍 Monitoring & Troubleshooting

### Check Workflow Executions
1. In n8n, go to **Executions**
2. Filter by workflow name
3. Check for errors or warnings
4. View detailed logs for each node

### Common Issues & Solutions

#### Issue: Supabase Authentication Error
**Solution**: 
- Verify service role key is correct
- Check Supabase project URL
- Ensure RLS policies allow service role access

#### Issue: External API Timeout
**Solution**:
- Increase timeout in HTTP Request nodes
- Implement retry logic
- Check API rate limits

#### Issue: Webhook Not Responding
**Solution**:
- Verify workflow is active
- Check webhook URL is correct
- Ensure n8n is accessible from frontend

#### Issue: Data Not Saving to Database
**Solution**:
- Check column names match schema
- Verify data types are correct
- Look for unique constraint violations

## 🚀 Production Deployment

### Security Considerations
1. **Webhook Authentication**: Add API key validation to webhook nodes
2. **Rate Limiting**: Implement rate limiting for public webhooks
3. **Error Handling**: Add comprehensive error handling to all workflows
4. **Data Validation**: Validate all inputs before processing

### Performance Optimization
1. **Parallel Processing**: Use split nodes for concurrent API calls
2. **Caching**: Implement caching for frequently accessed data
3. **Batch Operations**: Use batch inserts for multiple records
4. **Queue System**: Implement queue for bulk operations

### Scaling Considerations
1. **Worker Instances**: Run multiple n8n workers for high load
2. **Database Pooling**: Configure connection pooling in Supabase
3. **API Rate Limits**: Implement rate limiting and backoff strategies
4. **Monitoring**: Set up monitoring and alerting

## 📈 Metrics & KPIs

Track these metrics to measure workflow performance:
- **Enrichment Success Rate**: % of successful enrichments
- **Average Processing Time**: Time per property enrichment
- **API Error Rate**: % of API calls that fail
- **Data Quality Score**: Completeness of enriched data
- **Cost per Enrichment**: API costs per property

## 🔄 Maintenance Tasks

### Daily
- Check execution logs for errors
- Monitor API usage and limits
- Verify scheduled workflows are running

### Weekly
- Review and optimize slow-running workflows
- Update external API configurations
- Check for new property data sources

### Monthly
- Audit database for data quality
- Review and update scoring algorithms
- Optimize workflow performance
- Update API keys if needed

## 📚 Additional Resources

- [n8n Documentation](https://docs.n8n.io)
- [Supabase Documentation](https://supabase.com/docs)
- [Google Maps API Documentation](https://developers.google.com/maps/documentation)
- [FEMA Flood Map Service](https://hazards.fema.gov/gis/nfhl/rest/services/public/NFHL/MapServer)

## 🆘 Support

For issues or questions:
1. Check n8n execution logs
2. Review Supabase logs
3. Check API response codes
4. Verify environment variables

---

**Last Updated**: 2024-12-25
**Version**: 1.0.0
**Created for**: Tax Deed Platform
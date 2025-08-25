# 📊 Counties Census Business Patterns Enrichment Guide

## Current Status
✅ **Workflow Deployed:** Counties Census Business Patterns Update  
✅ **Workflow ID:** wl8bmfUATyR0jojj  
✅ **API Keys Configured:** Census API and Supabase credentials embedded  

## Step-by-Step Execution Guide

### Step 1: Verify SQL Schema Updates ✅
First, ensure the business columns have been added to your counties table.

**Option A: Run SQL in Supabase Dashboard**
1. Go to: https://supabase.com/dashboard/project/filvghircyrnlhzaeavm/sql/new
2. Copy and paste the SQL from: `scripts/add-counties-business-columns.sql`
3. Click "Run" to execute

**Option B: Verify columns exist**
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'counties' 
AND column_name LIKE 'business_%'
ORDER BY ordinal_position;
```

Expected columns:
- business_establishments (INTEGER)
- business_employees (INTEGER)
- business_payroll_annual (BIGINT)
- census_fips_code (VARCHAR)
- business_data_year (INTEGER)
- business_data_updated (TIMESTAMP)

### Step 2: Execute the Census Workflow

#### Open the Workflow in n8n
1. Open your browser to: http://localhost:5678/workflow/wl8bmfUATyR0jojj
2. You should see the workflow with 10 nodes

#### Test with Single State First (Recommended)
1. **Edit the "Get States from Supabase" node:**
   - Click on the node to open settings
   - In the URL field, change:
     ```
     FROM: /rest/v1/states?is_active=eq.true&select=id,code,name
     TO:   /rest/v1/states?is_active=eq.true&code=eq.FL&select=id,code,name
     ```
   - This will test with just Florida first

2. **Execute the workflow:**
   - Click the "Execute Workflow" button at the bottom
   - Watch as each node processes:
     - Manual Trigger → Get States → Process States → Fetch Census → Process Data → Update Counties

3. **Monitor execution:**
   - Green checkmarks = Success
   - Red X = Error (click node for details)
   - Orange = Currently processing

#### Run for All States
Once Florida test succeeds:
1. Edit "Get States from Supabase" node again
2. Remove the `&code=eq.FL` filter
3. Execute workflow again for all states

### Step 3: Monitor Progress

#### In n8n Interface
- Watch the execution flow
- Check the "Generate Summary" node for final statistics
- Review any error nodes for troubleshooting

#### Expected Processing Time
- Single state (FL): ~30 seconds
- All states: ~3-5 minutes

### Step 4: Verify Data in Supabase

#### Check Updated Counties
```sql
-- View recently updated counties
SELECT 
    name,
    state_code,
    business_establishments,
    business_employees,
    business_payroll_annual,
    census_fips_code,
    business_data_year,
    business_data_updated
FROM counties
WHERE business_data_updated IS NOT NULL
ORDER BY business_data_updated DESC
LIMIT 20;
```

#### Get Statistics
```sql
-- Count enriched counties
SELECT 
    state_code,
    COUNT(*) as total_counties,
    COUNT(business_establishments) as enriched_counties,
    AVG(business_establishments) as avg_establishments,
    AVG(business_employees) as avg_employees
FROM counties
GROUP BY state_code
ORDER BY state_code;
```

#### Sample Florida Counties
```sql
-- Check Florida counties specifically
SELECT 
    name,
    business_establishments,
    business_employees,
    business_payroll_annual
FROM counties
WHERE state_code = 'FL'
AND business_establishments IS NOT NULL
ORDER BY business_establishments DESC
LIMIT 10;
```

## Troubleshooting

### Common Issues

#### 1. "No data returned from Census API"
- Check the Census API is accessible
- Verify the API key: 059814072c853cf2c2c996f264d00b456f04979d
- Try the API directly: https://api.census.gov/data/2023/cbp?get=ESTAB,NAME&for=county:*&in=state:12&key=059814072c853cf2c2c996f264d00b456f04979d

#### 2. "Counties not updating in Supabase"
- Verify the business columns exist (Step 1)
- Check Supabase service role key is correct
- Ensure county names match between Census and your database

#### 3. "Workflow execution fails"
- Check each node's error message
- Verify all environment variables are set
- Check n8n logs for detailed errors

### Manual Census API Test
Test the Census API directly for Florida (FIPS code 12):
```bash
curl "https://api.census.gov/data/2023/cbp?get=ESTAB,EMP,PAYANN,NAME&for=county:*&in=state:12&key=059814072c853cf2c2c996f264d00b456f04979d"
```

## Success Metrics

After successful execution, you should have:
- ✅ All active states' counties enriched with business data
- ✅ Establishment counts for economic analysis
- ✅ Employment figures for market sizing
- ✅ Payroll data for economic indicators
- ✅ Census FIPS codes for future data integrations

## Next Steps

1. **Enable Automatic Updates:**
   - Activate the "Monthly Schedule" trigger node
   - Set to run on the 1st of each month

2. **Use the Data:**
   - Incorporate business metrics into property analysis
   - Filter counties by business activity
   - Identify high-opportunity areas

3. **Additional Enrichment:**
   - Add population data from Census
   - Include demographic information
   - Add economic indicators

## Files Reference

- **Workflow:** http://localhost:5678/workflow/wl8bmfUATyR0jojj
- **SQL Schema:** `scripts/add-counties-business-columns.sql`
- **Deployment Script:** `n8n-mcp/workflow-scripts/deploy-census-workflow.js`
- **Test Script:** `n8n-mcp/workflow-scripts/test-census-workflow.js`

---

Last Updated: 2025-01-25
Census Data Year: 2023
API Key: 059814072c853cf2c2c996f264d00b456f04979d
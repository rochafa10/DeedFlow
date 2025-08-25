# County Business Patterns Enrichment System

## Overview

The County Business Patterns (CBP) Enrichment System automatically enriches the `counties` table with business and economic data from the U.S. Census Bureau. This data provides valuable insights for real estate investment decisions by understanding the economic health and business landscape of different counties.

## 🎯 **What It Does**

### **Data Enrichment**
- Fetches business data from Census Bureau CBP API
- Updates county records with business metrics
- Calculates economic health scores
- Identifies top industries by employment
- Tracks data freshness with timestamps

### **Business Metrics Collected**
- **Business Establishments**: Total number of businesses
- **Employment**: Total number of employees
- **Payroll**: Total annual payroll (in dollars)
- **Industry Diversity**: Top 5 industries by employment
- **Economic Health Score**: Calculated score (0-100)

## 🏗️ **Architecture**

### **Components**
1. **n8n Workflow**: `county-business-patterns-enrichment.json`
2. **Database Migration**: `002_county_business_data.sql`
3. **API Endpoint**: `/api/counties/enrich`
4. **Database Functions**: PostgreSQL functions for data management

### **Data Flow**
```
Census Bureau CBP API → n8n Workflow → Supabase Database → Tax Deed Platform
```

## 📊 **Census Bureau Data Source**

### **API Endpoint**
```
https://api.census.gov/data/2023/cbp
```

### **Data Fields Retrieved**
- `ESTAB`: Number of establishments
- `EMP`: Number of employees
- `PAYANN`: Annual payroll
- `NAICS2017_LABEL`: Industry classification
- `NAME`: County name

### **Example API Call**
```bash
curl "https://api.census.gov/data/2023/cbp?get=ESTAB,EMP,PAYANN,NAICS2017_LABEL,NAME&for=state:06&key=YOUR_API_KEY"
```

## 🚀 **Getting Started**

### **1. Database Setup**
Run the migration to add business data fields:

```sql
-- Run this in Supabase SQL Editor
\i supabase/migrations/002_county_business_data.sql
```

### **2. Environment Configuration**
Add the webhook URL to your `.env.local`:

```bash
N8N_COUNTY_ENRICHMENT_WEBHOOK=http://localhost:5678/webhook/county-enrichment
```

### **3. Deploy n8n Workflow**
Import the workflow into your n8n instance:

```bash
# Copy the workflow file to your n8n workflows directory
cp n8n/workflows/county-business-patterns-enrichment.json /path/to/n8n/workflows/
```

## 🔧 **Usage**

### **Manual Trigger**
```bash
# Enrich all counties
curl -X POST http://localhost:3000/api/counties/enrich \
  -H "Content-Type: application/json" \
  -d '{}'

# Enrich specific state
curl -X POST http://localhost:3000/api/counties/enrich \
  -H "Content-Type: application/json" \
  -d '{"stateCode": "FL"}'

# Force update regardless of last update time
curl -X POST http://localhost:3000/api/counties/enrich \
  -H "Content-Type: application/json" \
  -d '{"stateCode": "TX", "forceUpdate": true}'
```

### **Scheduled Updates**
Set up a cron job or n8n scheduler to run weekly:

```bash
# Weekly update at 2 AM on Sundays
0 2 * * 0 curl -X POST http://localhost:3000/api/counties/enrich
```

## 📈 **Economic Health Scoring**

### **Score Calculation (0-100)**
- **Base Score**: 50 points
- **Industry Diversity**: +20 points (10+ industries), +10 points (5+ industries), +5 points (2+ industries)
- **Employment Density**: +15 points (>50 per 1000), +10 points (>25 per 1000), +5 points (>10 per 1000)
- **Average Salary**: +15 points (>$50k), +10 points (>$35k), +5 points (>$25k)

### **Rating Categories**
- **80-100**: Excellent economic health
- **60-79**: Good economic health
- **40-59**: Fair economic health
- **20-39**: Poor economic health
- **0-19**: Very poor economic health

## 🗄️ **Database Schema**

### **New Fields Added**
```sql
ALTER TABLE counties ADD COLUMN:
- business_establishments INTEGER
- business_employees INTEGER
- business_payroll BIGINT
- top_industries JSONB
- economic_health_score INTEGER
- business_data_updated_at TIMESTAMP WITH TIME ZONE
```

### **Views Created**
- `counties_with_business_data`: Comprehensive county view with business metrics
- `economic_health_rating`: Categorized economic health ratings
- `business_activity_level`: Business activity classifications

### **Functions Created**
- `calculate_economic_health_score()`: Calculate economic health scores
- `update_county_business_data()`: Update county business data
- `get_counties_needing_business_update()`: Find counties needing updates
- `get_state_business_summary()`: Get business summary for a state

## 📊 **Data Examples**

### **Sample County Record**
```json
{
  "id": "uuid",
  "name": "Miami-Dade County",
  "state_code": "FL",
  "business_establishments": 1250,
  "business_employees": 45000,
  "business_payroll": 2250000000,
  "economic_health_score": 85,
  "top_industries": [
    {
      "name": "Accommodation and Food Services",
      "establishments": 450,
      "employees": 18000,
      "payroll": 720000000
    },
    {
      "name": "Professional, Scientific, and Technical Services",
      "establishments": 200,
      "employees": 12000,
      "payroll": 900000000
    }
  ],
  "business_data_updated_at": "2024-12-15T10:30:00Z"
}
```

### **API Response Format**
```json
{
  "status": "success",
  "message": "County enrichment workflow triggered successfully",
  "run_id": "uuid",
  "data": {
    "status": "success",
    "message": "County Business Patterns enrichment completed",
    "summary": {
      "totalStatesProcessed": 5,
      "completionTime": "2024-12-15T10:35:00Z",
      "dataSource": "Census Bureau County Business Patterns 2023"
    }
  }
}
```

## 🔍 **Monitoring & Debugging**

### **Check Update Status**
```sql
-- Counties updated in last 7 days
SELECT name, state_code, business_data_updated_at, economic_health_score
FROM counties 
WHERE business_data_updated_at > NOW() - INTERVAL '7 days'
ORDER BY business_data_updated_at DESC;

-- Counties needing updates
SELECT * FROM get_counties_needing_business_update(30);
```

### **View Business Summary**
```sql
-- Get business summary for Florida
SELECT * FROM get_state_business_summary('FL');

-- View comprehensive county data
SELECT * FROM counties_with_business_data WHERE state_code = 'FL';
```

### **Logs & Errors**
Check n8n execution logs for workflow details and any API errors.

## ⚠️ **Rate Limits & Considerations**

### **Census API Limits**
- **Rate Limit**: 500 requests per day (free tier)
- **Request Size**: Maximum 50 variables per request
- **Data Freshness**: Annual updates (2023 data available in 2024)

### **Best Practices**
- Process states sequentially to avoid overwhelming the API
- Implement exponential backoff for failed requests
- Cache data locally to minimize API calls
- Monitor API usage to stay within limits

## 🚀 **Advanced Features**

### **Industry Analysis**
The system automatically identifies top industries by employment, providing insights into:
- Economic specialization
- Employment opportunities
- Market trends
- Investment potential

### **Economic Health Trends**
Track changes over time to identify:
- Growing vs. declining counties
- Economic development patterns
- Investment timing opportunities

### **Integration with Property Analysis**
Use economic health scores to:
- Prioritize property investments
- Assess market stability
- Calculate risk-adjusted returns
- Identify emerging markets

## 🔧 **Customization**

### **Modify Scoring Algorithm**
Edit the `calculate_economic_health_score()` function to adjust:
- Weight factors for different metrics
- Threshold values for scoring
- Additional economic indicators

### **Add New Data Sources**
Extend the workflow to include:
- Population data
- Income statistics
- Housing market data
- Employment trends

### **Custom Business Sectors**
Modify the `BUSINESS_SECTORS` mapping in the n8n workflow to focus on specific industries relevant to your investment strategy.

## 📚 **Resources**

### **Documentation**
- [Census Bureau CBP API](https://api.census.gov/data/2023/cbp.html)
- [NAICS Industry Codes](https://www.census.gov/naics/)
- [n8n Workflow Documentation](https://docs.n8n.io/)

### **Support**
- Check n8n execution logs for workflow issues
- Verify Census API key and rate limits
- Review database migration logs for schema issues

## 🎯 **Next Steps**

1. **Deploy the workflow** to your n8n instance
2. **Run the database migration** to add business data fields
3. **Test with a single state** to verify functionality
4. **Set up scheduled updates** for regular data refresh
5. **Integrate economic health scores** into your property analysis tools

---

**Last Updated**: December 2024  
**Version**: 1.0.0  
**Status**: Ready for Deployment

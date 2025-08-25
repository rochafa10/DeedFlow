# 🔧 Workflow Configuration & Activation Guide

## 📊 Deployment Status

✅ **Successfully Deployed Workflows:**

| Workflow | ID | Schedule | Status |
|----------|-----|----------|---------|
| Super-Smart Calendar Scraper | ZXqJ5vY39X9FtUhP | Every 2 hours | Ready to activate |
| AI Calendar Scraper Agent | ne9LQGojTtvGMlSH | Every 4 hours | Ready to activate |
| Python-Enhanced Calendar Scraper | pZ1OebVcf4MKwVar | Every 3 hours | Ready to activate |

## 🔑 Step 1: Configure Credentials

### Access n8n Credentials Page
1. Open n8n: http://localhost:5678
2. Navigate to **Credentials** in the left sidebar
3. Click **"+ Add Credential"** button

### Required Credentials

#### 1. OpenAI API (Required)
```
Type: OpenAI
Name: OpenAI
API Key: [Your OpenAI API key starting with sk-...]
Organization ID: (optional)
```

#### 2. Supabase (Required)
```
Type: Supabase
Name: Supabase Tax Deed
URL: https://filvghircyrnlhzaeavm.supabase.co
Service Role Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpbHZnaGlyY3lybmxoemFlYXZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTQ0MzA4NiwiZXhwIjoyMDcxMDE5MDg2fQ.kpbXeIrkCXd_9RLf2HsdYxyPg618NcYdN6N_FOC1qLU
```

#### 3. Anthropic (Optional but Recommended)
```
Type: Anthropic
Name: Anthropic
API Key: [Your Anthropic API key starting with sk-ant-...]
```

#### 4. Tavily Search (Optional)
```
Type: HTTP Request (OAuth2)
Name: Tavily
API Key: [Your Tavily API key starting with tvly-...]
```

## 🔌 Step 2: Connect Credentials to Workflows

### For Each Workflow:

1. **Open the workflow**
   - Go to Workflows → Click on workflow name

2. **Fix credential warnings**
   - Look for nodes with ⚠️ warning icons
   - Click on each node with a warning
   - Select the appropriate credential from dropdown:
     - OpenAI nodes → Select "OpenAI"
     - Supabase nodes → Select "Supabase Tax Deed"
     - Anthropic nodes → Select "Anthropic" (if available)

3. **Save the workflow**
   - Click "Save" button (Ctrl+S)

## ⚡ Step 3: Activate Workflows

### Activation Order (Recommended)

1. **Start with Python-Enhanced** (simplest)
   - Open workflow
   - Toggle "Active" switch in top bar
   - Verify: Should show "Active" status

2. **Then AI Agent**
   - Open workflow
   - Toggle "Active" switch
   - Verify activation

3. **Finally Super-Smart** (most complex)
   - Open workflow
   - Toggle "Active" switch
   - Verify activation

## 🧪 Step 4: Test Each Workflow

### Manual Test Execution

1. **Open workflow in editor**
2. **Click "Execute Workflow" button**
3. **Monitor execution:**
   - Green = Success
   - Red = Error (check node for details)
   - Yellow = Warning

### Expected Test Results

#### Python-Enhanced (3-5 minutes)
- Fetches Miami-Dade calendar
- Extracts auctions using Python
- Saves to Supabase
- Check: `auctions` table should have new entries

#### AI Agent (5-7 minutes)
- AI agent analyzes calendar
- Extracts with multiple tools
- Validates data
- Check: `extraction_logs` shows confidence scores

#### Super-Smart (7-10 minutes)
- Orchestrates all strategies
- Learns patterns
- Updates multiple tables
- Check: `learning_patterns` has new entries

## 📊 Step 5: Verify Data in Supabase

### SQL Queries to Check Results

```sql
-- Check latest auctions
SELECT 
  id,
  case_number,
  sale_date,
  property_address,
  confidence_score,
  created_at
FROM auctions
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 10;

-- Check extraction performance
SELECT 
  county,
  strategy,
  AVG(confidence_score) as avg_confidence,
  COUNT(*) as extraction_count
FROM extraction_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY county, strategy
ORDER BY avg_confidence DESC;

-- Check learning patterns (Super-Smart only)
SELECT 
  pattern_type,
  pattern_data,
  success_count,
  created_at
FROM learning_patterns
ORDER BY created_at DESC
LIMIT 5;

-- Monitor errors
SELECT 
  workflow_name,
  error_message,
  created_at
FROM error_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

## 🐍 Step 6: Configure Python Environment

### Option A: Docker Configuration
Add to your `docker-compose.yml`:
```yaml
services:
  n8n:
    environment:
      - N8N_PYTHON_PACKAGES=beautifulsoup4,pandas,numpy,matplotlib,python-dateutil,PyPDF2,requests
```

### Option B: Local Installation
```bash
pip install beautifulsoup4 pandas numpy matplotlib python-dateutil PyPDF2 requests
```

### Option C: n8n Settings
1. Go to Settings → Community Nodes
2. Add Python packages in settings

## 🔄 Step 7: Schedule Verification

### Check Active Schedules
1. Go to Workflows page
2. Filter by "Active"
3. Verify schedule badges:
   - Super-Smart: "Every 2 hours"
   - AI Agent: "Every 4 hours"
   - Python-Enhanced: "Every 3 hours"

### Next Execution Times
- Schedules start from activation time
- First runs will happen at:
  - Super-Smart: 2 hours after activation
  - AI Agent: 4 hours after activation
  - Python-Enhanced: 3 hours after activation

## 🚨 Troubleshooting

### Common Issues & Solutions

#### "Credential not found"
✅ Solution: Create credential first, then reconnect in workflow

#### "Python package not found"
✅ Solution: Install packages (see Step 6)

#### "Supabase connection failed"
✅ Solution: Verify service role key and URL

#### "OpenAI rate limit"
✅ Solution: Add delay between nodes or upgrade API tier

#### "Workflow not triggering"
✅ Solution: Ensure "Active" toggle is ON

#### Low confidence scores (<0.5)
✅ Solution: Let Super-Smart workflow learn for 24-48 hours

## 📈 Performance Monitoring

### Key Metrics to Track

| Metric | Target | How to Check |
|--------|--------|--------------|
| Extraction Success Rate | >90% | Query extraction_logs |
| Average Confidence | >0.8 | Check confidence_score field |
| Processing Time | <5 min | n8n execution history |
| Error Rate | <5% | Count error_logs entries |
| API Costs | <$0.15/run | OpenAI dashboard |

### Cost Estimates per Run
- Super-Smart: ~$0.12
- AI Agent: ~$0.09
- Python-Enhanced: ~$0.10

### Monthly Cost (All workflows active)
- Super-Smart (12x daily): ~$43/month
- AI Agent (6x daily): ~$16/month
- Python-Enhanced (8x daily): ~$24/month
- **Total: ~$83/month**

## ✅ Configuration Checklist

- [ ] OpenAI credential created
- [ ] Supabase credential created
- [ ] Anthropic credential created (optional)
- [ ] All workflow credentials connected
- [ ] Python packages installed
- [ ] All workflows activated
- [ ] Test execution successful
- [ ] Data appearing in Supabase
- [ ] Schedules verified
- [ ] Monitoring queries saved

## 📞 Quick Commands

### Check Workflow Status
```bash
curl -X GET http://localhost:5678/api/v1/workflows \
  -H "X-N8N-API-KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmMDYwNjYyMC01YmU3LTQ3Y2QtYWE5MS0xZmU3ZmMyMDAzYjciLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU2MTM1MjU1fQ.UQHnMwQbLd_AgP0sm3FwpLrSmUmJ8qsLxpHI9O6uPY4"
```

### Trigger Manual Execution
```bash
curl -X POST http://localhost:5678/api/v1/workflows/ZXqJ5vY39X9FtUhP/execute \
  -H "X-N8N-API-KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmMDYwNjYyMC01YmU3LTQ3Y2QtYWE5MS0xZmU3ZmMyMDAzYjciLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU2MTM1MjU1fQ.UQHnMwQbLd_AgP0sm3FwpLrSmUmJ8qsLxpHI9O6uPY4"
```

---

**Your workflows are deployed and ready for configuration! Follow these steps to get them running.**
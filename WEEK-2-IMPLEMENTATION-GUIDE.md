# 📈 WEEK 2 IMPLEMENTATION GUIDE - Tier 2 Tools
## Add Professional Property Data & Government APIs

**Goal:** Add 5 more tools for professional-grade property analysis

**Time Required:** ~5-7 hours total  
**Additional Cost:** +$120/month (total: ~$210/month)  
**Impact:** Professional data quality, automated property assessment  

---

## 📅 WEEK 2 DAY-BY-DAY PLAN

### **DAY 6: GOOGLE STREET VIEW STATIC API (1.5 hours)**

#### **Why This Tool?**
- Automated property photos (4 angles!)
- Agent 6 uses for condition assessment
- Agent 8 uses for occupancy indicators
- Only $0.007 per image (~$20/month for 3,000 images)

#### **Step-by-Step Setup:**

**STEP 1: Enable in Google Cloud (20 min)**
```
1. Go to: https://console.cloud.google.com/
2. Sign in with Google account
3. Create new project:
   - Name: "Tax Auction System"
   - Click "Create"
4. Enable Street View Static API:
   - Search: "Street View Static API"
   - Click "Enable"
5. Wait for activation (2-3 minutes)
```

**STEP 2: Create API Key (10 min)**
```
1. Go to: APIs & Services → Credentials
2. Click "Create Credentials" → "API Key"
3. Copy your API key
   Format: AIzaSy...
4. Restrict key (IMPORTANT for security):
   - Click "Edit API key"
   - API restrictions → "Restrict key"
   - Select: "Street View Static API"
   - Application restrictions: "None" (for now)
   - Click "Save"
5. Store key in password manager
```

**STEP 3: Set Up Billing (15 min)**
```
1. Go to: Billing → Link billing account
2. Add credit card
3. Note: 
   - First $200/month FREE credit
   - After that: $0.007 per image
   - 3,000 images = ~$21
   - Your $200 credit covers ~28,500 images!
4. Set budget alert:
   - Billing → Budgets & alerts
   - Set alert at $50
```

**STEP 4: Test API (15 min)**
```
Open browser, paste this URL:
https://maps.googleapis.com/maps/api/streetview?size=600x400&location=123+Main+St,Altoona,PA&key=YOUR-API-KEY

Expected: Property photo loads in browser

If yes: ✅ Working!

Now test 4 angles (heading parameter):
- Heading 0° (North): &heading=0
- Heading 90° (East): &heading=90
- Heading 180° (South): &heading=180
- Heading 270° (West): &heading=270

Example:
https://maps.googleapis.com/maps/api/streetview?size=600x400&location=123+Main+St,Altoona,PA&heading=0&key=YOUR-KEY
```

**STEP 5: Integrate with Agent 6 (30 min)**
```
Create helper for Agent 6:

"I have Google Street View API access.
API Key: AIzaSy... (stored securely)

For property at: 123 Main St, Altoona, PA 16601

Generate 4 street view URLs:
- North view (heading=0)
- East view (heading=90)
- South view (heading=180)
- West view (heading=270)

Then analyze each photo for:
- Roof condition
- Exterior condition
- Yard maintenance
- Visible damage
- Occupancy indicators"

Agent should generate URLs and request photos.
You can download or have Claude analyze via vision.
```

**STEP 6: Test with Real Property (20 min)**
```
Pick property from Blair County:
1. Get full address
2. Generate 4 Street View URLs
3. Download all 4 images
4. Ask Agent 6 to analyze:
   "Analyze these 4 Street View photos for property condition"
5. Verify quality of assessment

Success Metric: Automated photo collection + analysis
```

**✅ Day 6 Complete! Automated property photos working.**

**Cost Check:**
- Setup: FREE (first $200/month credit)
- Usage: $0.007 per image
- Expected: ~$0-20/month (within free tier initially)

---

### **DAY 7: ZILLOW BRIDGE API (2 hours)**

#### **Why This Tool?**
- Market comps (comparable sales)
- Zestimate (automated valuation)
- Property details (beds, baths, sqft)
- Listing photos (if available)
- Used by Agents 4, 6, 9, 11

#### **Step-by-Step Setup:**

**STEP 1: Sign Up (20 min)**
```
1. Go to: https://bridgedataoutput.com/
2. Click "Get Started" or "Sign Up"
3. Select plan:
   - Basic: $99/month
   - Includes: 10,000 API calls/month
   - Covers: ~1,000 properties researched
4. Fill out form:
   - Company: [Your business name]
   - Use case: "Real estate investment analysis"
5. Submit application
6. Wait for approval (usually 24-48 hours)
```

**STEP 2: Get API Credentials (10 min)**
```
After approval:
1. Log in to Bridge dashboard
2. Navigate to: API → Credentials
3. Copy your:
   - API Key
   - API Secret
4. Store both securely

Note: You'll use these together for authentication
```

**STEP 3: Test API Connection (20 min)**
```
Using curl or Postman:

curl -X POST https://api.bridgedataoutput.com/api/v2/zestimates_v2/zestimates \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR-API-KEY" \
  -d '{
    "access_token": "YOUR-API-SECRET",
    "address": "123 Main St",
    "city": "Altoona",
    "state": "PA",
    "zipcode": "16601"
  }'

Expected: JSON response with Zestimate data

If yes: ✅ Connected!
```

**STEP 4: Test Comp Search (30 min)**
```
curl -X GET https://api.bridgedataoutput.com/api/v2/OData/actris/Property?\$filter=City%20eq%20'Altoona'%20and%20StandardStatus%20eq%20'Closed'&\$top=10 \
  -H "Authorization: Bearer YOUR-API-KEY"

Expected: Recent sales in Altoona

Test filtering by:
- StandardStatus eq 'Closed' (sold properties)
- CloseDate gt 2024-01-01 (sold after date)
- BedroomsTotal eq 3 (3 bedroom)
- BathroomsTotalInteger eq 2 (2 bath)

Practice building comp queries.
```

**STEP 5: Integrate with Agent 4 (40 min)**
```
Update Agent 4 system prompt:

"You have access to Zillow Bridge API:
API Key: [stored securely]
API Secret: [stored securely]

For property valuation:
1. Get Zestimate for subject property
2. Search comps:
   - Same city
   - Sold in last 6 months
   - Similar beds/baths
   - Within 0.5 miles
   - Similar square footage
3. Calculate average $/sqft
4. Adjust for differences
5. Provide market value estimate"

Test on 3 Blair County properties.
```

**STEP 6: Create Reusable Query Templates (20 min)**
```
Document these query patterns:

1. GET ZESTIMATE:
   POST /zestimates_v2/zestimates
   Body: {address, city, state, zip}

2. GET COMPS (SOLD):
   GET /Property?$filter=
     City eq 'Altoona' and
     StandardStatus eq 'Closed' and
     CloseDate gt 2024-06-01 and
     BedroomsTotal eq 3
   
3. GET ACTIVE LISTINGS:
   GET /Property?$filter=
     City eq 'Altoona' and
     StandardStatus eq 'Active'

Save these for Agent 4, 6, 9, 11 to reference.
```

**✅ Day 7 Complete! Professional market data integrated.**

**Cost Check:**
- Monthly: $99
- Per call: ~$0.01
- 10,000 calls/month included
- Should cover 500-1,000 properties/month

---

### **DAY 8: FIRECRAWL MCP (1 hour)**

#### **Why This Tool?**
- Converts websites to clean markdown
- Better than raw HTML scraping
- Agent 1 uses for county portal data
- $20/month (or FREE 500 credits)

#### **Step-by-Step Setup:**

**STEP 1: Sign Up (10 min)**
```
1. Go to: https://www.firecrawl.dev/
2. Click "Get Started"
3. Sign up with email
4. Verify email
5. Log in to dashboard
6. Free tier: 500 credits/month
   (1 page scrape = 1 credit)
```

**STEP 2: Get API Key (5 min)**
```
1. Dashboard → API Keys
2. Click "Create New Key"
3. Name: "Tax Auction System"
4. Copy key: fc-...
5. Store in password manager
```

**STEP 3: Add to Claude Config (10 min)**
```
Open claude_desktop_config.json

Add to "mcps" section:

{
  "mcps": {
    "perplexity": { ... },
    "browserless": { ... },
    "firecrawl": {
      "command": "npx",
      "args": ["-y", "@mendable/firecrawl-mcp"],
      "env": {
        "FIRECRAWL_API_KEY": "fc-YOUR-KEY-HERE"
      }
    }
  }
}

Save and restart Claude Desktop.
```

**STEP 4: Test Scraping (15 min)**
```
In Claude conversation:

"Use Firecrawl to scrape this website:
https://www.blairco.org/

Extract:
- Contact information
- Department links
- Any tax sale information"

Expected:
- Clean markdown output
- No HTML tags
- Structured text
- Links preserved

Compare to Playwright (messier HTML).
```

**STEP 5: Test with Agent 1 (20 min)**
```
Open Agent 1 project:

"Use Firecrawl to scrape Blair County website:
https://www.blairco.org/

Find:
- Tax Collector office
- Phone number
- Email
- Office hours
- Upcoming tax sale dates"

Agent should:
1. Call Firecrawl
2. Get clean markdown
3. Extract information easily
4. Return structured results

Success: Cleaner, more reliable scraping
```

**✅ Day 8 Complete! Website scraping improved.**

**Cost Check:**
- Free: 500 credits/month
- Paid: $20/month (2,000 credits)
- Expected usage: 100-500 pages/month
- Start with free tier

---

### **DAY 9: GOVERNMENT APIs - ALL FREE! (1.5 hours)**

#### **Why These Tools?**
- FEMA Flood Maps (Agent 7)
- EPA Envirofacts (Agent 7)
- US Fish & Wildlife (Agent 7)
- ALL completely FREE
- No API keys needed!
- Public government data

#### **Part 1: FEMA Flood Map API (30 min)**

**STEP 1: Understand API (10 min)**
```
Endpoint: https://hazards.fema.gov/gis/nfhl/rest/services/public/NFHL/MapServer

Purpose: Determine flood zones for properties

No API key required - public access!

Key flood zones:
- X/C: Minimal risk (good!)
- A/AE: 100-year flood (moderate risk)
- V/VE: Coastal high risk (bad!)
```

**STEP 2: Test Lookup (10 min)**
```
Example query by address:
https://hazards.fema.gov/gis/nfhl/rest/services/public/NFHL/MapServer/28/query?where=1=1&outFields=*&geometry=-78.3947,40.5187&geometryType=esriGeometryPoint&inSR=4326&returnGeometry=false&f=json

This looks up flood zone at coordinates (lat/long).

For Blair County property:
1. Get coordinates from address (use Google Geocoding)
2. Query FEMA API
3. Check FLOOD_ZONE field
4. Assess risk level
```

**STEP 3: Document for Agent 7 (10 min)**
```
Create reference:

FEMA FLOOD LOOKUP PROCESS:
1. Get property coordinates (lat, long)
2. Query: hazards.fema.gov/gis/nfhl/...MapServer/28/query
3. Check FLOOD_ZONE field
4. Risk levels:
   - X, C, B: Low risk ✅
   - A, AE, AO, AH: Moderate risk ⚠️
   - V, VE: High risk 🚨
5. Estimate flood insurance cost:
   - Zone X: $400-700/year
   - Zone A: $1,500-3,000/year
   - Zone V: $5,000-10,000/year

Add to Agent 7 system prompt.
```

#### **Part 2: EPA Envirofacts API (30 min)**

**STEP 1: Understand API (10 min)**
```
Endpoint: https://data.epa.gov/efservice/

Purpose: Find Superfund sites, toxic releases

No API key needed!

Key searches:
- Superfund NPL sites
- TRI (Toxic Release Inventory)
- RCRA (Hazardous waste)
```

**STEP 2: Test Superfund Search (10 min)**
```
Search Superfund sites in Pennsylvania:
https://data.epa.gov/efservice/SEMS_CERCLIS_SITES/STATE_CODE/PA/JSON

Returns all Superfund sites in PA.

For property analysis:
1. Get all PA Superfund sites
2. Calculate distance from property
3. Flag if within 1 mile (CRITICAL!)
4. Reject if ON site

Critical: Properties ON Superfund = unlimited liability!
```

**STEP 3: Document for Agent 7 (10 min)**
```
EPA SUPERFUND CHECK PROCESS:
1. Query all Superfund sites in state
2. Calculate distance from property
3. Risk levels:
   - ON site: REJECT ❌
   - Within 1,000 ft: CRITICAL 🚨
   - Within 1 mile: HIGH ⚠️
   - >1 mile: Minimal ✅
4. Document nearest site
5. Check if site is active/remediated

Add to Agent 7 system prompt.
```

#### **Part 3: US Fish & Wildlife Wetlands API (30 min)**

**STEP 1: Understand API (10 min)**
```
Endpoint: https://www.fws.gov/wetlands/data/web-services.html

Purpose: Identify wetlands on property

No API key needed!

Why this matters:
- Can't build on wetlands
- 75%+ wetlands = unbuildable
- Severe building restrictions
```

**STEP 2: Test Wetlands Lookup (10 min)**
```
Query by coordinates:
https://www.fws.gov/wetlands/Data/Mapper.html

Process:
1. Get property boundary coordinates
2. Query wetlands API
3. Calculate wetlands percentage
4. Assess buildability

Thresholds:
- <25% wetlands: Buildable ✅
- 25-75% wetlands: Restricted ⚠️
- >75% wetlands: Unbuildable 🚨
```

**STEP 3: Document for Agent 7 (10 min)**
```
WETLANDS ASSESSMENT PROCESS:
1. Get property boundaries
2. Query FWS wetlands API
3. Calculate coverage percentage
4. Risk levels:
   - <10%: No impact ✅
   - 10-25%: Minor restrictions
   - 25-50%: Moderate restrictions ⚠️
   - 50-75%: Severe restrictions 🚨
   - >75%: Unbuildable ❌
5. Check local regulations
6. Estimate mitigation costs if needed

Add to Agent 7 system prompt.
```

**✅ Day 9 Complete! All government APIs documented and tested.**

**Cost Check:**
- FEMA: FREE ✅
- EPA: FREE ✅
- Fish & Wildlife: FREE ✅
- Total: $0/month (best price ever!)

---

### **DAY 10: OCR.SPACE API (45 min)**

#### **Why This Tool?**
- Handles scanned PDFs (bad quality)
- Agent 2 uses as backup parser
- FREE tier: 25,000 requests/month!
- $0 cost for our volume

#### **Step-by-Step Setup:**

**STEP 1: Get API Key (10 min)**
```
1. Go to: https://ocr.space/ocrapi
2. Click "Register for Free API key"
3. Fill out form:
   - Email
   - Use case: "Real estate document processing"
4. Verify email
5. Copy API key from email
6. Store in password manager
```

**STEP 2: Test API (15 min)**
```
Using curl:

curl -X POST https://api.ocr.space/parse/image \
  -F "apikey=YOUR-API-KEY" \
  -F "url=URL-TO-PDF-OR-IMAGE" \
  -F "language=eng" \
  -F "isTable=true"

Expected: JSON with extracted text

Test with sample scanned tax sale PDF:
1. Upload to temporary hosting
2. Run OCR.space on it
3. Check text quality
4. Compare to pdfplumber results
```

**STEP 3: Document for Agent 2 (15 min)**
```
Update Agent 2 system prompt:

"PDF PARSING STRATEGY:
1. Try pdfplumber first (clean PDFs)
2. If text is gibberish/missing:
   - PDF is scanned
   - Use OCR.space API
   - Process with OCR
   - Extract text
3. Parse extracted text
4. Structure into properties

OCR.space API:
- Endpoint: api.ocr.space/parse/image
- API Key: [stored securely]
- Free: 25,000 requests/month
- Use for scanned/bad quality PDFs"

Test on 2-3 difficult PDFs.
```

**STEP 4: Test Scanned PDF (15 min)**
```
Find a scanned county tax sale PDF:
1. Try parsing with pdfplumber
2. If text quality is poor:
3. Switch to OCR.space
4. Compare results
5. Verify accuracy

Success: Can handle both clean and scanned PDFs
```

**✅ Day 10 Complete! OCR backup for difficult PDFs.**

**Cost Check:**
- Free tier: 25,000 requests/month
- Paid: $6/month for 60,000
- Expected usage: 50-500/month
- Cost: $0 (within free tier)

---

## 🎯 WEEK 2 SUMMARY

### **What You Added This Week:**

| Tool | Purpose | Agent(s) | Cost | Status |
|------|---------|----------|------|--------|
| ✅ **Google Street View** | Property photos | 6, 8 | $0-20 | LIVE |
| ✅ **Zillow Bridge** | Market data, comps | 4, 6, 9, 11 | $99 | LIVE |
| ✅ **Firecrawl** | Clean web scraping | 1 | $0-20 | LIVE |
| ✅ **FEMA Flood** | Flood zones | 7 | FREE | LIVE |
| ✅ **EPA** | Superfund sites | 7 | FREE | LIVE |
| ✅ **Fish & Wildlife** | Wetlands | 7 | FREE | LIVE |
| ✅ **OCR.space** | Scanned PDFs | 2 | FREE | LIVE |

**New Tools Live: 7**  
**Total Tools Live: 15 of 28 (54%)**

---

## 💰 WEEK 2 COST SUMMARY

### **New Monthly Costs:**
```
Google Street View:   $0-20/month (within $200 free credit)
Zillow Bridge:        $99/month
Firecrawl:            $0-20/month (within free tier)
FEMA:                 FREE
EPA:                  FREE
Fish & Wildlife:      FREE
OCR.space:            FREE

Week 2 Additional: ~$99-139/month
```

### **Total System Costs (Week 1 + 2):**
```
WEEK 1 TOOLS:
Perplexity:          $20
Browserless:         $50
PACER:               ~$15 (usage)
Telegram:            FREE
Brave:               FREE

WEEK 2 TOOLS:
Street View:         ~$10 (usage)
Zillow Bridge:       $99
Firecrawl:           FREE tier
Gov APIs:            FREE
OCR.space:           FREE

TOTAL: ~$194/month
```

---

## 📊 SYSTEM TRANSFORMATION

### **After 2 Weeks:**

**Tools Operational:** 15 of 28 (54%)

**Capabilities Added:**
- ✅ Automated property photos (4 angles)
- ✅ Professional market comps
- ✅ Automated valuations (Zestimate)
- ✅ Flood zone determination
- ✅ Superfund site detection
- ✅ Wetlands assessment
- ✅ Scanned PDF processing
- ✅ Clean website scraping

**Agents Enhanced:**
- Agent 1: Better county research (Firecrawl)
- Agent 2: Handles scanned PDFs (OCR)
- Agent 4: Professional valuations (Zillow)
- Agent 6: Automated condition assessment (Street View)
- Agent 7: Complete environmental risk (Gov APIs)
- Agent 8: Visual occupancy indicators (Street View)
- Agent 9: Better comps for bid strategy (Zillow)
- Agent 11: Market data for pricing (Zillow)

---

## 🎯 BEFORE & AFTER

| Capability | Before Week 2 | After Week 2 |
|------------|---------------|--------------|
| **Property Photos** | Manual Google search | Automated 4-angle capture |
| **Market Comps** | Manual Zillow search | API-driven comp analysis |
| **Valuations** | Guess or manual research | Professional Zestimate |
| **Flood Risk** | Manual FEMA lookup | Automated API check |
| **Environmental** | Manual EPA search | Comprehensive auto-scan |
| **Scanned PDFs** | Often failed | OCR backup working |
| **Web Scraping** | Messy HTML | Clean markdown |

**Data Quality: Professional-grade! 📈**

---

## 🚀 NEXT STEPS (WEEK 3+)

### **Optional Premium Tools:**

**High Volume Phase (20+ properties/month):**
- Attom Data API ($100-500/month)
  - Better AVMs than Zillow
  - More property characteristics
  - Historical sales data

**Occupancy Issues Frequent:**
- Public Records APIs ($99-299/month)
  - Whitepages Pro
  - PeopleDataLabs
  - Better occupant identification

**Team Collaboration:**
- Notion API ($10/month)
  - Visual project boards
  - Team task management
  - Better than Supabase for non-technical users

**Tax Season:**
- QuickBooks API ($30/month)
  - Professional accounting
  - Tax preparation
  - P&L tracking

**High Volume Selling:**
- Zillow ListHub API ($300/month)
  - MLS-alternative listing distribution
  - Broader market reach
  - Faster sales

---

## 📋 WEEK 2 CHECKLIST

### **Day 6: Google Street View**
- [ ] Enable in Google Cloud Console
- [ ] Create and restrict API key
- [ ] Set up billing with budget alert
- [ ] Test 4-angle photo capture
- [ ] Integrate with Agent 6
- [ ] Test on real property

### **Day 7: Zillow Bridge**
- [ ] Sign up at bridgedataoutput.com
- [ ] Wait for approval (24-48hr)
- [ ] Get API credentials
- [ ] Test Zestimate endpoint
- [ ] Test comp search
- [ ] Create query templates
- [ ] Test with Agent 4

### **Day 8: Firecrawl**
- [ ] Sign up at firecrawl.dev
- [ ] Get API key
- [ ] Add to claude_desktop_config.json
- [ ] Restart Claude
- [ ] Test website scraping
- [ ] Compare to Playwright
- [ ] Test with Agent 1

### **Day 9: Government APIs**
- [ ] Test FEMA Flood API
- [ ] Document flood zone process
- [ ] Test EPA Superfund API
- [ ] Document Superfund check
- [ ] Test Fish & Wildlife API
- [ ] Document wetlands process
- [ ] Update Agent 7 prompt

### **Day 10: OCR.space**
- [ ] Get free API key
- [ ] Test with scanned PDF
- [ ] Compare to pdfplumber
- [ ] Document fallback process
- [ ] Update Agent 2 prompt
- [ ] Test on difficult PDFs

### **Week 2 Review:**
- [ ] All 7 new tools working
- [ ] Tested with relevant agents
- [ ] Total tools: 15 of 28 (54%)
- [ ] Cost tracking: ~$194/month
- [ ] ROI still massive (>1000x)
- [ ] System now professional-grade

---

## 🎉 CONGRATULATIONS!

**After Week 2, you have:**
- ✅ 15 tools operational (54% complete)
- ✅ Professional property data (Zillow)
- ✅ Automated photo collection (Street View)
- ✅ Complete environmental assessment (Gov APIs)
- ✅ Bulletproof PDF parsing (OCR backup)
- ✅ Clean web scraping (Firecrawl)
- ✅ Total cost: ~$194/month
- ✅ ROI: Still massive (>1000x)

**Your system is now competitive with institutional investors!** 🏆

---

## 💡 KEY INSIGHTS FROM WEEK 2

### **What We Learned:**

1. **Government APIs are GOLD** - Free, reliable, critical data
2. **Zillow Bridge is worth it** - $99/month saves hours per property
3. **Street View transforms assessment** - See properties remotely
4. **OCR is essential backup** - Many counties have scanned PDFs
5. **Firecrawl > Raw HTML** - Cleaner, easier to parse
6. **Free tier strategy works** - Most tools have generous free tiers
7. **$200/month = professional** - Competitive with institutions
8. **ROI still insane** - Tools pay for themselves 100x over

### **Common Pitfalls Avoided:**

❌ **Don't skip FEMA checks** - Flood insurance kills ROI  
❌ **Don't ignore Superfund** - Unlimited liability = disaster  
❌ **Don't skip wetlands** - 75%+ = unbuildable  
❌ **Don't rely on Zestimate alone** - Use as starting point only  
❌ **Don't forget OCR backup** - Many PDFs are scanned  

### **Pro Tips:**

✅ Use free tier for testing, upgrade when needed  
✅ Government APIs = free professional data  
✅ Street View historical views show property over time  
✅ Zillow comps need manual verification  
✅ Always check multiple data sources  

---

**Week 3 is optional - you now have a professional-grade system!** 🚀

**Ready to process Blair County and start bidding!** 💰

---

*Save this guide alongside Week 1 guide*  
*Follow day-by-day for best results*  
*System is now 54% complete and production-ready!*

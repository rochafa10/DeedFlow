# 🚀 QUICK START GUIDE - Priority 1 Tools
## Get Your First 5 Critical Tools Working in 1 Week

**Goal:** Transform your system from "documented" to "operational" with the 5 most critical tools.

**Time Required:** ~4-6 hours total (spread over 1 week)  
**Cost:** ~$90/month  
**Impact:** 10x more powerful system  

---

## 📅 DAY-BY-DAY IMPLEMENTATION PLAN

### **DAY 1: PERPLEXITY AI MCP (1 hour)**

#### **Why This First?**
- Used by ALL agents for better research
- Most immediate impact on quality
- Easy to setup
- Only $20/month

#### **Step-by-Step Setup:**

**STEP 1: Get API Key (10 min)**
```
1. Go to: https://www.perplexity.ai/
2. Sign up or log in
3. Click your profile → Settings
4. Navigate to "API" section
5. Click "Generate New Key"
6. Copy key: starts with "pplx-"
7. Save to password manager
```

**STEP 2: Add to Claude Config (5 min)**
```
1. Locate your claude_desktop_config.json:
   Windows: %APPDATA%\Claude\claude_desktop_config.json
   Mac: ~/Library/Application Support/Claude/claude_desktop_config.json

2. Open in text editor (Notepad++ or VSCode)

3. Add this to the "mcps" section:

{
  "mcps": {
    "perplexity": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-perplexity"],
      "env": {
        "PERPLEXITY_API_KEY": "pplx-YOUR-KEY-HERE"
      }
    }
  }
}

4. Replace "pplx-YOUR-KEY-HERE" with your actual key
5. Save file
```

**STEP 3: Restart Claude (1 min)**
```
1. Close Claude Desktop completely
2. Reopen Claude Desktop
3. Wait for it to load
```

**STEP 4: Test It (5 min)**
```
1. Open any Claude conversation
2. Send message:
   "Use Perplexity to search: 'Blair County Pennsylvania tax sale 2025'"

3. Expected result:
   - Claude calls Perplexity tool
   - Returns results with citations
   - Sources are clickable

4. If it works: ✅ Success!
5. If not: Check your API key is correct
```

**STEP 5: Test with Agent 1 (30 min)**
```
1. Open Agent 1 Claude Project (County Research)
2. Send message:
   "Research Blair County, PA tax sale information:
   - Find official county website
   - Find auction date
   - Find tax sale list"

3. Agent should use Perplexity automatically
4. Verify quality of results vs generic search
5. Note the citations provided

Success Metric: Better, cited research results
```

**✅ Day 1 Complete! Perplexity working across all agents.**

---

### **DAY 2: TELEGRAM BOT (1 hour)**

#### **Why This Next?**
- FREE (no cost!)
- Real-time mobile alerts
- Used by Agents 10 & 11
- Critical for auction monitoring

#### **Step-by-Step Setup:**

**STEP 1: Create Bot (10 min)**
```
1. Open Telegram app on phone/desktop
2. Search for: @BotFather
3. Start chat, send: /newbot
4. Bot asks "What's your bot name?"
   Type: Tax Auction Alerts
5. Bot asks "What's the username?"
   Type: [yourname]_tax_auction_bot
   (must end in 'bot')
6. BotFather responds with:
   - Bot Token: 1234567890:ABCdef-GHIjklMNOpqrs
   - Copy and save this!
```

**STEP 2: Get Your Chat ID (10 min)**
```
1. Send a message to your new bot
   Type: "Hello bot!"

2. Open browser, paste this URL:
   https://api.telegram.org/bot[YOUR-BOT-TOKEN]/getUpdates
   
   Replace [YOUR-BOT-TOKEN] with your actual token

3. Look for "chat":{"id": 1234567890
   This is YOUR_CHAT_ID
   
4. Copy and save your Chat ID
```

**STEP 3: Test Bot (5 min)**
```
In browser, paste this URL:
https://api.telegram.org/bot[BOT-TOKEN]/sendMessage?chat_id=[YOUR-CHAT-ID]&text=Test

You should receive "Test" message in Telegram!

If yes: ✅ Bot working!
If no: Check token and chat ID
```

**STEP 4: Add to Agent Prompts (20 min)**
```
Update Agent 10 and Agent 11 system prompts:

Replace:
  telegram_chat_id: YOUR_CHAT_ID

With:
  telegram_chat_id: 8433872534  // Your actual chat ID

Store bot token securely in password manager for later use.
```

**STEP 5: Create Test Alert (15 min)**
```
In Claude with Supabase access:

"Send me a test Telegram alert:
 Bot Token: [your token]
 Chat ID: [your chat ID]
 Message: '🎉 Tax Auction System Alert Test'"

Expected: Message appears on your phone!

Success Metric: Receiving alerts on mobile
```

**✅ Day 2 Complete! Telegram alerts ready for Agents 10 & 11.**

---

### **DAY 3: PACER API (2 hours)**

#### **Why This Is CRITICAL?**
- Detects IRS liens (survive tax sales!)
- Missing this = $50K+ potential loss
- Agent 5 depends on it
- Only $0.10 per page

#### **Step-by-Step Setup:**

**STEP 1: Register Account (20 min)**
```
1. Go to: https://pacer.uscourts.gov/
2. Click "Register for an Account"
3. Fill out form:
   - Name
   - Address  
   - Email
   - Phone
4. Verify email
5. Log in to account
```

**STEP 2: Link Payment Method (10 min)**
```
1. Log in to PACER
2. Go to: Manage Account → Payment
3. Link credit card or bank account
4. Billing: $0.10 per page
5. No monthly fee!
6. First $30 per quarter is FREE
```

**STEP 3: Learn Search Interface (30 min)**
```
Practice searches:

1. Go to: pcl.uscourts.gov
2. Click "Party Name Search"
3. Try searching:
   - "Smith, John" (common name)
   - Look at results format
   - Note case numbers
   - Check plaintiffs

4. Look for IRS indicators:
   - Plaintiff: "United States of America"
   - Keywords: "IRS", "Internal Revenue", "26 USC"
   - Case type: "Tax Lien"
```

**STEP 4: Test Real Search (30 min)**
```
Pick a property from Blair County list:
1. Get owner name from property data
2. Search in PACER by name
3. Check for IRS as plaintiff
4. Document cost (usually $0.10-0.50 per search)
5. Practice workflow
```

**STEP 5: Document Workflow (30 min)**
```
Create checklist for Agent 5:

IRS LIEN CHECK PROCESS:
□ Get property owner name
□ Go to pcl.uscourts.gov
□ Search party name
□ Look for "United States of America" plaintiff
□ Keywords: "IRS", "tax lien", "26 USC"
□ If found → REJECT property immediately
□ Document search in Supabase
□ Cost: ~$0.10-0.50 per property

Test on 5 properties to get comfortable.

Success Metric: Can detect IRS liens confidently
```

**✅ Day 3 Complete! PACER working - IRS lien protection active.**

---

### **DAY 4: BROWSERLESS MCP (1.5 hours)**

#### **Why This Matters?**
- Scalable automation for Agent 3 & 10
- Can monitor 50+ auctions simultaneously
- Better than local Playwright for production
- $50/month (or 6hr free to test)

#### **Step-by-Step Setup:**

**STEP 1: Sign Up (10 min)**
```
1. Go to: https://www.browserless.io/
2. Click "Start Free Trial" (6 hours free)
3. Sign up with email
4. Verify email
5. Log in to dashboard
```

**STEP 2: Get API Key (5 min)**
```
1. In dashboard: Navigate to "API"
2. Copy your API key
   Format: bl-abc123def456...
3. Save to password manager
4. Note: Free trial = 6 hours
   Paid = Unlimited for $50/mo
```

**STEP 3: Add to Claude Config (10 min)**
```
Open claude_desktop_config.json

Add to "mcps" section:

{
  "mcps": {
    "perplexity": { ... existing ... },
    "browserless": {
      "command": "npx",
      "args": ["@browserless/mcp"],
      "env": {
        "BROWSERLESS_API_KEY": "bl-YOUR-KEY-HERE"
      }
    }
  }
}

Save and restart Claude Desktop.
```

**STEP 4: Test Basic Navigation (30 min)**
```
In Claude conversation:

"Use Browserless to:
1. Navigate to regrid.com
2. Search for address: 123 Main St, Blair County, PA
3. Capture screenshot
4. Return property info"

Expected:
- Browserless connects
- Navigates to Regrid
- Returns results
- Screenshots captured

If it works: ✅ Success!
```

**STEP 5: Test with Agent 3 (30 min)**
```
1. Open Agent 3 Claude Project (Regrid Scraper)
2. Give it a property from Blair County
3. Ask it to use Browserless to scrape Regrid
4. Verify data quality
5. Check it's faster/more reliable than Playwright

Success Metric: Automated Regrid scraping working
```

**✅ Day 4 Complete! Browserless enabling scalable automation.**

---

### **DAY 5: BRAVE SEARCH API (45 min)**

#### **Why This Helps?**
- FREE (2,000 searches/month!)
- Better than generic search
- Backup to Perplexity
- Used by Agents 1, 5, 7, 8, 9

#### **Step-by-Step Setup:**

**STEP 1: Get API Key (10 min)**
```
1. Go to: https://brave.com/search/api/
2. Click "Get Started"
3. Sign up / Log in
4. Navigate to Dashboard
5. Click "Create API Key"
6. Name it: "Tax Auction System"
7. Copy key (starts with BSA...)
8. Save to password manager
```

**STEP 2: Test API Directly (10 min)**
```
Open browser, paste this URL:
https://api.search.brave.com/res/v1/web/search?q=Blair+County+tax+sale&count=10

Add header:
X-Subscription-Token: [YOUR-KEY]

Or use curl:
curl -H "X-Subscription-Token: YOUR-KEY" \
  "https://api.search.brave.com/res/v1/web/search?q=Blair+County+tax+sale"

Expected: JSON results with web pages

Success: ✅ API working
```

**STEP 3: Add to Claude (15 min)**
```
Note: Brave Search doesn't have an official MCP yet,
but we documented how agents should use it.

For now, agents can call it via the web_search tool
or by having you (the user) make the API call.

Alternative: Use Perplexity (already setup) as primary,
Brave as backup when needed.

Document in agent notes:
"Brave Search available at api.search.brave.com
API Key: [stored securely]
Usage: Backup to Perplexity, 2000 free/month"
```

**STEP 4: Test with Agent 1 (10 min)**
```
In Agent 1 conversation:

"I have Brave Search API available.
Here's how to use it: [paste curl example]

Now search for:
- Blair County PA tax collector office
- Contact information
- Website URL"

Agent may request you run the curl command,
or may try to use web_search tool.

Either way: Verify results quality.
```

**✅ Day 5 Complete! Brave Search as free backup.**

---

## 🎯 WEEK 1 SUMMARY

### **What You Now Have Working:**

| Tool | Status | Impact |
|------|--------|--------|
| ✅ **Perplexity AI** | LIVE | 10x better research, all agents |
| ✅ **Telegram Bot** | LIVE | Mobile alerts, Agents 10-11 |
| ✅ **PACER** | LIVE | IRS lien detection, Agent 5 |
| ✅ **Browserless** | LIVE | Scalable automation, Agents 3 & 10 |
| ✅ **Brave Search** | LIVE | Free search backup, multiple agents |

### **Plus Previously Working:**
- ✅ Supabase MCP (database)
- ✅ Playwright MCP (browser automation)
- ✅ Regrid scraping (via Playwright/Browserless)

**Total Tools Live: 8 of 28 (29%)**

---

## 💰 COST CHECK

### **Week 1 Monthly Costs:**
```
Perplexity AI:     $20/month
Browserless:       $50/month (after 6hr free trial)
Telegram:          FREE
PACER:             ~$10-20/month (usage-based)
Brave Search:      FREE

TOTAL: ~$80-90/month
```

### **ROI Check:**
```
Monthly cost: $90
Expected benefit: 
  - Prevent ONE $50K IRS lien loss = 555x ROI
  - Better research = More good deals found
  - Automated monitoring = Save 20+ hours/month
  
Actual ROI: MASSIVE
```

---

## 📊 BEFORE & AFTER

### **BEFORE (Day 0):**
- 3 tools working (Supabase, Playwright, Regrid)
- Manual research
- No IRS lien detection
- No mobile alerts
- Limited scalability

### **AFTER (Day 5):**
- 8 tools working
- AI-enhanced research (Perplexity)
- IRS lien protection (PACER) ← CRITICAL!
- Mobile alerts (Telegram)
- Scalable automation (Browserless)
- Free search backup (Brave)

**System Power: 10x improvement! 🚀**

---

## 🎯 NEXT STEPS (WEEK 2)

### **Priority 2 Tools to Add:**

**Day 6: Google Street View API**
- Automated property photos
- 4 angles per property
- ~$20/month usage

**Day 7: Zillow Bridge API**
- Market comps
- Zestimate data
- Property details
- $99/month

**Day 8: Firecrawl**
- Better county portal scraping
- Clean markdown output
- $20/month

**Day 9: Government APIs (Free!)**
- FEMA Flood Maps
- EPA Envirofacts
- US Fish & Wildlife
- All FREE, no keys needed

**Day 10: OCR.space**
- Scanned PDF processing
- FREE tier available
- Backup for Agent 2

---

## 🔧 TROUBLESHOOTING

### **Common Issues:**

**Issue 1: "Tool not found after restart"**
```
Solution:
1. Check claude_desktop_config.json syntax
2. Ensure no trailing commas
3. Verify API key format
4. Restart Claude again
5. Check MCP installation with: npx -y @package/name
```

**Issue 2: "API key invalid"**
```
Solution:
1. Log back into service
2. Regenerate API key
3. Copy fresh key
4. Update config
5. Restart Claude
```

**Issue 3: "Perplexity not being called"**
```
Solution:
1. Explicitly request: "Use Perplexity to search..."
2. Check agent prompt mentions tool
3. Verify tool is available with "What tools do you have?"
```

**Issue 4: "Browserless connection failed"**
```
Solution:
1. Check free trial hours remaining
2. Upgrade to paid if expired
3. Verify API key is correct
4. Try Playwright as backup
```

---

## 📋 WEEK 1 CHECKLIST

### **Day 1: Perplexity**
- [ ] Get API key from perplexity.ai
- [ ] Add to claude_desktop_config.json
- [ ] Restart Claude Desktop
- [ ] Test with simple search
- [ ] Test with Agent 1
- [ ] Verify citations working

### **Day 2: Telegram**
- [ ] Create bot with @BotFather
- [ ] Get bot token
- [ ] Get your chat ID
- [ ] Test with sendMessage API
- [ ] Update agent prompts with chat ID
- [ ] Send test alert

### **Day 3: PACER**
- [ ] Register at pacer.uscourts.gov
- [ ] Link payment method
- [ ] Practice party name searches
- [ ] Look for IRS indicators
- [ ] Test on 5 properties
- [ ] Document workflow

### **Day 4: Browserless**
- [ ] Sign up at browserless.io
- [ ] Get API key (6hr free trial)
- [ ] Add to claude_desktop_config.json
- [ ] Restart Claude Desktop
- [ ] Test basic navigation
- [ ] Test with Agent 3 (Regrid)

### **Day 5: Brave Search**
- [ ] Get API key from brave.com/search/api
- [ ] Test API with curl
- [ ] Document for agent use
- [ ] Test with Agent 1
- [ ] Note as backup to Perplexity

### **Week 1 Review:**
- [ ] All 5 tools working
- [ ] Tested with relevant agents
- [ ] Documented any issues
- [ ] Track costs vs budget
- [ ] Plan Week 2 tools

---

## 🎉 CONGRATULATIONS!

**After Week 1, you have:**
- ✅ 8 tools operational (vs 3 before)
- ✅ IRS lien detection (CRITICAL!)
- ✅ Mobile alerts (real-time)
- ✅ Better research (Perplexity)
- ✅ Scalable automation (Browserless)
- ✅ System 10x more powerful

**Ready for Week 2 to add professional property data!** 🚀

---

*Save this guide and follow day-by-day!*  
*Estimated time: 4-6 hours total over 1 week*  
*Difficulty: Easy (step-by-step instructions)*  
*Impact: Transform system from "documented" to "operational"*

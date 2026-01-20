# 🎯 TAX DEED SYSTEM - QUICK REFERENCE CARD

**Print this and keep it handy!**

---

## 🔑 ESSENTIAL API KEYS TO GET

### **TIER 1: Required ($90/month)**
| Service | URL | Cost | Get Key |
|---------|-----|------|---------|
| Perplexity AI | perplexity.ai | $20/mo | Settings → API → Generate |
| Brave Search | brave.com/search/api | FREE | Sign up → API Keys |
| Browserless | browserless.io | $50/mo | Dashboard → API Key |
| Firecrawl | firecrawl.dev | $20/mo | Dashboard → API Keys |
| PACER | pacer.uscourts.gov | $0.10/pg | Register → Link Card |

### **TIER 2: Recommended ($100/month)**
| Service | URL | Cost | Get Key |
|---------|-----|------|---------|
| Google Cloud (Street View) | console.cloud.google.com | $7/1K | APIs → Street View Static |
| Bing Maps | bingmapsportal.com | FREE | My Account → Keys |
| Zillow Bridge | bridgedataoutput.com | $99/mo | Sign Up → API Access |
| OCR.space | ocr.space | FREE | Register → API Key |

---

## 📱 TELEGRAM BOT SETUP

1. Open Telegram → Search **@BotFather**
2. Send `/newbot`
3. Name: "Tax Auction Alerts"
4. Username: "[yourname]_tax_bot"
5. Copy **Bot Token**: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`
6. Get **Chat ID**:
   - Message your bot
   - Visit: `https://api.telegram.org/bot[TOKEN]/getUpdates`
   - Find your "chat":{"id": **YOUR_CHAT_ID**}

---

## 🗄️ SUPABASE CONNECTION

**Already setup, but here's the info:**

- **URL**: `https://your-project.supabase.co`
- **Service Role Key**: (in your Supabase dashboard)
- **Location**: Settings → API → Project API keys → service_role

---

## 🧰 AGENT-TOOL MAPPING

| Agent | Primary Tools | Must-Have |
|-------|---------------|-----------|
| **1: County Research** | Perplexity, Brave, Firecrawl, Playwright | Perplexity ✅ |
| **2: PDF Parser** | Python/pdfplumber, OCR.space | OCR.space (if scanned) |
| **3: Regrid Scraper** | Playwright OR Browserless | Either ✅ |
| **4: Property Eval** | Zillow Bridge, Playwright | Zillow (or manual) |
| **5: Title Research** | **PACER**, Perplexity, Playwright | **PACER ✅✅✅** |
| **6: Property Condition** | Google Street View, Bing Maps, Zillow | Street View ✅ |
| **7: Environmental** | FEMA, EPA, US F&W (all free!) | All free APIs ✅ |
| **8: Occupancy** | Street View, Public Records | Street View ✅ |
| **9: Bid Strategy** | Zillow, Supabase history | Supabase ✅ |
| **10: Auction Monitor** | Browserless, Telegram Bot | Both ✅ |
| **11: Post-Sale** | Supabase, Telegram, Notion (opt) | Telegram ✅ |

---

## 🎯 CRITICAL WORKFLOWS

### **AGENT 5: IRS LIEN CHECK (NEVER SKIP!)**
```
1. Go to pacer.uscourts.gov
2. Search party name: "[Property Owner]"
3. Look for: "United States of America" as plaintiff
4. Keywords: "IRS", "tax lien", "26 USC"
5. If found → REJECT PROPERTY IMMEDIATELY
   (IRS liens survive tax sales = you inherit debt!)
```

### **AGENT 10: BID EXECUTION (Bid4Assets)**
```
1. Start monitoring: T-30 minutes
2. First bid: T-2:00 (2 minutes before close)
3. If outbid: Re-bid within 30 seconds
4. Soft close: Extends 5 min per bid
5. NEVER exceed maximum bid!
```

### **AGENT 11: WIRE INSTRUCTIONS**
```
1. Receive wire instructions via email
2. ⚠️ CALL platform directly (use website number)
3. Verify ALL details by phone
4. Do NOT call number from email
5. Wire fraud is EXTREMELY common!
```

---

## 💰 COST REFERENCE

### **API Costs:**
| What | Cost | When Charged |
|------|------|--------------|
| Perplexity | $20/mo | Monthly |
| Brave Search | FREE | - |
| Browserless | $50/mo | Monthly |
| Firecrawl | $20/mo | Monthly |
| Street View | $0.007/image | Per request |
| PACER | $0.10/page | Per search |
| Zillow Bridge | $99/mo | Monthly |

### **Property Costs:**
| What | Typical Cost |
|------|--------------|
| Tax owed | $5K-$30K |
| Your bid | 30-80% of value |
| Buyer premium | 5-10% |
| Title insurance | $500-2K |
| Repairs | $20K-80K |

---

## 📊 KEY METRICS TO TRACK

### **Processing:**
- Properties researched: Target 5,000/month
- Properties approved: Target 500/month (10%)
- Bids placed: Target 50/month
- **Wins: Target 15-20/month (30-40% win rate)**

### **Financial:**
- **Target ROI: 50%+**
- Average profit: $40-50K per property
- Monthly profit: $600K-1M (15-20 wins)
- Tool costs: <0.1% of revenue

### **Red Flags:**
- Win rate >50% = Bidding too high!
- Win rate <20% = Bidding too low!
- ROI variance >15% = Reassess projections

---

## 🚨 DEAL KILLERS (Auto-Reject)

| Issue | Why | Agent |
|-------|-----|-------|
| **IRS Tax Lien** | Survives tax sale = You pay it | 5 |
| **EPA Superfund (on-site)** | Unlimited liability | 7 |
| **Flood Zone V/VE** | $5K/year insurance | 7 |
| **75%+ Wetlands** | Unbuildable | 7 |
| **Gas Station History** | $50K-500K cleanup | 7 |
| **Dry Cleaner History** | $100K-1M+ cleanup | 7 |
| **Title Score <50** | Unsellable | 5 |

---

## 📞 EMERGENCY CONTACTS

### **Platform Support:**
- Bid4Assets: (877) 427-7387
- RealAuction: (888) 744-6333
- Auction.com: (800) 793-6107

### **Government:**
- PACER Help: (800) 676-6856
- FEMA Flood: (877) 336-2627
- EPA Hotline: (800) 424-9346

### **Services:**
- Title Company: [Your local]
- Attorney: [Your local]
- General Contractor: [Your local]

---

## ✅ DAILY CHECKLIST

### **Morning:**
- [ ] Check Telegram for alerts
- [ ] Review Supabase for new properties
- [ ] Check upcoming auctions (Agent 10)
- [ ] Follow up on open bids

### **During Auctions:**
- [ ] Monitor active auctions
- [ ] Execute bid strategies
- [ ] Record results
- [ ] Update Supabase

### **Evening:**
- [ ] Review daily performance
- [ ] Update financial tracking
- [ ] Plan next day activities
- [ ] Respond to showing requests

---

## 🎓 LEARNING RESOURCES

### **Tax Sale Education:**
- Book: "Profit by Investing in Real Estate Tax Liens" - Larry Loftis
- YouTube: "Tax Sale Resources" channel
- Website: taxsaleresources.com

### **n8n Automation:**
- Docs: docs.n8n.io
- Community: community.n8n.io

### **Claude & MCPs:**
- Docs: docs.claude.ai
- MCPs: modelcontextprotocol.io

---

## 💡 PRO TIPS

1. **Always search PACER** - $0.10 prevents $50K loss
2. **Verify wire by phone** - Trust nobody on email
3. **Never exceed max bid** - Emotion kills ROI
4. **Win 30-40% of bids** - Not 100%!
5. **Budget 20% contingency** - Things always cost more
6. **Price to sell fast** - Better than holding
7. **Document everything** - For taxes and learning
8. **Track actual ROI** - Improve projections
9. **Start small** - Test system before scaling
10. **Be patient** - Good deals come to those who wait

---

## 🏆 SUCCESS FORMULA

```
Great Deal = 
  Low Purchase Price +
  Accurate Repair Estimate +
  No Hidden Liens +
  No Environmental Issues +
  Fast Sale +
  Disciplined Execution

Tools help you find these deals 1000x faster!
```

---

## 📱 SAVE THESE NUMBERS

**Your Info:**
- Bot Token: _________________
- Telegram Chat ID: _________________
- Supabase URL: _________________
- Perplexity Key: _________________

**Quick Actions:**
- Emergency Stop Bid: [Create workflow]
- Check Property Status: [Supabase query]
- Alert Phone: [Your cell]

---

**Print this card and keep it visible during work sessions!**

*Version 2.0 - Enhanced Edition - January 2026*

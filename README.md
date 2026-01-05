# 🤖 Autonomous Tax Auction Research Agent

## Overview

A fully autonomous AI agent for Claude Desktop that researches county tax auctions across the United States and automatically stores comprehensive data in Supabase.

**Zero manual work. Just ask, and the agent handles everything.**

---

## 🎯 What It Does

### Autonomous Research
- Searches official .gov websites
- Finds auction vendor portals (Bid4Assets, RealAuction, etc.)
- Locates ALL documents (property lists, forms, notices)
- Extracts contact information
- Gets upcoming sale dates and deadlines

### Automatic Database Storage
- Creates county records
- Stores official links and contacts
- Saves upcoming sales with dates
- Archives all documents found
- Tracks vendor portals
- Logs important notes
- Records research metadata

### Intelligent Querying
- Answers questions about the data
- Finds opportunities based on criteria
- Monitors for updates and changes
- Exports data in various formats

---

## 🚀 Quick Start

### 1. Install (3 minutes)
```powershell
mkdir "C:\Users\fs_ro\.claude\skills\tax-auction-agent"
copy "AGENT-SYSTEM-PROMPT.md" "C:\Users\fs_ro\.claude\skills\tax-auction-agent\SKILL.md"
```

### 2. Configure Database (5 minutes)
- You already have Supabase MCP! ✅
- Run `supabase-schema.sql` in your project
- 8 tables created automatically

### 3. Test (2 minutes)
In Claude Desktop:
```
Research Blair County, PA
```

Agent autonomously researches and stores everything!

**Full guide**: See `QUICK-START.md`

---

## 📦 What's Included

### Core Agent
- **AGENT-SYSTEM-PROMPT.md** - Complete agent instructions and protocols
- **QUICK-START.md** - 15-minute setup guide ⭐ START HERE

### Configuration
- **CLAUDE-DESKTOP-SETUP.md** - MCP server configuration
- **claude_desktop_config_BASIC.json** - Minimal config (Supabase only)
- **claude_desktop_config_FULL.json** - Full config (all MCP servers)

### Documentation
- **AGENT-USAGE-GUIDE.md** - Commands, examples, patterns
- **README.md** - This file

### Related Files
Located in `county-tax-auction-finder/`:
- `supabase-schema.sql` - Database schema (8 tables)
- Supporting documentation

---

## 🎓 How It Works

### Input
```
You: Research Blair County, PA
```

### Agent Process
1. **Identifies System** - PA uses Upset→Judicial→Repository
2. **Searches Official Sources** - Finds tax claim bureau website
3. **Locates Documents** - Property lists, forms, notices (7+ PDFs)
4. **Gets Sale Info** - Upcoming dates, deadlines, deposit amounts
5. **Finds Vendor Portal** - Bid4Assets link and registration
6. **Validates Data** - Cross-references multiple sources
7. **Stores Everything** - 28 records inserted into Supabase
8. **Assigns Quality Score** - Rates completeness (1-10)

### Output
```
✅ COMPLETE: 28 records stored
Quality Score: 9/10

County: Blair, PA
Next Sale: March 11, 2026 (Repository)
Properties: 550+
Platform: Bid4Assets
Documents: 7 found
Contact: 814-317-2361
```

---

## 💡 Usage Examples

### Single County
```
Research Blair County, PA
```

### Multiple Counties
```
Research these PA counties:
- Blair
- Centre
- Bedford
```

### Query Database
```
Show me all sales in next 30 days
Find counties with 200+ properties
List all property lists available
```

### Monitor & Update
```
Find counties researched >7 days ago
Refresh stale data
Check for new sales posted
```

---

## 🗂️ Database Structure

### 8 Relational Tables

1. **counties** - Master list (county name, state, auction system)
2. **official_links** - Government websites, contact info
3. **upcoming_sales** - Sale dates, platforms, property counts
4. **documents** - PDFs, Excel files, forms (with direct URLs)
5. **vendor_portals** - Bid4Assets, RealAuction, etc.
6. **additional_resources** - Assessment, GIS, deeds offices
7. **important_notes** - Requirements, warnings, deadlines
8. **research_log** - When researched, quality scores

### 3 Helper Views

- **vw_county_complete** - All county info in one view
- **vw_latest_property_lists** - Most recent lists
- **vw_sales_calendar** - Upcoming sales schedule

---

## 🛠️ Tools & Integration

### Required (You Have These!)
✅ **Supabase MCP** - Database operations
✅ **Web Search** - Built-in search capabilities

### Optional Enhancements
⭐ **Google Custom Search** - Targeted document searches
⭐ **Puppeteer MCP** - Web scraping for complex sites
⭐ **Brave Search** - Alternative search engine

**See `CLAUDE-DESKTOP-SETUP.md` for configuration**

---

## 📊 State Coverage

### Deep Knowledge
- **Pennsylvania** - Upset → Judicial → Repository system
- **Florida** - Tax lien certificate sales
- **Texas** - Sheriff/Constable deed sales  
- **Arizona** - Tax lien sales
- **Illinois** - Annual + Scavenger sales

### General Coverage
- All 50 US states
- Adapts to each state's system
- Researches official sources
- Extracts all available data

---

## 🎯 Use Cases

### For Real Estate Investors
- Build searchable auction database
- Find upcoming opportunities
- Track registration deadlines
- Monitor property counts

### For Researchers
- Compile comprehensive data
- Compare auction systems
- Analyze trends
- Export for analysis

### For Developers
- API access to structured data
- Build custom dashboards
- Create notification systems
- Integrate with other tools

---

## 📈 Quality Scoring

The agent assigns quality scores (1-10) based on:

### 9-10 (Excellent)
- Complete official website
- All sales documented
- 5+ documents available
- Full contact information
- Vendor portal identified

### 7-8 (Good)
- Official website found
- Main sales documented
- 3+ documents available
- Basic contact info

### 5-6 (Acceptable)
- Basic website found
- Limited sale info
- 1-2 documents available

### 1-4 (Poor)
- Missing critical information
- No official sources
- Outdated data

---

## 🔄 Automated Workflows

### Weekly Maintenance
```
Find counties researched >7 days ago
→ Agent identifies 8 counties
→ Automatically refreshes all
→ Reports changes detected
```

### Opportunity Finding
```
Show me all sales with 300+ properties
→ Agent queries database
→ Filters by criteria
→ Returns ranked list
```

### Monitoring
```
Check for new property lists posted
→ Agent compares current vs previous
→ Identifies new documents
→ Updates database
→ Alerts you to changes
```

---

## 🚦 Getting Started

### Beginner Path (Week 1)
1. ✅ Install agent (3 min)
2. ✅ Set up database (5 min)
3. ✅ Test with 1 county (2 min)
4. ✅ Research 5-10 counties
5. ✅ Practice queries

### Intermediate Path (Week 2-3)
1. Research 20-50 counties
2. Set up refresh schedule
3. Create custom queries
4. Build monitoring workflow

### Advanced Path (Month 1+)
1. 100+ counties researched
2. Multi-state coverage
3. Automated alerts
4. Custom dashboards
5. API integrations

---

## 📚 Documentation

### Quick Reference
- **QUICK-START.md** - 15-minute setup ⭐
- **AGENT-USAGE-GUIDE.md** - Commands & examples

### Technical Details
- **AGENT-SYSTEM-PROMPT.md** - How the agent works
- **CLAUDE-DESKTOP-SETUP.md** - MCP configuration

### Database
- **supabase-schema.sql** - Complete schema
- Located in `county-tax-auction-finder/`

---

## 🎓 Example Session

```
You: Research Blair County, PA

Agent: 🔍 RESEARCHING: Blair County, PA
       
       Searching official sources...
       ✓ Found: Blair County Tax Claim Bureau
       ✓ Found: 2026 Repository Sale
       ✓ Found: 7 documents
       ✓ Found: Bid4Assets portal
       
       💾 STORING TO DATABASE:
       ✓ County: Blair, PA
       ✓ Official links: 3
       ✓ Upcoming sales: 2
       ✓ Documents: 7
       ✓ Vendor portals: 1
       ✓ Resources: 4
       ✓ Important notes: 9
       ✓ Research log: 1
       
       ✅ COMPLETE: 28 records stored
       Quality Score: 9/10
       
       📅 Next Sale: March 11, 2026 (Repository)
       📋 Properties: 550+
       🔗 Portal: https://bid4assets.com/blair-county-pa
       📞 Contact: 814-317-2361

You: Show me all PA sales in next 30 days

Agent: Querying database...
       
       Found 3 upcoming sales:
       
       1. Blair County - Repository Sale
          Date: March 11, 2026 at 10:00 AM
          Properties: 550
          Platform: Bid4Assets
          Register by: Feb 25, 2026
       
       2. Centre County - Upset Sale
          Date: March 18, 2026 at 10:00 AM
          Properties: 187
          Platform: Bid4Assets
          Register by: Mar 4, 2026
       
       3. Bedford County - Judicial Sale
          Date: March 25, 2026 at 10:00 AM
          Properties: 94
          Platform: Bid4Assets
          Register by: Mar 11, 2026
```

---

## 🔐 Security & Privacy

### Data Storage
- All data stored in YOUR Supabase instance
- You control access and permissions
- No third-party data sharing

### API Keys
- Service role key required for agent
- Never exposed to users
- Stored securely in Claude Desktop config

### Row Level Security
- Database schema includes RLS policies
- Public read access (optional)
- Authenticated write access

---

## 🆘 Support

### Troubleshooting
See `QUICK-START.md` and `CLAUDE-DESKTOP-SETUP.md`

### Common Issues
- Agent not responding → Check skill installation
- Database errors → Verify Supabase connection
- Limited data → Normal for some counties

### Getting Help
- Review documentation files
- Check MCP server status
- Verify database schema installed

---

## 📝 License

Free to use and modify for personal or commercial purposes.

---

## 🎉 What's Next?

1. ✅ Follow `QUICK-START.md` (15 minutes)
2. ✅ Research your first county
3. ✅ Build a database of 10-20 counties
4. ✅ Set up weekly refresh schedule
5. ✅ Create custom queries for opportunities
6. ✅ Scale to 50+ counties

---

**Built for**: Real estate investors, property researchers, developers  
**Powered by**: Claude Desktop + Supabase + MCP  
**Coverage**: All 50 US states  
**Automation**: Fully autonomous  
**Setup Time**: 15 minutes  

🏘️ **Start building your tax auction database today!**

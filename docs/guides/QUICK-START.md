# 🚀 Tax Auction Agent - Quick Start

## What You're Building

An **autonomous AI agent** in Claude Desktop that:
- Researches county tax auctions automatically
- Finds ALL documents, links, and property lists
- Stores everything in your Supabase database
- Answers questions about the data
- Monitors for updates

**No manual work. Just ask and the agent does everything.**

---

## ⚡ Quick Start (15 Minutes)

### Step 1: Install Agent Skill (2 minutes)

```powershell
# Create directory
mkdir "C:\Users\fs_ro\.claude\skills\tax-auction-agent"

# Copy agent skill
copy "C:\Users\fs_ro\Downloads\tax-auction-agent\AGENT-SYSTEM-PROMPT.md" "C:\Users\fs_ro\.claude\skills\tax-auction-agent\SKILL.md"
```

### Step 2: Configure Supabase MCP (Already Done! ✅)

You already have Supabase MCP configured. Verify it's working:
- Open Claude Desktop
- Check for Supabase tools available

### Step 3: Create Database (5 minutes)

1. Go to your Supabase project
2. SQL Editor
3. Run the schema from `supabase-schema.sql`
4. Verify 8 tables created

### Step 4: Create Agent Project (3 minutes)

In Claude Desktop:
1. Click "Projects" → "+ New Project"
2. Name: "Tax Auction Research Agent"
3. Add Content → Upload `AGENT-SYSTEM-PROMPT.md`

### Step 5: TEST IT! (5 minutes)

In your new project, say:
```
Research Blair County, PA
```

**Expected Result**:
```
🔍 RESEARCHING: Blair County, PA

[Agent searches web automatically]
[Finds official sources, documents, links]
[Stores everything in Supabase]

✅ COMPLETE: 28 records stored
Quality Score: 9/10

Next Sale: March 11, 2026
Properties: 550+
Platform: Bid4Assets
```

---

## ✅ What Just Happened?

The agent **autonomously**:
1. ✅ Searched for "Blair County PA tax claim bureau"
2. ✅ Found official website
3. ✅ Located all property lists (PDFs, Excel)
4. ✅ Found registration forms
5. ✅ Identified upcoming sales
6. ✅ Got vendor portal info (Bid4Assets)
7. ✅ Stored 28 records in your database
8. ✅ Reported comprehensive findings

**You did nothing except ask!**

---

## 🎯 What Can You Do Now?

### Research Any County
```
Research Allegheny County, PA
Research Miami-Dade County, FL
Research Harris County, TX
```

### Batch Process
```
Research these counties:
- Blair, PA
- Centre, PA
- Bedford, PA
```

### Query Database
```
Show me all sales in next 30 days
Find all property lists available
Which counties use Bid4Assets?
```

### Monitor Updates
```
Find counties researched >7 days ago
Refresh stale data
Check for new sales posted
```

---

## 📊 Database Tables Created

After researching Blair County, you'll have data in:

1. **counties** (1 record)
   - Blair County, PA info

2. **official_links** (3 records)
   - Tax claim bureau website
   - Tax sale pages
   - Contact pages

3. **upcoming_sales** (2 records)
   - Repository Sale - March 11, 2026
   - Upset Sale - November 2025 (completed)

4. **documents** (7 records)
   - Property lists (PDF, Excel)
   - Legal notices
   - Registration forms
   - Terms & conditions
   - Past results

5. **vendor_portals** (1 record)
   - Bid4Assets info and links

6. **additional_resources** (4 records)
   - Assessment office
   - GIS mapping
   - Recorder of deeds
   - Property search

7. **important_notes** (9 records)
   - Deposit requirements
   - Deadlines
   - Warnings
   - Tips

8. **research_log** (1 record)
   - When researched
   - Quality score
   - Sources checked

**Total: 28 records from ONE county!**

---

## 🔧 Optional Enhancements

### Add Google Custom Search (Recommended)

**Why?** More targeted searches, better document finding

**How?**
1. Get Google API key (see `CLAUDE-DESKTOP-SETUP.md`)
2. Create Custom Search Engine
3. Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "supabase": { ... },
    "google-search": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-google-search"],
      "env": {
        "GOOGLE_API_KEY": "your-key",
        "GOOGLE_CSE_ID": "your-cx"
      }
    }
  }
}
```

### Add Web Scraping

**Why?** Extract data from PDFs and complex sites

**How?** Add Puppeteer MCP:
```json
{
  "puppeteer": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-puppeteer"]
  }
}
```

---

## 📚 Next Steps

### Day 1: Test & Verify
- ✅ Research 1-2 counties
- ✅ Verify data in Supabase
- ✅ Check quality scores

### Day 2-3: Build Database
- Research 10-20 counties
- Focus on your target states
- Verify data accuracy

### Week 2: Automation
- Set up weekly refresh
- Create custom queries
- Build dashboards

### Month 1: Scale
- 50+ counties researched
- Automated monitoring
- Integration with other tools

---

## 🎓 Learning Resources

All in `C:\Users\fs_ro\Downloads\tax-auction-agent\`:

1. **AGENT-SYSTEM-PROMPT.md** - Full agent instructions
2. **CLAUDE-DESKTOP-SETUP.md** - MCP configuration
3. **AGENT-USAGE-GUIDE.md** - Commands and examples
4. **claude_desktop_config_BASIC.json** - Minimal config
5. **claude_desktop_config_FULL.json** - All MCP servers

---

## 💡 Pro Tips

### Tip 1: Start Small
Research 1-2 counties first. Verify quality. Then scale.

### Tip 2: Use Projects
Create separate projects for different states or purposes.

### Tip 3: Monitor Quality
Always check the quality score. Aim for 8+.

### Tip 4: Refresh Regularly
Set up weekly refresh for active counties.

### Tip 5: Query Often
Use the database! That's where the value is.

---

## 🐛 Troubleshooting

### Agent Not Working
1. Check skill is in `.claude/skills/tax-auction-agent/SKILL.md`
2. Verify AGENT-SYSTEM-PROMPT.md uploaded to project
3. Restart Claude Desktop

### Supabase Not Connecting
1. Check `claude_desktop_config.json` syntax
2. Verify service_role key (not anon key!)
3. Ensure database schema installed
4. Restart Claude Desktop

### Limited Data Found
- Normal for some counties
- Agent will note this
- Quality score will be lower
- Manual follow-up may be needed

---

## ✅ Success Checklist

You're ready when:
- [ ] Agent skill installed
- [ ] Supabase database created (8 tables)
- [ ] Tested with Blair County, PA
- [ ] 28 records stored successfully
- [ ] Can query database for sales
- [ ] Agent responds to commands

---

## 🎉 You're Done!

You now have an **autonomous Tax Auction Research Agent**!

**What to do next:**
1. Research 5-10 counties
2. Query for opportunities
3. Set up monitoring
4. Build your investment pipeline

**Questions?** Check:
- `AGENT-USAGE-GUIDE.md` - Commands & examples
- `CLAUDE-DESKTOP-SETUP.md` - Technical setup
- `AGENT-SYSTEM-PROMPT.md` - How agent works

---

**Time to Complete**: 15 minutes  
**Result**: Fully autonomous research agent  
**Next**: Start building your county database!

🏘️ Happy auction hunting!

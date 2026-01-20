# Tax Auction Agent - Claude Desktop Setup

## Overview
This guide configures Claude Desktop as an autonomous Tax Auction Research Agent with access to:
- Supabase (database operations) ✅
- Web Search (built-in) ✅  
- Google Custom Search API (optional)
- Document extraction tools (optional)

## Prerequisites

1. ✅ Claude Desktop installed
2. ✅ Supabase MCP already configured (you have this!)
3. ⚠️ Google Custom Search API key (optional but recommended)

## Step 1: Locate Claude Desktop Config

Your Claude Desktop config is at:
```
C:\Users\fs_ro\AppData\Roaming\Claude\claude_desktop_config.json
```

## Step 2: Current Configuration (What You Have)

You should already have Supabase MCP configured. Your config looks like:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase",
        "run"
      ],
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key"
      }
    }
  }
}
```

## Step 3: Add Google Custom Search MCP (Optional)

To add Google Custom Search capabilities, you need:

### Get Google Custom Search API Credentials

1. **Go to Google Cloud Console**
   - https://console.cloud.google.com

2. **Create/Select Project**
   - Click "Select a project" → "New Project"
   - Name it "Tax Auction Research"

3. **Enable Custom Search API**
   - Go to "APIs & Services" → "Library"
   - Search for "Custom Search API"
   - Click "Enable"

4. **Create API Key**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "API Key"
   - Copy your API key

5. **Create Custom Search Engine**
   - Go to https://programmablesearchengine.google.com/
   - Click "Add"
   - Sites to search: Leave empty (search entire web)
   - Name: "Tax Auction Search"
   - Click "Create"
   - Copy your "Search Engine ID" (CX)

### Update Claude Desktop Config

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase",
        "run"
      ],
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key"
      }
    },
    "google-search": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-google-search"
      ],
      "env": {
        "GOOGLE_API_KEY": "your-google-api-key",
        "GOOGLE_CSE_ID": "your-search-engine-id"
      }
    }
  }
}
```

## Step 4: Install the Agent Skill

Copy the agent system prompt to your skills directory:

```powershell
mkdir "C:\Users\fs_ro\.claude\skills\tax-auction-agent"

copy "C:\Users\fs_ro\Downloads\tax-auction-agent\AGENT-SYSTEM-PROMPT.md" "C:\Users\fs_ro\.claude\skills\tax-auction-agent\SKILL.md"
```

## Step 5: Create Project in Claude Desktop

1. **Open Claude Desktop**
2. **Create New Project**
   - Click "Projects" in sidebar
   - Click "+ New Project"
   - Name: "Tax Auction Research Agent"

3. **Add Agent Skill to Project**
   - Click "Add Content"
   - Upload `AGENT-SYSTEM-PROMPT.md`

4. **Add Database Schema (Optional)**
   - Upload `supabase-schema.sql` as reference

## Step 6: Test the Agent

### Test 1: Simple Research
```
Research Blair County, PA
```

**Expected**: Agent autonomously:
1. Searches for official sources
2. Finds documents and links
3. Stores everything in Supabase
4. Reports comprehensive findings

### Test 2: Multi-County Research
```
Research these PA counties:
- Blair
- Centre  
- Bedford
```

**Expected**: Agent processes all three sequentially

### Test 3: Update Existing
```
Refresh data for Blair County, PA
```

**Expected**: Agent updates existing records

### Test 4: Query Database
```
Show me all PA counties with sales in March 2026
```

**Expected**: Agent queries Supabase and displays results

## Agent Capabilities

With this setup, your agent can:

### ✅ Autonomous Research
- "Research [County], [State]"
- "Find tax auctions in [County]"
- "Get property lists for [County]"

### ✅ Batch Operations
- "Research all counties in Delaware"
- "Update all PA counties researched >30 days ago"
- "Find counties using Bid4Assets"

### ✅ Database Queries
- "Show upcoming sales in next 30 days"
- "List all property list documents"
- "Find counties with >500 properties"

### ✅ Data Analysis
- "Compare PA vs FL auction systems"
- "Which counties have the most documents?"
- "What's the average property count?"

### ✅ Monitoring
- "Check for stale data"
- "Find counties needing refresh"
- "Quality score distribution"

## Working Without Google Custom Search

If you don't set up Google Custom Search, the agent will still work using:
- Built-in web search (works great!)
- Supabase MCP for database
- Manual URL validation

The agent is smart enough to adapt to available tools.

## Advanced: Add More MCP Servers

### Filesystem MCP (Already Have)
You already have this! Useful for:
- Reading downloaded property lists
- Parsing local PDFs
- Saving research reports

### Brave Search MCP (Alternative to Google)
```json
{
  "brave-search": {
    "command": "npx",
    "args": [
      "-y",
      "@modelcontextprotocol/server-brave-search"
    ],
    "env": {
      "BRAVE_API_KEY": "your-brave-api-key"
    }
  }
}
```

Get free API key: https://brave.com/search/api/

### Puppeteer MCP (Web Scraping)
```json
{
  "puppeteer": {
    "command": "npx",
    "args": [
      "-y",
      "@modelcontextprotocol/server-puppeteer"
    ]
  }
}
```

Useful for:
- Scraping dynamic websites
- Taking screenshots
- Extracting JavaScript-rendered content

## Restart Claude Desktop

After updating `claude_desktop_config.json`:
1. Close Claude Desktop completely
2. Reopen Claude Desktop
3. Verify MCP servers loaded (check status indicator)

## Troubleshooting

### MCP Server Not Loading
- Check JSON syntax (use JSONLint.com)
- Verify file path is correct
- Check environment variables set
- Restart Claude Desktop

### Google Search Not Working
- Verify API key is valid
- Check Custom Search Engine ID
- Ensure API is enabled in Google Cloud
- Check rate limits (100 free queries/day)

### Supabase Connection Failed
- Verify project URL is correct
- Check service_role key
- Ensure database schema is installed
- Test connection in Supabase dashboard

### Agent Not Following Protocol
- Ensure AGENT-SYSTEM-PROMPT.md is uploaded to project
- Check skill is in correct directory
- Restart conversation

## Usage Examples

### Example 1: Start Fresh
```
User: I want to build a tax auction database for Pennsylvania. 
      Start with Blair County.

Agent: 🔍 RESEARCHING: Blair County, PA
       [Autonomous research begins]
       [Stores all data]
       ✅ COMPLETE: 28 records stored
```

### Example 2: Daily Workflow
```
User: Find counties researched >7 days ago and refresh them

Agent: Querying database...
       Found 5 counties needing refresh:
       1. Blair, PA
       2. Centre, PA
       3. Bedford, PA
       4. Fulton, PA
       5. Huntingdon, PA
       
       Refreshing all 5...
       [Updates each county]
       ✅ All 5 counties refreshed
```

### Example 3: Find Opportunities
```
User: Show me all upcoming sales with 200+ properties

Agent: Querying database...
       Found 12 sales:
       [Lists sales with details]
       
       Top opportunities:
       1. Allegheny County, PA - 523 properties (Mar 15)
       2. Philadelphia County, PA - 789 properties (Apr 3)
       3. Miami-Dade County, FL - 645 properties (May 20)
```

## Next Steps

1. ✅ Configure Claude Desktop with MCP servers
2. ✅ Install agent skill
3. ✅ Test with one county
4. ✅ Build database with 10-20 counties
5. ✅ Set up monitoring and alerts
6. ✅ Create custom queries for your needs

## Files Provided

- `AGENT-SYSTEM-PROMPT.md` - Complete agent instructions
- `CLAUDE-DESKTOP-SETUP.md` - This file
- `AGENT-USAGE-GUIDE.md` - How to use the agent
- Sample `claude_desktop_config.json` - MCP configuration

Your autonomous Tax Auction Research Agent is ready! 🚀

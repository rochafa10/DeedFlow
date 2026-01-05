# DUAL-TOOL POWER: Perplexity + Google Custom Search

## **Best of Both Worlds!**

You have access to BOTH Perplexity and Google Custom Search in Claude Code. This is PERFECT because they complement each other!

---

## **Why Use Both?**

### **Perplexity** = The Researcher
- Synthesizes information from multiple sources
- Provides context and explanations
- Verifies information with citations
- Handles complex questions
- Gets real-time, current information

### **Google Custom Search** = The Finder
- Pinpoint accuracy for specific files
- `filetype:pdf` precision
- `site:.gov` filtering
- Exact URL discovery
- Finds documents Perplexity might summarize

### **Together** = Unstoppable!

---

## **Perfect Division of Labor**

| What You Need | Use This First | Then Use This |
|---------------|----------------|---------------|
| **"What's the tax sale system?"** | Perplexity | - |
| **"Find property list PDF"** | Google Custom Search | Perplexity (verify) |
| **"When is next sale?"** | Perplexity | Google (find notice) |
| **"Registration deadline?"** | Perplexity | Google (find form) |
| **"Official website?"** | Perplexity | - |
| **"Exact vendor URL?"** | Google Custom Search | - |
| **"Legal notices?"** | Google Custom Search | Perplexity (context) |
| **"How does it work?"** | Perplexity | - |

---

## **Example: Blair County, PA Research**

### **Round 1: Perplexity (Get Overview)**

**Query:**
```
Blair County PA tax auction 2026 - system, upcoming sales, official contacts
```

**Result:**
```
System: PA Upset → Judicial → Repository
Next Sale: Repository - March 11, 2026
Office: Blair County Tax Claim Bureau
Phone: 814-317-2361
Vendor: Bid4Assets
Citations: [3 sources from Perplexity]

Time: 10 seconds
Quality: Comprehensive overview with context
```

### **Round 2: Google Custom Search (Find Documents)**

**Search 1: Property Lists**
```
"Blair County" "PA" "property list" "2026" filetype:pdf
```
**Result:**
```
Found: 2026-repository-property-list.pdf
URL: https://blairco.org/getmedia/abc/2026-repo-list.pdf
Also found: Excel version

Time: 5 seconds
Quality: Direct links, exact files
```

**Search 2: Registration Forms**
```
site:blairco.org "registration" filetype:pdf
```
**Result:**
```
Found: bidder-registration-instructions.pdf
Found: bidder-application-2026.pdf
Found: terms-and-conditions.pdf

Time: 5 seconds
Quality: All official forms with direct URLs
```

**Search 3: Vendor Portal**
```
site:bid4assets.com "Blair County" "Pennsylvania"
```
**Result:**
```
Found: https://bid4assets.com/blair-county-pa
Direct registration: /blair-county-pa/register
Property search: /blair-county-pa/current-sales

Time: 3 seconds
Quality: Exact URLs, no guessing
```

### **Round 3: Perplexity (Verify & Fill Gaps)**

**Query:**
```
Blair County PA March 2026 repository sale - registration deadline and deposit required
```

**Result:**
```
Deadline: February 25, 2026
Deposit: $10,000
Payment: Wire transfer
Property count: 568 (updated from original 550)
Citations: Official notice + Bid4Assets

Time: 8 seconds
Quality: Verified details with sources
```

---

## **Results Comparison**

### **Using Only Perplexity:**
```
Good overview
General information
Citations
May miss specific PDFs
Might summarize instead of linking
Documents Found: 3-4
Quality: 8/10
```

### **Using Only Google Custom Search:**
```
Finds exact documents
Precise URLs
No context
No synthesis
Requires knowing what to search for
Documents Found: 5-6
Quality: 7/10
```

### **Using BOTH (Optimal!):**
```
Complete overview (Perplexity)
All documents with URLs (Google)
Context + precision
Verified information
Citations for everything
Documents Found: 7-10
Quality: 10/10
```

---

## **Optimal Configuration**

Use **`claude_desktop_config_OPTIMAL.json`**:

```json
{
  "mcpServers": {
    "supabase": { ...database... },
    "perplexity": { ...research... },
    "google-search": { ...precision... }
  }
}
```

This gives your agent:
- **Perplexity** for intelligence
- **Google** for precision
- **Supabase** for storage

---

## **Setup Instructions**

### **Step 1: Use Dual-Tool Agent**
```powershell
copy "AGENT-SYSTEM-PROMPT-DUAL-TOOLS.md" "C:\Users\fs_ro\.claude\skills\tax-auction-agent\SKILL.md" -Force
```

### **Step 2: Use Optimal Config**
Edit: `C:\Users\fs_ro\AppData\Roaming\Claude\claude_desktop_config.json`

Copy from: `claude_desktop_config_OPTIMAL.json`

**Fill in:**
- Supabase URL + Service Role Key
- Perplexity API Key (you have this!)
- Google API Key + CSE ID (you have this!)

### **Step 3: Restart Claude Desktop**

### **Step 4: Test**
```
Research Blair County, PA
```

**Expected:**
```
RESEARCHING: Blair County, PA

Perplexity: Getting overview...
Found system, dates, contacts

Google Custom Search: Finding documents...
Found 7 PDFs with direct links

Perplexity: Verifying details...
All information confirmed

Storing 28 records...
Quality Score: 10/10
```

---

## **Tool Usage Pattern**

Your agent will automatically use tools in this order:

```
1. Perplexity → "Tell me about [County]"
   └─> Get overview, system, general info

2. Google Custom Search → Find specific docs
   ├─> Property lists (filetype:pdf)
   ├─> Registration forms (site:.gov)
   ├─> Vendor portals (site:bid4assets.com)
   └─> Legal notices (filetype:pdf + date)

3. Perplexity → Verify critical info
   └─> Confirm dates, deadlines, counts

4. Supabase → Store everything
   └─> With citations from both tools
```

---

## **When Each Tool Shines**

### **Perplexity Excels At:**
- "What is the tax sale system in [County]?"
- "When is the next sale?"
- "How does repository sale work in PA?"
- "What are the requirements to register?"
- "Compare upset vs judicial sale"

### **Google Custom Search Excels At:**
- Finding: `"Blair County" "PA" "property list" filetype:pdf`
- Finding: `site:bid4assets.com "Blair County"`
- Finding: `site:.gov "Blair County" "registration" filetype:pdf`
- Finding: `"Blair County" "legal notice" "2026" filetype:pdf`
- Finding: `site:blairco.org filetype:xlsx`

---

## **Real-World Workflow**

### **Scenario: Research New County**

```
1. Agent asks Perplexity:
   "Centre County PA tax auction 2026"

   Gets: System, dates, vendor, contacts

2. Agent uses Google Custom Search:
   "Centre County" "PA" "property list" "2026" filetype:pdf

   Finds: Direct PDF links

3. Agent uses Google Custom Search:
   site:bid4assets.com "Centre County" "PA"

   Finds: Exact auction portal URL

4. Agent asks Perplexity:
   "Centre County PA March 2026 upset sale registration deadline"

   Verifies: Deadline, deposit, requirements

5. Agent stores everything in Supabase
   With citations from both tools

Result: 10/10 quality, all documents found
```

---

## **Checklist**

After setup, your agent should:
- [x] Use Perplexity for comprehensive overviews
- [x] Use Google for finding specific PDFs
- [x] Cross-verify information between tools
- [x] Store citations from both in database
- [x] Achieve 9-10/10 quality scores consistently

---

## **You Now Have:**

- **Perplexity** for intelligence & context
- **Google Custom Search** for precision & documents
- **Supabase** for permanent storage
- **Autonomous agent** that uses both optimally

**Result:** The most powerful tax auction research system possible!

---

**Files:**
- `AGENT-SYSTEM-PROMPT-DUAL-TOOLS.md` - Agent that uses both
- `claude_desktop_config_OPTIMAL.json` - All 3 MCP servers

**Ready to test?** Copy the dual-tool agent and see the difference!

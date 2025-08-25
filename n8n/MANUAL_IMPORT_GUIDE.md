# 📋 Manual Import Instructions for n8n

Since the API import failed, you can manually import the workflows:

## Option 1: n8n UI Import (Recommended)

1. **Open n8n in your browser**
   http://localhost:5678

2. **Go to Workflows**
   Click on "Workflows" in the left sidebar

3. **Import each workflow**
   - Click the "+" button or "Add workflow"
   - Click on the menu (3 dots) → "Import from File"
   - Select these files one by one:
     - `n8n/workflows/super-smart-calendar-scraper.json`
     - `n8n/workflows/ai-calendar-scraper-agent.json`
     - `n8n/workflows/ai-calendar-scraper-python-enhanced.json`

## Option 2: n8n CLI Import

```bash
# Navigate to the project directory
cd C:\Users\fs_ro\Documents\tax-deed-platform

# Import workflows using n8n CLI
n8n import:workflow --input="n8n/workflows/super-smart-calendar-scraper.json"
n8n import:workflow --input="n8n/workflows/ai-calendar-scraper-agent.json"
n8n import:workflow --input="n8n/workflows/ai-calendar-scraper-python-enhanced.json"
```

## Option 3: Copy & Paste JSON

1. Open each workflow JSON file
2. Copy the entire content
3. In n8n UI: Create new workflow → Switch to "Code" view → Paste JSON → Save

## After Import

### Configure Credentials
1. Go to Credentials → Add Credential
2. Add these credentials:
   - **OpenAI**: Your OpenAI API key
   - **Anthropic**: Your Anthropic API key (optional)
   - **Supabase**: Your Supabase URL and Service Key

### Fix Node Credentials
After import, you may need to:
1. Open each workflow
2. Click on nodes with ⚠️ warning icons
3. Select the appropriate credential from dropdown
4. Save the workflow

### Activate Workflows
1. Open each workflow
2. Toggle the "Active" switch in the top bar
3. The schedule triggers will start running automatically

## Required Environment Variables

Add these to your .env.local file:
```
# Required
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJ...

# Optional but recommended
ANTHROPIC_API_KEY=sk-ant-...
TAVILY_API_KEY=tvly-...
```

## Python Packages for n8n

If using Docker, add to docker-compose.yml:
```yaml
environment:
  - N8N_PYTHON_PACKAGES=beautifulsoup4,pandas,numpy,matplotlib,python-dateutil,PyPDF2
```

Or install globally:
```bash
pip install beautifulsoup4 pandas numpy matplotlib python-dateutil PyPDF2 requests
```

## Testing the Workflows

### Test Execution
1. Open the workflow in n8n
2. Click "Execute Workflow" button
3. Check the execution log for results

### Check Supabase
```sql
-- See if auctions are being saved
SELECT * FROM auctions 
ORDER BY created_at DESC 
LIMIT 10;

-- Check extraction logs
SELECT * FROM extraction_logs 
ORDER BY created_at DESC;
```

## Troubleshooting

### "Credential not found" error
→ Create the credential in n8n UI first

### "Python package not found" error
→ Install required Python packages (see above)

### Workflow doesn't trigger
→ Make sure it's activated (toggle switch)

### Low confidence scores
→ Add OpenAI API key for AI features

---

**Need help? Check the workflow files directly in:**
`C:\Users\fs_ro\Documents\tax-deed-platform\n8n\workflows\`

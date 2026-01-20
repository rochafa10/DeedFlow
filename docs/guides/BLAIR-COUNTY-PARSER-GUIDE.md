# Blair County Parser - Quick Setup & Run Guide

## Quick Setup (5 Minutes)

### **Step 1: Install Dependencies**
```bash
pip install pdfplumber requests supabase
```

### **Step 2: Set Environment Variables**
```bash
# Windows PowerShell:
$env:SUPABASE_URL="https://your-project-id.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Or edit the script directly and replace:
# SUPABASE_URL = "https://your-project.supabase.co"
# SUPABASE_KEY = "your-service-role-key"
```

### **Step 3: Run the Parser**
```bash
python parse_blair_county.py
```

---

## Expected Output

```
Blair County Property List Parser
============================================================

Getting county ID...
   County ID: 550e8400-e29b-41d4-a716-446655440000

Processing: Repository Property List
   URL: https://www.blairco.org/getmedia/.../REPOSITORY_LIST.pdf
   Created parsing job: abc-def-123
   Downloading PDF...
   Downloaded to /tmp/Repository_Property_List.pdf
   Extracting properties...
  Processing page 1...
  Processing page 2...
  ...
  Processing page 12...
   Found 568 properties
   Storing in database...
      Progress: 50/568
      Progress: 100/568
      Progress: 150/568
      ...
   Stored 563 properties (5 failed)

Processing: Judicial Sale Property List
   URL: https://www.blairco.org/getmedia/.../Judicial-Sale-List.pdf
   Created parsing job: def-ghi-456
   Downloading PDF...
   Downloaded
   Extracting properties...
   Found 127 properties
   Storing in database...
   Stored 127 properties (0 failed)

Processing: Upset Sale Property List
   URL: https://www.blairco.org/getmedia/.../Upset-Sale-List.pdf
   Created parsing job: ghi-jkl-789
   Downloading PDF...
   Downloaded
   Extracting properties...
   Found 150 properties
   Storing in database...
   Stored 148 properties (2 failed)

============================================================
PARSING COMPLETE
   Total Properties Extracted: 838
   Total Failed: 7
   Success Rate: 99.2%
============================================================
```

---

## Configuration

### **Edit PDF URLs**
The script has the 3 Blair County PDFs hardcoded. To add more:

```python
PDFS = [
    {
        "title": "Repository Property List",
        "url": "https://www.blairco.org/getmedia/.../REPOSITORY_LIST.pdf",
        "sale_type": "repository",
        "sale_date": "2026-03-11 10:00:00"
    },
    # Add more PDFs here
]
```

### **Adjust Parsing Logic**
If Blair County uses different column order, edit the `parse_pdf()` function:

```python
# Current format: [Parcel, Address, Owner, Tax, Penalty, Total]
parcel_id = parse_parcel_id(row[0])
address = row[1].strip()
owner = row[2].strip()
tax_amount = parse_money(row[3])
total_due = parse_money(row[5])

# Adjust indices based on actual PDF format
```

---

## Troubleshooting

### **Issue: Module not found**
```bash
pip install pdfplumber requests supabase
```

### **Issue: Supabase connection failed**
Check environment variables:
```python
print(f"URL: {SUPABASE_URL}")
print(f"Key: {SUPABASE_KEY[:10]}...")  # First 10 chars
```

### **Issue: No properties found**
- PDF format may be different than expected
- Check PDF manually to see column order
- Adjust parsing logic in `parse_pdf()` function

### **Issue: Download failed**
- PDF URL may have changed
- Check URLs in Supabase `documents` table
- Update `PDFS` list with correct URLs

---

## For Claude Code

Tell Claude Code:

```
Run the Python script at:
parse_blair_county.py

Make sure to set environment variables:
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-key
```

Or Claude Code can:
1. Read the script
2. Install dependencies
3. Set env vars
4. Run it
5. Monitor progress

---

## What This Script Does

1. Connects to Supabase
2. Gets Blair County ID
3. Downloads 3 PDFs
4. Extracts property data using pdfplumber
5. Validates parcel IDs and amounts
6. Stores in `properties` table using UPSERT
7. Tracks parsing jobs
8. Reports progress and results

---

## After Running

### **Query the Data:**
```sql
-- See all properties
SELECT * FROM vw_properties_complete
WHERE county_name = 'Blair' AND state_code = 'PA'
ORDER BY total_due DESC;

-- High value properties
SELECT * FROM properties
WHERE county_id = (SELECT id FROM counties WHERE county_name='Blair')
  AND total_due > 10000;

-- Check parsing status
SELECT * FROM vw_parsing_summary
WHERE county_name = 'Blair';
```

---

## Success!

After running, you'll have:
- 800+ properties in database
- All with parcel IDs, addresses, amounts
- Ready for analysis and investment research

**Your Blair County property database is live!**

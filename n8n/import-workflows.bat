@echo off
echo ====================================
echo n8n Workflow Import Helper
echo Tax Deed Platform
echo ====================================
echo.

echo Checking n8n status...
curl -s -o nul -w "n8n Status: %%{http_code}\n" http://localhost:5678
echo.

echo Your Supabase Credentials:
echo --------------------------
echo Host: https://filvghircyrnlhzaeavm.supabase.co
echo Service Role Key: (from .env.local - NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY)
echo.

echo Workflows to Import:
echo --------------------
echo 1. property-enrichment-supabase.json
echo 2. inspection-report-workflow.json  
echo 3. auction-scraper-workflow.json
echo 4. miami-dade-scraper-detailed.json
echo.

echo Opening n8n in your browser...
start http://localhost:5678
timeout /t 2 >nul

echo Opening workflow folder...
explorer "C:\Users\fs_ro\Documents\tax-deed-platform\n8n\workflows"
echo.

echo ====================================
echo MANUAL STEPS IN N8N:
echo ====================================
echo.
echo 1. CREATE CREDENTIALS:
echo    - Click "Credentials" in sidebar
echo    - Add Credential -^> Search "Supabase"
echo    - Name: "Supabase Tax Deed"
echo    - Host: https://filvghircyrnlhzaeavm.supabase.co
echo    - Service Role Key: (copy from .env.local)
echo    - Click "Create"
echo.
echo 2. IMPORT WORKFLOWS:
echo    - Click "Workflows" -^> "Add Workflow" -^> "Import from File"
echo    - Select each JSON file from the explorer window
echo    - After import, click on each Supabase node
echo    - Select "Supabase Tax Deed" credential
echo    - Save and Activate each workflow
echo.
echo 3. NOTE WEBHOOK URLs:
echo    - Each webhook workflow will show its URL
echo    - Copy these to update .env.local
echo.
pause
# n8n Workflow Import Helper Script
# Run this in PowerShell to help with the import process

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "n8n Workflow Import Helper" -ForegroundColor Cyan
Write-Host "Tax Deed Platform" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Check if n8n is running
Write-Host "Checking n8n status..." -ForegroundColor Yellow
$response = try { Invoke-WebRequest -Uri "http://localhost:5678" -UseBasicParsing -TimeoutSec 2 } catch { $null }
if ($response -and $response.StatusCode -eq 200) {
    Write-Host "✓ n8n is running at http://localhost:5678" -ForegroundColor Green
} else {
    Write-Host "✗ n8n is not accessible. Please start n8n first." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Workflows ready for import:" -ForegroundColor Yellow
Write-Host ""

# List workflows
$workflowPath = "C:\Users\fs_ro\Documents\tax-deed-platform\n8n\workflows"
$workflows = @(
    @{Name="Property Enrichment"; File="property-enrichment-supabase.json"; Type="Webhook"},
    @{Name="Inspection Report"; File="inspection-report-workflow.json"; Type="Webhook"},
    @{Name="Auction Scraper"; File="auction-scraper-workflow.json"; Type="Scheduled (6 hours)"},
    @{Name="Miami-Dade Scraper"; File="miami-dade-scraper-detailed.json"; Type="Scheduled (Daily 9 AM)"}
)

foreach ($workflow in $workflows) {
    $filePath = Join-Path $workflowPath $workflow.File
    if (Test-Path $filePath) {
        Write-Host "  ✓ $($workflow.Name)" -ForegroundColor Green
        Write-Host "    File: $($workflow.File)" -ForegroundColor Gray
        Write-Host "    Type: $($workflow.Type)" -ForegroundColor Gray
        Write-Host "    Path: $filePath" -ForegroundColor Gray
        Write-Host ""
    } else {
        Write-Host "  ✗ $($workflow.Name) - File not found" -ForegroundColor Red
    }
}

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "IMPORT INSTRUCTIONS:" -ForegroundColor Yellow
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Open n8n in your browser:" -ForegroundColor White
Write-Host "   http://localhost:5678" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Create Supabase Credentials first:" -ForegroundColor White
Write-Host "   - Go to Credentials → Add Credential → Supabase" -ForegroundColor Gray
Write-Host "   - Name: 'Supabase Tax Deed'" -ForegroundColor Gray
Write-Host "   - Use credentials from .env.local" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Import each workflow:" -ForegroundColor White
Write-Host "   - Click Workflows → Add Workflow → Import from File" -ForegroundColor Gray
Write-Host "   - Navigate to: $workflowPath" -ForegroundColor Gray
Write-Host "   - Select each JSON file" -ForegroundColor Gray
Write-Host ""
Write-Host "4. For each imported workflow:" -ForegroundColor White
Write-Host "   - Click on Supabase nodes" -ForegroundColor Gray
Write-Host "   - Select 'Supabase Tax Deed' credential" -ForegroundColor Gray
Write-Host "   - Save the workflow" -ForegroundColor Gray
Write-Host "   - Toggle Active switch ON" -ForegroundColor Gray
Write-Host ""
Write-Host "5. Copy webhook URLs to .env.local" -ForegroundColor White
Write-Host ""

# Open n8n in browser
Write-Host "Press Enter to open n8n in your browser..." -ForegroundColor Yellow
Read-Host
Start-Process "http://localhost:5678"

Write-Host ""
Write-Host "Opening workflow folder in Explorer..." -ForegroundColor Yellow
Start-Process "explorer.exe" -ArgumentList $workflowPath

Write-Host ""
Write-Host "✓ Helper script complete!" -ForegroundColor Green
Write-Host "Follow the instructions above to complete the import." -ForegroundColor White
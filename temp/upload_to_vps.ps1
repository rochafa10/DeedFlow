# PowerShell script to upload regrid-screenshot-v15.js to VPS
# This uses the DigitalOcean web console approach (no SSH key needed)

$scriptPath = Join-Path $PSScriptRoot "..\scripts\regrid-screenshot-v15.js" | Resolve-Path
$scriptContent = Get-Content $scriptPath -Raw

# Base64 encode the content
$base64Content = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($scriptContent))

Write-Host "=" -NoNewline
Write-Host ("=" * 79)
Write-Host "Copy and paste this command into the DigitalOcean console:"
Write-Host ("=" * 80)
Write-Host ""
Write-Host "python3 -c `"import base64; open('/tmp/regrid-screenshot-v15.js', 'wb').write(base64.b64decode('$base64Content'))`""
Write-Host ""
Write-Host ("=" * 80)
Write-Host "Then run these commands:"
Write-Host ("=" * 80)
Write-Host ""
Write-Host "docker cp /tmp/regrid-screenshot-v15.js n8n-production-pwrunner-1:/app/scripts/regrid-screenshot-v15.js"
Write-Host "docker exec n8n-production-pwrunner-1 chmod +x /app/scripts/regrid-screenshot-v15.js"
Write-Host "docker exec n8n-production-pwrunner-1 ls -la /app/scripts/regrid-screenshot-v15.js"
Write-Host ""

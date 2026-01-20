# Test script with multiple parcel IDs
$parcels = @(
    @{parcel="03-002-106.0"; county="Indiana"; state="PA"; property_id="897670b1-d4d6-4369-9e31-fbb851f7dc09"},
    @{parcel="11-12-125-3313"; county="Elk"; state="PA"; property_id="03e50971-1484-4f52-a741-3550136469af"},
    @{parcel="01-007-057-000-0000"; county="Dauphin"; state="PA"; property_id="a555c763-75b9-4118-a449-3dd6b1f4a9f8"},
    @{parcel="01-007-071-000-0000"; county="Dauphin"; state="PA"; property_id="657c5fb6-b5e6-4fe3-af79-b2c1c53a95ff"},
    @{parcel="01-011-018-000-0000"; county="Dauphin"; state="PA"; property_id="2c45fc78-16d7-4aba-876d-ba224aff8c87"}
)

$results = @()

Write-Host "=== Testing Optimized Script with Multiple Parcels ===" -ForegroundColor Cyan
Write-Host ""

foreach ($p in $parcels) {
    Write-Host "Testing parcel: $($p.parcel) ($($p.county), $($p.state))" -ForegroundColor Yellow
    
    $startTime = Get-Date
    try {
        $output = docker exec pwrunner-test node /app/scripts/regrid-screenshot-v15.js $p.parcel $p.county $p.state $p.property_id 2>$null
        $duration = (Get-Date) - $startTime
        
        $outputSize = $output.Length
        $json = $output | ConvertFrom-Json
        
        $result = @{
            parcel = $p.parcel
            county = $p.county
            state = $p.state
            success = $json.success
            duration_seconds = [math]::Round($duration.TotalSeconds, 2)
            output_size_kb = [math]::Round($outputSize / 1024, 2)
            screenshot_size_kb = if ($json.screenshot) { [math]::Round($json.screenshot.Length / 1024, 2) } else { 0 }
            data_quality_score = $json.data_quality_score
            has_regrid_data = ($json.regrid_data -ne $null)
            error = $json.error
        }
        
        $results += $result
        
        Write-Host "  ✓ Success: $($result.success)" -ForegroundColor Green
        Write-Host "  Duration: $($result.duration_seconds)s" -ForegroundColor Gray
        Write-Host "  Output Size: $($result.output_size_kb) KB" -ForegroundColor Gray
        Write-Host "  Screenshot: $($result.screenshot_size_kb) KB" -ForegroundColor Gray
        Write-Host "  Data Quality: $($result.data_quality_score)" -ForegroundColor Gray
        if ($result.error) {
            Write-Host "  Error: $($result.error)" -ForegroundColor Red
        }
        Write-Host ""
        
    } catch {
        Write-Host "  ✗ Failed: $_" -ForegroundColor Red
        $results += @{
            parcel = $p.parcel
            success = $false
            error = $_.Exception.Message
        }
        Write-Host ""
    }
}

Write-Host "=== Test Summary ===" -ForegroundColor Cyan
Write-Host "Total parcels tested: $($results.Count)"
Write-Host "Successful: $($results | Where-Object { $_.success -eq $true } | Measure-Object | Select-Object -ExpandProperty Count)"
Write-Host "Failed: $($results | Where-Object { $_.success -ne $true } | Measure-Object | Select-Object -ExpandProperty Count)"
Write-Host ""
$avgSize = [math]::Round(($results | Where-Object { $_.output_size_kb } | Measure-Object -Property output_size_kb -Average).Average, 2)
$avgDuration = [math]::Round(($results | Where-Object { $_.duration_seconds } | Measure-Object -Property duration_seconds -Average).Average, 2)
Write-Host "Average output size: $avgSize KB"
Write-Host ("Average duration: " + $avgDuration + "s")

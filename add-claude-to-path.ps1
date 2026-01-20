# Add Claude CLI to User PATH
$claudePath = "C:\Users\fs_ro\.local\bin"
$currentPath = [Environment]::GetEnvironmentVariable("PATH", "User")

if ($currentPath -notlike "*$claudePath*") {
    [Environment]::SetEnvironmentVariable("PATH", "$claudePath;$currentPath", "User")
    Write-Host "SUCCESS: Added $claudePath to PATH" -ForegroundColor Green
    Write-Host ""
    Write-Host "IMPORTANT: Close and reopen PowerShell/Auto Claude for changes to take effect" -ForegroundColor Yellow
} else {
    Write-Host "Claude CLI path is already in PATH" -ForegroundColor Cyan
}

# Verify claude.exe exists
if (Test-Path "$claudePath\claude.exe") {
    Write-Host ""
    Write-Host "Claude CLI found at: $claudePath\claude.exe" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "WARNING: claude.exe not found at $claudePath" -ForegroundColor Red
}

# PowerShell script to send keystrokes to Chrome window
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName Microsoft.VisualBasic

Write-Host "=== Sending SSH Key Commands to Console ===" -ForegroundColor Cyan
Write-Host ""

# Find Chrome window
$chrome = Get-Process chrome -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $chrome) {
    Write-Host "[ERROR] Chrome is not running!" -ForegroundColor Red
    exit 1
}

Write-Host "[1] Found Chrome process (PID: $($chrome.Id))"

# Activate Chrome window
Write-Host "[2] Activating Chrome window..."
[Microsoft.VisualBasic.Interaction]::AppActivate($chrome.Id)
Start-Sleep -Seconds 2

# Send commands
$commands = @(
    "mkdir -p ~/.ssh",
    'echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIEuhmIZg/3wdVhlLw8PHGaWojwoFEl6pIFMhuuc6q0qb claude" >> ~/.ssh/authorized_keys',
    "chmod 600 ~/.ssh/authorized_keys",
    "cat ~/.ssh/authorized_keys",
    'echo "SSH_KEY_ADDED_OK"'
)

Write-Host "[3] Sending commands..." -ForegroundColor Yellow
Write-Host ""

foreach ($cmd in $commands) {
    Write-Host "    > $($cmd.Substring(0, [Math]::Min(60, $cmd.Length)))$(if($cmd.Length -gt 60){'...'})" -ForegroundColor Green

    # Type each character slowly
    foreach ($char in $cmd.ToCharArray()) {
        [System.Windows.Forms.SendKeys]::SendWait($char)
        Start-Sleep -Milliseconds 20
    }

    # Press Enter
    [System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
    Start-Sleep -Seconds 2
}

Write-Host ""
Write-Host "[4] All commands sent!" -ForegroundColor Cyan
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Check Chrome console - you should see:" -ForegroundColor White
Write-Host "  - The SSH key displayed" -ForegroundColor White
Write-Host "  - 'SSH_KEY_ADDED_OK' message" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan

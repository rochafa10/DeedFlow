# Fix Auto Claude PATH issue
# This patches auth.py to pass PATH to subprocesses

$authFile = "C:\Users\fs_ro\AppData\Local\Programs\auto-claude-ui\resources\backend\core\auth.py"

# Backup original
Copy-Item $authFile "$authFile.backup" -Force
Write-Host "Backed up original file" -ForegroundColor Cyan

# Read content
$content = Get-Content $authFile -Raw

# Check if already patched
if ($content -match '"PATH"') {
    Write-Host "File already patched - PATH is already in SDK_ENV_VARS" -ForegroundColor Yellow
    exit 0
}

# Find and replace
$oldText = @'
    "CLAUDE_CODE_GIT_BASH_PATH",
]
'@

$newText = @'
    "CLAUDE_CODE_GIT_BASH_PATH",
    # System PATH for executable resolution (fix for require not defined error)
    "PATH",
]
'@

$content = $content -replace [regex]::Escape($oldText), $newText

# Write back
Set-Content $authFile -Value $content -NoNewline

Write-Host ""
Write-Host "SUCCESS: Patched auth.py to include PATH in SDK_ENV_VARS" -ForegroundColor Green
Write-Host ""
Write-Host "Now restart Auto Claude for the fix to take effect" -ForegroundColor Yellow

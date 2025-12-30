$timestamp = Get-Date -Format "yyyyMMdd_HHmm"
$backupDir = ".\Backups"
if (!(Test-Path -Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
}

$zipName = "Antigravity_Full_Backup_$timestamp.zip"
$zipPath = "$backupDir\$zipName"

Write-Host "Starting Backup..."
Write-Host "Target: $zipPath"
Write-Host "Excluding: node_modules, .git, dist, .gemini, backups"

# Use tar for speed and exclusions
# -a = Auto-detect compression (zip) based on extension
# -c = Create
# -f = File
tar -a -cf $zipPath --exclude "node_modules" --exclude ".git" --exclude "dist" --exclude "dist_production" --exclude ".gemini" --exclude "Backups" --exclude "coverage" *

if (Test-Path $zipPath) {
    Write-Host "✅ Backup Successful!" -ForegroundColor Green
    Write-Host "Location: $(Resolve-Path $zipPath)"
} else {
    Write-Host "❌ Backup Failed." -ForegroundColor Red
}

# Bi-Directional Sync Monitor (Automation)
# Run this script in a dedicated PowerShell terminal

$PULL_INTERVAL_SECONDS = 300 # 5 minutes
$lastPullTime = [DateTime]::MinValue

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   QIX ADS BI-DIRECTIONAL SYNC MONITOR   " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Monitoring for changes and pulling updates..." -ForegroundColor Gray

while ($true) {
    $now = Get-Date
    
    # 1. Periodically Pull from Cloud (Automatic)
    if (($now - $lastPullTime).TotalSeconds -ge $PULL_INTERVAL_SECONDS) {
        Write-Host "[$($now.ToShortTimeString())] Periodic Pull: Checking for Cloud Updates..." -ForegroundColor Yellow
        powershell.exe -ExecutionPolicy Bypass -File ".\pull_from_vps.ps1"
        $lastPullTime = Get-Date
    }

    # 2. Manual Trigger Detection (Optional: can add file system watcher here)
    # For now, we recommend using the "Push to Cloud" button in the Dashboard for immediate updates.
    # However, we can add a simple check for local file changes in 'client/src' or 'server/src'.
    
    Start-Sleep -Seconds 60
}

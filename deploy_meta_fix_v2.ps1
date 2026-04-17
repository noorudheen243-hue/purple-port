Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"
$User = "root"
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)

Write-Host "Connecting to VPS..." -ForegroundColor Cyan
$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force
Write-Host "Connected!" -ForegroundColor Green

$APP = "/var/www/purple-port/server"

function Run($cmd, $timeout = 300) {
    Write-Host "`n>> $cmd" -ForegroundColor DarkGray
    $r = Invoke-SSHCommand -SessionId $s.SessionId -Command $cmd -TimeOut $timeout
    if ($r.Output) { Write-Host $r.Output -ForegroundColor White }
    if ($r.Error -and $r.Error.Trim()) { Write-Host "ERR: $($r.Error)" -ForegroundColor Yellow }
    return $r
}

Write-Host "`n[1] Uploading fixed metaAdsService.ts (API v21.0)..." -ForegroundColor Yellow
Set-SCPItem -ComputerName $VPS -Credential $Cred `
    -Path "f:\Antigravity\server\src\modules\marketing-tasks\services\metaAdsService.ts" `
    -Destination "$APP/src/modules/marketing-tasks/services/" -Force

Write-Host "`n[2] Rebuilding TypeScript..." -ForegroundColor Yellow
Run "source `$HOME/.nvm/nvm.sh 2>/dev/null; cd $APP && npm run build 2>&1 | tail -5" 300

Write-Host "`n[3] Triggering full sync (last 100 days = all of 2026) in background..." -ForegroundColor Yellow
$triggerCode = 'const { MarketingSyncWorker } = require(\"./dist/modules/marketing-tasks/sync/syncWorker.js\"); MarketingSyncWorker.syncAllActiveCampaigns(100).then(() => { console.log(\"Sync completed\"); process.exit(0); }).catch(e => { console.error(\"Sync failed:\", e.message); process.exit(1); });'
Run "source `$HOME/.nvm/nvm.sh 2>/dev/null; cd $APP && nohup node -e '$triggerCode' > /tmp/meta_sync.log 2>&1 &
echo 'Sync started in background (PID: '$!')'
sleep 2 && head -20 /tmp/meta_sync.log" 30

Write-Host "`n[4] Restarting PM2 with new build..." -ForegroundColor Yellow
Run "source `$HOME/.nvm/nvm.sh 2>/dev/null; pm2 restart all --update-env && pm2 save" 30

Write-Host "`n[5] Health check..." -ForegroundColor Yellow
Run "sleep 3 && curl -s http://localhost:4001/health" 15

Remove-SSHSession -SessionId $s.SessionId | Out-Null
Write-Host "`nDone! Sync is running in background. Monitor: ssh root@66.116.224.221 'tail -f /tmp/meta_sync.log'" -ForegroundColor Green

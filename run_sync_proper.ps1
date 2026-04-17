Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)
$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force
$APP = "/var/www/purple-port/server"

function Run($cmd, $timeout = 300) {
    $r = Invoke-SSHCommand -SessionId $s.SessionId -Command $cmd -TimeOut $timeout
    if ($r.Output) { Write-Host $r.Output -ForegroundColor White }
    if ($r.Error -and $r.Error.Trim()) { Write-Host "ERR: $($r.Error)" -ForegroundColor Yellow }
    return $r
}

# Step 1: Write the sync runner script directly on the VPS to avoid quoting hell
Write-Host "[1] Writing sync runner script directly on VPS..." -ForegroundColor Cyan
$syncScript = @'
const { MarketingSyncWorker } = require('./dist/modules/marketing-tasks/sync/syncWorker.js');
console.log('[SYNC] Starting full sync for 100 days...');
MarketingSyncWorker.syncAllActiveCampaigns(100)
    .then(() => {
        console.log('[SYNC] COMPLETED SUCCESSFULLY');
        process.exit(0);
    })
    .catch(err => {
        console.error('[SYNC] FAILED:', err.message);
        process.exit(1);
    });
'@

# Upload the sync runner script
$syncScript | Set-Content -Path "f:\Antigravity\tmp_sync_runner.js" -Encoding UTF8
Set-SCPItem -ComputerName $VPS -Credential $Cred -Path "f:\Antigravity\tmp_sync_runner.js" -Destination "$APP/" -Force
Write-Host " -> Uploaded sync_runner.js" -ForegroundColor Green

# Step 2: Run it in background with nohup
Write-Host "[2] Starting sync in background on VPS..." -ForegroundColor Cyan
Run "source `$HOME/.nvm/nvm.sh 2>/dev/null; cd $APP && nohup node tmp_sync_runner.js > /tmp/meta_sync.log 2>&1 & echo 'Sync PID: '$!'" 10

# Step 3: Wait 10 seconds and check early log
Write-Host "[3] Waiting 10s to check initial log..." -ForegroundColor Cyan
Start-Sleep 10
Run "head -30 /tmp/meta_sync.log" 15

Remove-SSHSession -SessionId $s.SessionId | Out-Null
Write-Host "`nSync is running in background on VPS." -ForegroundColor Green
Write-Host "Monitor: run check_sync_progress.ps1 again after 1-2 minutes." -ForegroundColor Yellow

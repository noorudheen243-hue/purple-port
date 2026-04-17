Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"
$User = "root"
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

$APP = "/var/www/purple-port/server"
$triggerCode = "const { MarketingSyncWorker } = require('./dist/modules/marketing-tasks/sync/syncWorker.js'); MarketingSyncWorker.syncAllActiveCampaigns(100).then(() => { console.log('Sync completed gracefully'); process.exit(0); }).catch(e => { console.error('Sync failed:', e); process.exit(1); });"

Write-Host "Triggering Database Sync on VPS for the last 100 days (covers all of 2026)..." -ForegroundColor Cyan
$cmd = "source `$HOME/.nvm/nvm.sh 2>/dev/null; cd $APP && node -e ""$triggerCode"""
$r = Invoke-SSHCommand -SessionId $s.SessionId -Command $cmd -TimeOut 300

Write-Host $r.Output
if ($r.Error) { Write-Host "ERR: " $r.Error -ForegroundColor Yellow }

Remove-SSHSession -SessionId $s.SessionId | Out-Null
Write-Host "Finished." -ForegroundColor Green

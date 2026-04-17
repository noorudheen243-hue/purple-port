Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)
$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force
$APP = "/var/www/purple-port/server"

function Run($cmd, $timeout = 300) {
    Write-Host "`n>> $cmd" -ForegroundColor DarkGray
    $r = Invoke-SSHCommand -SessionId $s.SessionId -Command $cmd -TimeOut $timeout
    if ($r.Output) { Write-Host $r.Output -ForegroundColor White }
    if ($r.Error -and $r.Error.Trim()) { Write-Host "ERR: $($r.Error)" -ForegroundColor Yellow }
    return $r
}

Write-Host "[1] Uploading all fixed files..." -ForegroundColor Cyan
Set-SCPItem -ComputerName $VPS -Credential $Cred `
    -Path "f:\Antigravity\server\src\modules\marketing-tasks\controller.ts" `
    -Destination "$APP/src/modules/marketing-tasks/" -Force
Set-SCPItem -ComputerName $VPS -Credential $Cred `
    -Path "f:\Antigravity\server\src\modules\marketing-tasks\services\metaLeadsService.ts" `
    -Destination "$APP/src/modules/marketing-tasks/services/" -Force
Set-SCPItem -ComputerName $VPS -Credential $Cred `
    -Path "f:\Antigravity\server\src\modules\ad_intelligence\meta.service.ts" `
    -Destination "$APP/src/modules/ad_intelligence/" -Force
Write-Host " -> All files uploaded" -ForegroundColor Green

Write-Host "[2] Building server..." -ForegroundColor Cyan
Run "source `$HOME/.nvm/nvm.sh 2>/dev/null; cd $APP && npm run build 2>&1 | tail -5" 300

Write-Host "[3] Restarting PM2..." -ForegroundColor Cyan
Run "source `$HOME/.nvm/nvm.sh 2>/dev/null; pm2 restart all --update-env && pm2 save" 30

Write-Host "[4] Health check..." -ForegroundColor Cyan
Run "sleep 2 && curl -s http://localhost:4001/health" 10

Remove-SSHSession -SessionId $s.SessionId | Out-Null
Write-Host "`nAll v19.0 → v21.0 fixes deployed!" -ForegroundColor Green

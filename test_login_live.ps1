# Test login + check antigravity app structure + deploy fix
Import-Module Posh-SSH -Force

$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

function Run($cmd, $timeout = 300) {
    Write-Host "`n>> $cmd" -ForegroundColor DarkGray
    $r = Invoke-SSHCommand -SessionId $s.SessionId -Command $cmd -TimeOut $timeout
    if ($r.Output) { Write-Host $r.Output -ForegroundColor White }
    if ($r.Error -and $r.Error.Trim()) { Write-Host "ERR: $($r.Error)" -ForegroundColor Yellow }
    return $r
}

$APP = "/var/www/antigravity"

Write-Host "`n[1] Test login API with client credentials" -ForegroundColor Yellow
Run "curl -sv -X POST http://localhost:4001/api/auth/login -H 'Content-Type: application/json' -d '{""email"":""qixads@qix.com"",""password"":""password123""}' 2>&1 | tail -30"

Write-Host "`n[2] Check structure of /var/www/antigravity" -ForegroundColor Yellow
Run "ls -lah $APP && ls $APP/dist/ 2>/dev/null | head -5"

Write-Host "`n[3] Check if antigravity has git + what version" -ForegroundColor Yellow
Run "cd $APP && git log -1 --oneline 2>/dev/null || echo 'No git at antigravity'"

Write-Host "`n[4] Check CLIENT users in the live DB being used by antigravity" -ForegroundColor Yellow
Run "cat $APP/.env 2>/dev/null || echo 'No .env at antigravity' && ls $APP/prisma/ 2>/dev/null"

Write-Host "`n[5] Test login with all known client emails" -ForegroundColor Yellow
Run "curl -s -X POST http://localhost:4001/api/auth/login -H 'Content-Type: application/json' -d '{""email"":""valuableservices@qix.com"",""password"":""password123""}' 2>&1 | head -5"
Run "curl -s -X POST http://localhost:4001/api/auth/login -H 'Content-Type: application/json' -d '{""email"":""drbasilhomeohospital@qix.com"",""password"":""password123""}' 2>&1 | head -5"

Write-Host "`n[6] Check PM2 out log for LOGIN messages" -ForegroundColor Yellow
Run "tail -20 /root/.pm2/logs/qix-backend-out.log"

Remove-SSHSession -SessionId $s.SessionId | Out-Null

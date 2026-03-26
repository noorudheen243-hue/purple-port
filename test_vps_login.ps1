# Test login API + check PM2 logs
Import-Module Posh-SSH -Force

$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

function Run($cmd, $timeout = 60) {
    Write-Host "`n>> $cmd" -ForegroundColor DarkGray
    $r = Invoke-SSHCommand -SessionId $s.SessionId -Command $cmd -TimeOut $timeout
    if ($r.Output) { Write-Host $r.Output -ForegroundColor White }
    if ($r.Error -and $r.Error.Trim()) { Write-Host "ERR: $($r.Error)" -ForegroundColor Yellow }
    return $r
}

Write-Host "`n[1] Health check" -ForegroundColor Yellow
Run "curl -sv http://localhost:4001/health 2>&1 | tail -20"

Write-Host "`n[2] Login test with verbose output" -ForegroundColor Yellow
Run "curl -sv -X POST http://localhost:4001/api/auth/login -H 'Content-Type: application/json' -d '{""email"":""qixads@qix.com"",""password"":""password123""}' 2>&1"

Write-Host "`n[3] PM2 latest logs after test" -ForegroundColor Yellow
Run "tail -30 /root/.pm2/logs/qix-backend-out.log 2>/dev/null"

Write-Host "`n[4] PM2 error logs" -ForegroundColor Yellow
Run "tail -20 /root/.pm2/logs/qix-backend-error.log 2>/dev/null"

Write-Host "`n[5] Check what server.js file is actually being served" -ForegroundColor Yellow
Run "ls -lah /var/www/purple-port/server/dist/server.js && stat /var/www/purple-port/server/dist/server.js | grep Modify"

Write-Host "`n[6] Check if LOGIN ATTEMPT log is in the deployed dist" -ForegroundColor Yellow
Run "grep -c 'LOGIN ATTEMPT' /var/www/purple-port/server/dist/server.js"

Remove-SSHSession -SessionId $s.SessionId | Out-Null

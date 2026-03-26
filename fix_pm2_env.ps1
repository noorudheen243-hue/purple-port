# Investigate hardcoded Prisma paths in antigravity
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

Write-Host "`n[1] Check what DATABASE_URL PM2 is actually passing to the process" -ForegroundColor Yellow
Run "source `$HOME/.nvm/nvm.sh 2>/dev/null; pm2 env 0 | grep DATABASE_URL"

Write-Host "`n[2] Check if Prisma client has hardcoded the old path" -ForegroundColor Yellow
Run "grep -A 5 -B 5 -r 'file:' /var/www/antigravity/node_modules/.prisma/client/schema.prisma 2>/dev/null"

Write-Host "`n[3] Explicitly restart PM2 by deleting and recreating the process with the correct .env" -ForegroundColor Yellow
Run "source `$HOME/.nvm/nvm.sh 2>/dev/null; cd /var/www/antigravity && pm2 delete qix-backend && pm2 start dist/server.js --name qix-backend --env production --cwd /var/www/antigravity && pm2 save"

Write-Host "`n[4] Wait and test health" -ForegroundColor Yellow
Run "sleep 4 && curl -s http://localhost:4001/health"

Write-Host "`n[5] Test client login NOW" -ForegroundColor Yellow
Run "curl -s -X POST http://localhost:4001/api/auth/login -H 'Content-Type: application/json' -d '{""email"":""qixads@qix.com"",""password"":""password123""}' | head -100"

Remove-SSHSession -SessionId $s.SessionId | Out-Null

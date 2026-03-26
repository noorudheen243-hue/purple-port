# Fix Prisma Connection permanently via Symlink
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

Write-Host "`n[1] Check if the live server has a working Prisma Client" -ForegroundColor Yellow
Run "ls -lah /var/www/purple-port/server/node_modules/@prisma/client/ 2>/dev/null | head -5"

Write-Host "`n[2] Replace antigravity Prisma Client with a symlink to the live one" -ForegroundColor Yellow
Run "rm -rf /var/www/antigravity/node_modules/@prisma"
Run "ln -s /var/www/purple-port/server/node_modules/@prisma /var/www/antigravity/node_modules/@prisma"
Run "ls -la /var/www/antigravity/node_modules/@prisma"

Write-Host "`n[3] Restart PM2" -ForegroundColor Yellow
Run "source `$HOME/.nvm/nvm.sh 2>/dev/null; pm2 restart qix-backend"

Write-Host "`n[4] Wait and test health" -ForegroundColor Yellow
Run "sleep 5 && curl -s http://localhost:4001/health"

Write-Host "`n[5] Test client login NOW" -ForegroundColor Yellow
Run "curl -s -X POST http://localhost:4001/api/auth/login -H 'Content-Type: application/json' -d '{""email"":""qixads@qix.com"",""password"":""password123""}' | head -100"

Write-Host "`n[6] Test an incorrect password to verify it's hitting the DB properly" -ForegroundColor Yellow
Run "curl -s -X POST http://localhost:4001/api/auth/login -H 'Content-Type: application/json' -d '{""email"":""qixads@qix.com"",""password"":""wrongpassword""}' | head -100"

Remove-SSHSession -SessionId $s.SessionId | Out-Null

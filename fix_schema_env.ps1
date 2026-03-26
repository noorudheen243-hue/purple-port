# Fix Prisma Schema to use env() correctly
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

Write-Host "`n[1] Check schema.prisma datasource" -ForegroundColor Yellow
Run "head -15 /var/www/antigravity/prisma/schema.prisma"

Write-Host "`n[2] Modify schema.prisma to use env(\"DATABASE_URL\")" -ForegroundColor Yellow
Run "sed -i 's|url      = \"file:./dev.db\"|url      = env(\"DATABASE_URL\")|g' /var/www/antigravity/prisma/schema.prisma"
Run "head -15 /var/www/antigravity/prisma/schema.prisma"

Write-Host "`n[3] Regenerate Prisma Client" -ForegroundColor Yellow
Run "source `$HOME/.nvm/nvm.sh 2>/dev/null; cd /var/www/antigravity && npx prisma generate" 120

Write-Host "`n[4] Restart PM2" -ForegroundColor Yellow
Run "source `$HOME/.nvm/nvm.sh 2>/dev/null; pm2 restart qix-backend && pm2 save"

Write-Host "`n[5] Wait and test health" -ForegroundColor Yellow
Run "sleep 4 && curl -s http://localhost:4001/health"

Write-Host "`n[6] Test client login NOW" -ForegroundColor Yellow
Run "curl -s -X POST http://localhost:4001/api/auth/login -H 'Content-Type: application/json' -d '{""email"":""qixads@qix.com"",""password"":""password123""}' | head -100"

Remove-SSHSession -SessionId $s.SessionId | Out-Null

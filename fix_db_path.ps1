# Fix antigravity .env to point to correct DB, then restart
Import-Module Posh-SSH -Force

$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

function Run($cmd, $timeout = 120) {
    Write-Host "`n>> $cmd" -ForegroundColor DarkGray
    $r = Invoke-SSHCommand -SessionId $s.SessionId -Command $cmd -TimeOut $timeout
    if ($r.Output) { Write-Host $r.Output -ForegroundColor White }
    if ($r.Error -and $r.Error.Trim()) { Write-Host "ERR: $($r.Error)" -ForegroundColor Yellow }
    return $r
}

Write-Host "`n[1] Show current .env files at both locations" -ForegroundColor Yellow
Run "cat /var/www/antigravity/.env 2>/dev/null || echo 'NO .env at antigravity'"
Run "cat /var/www/purple-port/server/.env 2>/dev/null"

Write-Host "`n[2] Backup and fix /var/www/antigravity/.env to point to the correct DB" -ForegroundColor Yellow
# The live DB is at /var/www/purple-port/server/prisma/dev.db
Run "cp /var/www/antigravity/.env /var/www/antigravity/.env.backup.$(date +%Y%m%d) 2>/dev/null; echo backed_up"
Run "cat /var/www/antigravity/.env"

# Update DATABASE_URL to point to the real live database
Run "sed -i 's|DATABASE_URL=.*|DATABASE_URL=file:/var/www/purple-port/server/prisma/dev.db|' /var/www/antigravity/.env && echo 'DATABASE_URL updated' || echo 'FAILED to update'"
Run "grep DATABASE_URL /var/www/antigravity/.env"

Write-Host "`n[3] Restart PM2 with updated env" -ForegroundColor Yellow
Run "source `$HOME/.nvm/nvm.sh 2>/dev/null; pm2 restart qix-backend --update-env && pm2 save && echo 'PM2 restarted'" 30

Write-Host "`n[4] Health check" -ForegroundColor Yellow
Run "sleep 5 && curl -s http://localhost:4001/health" 15

Write-Host "`n[5] Test client login NOW" -ForegroundColor Yellow
Run "curl -s -X POST http://localhost:4001/api/auth/login -H 'Content-Type: application/json' -d '{""email"":""qixads@qix.com"",""password"":""password123""}'"

Write-Host "`n[6] Test another client" -ForegroundColor Yellow
Run "curl -s -X POST http://localhost:4001/api/auth/login -H 'Content-Type: application/json' -d '{""email"":""valuableservices@qix.com"",""password"":""password123""}' | head -3"

Write-Host "`n[7] Show full list of CLIENT users in the CORRECT DB" -ForegroundColor Yellow
Run "source `$HOME/.nvm/nvm.sh 2>/dev/null; cd /var/www/antigravity && node -e ""const{PrismaClient}=require('./node_modules/@prisma/client');const p=new PrismaClient();p.user.findMany({where:{role:'CLIENT'},select:{id:true,email:true,full_name:true}}).then(r=>{console.log(JSON.stringify(r,null,2));return p.\`$disconnect();})"""

Remove-SSHSession -SessionId $s.SessionId | Out-Null
Write-Host "`nDone! Test at: https://www.qixport.com" -ForegroundColor Green

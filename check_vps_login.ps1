# Check production server logs and test client login API
Import-Module Posh-SSH -Force

$VPS = "66.116.224.221"
$User = "root"
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)

Write-Host "Connecting to VPS..." -ForegroundColor Cyan
$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force
Write-Host "Connected!" -ForegroundColor Green

function Run($cmd, $timeout = 60) {
    Write-Host "`n>> $cmd" -ForegroundColor DarkGray
    $r = Invoke-SSHCommand -SessionId $s.SessionId -Command $cmd -TimeOut $timeout
    if ($r.Output) { Write-Host $r.Output -ForegroundColor White }
    if ($r.Error -and $r.Error.Trim()) { Write-Host "ERR: $($r.Error)" -ForegroundColor Yellow }
    return $r
}

Write-Host "`n[1] Check PM2 logs (last 50 lines)" -ForegroundColor Yellow
Run "source `$HOME/.nvm/nvm.sh 2>/dev/null; pm2 logs --nostream --lines 50 2>/dev/null || tail -50 /root/.pm2/logs/qix-backend-out.log 2>/dev/null"

Write-Host "`n[2] Health check on server" -ForegroundColor Yellow
Run "curl -s http://localhost:4001/health"

Write-Host "`n[3] Test the login API directly with a known client credential" -ForegroundColor Yellow
Run "curl -s -X POST http://localhost:4001/api/auth/login -H 'Content-Type: application/json' -d '{""email"":""qixads@qix.com"",""password"":""password123""}' | head -100"

Write-Host "`n[4] Test another client email" -ForegroundColor Yellow
Run "curl -s -X POST http://localhost:4001/api/auth/login -H 'Content-Type: application/json' -d '{""email"":""valuableservices@qix.com"",""password"":""password123""}' | head -200"

Write-Host "`n[5] Show PM2 error logs" -ForegroundColor Yellow
Run "tail -30 /root/.pm2/logs/qix-backend-error.log 2>/dev/null || echo 'No error log found'"

Write-Host "`n[6] Confirm which server.js is running (grep key function)" -ForegroundColor Yellow
Run "grep -c 'LOGIN ATTEMPT' /var/www/purple-port/server/dist/server.js 2>/dev/null || echo '0 matches'"

Write-Host "`n[7] Check all client users with their hashes to verify they are set" -ForegroundColor Yellow
Run "source `$HOME/.nvm/nvm.sh 2>/dev/null; cd /var/www/purple-port && node -e ""const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.user.findMany({where:{role:'CLIENT'},select:{id:true,email:true,full_name:true,password_hash:true}}).then(r=>{r.forEach(u=>console.log(u.email + ' | hash_set: ' + (u.password_hash?'YES':'NO')));return p.\`$disconnect();})"""

Remove-SSHSession -SessionId $s.SessionId | Out-Null

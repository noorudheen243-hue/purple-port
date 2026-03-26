# Fix Client Login on Correct VPS Path: /var/www/purple-port/server
Import-Module Posh-SSH -Force

$VPS = "66.116.224.221"
$User = "root"
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)

Write-Host "Connecting to VPS..." -ForegroundColor Cyan
$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force
Write-Host "Connected!" -ForegroundColor Green

function Run($cmd, $timeout = 300) {
    Write-Host "`n>> $cmd" -ForegroundColor DarkGray
    $r = Invoke-SSHCommand -SessionId $s.SessionId -Command $cmd -TimeOut $timeout
    if ($r.Output) { Write-Host $r.Output -ForegroundColor White }
    if ($r.Error -and $r.Error.Trim()) { Write-Host "ERR: $($r.Error)" -ForegroundColor Yellow }
    return $r
}

$APP = "/var/www/purple-port/server"

Write-Host "`n[1] Verify the live DB exists and show CLIENT users" -ForegroundColor Yellow
Run "ls -lah $APP/prisma/dev.db 2>/dev/null || echo 'DB NOT FOUND'"
Run "source `$HOME/.nvm/nvm.sh 2>/dev/null; cd $APP && node -e ""const{PrismaClient}=require('./node_modules/@prisma/client');const p=new PrismaClient();p.user.findMany({where:{role:'CLIENT'},select:{id:true,email:true,full_name:true}}).then(r=>{console.log(JSON.stringify(r,null,2));return p.\`$disconnect();})"""

Write-Host "`n[2] Fix any uppercase/wrong-case emails for CLIENT users" -ForegroundColor Yellow
Run "source `$HOME/.nvm/nvm.sh 2>/dev/null; cd $APP && node -e ""const{PrismaClient}=require('./node_modules/@prisma/client');const p=new PrismaClient();p.user.findMany({where:{role:'CLIENT'},select:{id:true,email:true}}).then(async r=>{let fx=0;for(const u of r){const n=u.email.trim().toLowerCase();if(n!==u.email){await p.user.update({where:{id:u.id},data:{email:n}});console.log('FIXED: '+u.email+' -> '+n);fx++;}else{console.log('OK: '+u.email);}}console.log('Fixed '+fx);return p.\`$disconnect();})"""

Write-Host "`n[3] Git pull at the parent repo level" -ForegroundColor Yellow
Run "cd /var/www/purple-port && git fetch --all && git reset --hard origin/main && git log -1 --oneline" 60

Write-Host "`n[4] Install server deps" -ForegroundColor Yellow
Run "source `$HOME/.nvm/nvm.sh 2>/dev/null; cd $APP && npm install --no-audit 2>&1 | tail -5" 300

Write-Host "`n[5] Build server TypeScript" -ForegroundColor Yellow
Run "source `$HOME/.nvm/nvm.sh 2>/dev/null; cd $APP && npm run build 2>&1 | tail -10" 300

Write-Host "`n[6] Build client frontend" -ForegroundColor Yellow
Run "source `$HOME/.nvm/nvm.sh 2>/dev/null; cd /var/www/purple-port/client && npm install --no-audit --silent 2>&1 | tail -3 && npm run build 2>&1 | tail -10" 600

Write-Host "`n[7] Copy frontend dist -> server/public" -ForegroundColor Yellow
Run "mkdir -p $APP/public && cp -rf /var/www/purple-port/client/dist/* $APP/public/ && echo 'Frontend copied OK' && ls $APP/public/ | head -5"

Write-Host "`n[8] Restart PM2 (qix-backend)" -ForegroundColor Yellow
Run "source `$HOME/.nvm/nvm.sh 2>/dev/null; pm2 restart qix-backend && pm2 save && echo 'PM2 restarted OK'" 30

Write-Host "`n[9] Health check" -ForegroundColor Yellow
Run "sleep 4 && curl -s http://localhost:4001/health" 15

Write-Host "`n[10] Final check - CLIENT users" -ForegroundColor Yellow
Run "source `$HOME/.nvm/nvm.sh 2>/dev/null; cd $APP && node -e ""const{PrismaClient}=require('./node_modules/@prisma/client');const p=new PrismaClient();p.user.findMany({where:{role:'CLIENT'},select:{id:true,email:true,full_name:true,linked_client_id:true}}).then(r=>{console.log(JSON.stringify(r,null,2));return p.\`$disconnect();})"""

Remove-SSHSession -SessionId $s.SessionId | Out-Null
Write-Host "`nDone! Test: https://www.qixport.com" -ForegroundColor Green

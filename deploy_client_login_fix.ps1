# VPS Deploy + Fix Client Login
# Connects via Posh-SSH and runs full deployment

Import-Module Posh-SSH -Force

$VPS = "66.116.224.221"
$User = "root"
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)

Write-Host "Connecting to VPS..." -ForegroundColor Cyan
$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force
Write-Host "Connected (Session $($s.SessionId))" -ForegroundColor Green

function Run($cmd, $timeout = 300) {
    Write-Host "  >> $cmd" -ForegroundColor DarkGray
    $r = Invoke-SSHCommand -SessionId $s.SessionId -Command $cmd -TimeOut $timeout
    if ($r.Output) { Write-Host $r.Output -ForegroundColor White }
    if ($r.Error -and $r.Error.Trim()) { Write-Host "STDERR: $($r.Error)" -ForegroundColor Yellow }
    return $r
}

Write-Host "`n[STEP 1] Check existing client users in production DB" -ForegroundColor Yellow
Run 'source $HOME/.nvm/nvm.sh 2>/dev/null; cd /var/www/purple-port && node -e "const {PrismaClient}=require(\"@prisma/client\");const p=new PrismaClient();p.user.findMany({where:{role:\"CLIENT\"},select:{id:true,email:true,full_name:true}}).then(r=>{console.log(JSON.stringify(r,null,2));return p.\$disconnect();})"'

Write-Host "`n[STEP 2] Fix any uppercase emails in CLIENT users" -ForegroundColor Yellow
Run 'source $HOME/.nvm/nvm.sh 2>/dev/null; cd /var/www/purple-port && node -e "
const {PrismaClient}=require(\"@prisma/client\");
const p=new PrismaClient();
p.user.findMany({where:{role:\"CLIENT\"},select:{id:true,email:true}}).then(async r=>{
  let fixed=0;
  for(const u of r){
    const n=u.email.trim().toLowerCase();
    if(n!==u.email){
      await p.user.update({where:{id:u.id},data:{email:n}});
      console.log(\"Fixed: \"+u.email+\" -> \"+n);
      fixed++;
    }
  }
  console.log(\"Fixed \"+fixed+\" email(s)\");
  return p.\$disconnect();
})"'

Write-Host "`n[STEP 3] Git pull latest code" -ForegroundColor Yellow
Run 'cd /var/www/purple-port && git fetch --all && git reset --hard origin/main && git log -1 --oneline' 120

Write-Host "`n[STEP 4] Install dependencies" -ForegroundColor Yellow
Run 'source $HOME/.nvm/nvm.sh 2>/dev/null; cd /var/www/purple-port && npm install --no-audit 2>&1 | tail -5' 180

Write-Host "`n[STEP 5] Build backend (TypeScript -> JS)" -ForegroundColor Yellow
Run 'source $HOME/.nvm/nvm.sh 2>/dev/null; cd /var/www/purple-port && npm run build 2>&1 | tail -10' 180

Write-Host "`n[STEP 6] Build frontend (React -> public/)" -ForegroundColor Yellow
Run 'source $HOME/.nvm/nvm.sh 2>/dev/null; cd /var/www/purple-port && npm run build:client 2>&1 | tail -10 || echo "No client build script, skipping"' 300

Write-Host "`n[STEP 7] Restart PM2 server" -ForegroundColor Yellow
Run 'source $HOME/.nvm/nvm.sh 2>/dev/null; pm2 restart antigravity-app || pm2 restart all && echo "Restarted OK"' 30

Write-Host "`n[STEP 8] Verify server is running" -ForegroundColor Yellow
Run 'sleep 3 && curl -s http://localhost:4001/health || echo "Health check failed"' 15

Write-Host "`n[STEP 9] Verify client users after fix" -ForegroundColor Yellow
Run 'source $HOME/.nvm/nvm.sh 2>/dev/null; cd /var/www/purple-port && node -e "const {PrismaClient}=require(\"@prisma/client\");const p=new PrismaClient();p.user.findMany({where:{role:\"CLIENT\"},select:{id:true,email:true,full_name:true,linked_client_id:true}}).then(r=>{console.log(JSON.stringify(r,null,2));return p.\$disconnect();})"'

Remove-SSHSession -SessionId $s.SessionId | Out-Null
Write-Host "`nDeployment Complete! Test at: https://www.qixport.com" -ForegroundColor Green

Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)
$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

# Check sync log progress
$r = Invoke-SSHCommand -SessionId $s.SessionId -Command "tail -40 /tmp/meta_sync.log 2>/dev/null || echo 'Sync log not yet created'"
Write-Host "=== SYNC LOG ===" -ForegroundColor Cyan
Write-Host $r.Output

# Also check DB row counts
$APP = "/var/www/purple-port/server"
$dbCode = 'const {PrismaClient}=require("./node_modules/@prisma/client");const p=new PrismaClient();Promise.all([p.marketingMetric.count(),p.marketingCampaign.count(),p.marketingCampaign.count({where:{status:"ACTIVE"}})]).then(([m,c,a])=>{console.log("Metrics rows:",m,"| Campaigns:",c,"| ACTIVE:",a);return p.$disconnect();})'
$r2 = Invoke-SSHCommand -SessionId $s.SessionId -Command "source `$HOME/.nvm/nvm.sh 2>/dev/null; cd $APP && node -e '$dbCode'" -TimeOut 30
Write-Host "`n=== DB COUNTS ===" -ForegroundColor Cyan
Write-Host $r2.Output

Remove-SSHSession -SessionId $s.SessionId | Out-Null

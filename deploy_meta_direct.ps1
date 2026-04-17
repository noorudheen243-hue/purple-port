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

Write-Host "`n[1] Uploading modified API files..." -ForegroundColor Yellow
$localSync = "f:\Antigravity\server\src\modules\marketing-tasks\sync\syncWorker.ts"
$remoteSync = "$APP/src/modules/marketing-tasks/sync/"

$localMeta = "f:\Antigravity\server\src\modules\marketing-tasks\services\metaAdsService.ts"
$remoteMeta = "$APP/src/modules/marketing-tasks/services/"

Set-SCPItem -ComputerName $VPS -Credential $Cred -Path $localSync -Destination $remoteSync -Force
Set-SCPItem -ComputerName $VPS -Credential $Cred -Path $localMeta -Destination $remoteMeta -Force

Write-Host "`n[2] Building server TypeScript..." -ForegroundColor Yellow
Run "source `$HOME/.nvm/nvm.sh 2>/dev/null; cd $APP && npm run build 2>&1 | tail -10" 300

Write-Host "`n[3] Wiping stale metrics & resetting campaign status..." -ForegroundColor Yellow
Run "source `$HOME/.nvm/nvm.sh 2>/dev/null; cd $APP && node -e ""const {PrismaClient}=require('./node_modules/@prisma/client'); const p=new PrismaClient(); p.marketingMetric.deleteMany({where:{campaign:{platform:'meta'}}}).then(r=>{console.log('Wiped metrics:', r.count); return p.marketingCampaign.updateMany({where:{platform:'meta'},data:{status:'UNKNOWN'}});}).then(r=>{console.log('Reset campaigns:', r.count); return p.\`$disconnect();});""" 60

Write-Host "`n[4] Restarting PM2 (qix-backend)..." -ForegroundColor Yellow
Run "source `$HOME/.nvm/nvm.sh 2>/dev/null; pm2 restart qix-backend && pm2 save" 30

Remove-SSHSession -SessionId $s.SessionId | Out-Null
Write-Host "`n[5] Deployment and Data reset complete." -ForegroundColor Green

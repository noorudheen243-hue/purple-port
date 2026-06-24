Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"
$User = "root"
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)

try {
    Write-Host "Connecting SSH and SFTP to VPS..." -ForegroundColor Cyan
    $sftp = New-SFTPSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force
    $ssh = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

    function Run($cmd) {
        Write-Host "`n>> $cmd" -ForegroundColor DarkGray
        $r = Invoke-SSHCommand -SessionId $ssh.SessionId -Command $cmd -TimeOut 600
        if ($r.Output) { Write-Host $r.Output -ForegroundColor White }
        if ($r.Error -and $r.Error.Trim()) { Write-Host "ERR: $($r.Error)" -ForegroundColor Yellow }
        return $r
    }

    Write-Host "Uploading updated source files..." -ForegroundColor Yellow
    Set-SFTPItem -SFTPSession $sftp -Path "f:\Antigravity\server\src\modules\marketing-tasks\services\metaAdsService.ts" -Destination "/var/www/purple-port/server/src/modules/marketing-tasks/services/" -Force
    Set-SFTPItem -SFTPSession $sftp -Path "f:\Antigravity\server\src\modules\marketing-tasks\services\metaLeadsService.ts" -Destination "/var/www/purple-port/server/src/modules/marketing-tasks/services/" -Force
    Set-SFTPItem -SFTPSession $sftp -Path "f:\Antigravity\server\src\modules\marketing-tasks\controller.ts" -Destination "/var/www/purple-port/server/src/modules/marketing-tasks/" -Force
    Set-SFTPItem -SFTPSession $sftp -Path "f:\Antigravity\server\src\modules\marketing-tasks\routes.ts" -Destination "/var/www/purple-port/server/src/modules/marketing-tasks/" -Force
    Set-SFTPItem -SFTPSession $sftp -Path "f:\Antigravity\server\src\modules\marketing-tasks\sync\syncWorker.ts" -Destination "/var/www/purple-port/server/src/modules/marketing-tasks/sync/" -Force
    Set-SFTPItem -SFTPSession $sftp -Path "f:\Antigravity\server\src\modules\ad_intelligence\meta.service.ts" -Destination "/var/www/purple-port/server/src/modules/ad_intelligence/" -Force

    Write-Host "Creating database backup on VPS..." -ForegroundColor Yellow
    Run "cp /var/www/purple-port/server/prisma/dev.db /var/www/purple-port/server/prisma/dev_backup_`$(date +%Y%m%d_%H%M%S).db 2>/dev/null || echo 'Database backup skipped or not found'"

    Write-Host "Rebuilding server and restarting PM2 on VPS..." -ForegroundColor Yellow
    Run "source `$HOME/.nvm/nvm.sh 2>/dev/null; cd /var/www/purple-port/server && npm run build"
    Run "source `$HOME/.nvm/nvm.sh 2>/dev/null; pm2 restart qix-api"
    Run "source `$HOME/.nvm/nvm.sh 2>/dev/null; pm2 status"

    Write-Host "`nPATCH DEPLOYMENT COMPLETED!" -ForegroundColor Green
}
catch {
    Write-Error "Deployment failed: $($_.Exception.Message)"
}
finally {
    if ($sftp) { Remove-SFTPSession -SFTPSession $sftp | Out-Null }
    if ($ssh) { Remove-SSHSession -SessionId $ssh.SessionId | Out-Null }
}

Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)

try {
    Write-Host ">>> Opening Sessions..."
    $sftpSession = New-SFTPSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force
    $sshSession = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force
    
    $sftpId = $sftpSession.SessionId
    $sshId = $sshSession.SessionId

    Write-Host "Uploading server files..."
    Set-SFTPItem -SessionId $sftpId -Path "f:\Antigravity\server\src\app.ts" -Destination "/var/www/purple-port/server/src" -Force
    Set-SFTPItem -SessionId $sftpId -Path "f:\Antigravity\server\src\modules\attendance\criteria.service.ts" -Destination "/var/www/purple-port/server/src/modules/attendance" -Force
    Set-SFTPItem -SessionId $sftpId -Path "f:\Antigravity\server\src\modules\attendance\service.ts" -Destination "/var/www/purple-port/server/src/modules/attendance" -Force
    Set-SFTPItem -SessionId $sftpId -Path "f:\Antigravity\server\src\modules\marketing-tasks\crm.controller.ts" -Destination "/var/www/purple-port/server/src/modules/marketing-tasks" -Force
    Set-SFTPItem -SessionId $sftpId -Path "f:\Antigravity\server\src\modules\marketing-tasks\crmMeta.controller.ts" -Destination "/var/www/purple-port/server/src/modules/marketing-tasks" -Force
    Set-SFTPItem -SessionId $sftpId -Path "f:\Antigravity\server\src\modules\marketing-tasks\routes.ts" -Destination "/var/www/purple-port/server/src/modules/marketing-tasks" -Force
    
    Write-Host "Uploading client files..."
    Set-SFTPItem -SessionId $sftpId -Path "f:\Antigravity\client\src\lib\utils.ts" -Destination "/var/www/purple-port/client/src/lib" -Force
    Set-SFTPItem -SessionId $sftpId -Path "f:\Antigravity\client\src\pages\attendance\BiometricDetailsPage.tsx" -Destination "/var/www/purple-port/client/src/pages/attendance" -Force
    Set-SFTPItem -SessionId $sftpId -Path "f:\Antigravity\client\src\pages\attendance\BiometricManagerPage.tsx" -Destination "/var/www/purple-port/client/src/pages/attendance" -Force
    Set-SFTPItem -SessionId $sftpId -Path "f:\Antigravity\client\src\pages\attendance\CalendarPage.tsx" -Destination "/var/www/purple-port/client/src/pages/attendance" -Force
    Set-SFTPItem -SessionId $sftpId -Path "f:\Antigravity\client\src\pages\tasks\TeamPerformance.tsx" -Destination "/var/www/purple-port/client/src/pages/tasks" -Force

    Write-Host "Rebuilding server..."
    $RemoteCMD1 = @"
cd /var/www/purple-port/server
npm run build
pm2 restart qix-api
"@
    $r1 = Invoke-SSHCommand -SessionId $sshId -Command $RemoteCMD1 -Timeout 120
    Write-Host "Server Build Output:"
    Write-Host $r1.Output

    Write-Host "Rebuilding client..."
    $RemoteCMD2 = @"
cd /var/www/purple-port/client
npm run build
pm2 restart qix-frontend
"@
    $r2 = Invoke-SSHCommand -SessionId $sshId -Command $RemoteCMD2 -Timeout 240
    Write-Host "Client Build Output:"
    Write-Host $r2.Output

    Write-Host "✅ FULL SYNC DEPLOYMENT SUCCESSFUL!"
} catch {
    Write-Error "❌ Deployment failed: $($_.Exception.Message)"
} finally {
    if ($sftpSession) { Remove-SFTPSession -SessionId $sftpId | Out-Null }
    if ($sshSession) { Remove-SSHSession -SessionId $sshId | Out-Null }
}

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

    Write-Host "Creating remote directories..."
    $RemoteCMD = @"
mkdir -p /var/www/purple-port/server/src/modules/creative-performance
mkdir -p /var/www/purple-port/client/src/pages/tasks/TeamPerformance
"@
    Invoke-SSHCommand -SessionId $sshId -Command $RemoteCMD | Out-Null

    Write-Host "Uploading schema and app.ts..."
    Set-SFTPItem -SessionId $sftpId -Path "f:\Antigravity\server\prisma\schema.prisma" -Destination "/var/www/purple-port/server/prisma" -Force
    Set-SFTPItem -SessionId $sftpId -Path "f:\Antigravity\server\src\app.ts" -Destination "/var/www/purple-port/server/src" -Force

    Write-Host "Uploading creative-performance module..."
    Set-SFTPItem -SessionId $sftpId -Path "f:\Antigravity\server\src\modules\creative-performance\creative-performance.routes.ts" -Destination "/var/www/purple-port/server/src/modules/creative-performance" -Force
    Set-SFTPItem -SessionId $sftpId -Path "f:\Antigravity\server\src\modules\creative-performance\creative-performance.controller.ts" -Destination "/var/www/purple-port/server/src/modules/creative-performance" -Force

    Write-Host "Uploading client files..."
    Set-SFTPItem -SessionId $sftpId -Path "f:\Antigravity\client\src\pages\tasks\TeamPerformance.tsx" -Destination "/var/www/purple-port/client/src/pages/tasks" -Force
    Set-SFTPItem -SessionId $sftpId -Path "f:\Antigravity\client\src\pages\tasks\TeamPerformance\CreativeServiceRateMaster.tsx" -Destination "/var/www/purple-port/client/src/pages/tasks/TeamPerformance" -Force
    Set-SFTPItem -SessionId $sftpId -Path "f:\Antigravity\client\src\pages\tasks\TeamPerformance\TaskMonetaryCalculator.tsx" -Destination "/var/www/purple-port/client/src/pages/tasks/TeamPerformance" -Force

    Write-Host "Rebuilding server and applying db push..."
    $RemoteCMD2 = @"
rm -f /var/www/purple-port/server/src/scripts/fix_status.ts /var/www/purple-port/server/src/scripts/fix_status2.ts
cd /var/www/purple-port/server
npx prisma db push
npx prisma generate
npm run build
pm2 restart qix-api
"@
    $r2 = Invoke-SSHCommand -SessionId $sshId -Command $RemoteCMD2
    Write-Host $r2.Output

    Write-Host "Rebuilding client..."
    $RemoteCMD3 = @"
cd /var/www/purple-port/client
npm run build
pm2 restart qix-client
"@
    $r3 = Invoke-SSHCommand -SessionId $sshId -Command $RemoteCMD3
    Write-Host $r3.Output

    Write-Host "✅ DEPLOYMENT SUCCESSFUL!"
} catch {
    Write-Error "❌ Deployment failed: $($_.Exception.Message)"
} finally {
    if ($sftpSession) { Remove-SFTPSession -SessionId $sftpId | Out-Null }
    if ($sshSession) { Remove-SSHSession -SessionId $sshId | Out-Null }
}

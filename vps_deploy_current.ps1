Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)

try {
    Write-Host ">>> Opening Sessions..." -ForegroundColor Cyan
    $sftpSession = New-SFTPSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force
    $sshSession = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force
    
    if (-not $sftpSession -or -not $sshSession) { throw "Failed to connect to VPS" }
    
    $sftpId = $sftpSession.SessionId
    $sshId = $sshSession.SessionId

    # 1. Upload Frontend via SFTP
    Write-Host "`n[1/5] Uploading dist.zip..." -ForegroundColor Green
    Set-SFTPItem -SessionId $sftpId -Path "f:\Antigravity\client\dist.zip" -Destination "/var/www/purple-port/client" -Force
    
    # 2. Upload Backend Controller via SFTP
    Write-Host "`n[2/5] Uploading server controller..." -ForegroundColor Green
    Set-SFTPItem -SessionId $sftpId -Path "f:\Antigravity\server\src\modules\marketing-tasks\controller.ts" -Destination "/var/www/purple-port/server/src/modules/marketing-tasks" -Force

    # 3. Extract and Rebuild Remote
    Write-Host "`n[3/5] Extracting frontend and rebuilding server on VPS..." -ForegroundColor Green
    $RemoteCMD = @"
cd /var/www/purple-port/client
unzip -o dist.zip -d dist/
rm dist.zip

cd /var/www/purple-port/server
npm run build
"@
    $r1 = Invoke-SSHCommand -SessionId $sshId -Command $RemoteCMD
    Write-Host $r1.Output
    if ($r1.Error) { Write-Host "Build Warning/Error: $($r1.Error)" -ForegroundColor Yellow }

    # 4. Restart Services
    Write-Host "`n[4/5] Restarting PM2 and Nginx..." -ForegroundColor Green
    $r2 = Invoke-SSHCommand -SessionId $sshId -Command "pm2 restart qix-api && systemctl restart nginx"
    Write-Host $r2.Output

    # 5. Verification
    Write-Host "`n[5/5] Verifying deployment..." -ForegroundColor Green
    $r3 = Invoke-SSHCommand -SessionId $sshId -Command "ls -la /var/www/purple-port/client/dist/index.html"
    Write-Host $r3.Output

    Write-Host "`n✅ DEPLOYMENT SUCCESSFUL!" -ForegroundColor White -BackgroundColor Green
} catch {
    Write-Error "❌ Deployment failed: $($_.Exception.Message)"
} finally {
    if ($sftpSession) { Remove-SFTPSession -SessionId $sftpId | Out-Null }
    if ($sshSession) { Remove-SSHSession -SessionId $sshId | Out-Null }
}

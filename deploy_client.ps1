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

    Write-Host "Uploading client files..."
    Set-SFTPItem -SessionId $sftpId -Path "f:\Antigravity\client\src\pages\tasks\TeamPerformance\TaskMonetaryCalculator.tsx" -Destination "/var/www/purple-port/client/src/pages/tasks/TeamPerformance" -Force

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

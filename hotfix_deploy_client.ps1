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

    Write-Host "Uploading updated UniversalTransactionRecorder.tsx..."
    Set-SFTPItem -SessionId $sftpId -Path "f:\Antigravity\client\src\pages\accounts\UniversalTransactionRecorder.tsx" -Destination "/var/www/purple-port/client/src/pages/accounts" -Force
    
    Write-Host "Rebuilding client..."
    $RemoteCMD = @"
source ~/.nvm/nvm.sh 2>/dev/null
cd /var/www/purple-port/client
npm run build
systemctl restart nginx
"@
    $r1 = Invoke-SSHCommand -SessionId $sshId -Command $RemoteCMD -TimeOut 600
    Write-Host $r1.Output

    Write-Host "✅ HOTFIX DEPLOYMENT SUCCESSFUL!"
} catch {
    Write-Error "❌ Deployment failed: $($_.Exception.Message)"
} finally {
    if ($sftpSession) { Remove-SFTPSession -SessionId $sftpId | Out-Null }
    if ($sshSession) { Remove-SSHSession -SessionId $sshId | Out-Null }
}

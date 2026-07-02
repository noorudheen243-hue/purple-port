Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)

try {
    Write-Host ">>> Opening Sessions..."
    $sshSession = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force
    $sshId = $sshSession.SessionId

    Write-Host "Rebuilding server..."
    $r1 = Invoke-SSHCommand -SessionId $sshId -Command "cd /var/www/purple-port/server && npm run build && pm2 restart qix-server" -Timeout 120
    Write-Host $r1.Output

    Write-Host "Rebuilding client..."
    $r2 = Invoke-SSHCommand -SessionId $sshId -Command "cd /var/www/purple-port/client && npm run build && pm2 restart qix-client" -Timeout 300
    Write-Host $r2.Output

    Write-Host "✅ DEPLOYMENT SUCCESSFUL!"
} catch {
    Write-Error "❌ Deployment failed: $($_.Exception.Message)"
} finally {
    if ($sshSession) { Remove-SSHSession -SessionId $sshId | Out-Null }
}

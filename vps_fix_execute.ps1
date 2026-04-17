$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)
try {
    $s = New-SSHSession -ComputerName "66.116.224.221" -Credential $Cred -AcceptKey -Force
    Write-Host "Connected. Fixing permissions..."
    $r1 = Invoke-SSHCommand -SessionId $s.SessionId -Command "chmod +x /var/www/purple-port/deploy_update.sh"
    Write-Host "Permissions fixed."
    
    Write-Host "Triggering deployment script..."
    # We use 'bash -c' to ensure full control and capture output
    $r2 = Invoke-SSHCommand -SessionId $s.SessionId -Command "cd /var/www/purple-port && bash deploy_update.sh"
    Write-Host "Deployment Output:"
    Write-Host $r2.Output
    if ($r2.Error) { Write-Host "ERROR: $($r2.Error)" }
    
    Write-Host "`nChecking PM2 status..."
    $r3 = Invoke-SSHCommand -SessionId $s.SessionId -Command "pm2 status qix-ads-v2.7"
    Write-Host $r3.Output
} catch {
    Write-Error $_.Exception.Message
} finally {
    if ($s) { Remove-SSHSession -SessionId $s.SessionId }
}

$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)
try {
    $s = New-SSHSession -ComputerName "66.116.224.221" -Credential $Cred -AcceptKey -Force
    
    Write-Host "Installing ALL dependencies (including dev)..."
    $r1 = Invoke-SSHCommand -SessionId $s.SessionId -Command "cd /var/www/purple-port/server && NODE_ENV=development npm install"
    Write-Host $r1.Output
    
    Write-Host "Building backend..."
    $r2 = Invoke-SSHCommand -SessionId $s.SessionId -Command "cd /var/www/purple-port/server && npm run build"
    Write-Host $r2.Output
    
    Write-Host "Restarting application..."
    Invoke-SSHCommand -SessionId $s.SessionId -Command "pm2 restart qix-ads-v2.7"
    
} catch {
    $_.Exception.Message
} finally {
    if ($s) { Remove-SSHSession -SessionId $s.SessionId }
}

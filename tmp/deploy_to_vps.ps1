$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)
try {
    $s = New-SSHSession -ComputerName "66.116.224.221" -Credential $Cred -AcceptKey -Force
    
    Write-Host "Updating code from GitHub..."
    Invoke-SSHCommand -SessionId $s.SessionId -Command "cd /var/www/purple-port && git pull origin main"
    
    Write-Host "Building backend..."
    Invoke-SSHCommand -SessionId $s.SessionId -Command "cd /var/www/purple-port && npm install && npm run build"
    
    Write-Host "Building frontend..."
    Invoke-SSHCommand -SessionId $s.SessionId -Command "cd /var/www/purple-port/client && npm install && npm run build && cp -rf dist/* ../public/"
    
    Write-Host "Restarting application..."
    Invoke-SSHCommand -SessionId $s.SessionId -Command "pm2 restart qix-ads-v2.7"
    
    Write-Host "Deployment completed!"
} catch {
    $_.Exception.Message
} finally {
    if ($s) { Remove-SSHSession -SessionId $s.SessionId }
}

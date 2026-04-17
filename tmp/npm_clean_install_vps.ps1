$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)
try {
    $s = New-SSHSession -ComputerName "66.116.224.221" -Credential $Cred -AcceptKey -Force
    
    Write-Host "Cleaning NPM Cache and removing corrupted node_modules..."
    Invoke-SSHCommand -SessionId $s.SessionId -Command "cd /var/www/purple-port/server && rm -rf node_modules/whatsapp-web.js && rm -rf node_modules/qrcode && npm cache clean --force"
    
    Write-Host "Re-installing packages safely..."
    Invoke-SSHCommand -SessionId $s.SessionId -Command "cd /var/www/purple-port/server && npm install"
    
    Write-Host "Building backend..."
    $r = Invoke-SSHCommand -SessionId $s.SessionId -Command "cd /var/www/purple-port/server && npm run build"
    Write-Host $r.Output
    
    Write-Host "Restarting application..."
    Invoke-SSHCommand -SessionId $s.SessionId -Command "pm2 restart qix-ads-v2.7"
    
} catch {
    $_.Exception.Message
} finally {
    if ($s) { Remove-SSHSession -SessionId $s.SessionId }
}

$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)
try {
    $s = New-SSHSession -ComputerName "66.116.224.221" -Credential $Cred -AcceptKey -Force
    
    Write-Host "Installing whatsapp-web.js and skipping Puppeteer Chrome download..."
    $r1 = Invoke-SSHCommand -SessionId $s.SessionId -Command "cd /var/www/purple-port/server && npm install whatsapp-web.js qrcode --save --ignore-scripts"
    Write-Host $r1.Output
    
    Write-Host "Verifying if folder exists..."
    $r2 = Invoke-SSHCommand -SessionId $s.SessionId -Command "ls -la /var/www/purple-port/server/node_modules/whatsapp-web.js"
    Write-Host $r2.Output
    
    Write-Host "Building backend..."
    $r3 = Invoke-SSHCommand -SessionId $s.SessionId -Command "cd /var/www/purple-port/server && npm run build"
    Write-Host $r3.Output
    
    Write-Host "Restarting application..."
    Invoke-SSHCommand -SessionId $s.SessionId -Command "pm2 restart qix-ads-v2.7"
    
} catch {
    $_.Exception.Message
} finally {
    if ($s) { Remove-SSHSession -SessionId $s.SessionId }
}

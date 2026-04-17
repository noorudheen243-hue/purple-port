$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)
try {
    $s = New-SSHSession -ComputerName "66.116.224.221" -Credential $Cred -AcceptKey -Force
    Write-Host "Forcing install of missing dependencies..."
    Invoke-SSHCommand -SessionId $s.SessionId -Command "cd /var/www/purple-port/server && npm install whatsapp-web.js qrcode --save"
    
    Write-Host "Rebuilding backend..."
    $r = Invoke-SSHCommand -SessionId $s.SessionId -Command "cd /var/www/purple-port/server && npm run build"
    Write-Host $r.Output
    
    Write-Host "Restarting application..."
    Invoke-SSHCommand -SessionId $s.SessionId -Command "pm2 restart qix-ads-v2.7"
} catch {
    $_.Exception.Message
} finally {
    if ($s) { Remove-SSHSession -SessionId $s.SessionId }
}

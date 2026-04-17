$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)
try {
    $s = New-SSHSession -ComputerName "66.116.224.221" -Credential $Cred -AcceptKey -Force
    
    Write-Host "Resetting VPS git to origin/main..."
    $r = Invoke-SSHCommand -SessionId $s.SessionId -Command "cd /var/www/purple-port && git fetch origin && git reset --hard origin/main && git clean -fd"
    Write-Host $r.Output
    
    Write-Host "Rebuilding backend..."
    Invoke-SSHCommand -SessionId $s.SessionId -Command "cd /var/www/purple-port/server && npm install && npm run build"
    
    Write-Host "Rebuilding frontend..."
    Invoke-SSHCommand -SessionId $s.SessionId -Command "cd /var/www/purple-port/client && npm install && npm run build"
    
    Write-Host "Restarting application..."
    Invoke-SSHCommand -SessionId $s.SessionId -Command "pm2 restart qix-ads-v2.7"
    
} catch {
    $_.Exception.Message
} finally {
    if ($s) { Remove-SSHSession -SessionId $s.SessionId }
}

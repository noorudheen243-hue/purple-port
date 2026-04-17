param([string]$cmd)
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)
try {
    $s = New-SSHSession -ComputerName "66.116.224.221" -Credential $Cred -AcceptKey -Force
    
    Write-Host "Wiping corrupted node_modules..."
    Invoke-SSHCommand -SessionId $s.SessionId -Command "cd /var/www/purple-port/server && rm -rf node_modules"
    
    Write-Host "Running fresh npm install..."
    $r1 = Invoke-SSHCommand -SessionId $s.SessionId -Command "cd /var/www/purple-port/server && npm install"
    Write-Host "npm install exit: $($r1.ExitStatus)"
    Write-Host "npm install err: $($r1.Error)"
    
    Write-Host "Running typescript build..."
    $r2 = Invoke-SSHCommand -SessionId $s.SessionId -Command "cd /var/www/purple-port/server && npm run build"
    Write-Host "tsc exit: $($r2.ExitStatus)"
    Write-Host "tsc err: $($r2.Error)"
    
    Write-Host "Restarting PM2 Service..."
    Invoke-SSHCommand -SessionId $s.SessionId -Command "pm2 restart qix-ads-v2.7"
    
} catch {
    $_.Exception.Message
} finally {
    if ($s) { Remove-SSHSession -SessionId $s.SessionId }
}

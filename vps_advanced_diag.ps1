$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)
try {
    $s = New-SSHSession -ComputerName "66.116.224.221" -Credential $Cred -AcceptKey -Force
    Write-Host "--- PM2 SHOW qix-api ---"
    $r1 = Invoke-SSHCommand -SessionId $s.SessionId -Command "pm2 show qix-api"
    Write-Host $r1.Output
    
    Write-Host "`n--- NETSTAT (Port 4001) ---"
    $r2 = Invoke-SSHCommand -SessionId $s.SessionId -Command "netstat -tulpn | grep :4001"
    Write-Host $r2.Output
    
    Write-Host "`n--- NGINX ACCESS LOG (last 20) ---"
    $r3 = Invoke-SSHCommand -SessionId $s.SessionId -Command "tail -n 20 /var/log/nginx/access.log"
    Write-Host $r3.Output
} catch {
    Write-Host "Exception: $($_.Exception.Message)"
} finally {
    if ($s) { Remove-SSHSession -SessionId $s.SessionId }
}

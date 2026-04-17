$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)

try {
    $s = New-SSHSession -ComputerName "66.116.224.221" -Credential $Cred -AcceptKey -Force

    Write-Host "=== PM2 Full Status ===" -ForegroundColor Cyan
    $pm2 = Invoke-SSHCommand -SessionId $s.SessionId -Command "pm2 list 2>&1"
    Write-Host $pm2.Output

    Write-Host "`n=== PM2 Process Details (ports) ===" -ForegroundColor Cyan
    $ports = Invoke-SSHCommand -SessionId $s.SessionId -Command "pm2 info qix-ads-v2.7 2>&1 | head -40"
    Write-Host $ports.Output

    Write-Host "`n=== PM2 info qix-api ===" -ForegroundColor Cyan
    $apiInfo = Invoke-SSHCommand -SessionId $s.SessionId -Command "pm2 info qix-api 2>&1 | head -40"
    Write-Host $apiInfo.Output

    Write-Host "`n=== Nginx Config ===" -ForegroundColor Cyan
    $nginx = Invoke-SSHCommand -SessionId $s.SessionId -Command "cat /etc/nginx/sites-enabled/default 2>&1 || cat /etc/nginx/conf.d/default.conf 2>&1 || find /etc/nginx -name '*.conf' -exec grep -l 'proxy_pass' {} +"
    Write-Host $nginx.Output

    Write-Host "`n=== Which port handles /api/marketing ===" -ForegroundColor Cyan
    $port4001 = Invoke-SSHCommand -SessionId $s.SessionId -Command "curl -s -o /dev/null -w '%{http_code}' http://localhost:4001/api/marketing/groups 2>&1"
    Write-Host "Port 4001: $($port4001.Output)"
    
    $port3000 = Invoke-SSHCommand -SessionId $s.SessionId -Command "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/api/marketing/groups 2>&1"
    Write-Host "Port 3000: $($port3000.Output)"

    $port5000 = Invoke-SSHCommand -SessionId $s.SessionId -Command "curl -s -o /dev/null -w '%{http_code}' http://localhost:5000/api/marketing/groups 2>&1"
    Write-Host "Port 5000: $($port5000.Output)"

    Write-Host "`n=== Check qix-ads-v2.7 crash logs ===" -ForegroundColor Cyan
    $logs = Invoke-SSHCommand -SessionId $s.SessionId -Command "pm2 logs qix-ads-v2.7 --lines 20 --nostream 2>&1"
    Write-Host $logs.Output

} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
} finally {
    if ($s) { Remove-SSHSession -SessionId $s.SessionId }
}

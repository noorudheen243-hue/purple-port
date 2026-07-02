$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)

try {
    Write-Host "Connecting to VPS..." -ForegroundColor Cyan
    $s = New-SSHSession -ComputerName "66.116.224.221" -Credential $Cred -AcceptKey -Force

    Write-Host "`n--- Git Reset & Pull ---" -ForegroundColor Yellow
    $pull = Invoke-SSHCommand -SessionId $s.SessionId -Command "cd /var/www/purple-port && git reset --hard HEAD && git pull origin main 2>&1"
    Write-Host $pull.Output

    Write-Host "`n--- Build Client ---" -ForegroundColor Yellow
    $buildClient = Invoke-SSHCommand -SessionId $s.SessionId -Command "cd /var/www/purple-port/client && npm run build 2>&1" -Timeout 300
    Write-Host $buildClient.Output

    Write-Host "`n--- Restart Nginx ---" -ForegroundColor Yellow
    $nginx = Invoke-SSHCommand -SessionId $s.SessionId -Command "systemctl restart nginx 2>&1"
    Write-Host $nginx.Output

    Write-Host "`n✅ FRONTEND DEPLOYED" -ForegroundColor Green

} catch {
    Write-Host "Exception: $($_.Exception.Message)" -ForegroundColor Red
} finally {
    if ($s) { Remove-SSHSession -SessionId $s.SessionId }
}

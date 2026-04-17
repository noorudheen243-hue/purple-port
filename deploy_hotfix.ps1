$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)

try {
    Write-Host "Connecting to VPS..." -ForegroundColor Cyan
    $s = New-SSHSession -ComputerName "66.116.224.221" -Credential $Cred -AcceptKey -Force

    Write-Host "`n--- Git Pull ---" -ForegroundColor Yellow
    $pull = Invoke-SSHCommand -SessionId $s.SessionId -Command "cd /var/www/purple-port && git pull origin main 2>&1"
    Write-Host $pull.Output

    Write-Host "`n--- Build Client ---" -ForegroundColor Yellow
    $build = Invoke-SSHCommand -SessionId $s.SessionId -Command "cd /var/www/purple-port/client && npm run build 2>&1" -Timeout 300
    Write-Host $build.Output

    Write-Host "`n--- Restart PM2 ---" -ForegroundColor Yellow
    $pm2 = Invoke-SSHCommand -SessionId $s.SessionId -Command "pm2 restart qix-api 2>&1"
    Write-Host $pm2.Output

    Write-Host "`n✅ HOTFIX DEPLOYED" -ForegroundColor Green

} catch {
    Write-Host "Exception: $($_.Exception.Message)" -ForegroundColor Red
} finally {
    if ($s) { Remove-SSHSession -SessionId $s.SessionId }
}

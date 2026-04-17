$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)

try {
    $s = New-SSHSession -ComputerName "66.116.224.221" -Credential $Cred -AcceptKey -Force

    Write-Host "--- git pull ---"
    $pull = Invoke-SSHCommand -SessionId $s.SessionId -Command "cd /var/www/purple-port && git pull origin main 2>&1"
    Write-Host $pull.Output

    Write-Host "`n--- Check dist for marketingGroup ---"
    $dist = Invoke-SSHCommand -SessionId $s.SessionId -Command "ls /var/www/purple-port/server/dist/modules/marketing-tasks/ 2>&1"
    Write-Host $dist.Output

    Write-Host "`n--- Build Server ---"
    $build = Invoke-SSHCommand -SessionId $s.SessionId -Command "cd /var/www/purple-port/server && npm run build 2>&1" -Timeout 120
    Write-Host $build.Output

    Write-Host "`n--- Restart PM2 ---"
    $pm2 = Invoke-SSHCommand -SessionId $s.SessionId -Command "pm2 restart qix-api 2>&1"
    Write-Host $pm2.Output

    Start-Sleep -Seconds 6

    Write-Host "`n--- Verify Route ---"
    $verify = Invoke-SSHCommand -SessionId $s.SessionId -Command "curl -s -o /dev/null -w '%{http_code}' http://localhost:4001/api/marketing/groups 2>&1"
    Write-Host "HTTP Status: $($verify.Output) (401=OK, 404=still broken)"

    Write-Host "`n--- Check dist again ---"
    $dist2 = Invoke-SSHCommand -SessionId $s.SessionId -Command "ls /var/www/purple-port/server/dist/modules/marketing-tasks/ 2>&1"
    Write-Host $dist2.Output

    Write-Host "`n✅ DONE"
} catch {
    Write-Host "Error: $($_.Exception.Message)"
} finally {
    if ($s) { Remove-SSHSession -SessionId $s.SessionId }
}

$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)

try {
    $s = New-SSHSession -ComputerName "66.116.224.221" -Credential $Cred -AcceptKey -Force

    Write-Host "=== Restarting qix-api (the real API server on port 4001) ===" -ForegroundColor Yellow
    $restart = Invoke-SSHCommand -SessionId $s.SessionId -Command "pm2 restart qix-api 2>&1"
    Write-Host $restart.Output

    Start-Sleep -Seconds 8

    Write-Host "`n=== Verify /groups route after restart ===" -ForegroundColor Cyan
    $verify = Invoke-SSHCommand -SessionId $s.SessionId -Command "curl -s -o /dev/null -w '%{http_code}' http://localhost:4001/api/marketing/groups 2>&1"
    Write-Host "GET /groups HTTP Status: $($verify.Output) (401=working, 404=broken)"

    $verifyPost = Invoke-SSHCommand -SessionId $s.SessionId -Command "curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:4001/api/marketing/groups -H 'Content-Type: application/json' -d '{""name"":""test""}' 2>&1"
    Write-Host "POST /groups HTTP Status: $($verifyPost.Output) (401=working, 404=broken)"

    Write-Host "`n=== PM2 Status ===" -ForegroundColor Cyan
    $status = Invoke-SSHCommand -SessionId $s.SessionId -Command "pm2 list 2>&1"
    Write-Host $status.Output

    Write-Host "`n✅ Done — qix-api restarted with new routes" -ForegroundColor Green

} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
} finally {
    if ($s) { Remove-SSHSession -SessionId $s.SessionId }
}

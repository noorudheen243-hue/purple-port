$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)
try {
    $s = New-SSHSession -ComputerName "66.116.224.221" -Credential $Cred -AcceptKey -Force
    Write-Host "--- PM2 LOGS (Last 100) ---"
    $r1 = Invoke-SSHCommand -SessionId $s.SessionId -Command "pm2 logs --lines 100 --no-daemon"
    # Note: pm2 logs --no-daemon might hang, so we use a different approach
    $r2 = Invoke-SSHCommand -SessionId $s.SessionId -Command "cat /root/.pm2/logs/qix-api-error.log | tail -n 50"
    Write-Host "--- ERRORS ---"
    Write-Host $r2.Output
    
    $r3 = Invoke-SSHCommand -SessionId $s.SessionId -Command "cat /root/.pm2/logs/qix-api-out.log | tail -n 50"
    Write-Host "`n--- OUTPUT ---"
    Write-Host $r3.Output
} catch {
    Write-Host "Exception: $($_.Exception.Message)"
} finally {
    if ($s) { Remove-SSHSession -SessionId $s.SessionId }
}

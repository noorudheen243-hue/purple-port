$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)
try {
    $s = New-SSHSession -ComputerName "66.116.224.221" -Credential $Cred -AcceptKey -Force
    Write-Host "--- PM2 LIST (detailed) ---"
    $r1 = Invoke-SSHCommand -SessionId $s.SessionId -Command "pm2 list"
    Write-Host $r1.Output
    
    Write-Host "`n--- PM2 ERROR LOGS (qix-api) ---"
    $r2 = Invoke-SSHCommand -SessionId $s.SessionId -Command "pm2 logs qix-api --err --lines 100 --no-colors"
    Write-Host $r2.Output
    
    Write-Host "`n--- SYSTEMD LOGS (if applicable) ---"
    $r3 = Invoke-SSHCommand -SessionId $s.SessionId -Command "journalctl -u qix-api -n 50 --no-pager"
    Write-Host $r3.Output
} catch {
    Write-Host "Exception: $($_.Exception.Message)"
} finally {
    if ($s) { Remove-SSHSession -SessionId $s.SessionId }
}

$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)
try {
    $s = New-SSHSession -ComputerName "66.116.224.221" -Credential $Cred -AcceptKey -Force
    Write-Host "--- PM2 LIST ---"
    $r1 = Invoke-SSHCommand -SessionId $s.SessionId -Command "pm2 list"
    Write-Host $r1.Output
    
    Write-Host "`n--- BUILD OUTPUT (last 50 lines) ---"
    $r2 = Invoke-SSHCommand -SessionId $s.SessionId -Command "tail -n 50 /var/www/purple-port/deployment.log"
    Write-Host $r2.Output
} catch {
    Write-Host "Exception: $($_.Exception.Message)"
} finally {
    if ($s) { Remove-SSHSession -SessionId $s.SessionId }
}

$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)
try {
    $s = New-SSHSession -ComputerName "66.116.224.221" -Credential $Cred -AcceptKey -Force
    Write-Host "--- SERVER SOURCE ON VPS ---"
    $r1 = Invoke-SSHCommand -SessionId $s.SessionId -Command "ls -la /var/www/purple-port/server/src/modules/marketing-tasks/routes.ts"
    Write-Host $r1.Output
    
    Write-Host "`n--- SERVER DIST ON VPS ---"
    $r2 = Invoke-SSHCommand -SessionId $s.SessionId -Command "ls -la /var/www/purple-port/server/dist/modules/marketing-tasks/routes.js"
    Write-Host $r2.Output
    
    Write-Host "`n--- REBUILDING SERVER MANUALLY ---"
    $r3 = Invoke-SSHCommand -SessionId $s.SessionId -Command "cd /var/www/purple-port/server && npm run build"
    Write-Host $r3.Output
    if ($r3.Error) { Write-Host "ERROR: $($r3.Error)" }
    
    Write-Host "`n--- RESTARTING PM2 ---"
    $r4 = Invoke-SSHCommand -SessionId $s.SessionId -Command "pm2 restart qix-api"
    Write-Host $r4.Output
} catch {
    Write-Host "Exception: $($_.Exception.Message)"
} finally {
    if ($s) { Remove-SSHSession -SessionId $s.SessionId }
}

$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)
try {
    $s = New-SSHSession -ComputerName "66.116.224.221" -Credential $Cred -AcceptKey -Force
    Write-Host "--- READ .env ---"
    $r1 = Invoke-SSHCommand -SessionId $s.SessionId -Command "head -n 20 /var/www/purple-port/server/.env"
    Write-Host $r1.Output
    
    Write-Host "`n--- READ routes.ts ---"
    $r2 = Invoke-SSHCommand -SessionId $s.SessionId -Command "grep -C 5 '/meta/accounts' /var/www/purple-port/server/src/modules/marketing-tasks/routes.ts"
    Write-Host $r2.Output
    
    Write-Host "`n--- READ routes.js (Compiled) ---"
    $r3 = Invoke-SSHCommand -SessionId $s.SessionId -Command "grep -C 5 '/meta/accounts' /var/www/purple-port/server/dist/modules/marketing-tasks/routes.js"
    Write-Host $r3.Output
} catch {
    Write-Host "Exception: $($_.Exception.Message)"
} finally {
    if ($s) { Remove-SSHSession -SessionId $s.SessionId }
}

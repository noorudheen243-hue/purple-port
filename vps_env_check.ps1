$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)
try {
    $s = New-SSHSession -ComputerName "66.116.224.221" -Credential $Cred -AcceptKey -Force
    Write-Host "--- ENV FILE (.env) ---"
    $r1 = Invoke-SSHCommand -SessionId $s.SessionId -Command "cat /var/www/purple-port/server/.env"
    Write-Host $r1.Output
    
    Write-Host "`n--- DB CHECK (MetaToken count) ---"
    $r2 = Invoke-SSHCommand -SessionId $s.SessionId -Command "cd /var/www/purple-port/server && npx prisma db pull --print"
    Write-Host $r2.Output
} catch {
    Write-Host "Exception: $($_.Exception.Message)"
} finally {
    if ($s) { Remove-SSHSession -SessionId $s.SessionId }
}

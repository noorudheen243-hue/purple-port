$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)
try {
    $s = New-SSHSession -ComputerName "66.116.224.221" -Credential $Cred -AcceptKey -Force
    Write-Host "--- LS -L ---"
    $r1 = Invoke-SSHCommand -SessionId $s.SessionId -Command "ls -l /var/www/purple-port/deploy_update.sh"
    Write-Host $r1.Output
    
    Write-Host "`n--- TRYING CHMOD AGAIN ---"
    $r2 = Invoke-SSHCommand -SessionId $s.SessionId -Command "chmod 755 /var/www/purple-port/deploy_update.sh"
    Write-Host "Chmod attempted."
    
    Write-Host "`n--- LS -L AGAIN ---"
    $r3 = Invoke-SSHCommand -SessionId $s.SessionId -Command "ls -l /var/www/purple-port/deploy_update.sh"
    Write-Host $r3.Output
    
    Write-Host "`n--- RUNNING SCRIPT VIA BASH EXPLICITLY ---"
    $r4 = Invoke-SSHCommand -SessionId $s.SessionId -Command "cd /var/www/purple-port && bash deploy_update.sh"
    Write-Host $r4.Output
    if ($r4.Error) { Write-Host "ERROR: $($r4.Error)" }
    
} catch {
    Write-Host "Exception: $($_.Exception.Message)"
} finally {
    if ($s) { Remove-SSHSession -SessionId $s.SessionId }
}

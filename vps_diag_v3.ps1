$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)
try {
    $s = New-SSHSession -ComputerName "66.116.224.221" -Credential $Cred -AcceptKey -Force
    Write-Host "--- DEPLOY SCRIPT ---"
    $r1 = Invoke-SSHCommand -SessionId $s.SessionId -Command "cat /var/www/purple-port/deploy_update.sh"
    Write-Host $r1.Output
    
    Write-Host "`n--- RECENT DEPLOYMENT LOGS ---"
    $r2 = Invoke-SSHCommand -SessionId $s.SessionId -Command "tail -n 100 /var/www/purple-port/deployment.log"
    Write-Host $r2.Output
} catch {
    Write-Host "Exception: $($_.Exception.Message)"
} finally {
    if ($s) { Remove-SSHSession -SessionId $s.SessionId }
}

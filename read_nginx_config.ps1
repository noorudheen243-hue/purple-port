$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)
try {
    $s = New-SSHSession -ComputerName "66.116.224.221" -Credential $Cred -AcceptKey -Force
    Write-Host "--- NGINX SITES ---"
    $r1 = Invoke-SSHCommand -SessionId $s.SessionId -Command "ls /etc/nginx/sites-enabled/"
    Write-Host $r1.Output
    
    Write-Host "`n--- NGINX CONFIG (purple-port) ---"
    $r2 = Invoke-SSHCommand -SessionId $s.SessionId -Command "cat /etc/nginx/sites-available/purple-port"
    Write-Host $r2.Output
} catch {
    Write-Host "Exception: $($_.Exception.Message)"
} finally {
    if ($s) { Remove-SSHSession -SessionId $s.SessionId }
}

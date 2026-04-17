$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)
try {
    $s = New-SSHSession -ComputerName "66.116.224.221" -Credential $Cred -AcceptKey -Force
    Write-Host "--- APP RUNTIME LOGS ---"
    # Checking logs for qix-api (process id 1)
    $r1 = Invoke-SSHCommand -SessionId $s.SessionId -Command "pm2 logs qix-api --lines 100 --no-colors"
    Write-Host $r1.Output
} catch {
    Write-Host "Exception: $($_.Exception.Message)"
} finally {
    if ($s) { Remove-SSHSession -SessionId $s.SessionId }
}

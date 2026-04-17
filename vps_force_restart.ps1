$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)
try {
    $s = New-SSHSession -ComputerName "66.116.224.221" -Credential $Cred -AcceptKey -Force
    Write-Host "Triggering background build and restart on VPS..."
    # We use nohup and redirect to /dev/null or a log to prevent SSH hangup issues
    $cmd = "cd /var/www/purple-port && nohup bash deploy_update.sh > deployment.log 2>&1 &"
    $r = Invoke-SSHCommand -SessionId $s.SessionId -Command $cmd
    Write-Host "Command sent to background. Waiting 10 seconds to check log start..."
    Start-Sleep -Seconds 10
    $r2 = Invoke-SSHCommand -SessionId $s.SessionId -Command "tail -n 20 /var/www/purple-port/deployment.log"
    Write-Host "Log Output:"
    Write-Host $r2.Output
} catch {
    Write-Error $_.Exception.Message
} finally {
    if ($s) { Remove-SSHSession -SessionId $s.SessionId }
}

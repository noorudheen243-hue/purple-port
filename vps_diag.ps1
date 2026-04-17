$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)
try {
    $s = New-SSHSession -ComputerName "66.116.224.221" -Credential $Cred -AcceptKey -Force
    Write-Host "--- FILE LIST ---"
    $r1 = Invoke-SSHCommand -SessionId $s.SessionId -Command "ls -F /var/www/purple-port/"
    Write-Host $r1.Output
    
    Write-Host "--- DEPLOY SCRIPT CONTENT ---"
    $r2 = Invoke-SSHCommand -SessionId $s.SessionId -Command "cat /var/www/purple-port/deploy_update.sh"
    Write-Host $r2.Output
    
    Write-Host "--- PM2 STATUS ---"
    $r3 = Invoke-SSHCommand -SessionId $s.SessionId -Command "pm2 status"
    Write-Host $r3.Output
    
    Write-Host "--- RECENT LOGS ---"
    $r4 = Invoke-SSHCommand -SessionId $s.SessionId -Command "pm2 logs qix-ads-v2.7 --lines 20 --no-colors"
    Write-Host $r4.Output
} catch {
    Write-Error $_.Exception.Message
} finally {
    if ($s) { Remove-SSHSession -SessionId $s.SessionId }
}

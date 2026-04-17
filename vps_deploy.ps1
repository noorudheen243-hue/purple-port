$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)
try {
    $s = New-SSHSession -ComputerName "66.116.224.221" -Credential $Cred -AcceptKey -Force
    Write-Host "Connected to VPS. Running deployment..."
    $r = Invoke-SSHCommand -SessionId $s.SessionId -Command "cd /var/www/purple-port && bash deploy_update.sh"
    Write-Host "Deployment Output:"
    Write-Host $r.Output
    if ($r.Error) { Write-Error $r.Error }
} catch {
    Write-Error $_.Exception.Message
} finally {
    if ($s) { Remove-SSHSession -SessionId $s.SessionId }
}

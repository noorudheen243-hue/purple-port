Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

# Clear logs
Write-Host "=== Clearing PM2 logs ==="
Invoke-SSHCommand -SSHSession $session -Command "pm2 flush"

# Restart to be sure
Write-Host "=== Restarting PM2 app 0 ==="
Invoke-SSHCommand -SSHSession $session -Command "pm2 restart 0"

Remove-SSHSession -SSHSession $session | Out-Null

Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

Write-Host "=== PM2 Detailed Info for App 0 ==="
$r0 = Invoke-SSHCommand -SSHSession $session -Command "pm2 show 0"
Write-Host ($r0.Output -join [System.Environment]::NewLine)

Write-Host "=== PM2 Environment Variables for App 0 ==="
$r1 = Invoke-SSHCommand -SSHSession $session -Command "pm2 env 0"
Write-Host ($r1.Output -join [System.Environment]::NewLine)

Write-Host "=== Checking for duplicate PM2 processes ==="
$r2 = Invoke-SSHCommand -SSHSession $session -Command "ps aux | grep node"
Write-Host ($r2.Output -join [System.Environment]::NewLine)

Write-Host "=== Nginx Error Logs ==="
$r3 = Invoke-SSHCommand -SSHSession $session -Command "tail -n 20 /var/log/nginx/error.log"
Write-Host ($r3.Output -join [System.Environment]::NewLine)

Remove-SSHSession -SSHSession $session | Out-Null

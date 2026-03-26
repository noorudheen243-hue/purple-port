Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

# Show exact context around tokenExpiry and expires_at in controller
Write-Host "=== Checking VPS controller.js ==="
$r1 = Invoke-SSHCommand -SSHSession $session -Command "grep -n 'tokenExpiry\|expires_at' /var/www/antigravity/server/dist/modules/marketing-tasks/controller.js"
Write-Host ($r1.Output -join [System.Environment]::NewLine)

# Check the last PM2 logs for the error
Write-Host "=== Recent PM2 Error Logs ==="
$r2 = Invoke-SSHCommand -SSHSession $session -Command "pm2 logs qix-ads-v2.6 --lines 15 --nostream 2>&1 | tail -20"
Write-Host ($r2.Output -join [System.Environment]::NewLine)

Remove-SSHSession -SSHSession $session | Out-Null

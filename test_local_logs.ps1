Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

# Hit /api/settings
Write-Host "Hitting /api/settings..."
$r1 = Invoke-SSHCommand -SSHSession $session -Command "curl -s -o /dev/null -w '%{http_code}' http://localhost:4001/api/settings"
Write-Host "HTTP Status: $($r1.Output)"

# Check logs
Write-Host "Checking fresh logs..."
$r2 = Invoke-SSHCommand -SSHSession $session -Command "pm2 logs qix-ads-v2.6 --lines 30 --nostream"
Write-Host ($r2.Output -join [System.Environment]::NewLine)

Remove-SSHSession -SSHSession $session | Out-Null

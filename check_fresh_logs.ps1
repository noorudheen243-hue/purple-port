Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

Write-Host "=== PM2 Status ==="
$r0 = Invoke-SSHCommand -SSHSession $session -Command "pm2 list"
Write-Host ($r0.Output -join [System.Environment]::NewLine)

Write-Host "=== Last 50 Error Log Lines ==="
$r1 = Invoke-SSHCommand -SSHSession $session -Command "tail -50 /root/.pm2/logs/qix-ads-v2.6-error.log"
Write-Host ($r1.Output -join [System.Environment]::NewLine)

Remove-SSHSession -SSHSession $session | Out-Null

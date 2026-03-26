Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

$controllerPath = "/var/www/antigravity/server/dist/modules/marketing-tasks/controller.js"

# Show exact lines around the metaToken upsert
Write-Host "=== Lines 185-210 of controller.js ==="
$r1 = Invoke-SSHCommand -SSHSession $session -Command "sed -n '185,210p' $controllerPath"
Write-Host ($r1.Output -join [System.Environment]::NewLine)

# Check recent errors after restart
Write-Host "=== Recent error log (last 5 mins) ==="
$r2 = Invoke-SSHCommand -SSHSession $session -Command "pm2 logs qix-ads-v2.6 --lines 5 --nostream 2>&1"
Write-Host ($r2.Output -join [System.Environment]::NewLine)

Remove-SSHSession -SSHSession $session | Out-Null

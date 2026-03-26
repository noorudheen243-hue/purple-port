Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

# Check PM2 logs for any API errors or warnings over the last 200 lines
$r1 = Invoke-SSHCommand -SSHSession $session -Command "pm2 logs qix-ads-v2.6 --lines 100 --nostream > /var/www/antigravity/pm2_debug.txt && cat /var/www/antigravity/pm2_debug.txt"
Write-Host "--- PM2 LOGS ---"
Write-Host $r1.Output

Remove-SSHSession -SSHSession $session | Out-Null

Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

# Read the last 200 lines of PM2 logs looking for leads endpoint errors
$r3 = Invoke-SSHCommand -SSHSession $session -Command "pm2 logs qix-ads-v2.6 --lines 100 --nostream > /var/www/antigravity/pm2_leads.txt && grep -i 'leads' /var/www/antigravity/pm2_leads.txt"

Write-Host "--- LOG OUTPUT ---"
Write-Host $r3.Output

Remove-SSHSession -SSHSession $session | Out-Null

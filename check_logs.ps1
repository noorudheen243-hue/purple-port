Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

Invoke-SSHCommand -SSHSession $session -Command "pm2 logs qix-ads-v2.6 --lines 50 --nostream > /var/www/antigravity/pm2_check.txt"
$r = Invoke-SSHCommand -SSHSession $session -Command "cat /var/www/antigravity/pm2_check.txt"
Write-Host $r.Output

Remove-SSHSession -SSHSession $session | Out-Null

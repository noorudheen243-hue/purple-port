Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

# dump and base64
Invoke-SSHCommand -SSHSession $session -Command "pm2 logs qix-ads-v2.6 --lines 300 --nostream > /var/www/pm2_clean.txt"
$r = Invoke-SSHCommand -SSHSession $session -Command "base64 /var/www/pm2_clean.txt"
Remove-SSHSession -SSHSession $session | Out-Null

$b64 = $r.Output -join ""
$bytes = [System.Convert]::FromBase64String($b64)
[System.IO.File]::WriteAllBytes("f:\Antigravity\vps_pm2_clean.txt", $bytes)
Write-Host "Success"

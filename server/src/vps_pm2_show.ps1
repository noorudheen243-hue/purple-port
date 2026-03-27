
Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

Write-Host "Dumping PM2 logs to /tmp/pm2_logs.txt..."
$cmd = "pm2 logs qix-ads-v2.7 --lines 2000 --no-colors > /tmp/pm2_logs.txt 2>&1 & sleep 2 && kill $!"
# Wait, pm2 logs is a streaming command. I should use 'pm2 logs --lines 2000 --no-colors --err' or similar.
# Actually, pm2 show qix-ads-v2.7 will show the log file paths.
$r = Invoke-SSHCommand -SSHSession $session -Command "pm2 show qix-ads-v2.7"
Write-Host $r.Output

Remove-SSHSession -SSHSession $session | Out-Null

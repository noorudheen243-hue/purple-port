# Nuclear Deployment Fix for PM2 and Port 4001
Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

Write-Host "--- Stopping and Deleting ALL PM2 Processes ---"
Invoke-SSHCommand -SessionId $s.SessionId -Command "pm2 stop all; pm2 delete all; pm2 save"

Write-Host "--- Starting Backend from Correct Path: /var/www/antigravity/server/dist/index.js ---"
# Note: Root is /var/www/antigravity. The server code is in server/dist/
Invoke-SSHCommand -SessionId $s.SessionId -Command "cd /var/www/antigravity/server && pm2 start dist/index.js --name qix-ads-v2.5"

Write-Host "--- Verifying PM2 Status ---"
$r = Invoke-SSHCommand -SessionId $s.SessionId -Command "pm2 list"
$r.Output

Remove-SSHSession -SessionId $s.SessionId | Out-Null

Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

# We trigger the sync process directly from the VPS by calling the local server port
$r1 = Invoke-SSHCommand -SSHSession $session -Command "curl -s -X POST http://localhost:4000/api/marketing/sync -H 'Content-Type: application/json' -d '{`"clientId`":`"koomen-client-id`"}'"

# Fetch leads sync as well
$r2 = Invoke-SSHCommand -SSHSession $session -Command "curl -s -X POST http://localhost:4000/api/marketing/leads/sync -H 'Content-Type: application/json' -d '{`"clientId`":`"koomen-client-id`"}'"

# Read the last 200 lines of PM2 logs looking for our tags
$r3 = Invoke-SSHCommand -SSHSession $session -Command "pm2 logs qix-ads-v2.6 --lines 200 --nostream > /var/www/antigravity/pm2_debug2.txt && grep 'DEBUG Meta' /var/www/antigravity/pm2_debug2.txt"

Write-Host "--- LOG OUTPUT ---"
Write-Host $r3.Output

Remove-SSHSession -SSHSession $session | Out-Null

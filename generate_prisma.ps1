Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

Write-Host "Running Prisma generate on VPS..."
$r = Invoke-SSHCommand -SSHSession $session -Command "cd /var/www/antigravity/server && npx prisma generate"

Write-Host "Restarting PM2..."
Invoke-SSHCommand -SSHSession $session -Command "pm2 restart qix-ads-v2.6"

Write-Host "--- SCRIPT OUTPUT ---"
Write-Host $r.Output

Remove-SSHSession -SSHSession $session | Out-Null

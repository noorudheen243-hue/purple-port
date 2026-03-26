Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

# Upload schema.prisma
$remotePath = "/var/www/antigravity/server/prisma"
Set-SCPItem -ComputerName $VPS -Credential $Cred -Path "f:\Antigravity\server\prisma\schema.prisma" -Destination "$remotePath/" -Force

Write-Host "Running Prisma db push and generate on VPS..."
$r = Invoke-SSHCommand -SSHSession $session -Command "cd /var/www/antigravity/server && npx prisma db push --skip-generate && npx prisma generate"

Write-Host "Restarting PM2..."
Invoke-SSHCommand -SSHSession $session -Command "pm2 restart qix-ads-v2.6"

Write-Host "--- SCRIPT OUTPUT ---"
Write-Host $r.Output

Remove-SSHSession -SSHSession $session | Out-Null

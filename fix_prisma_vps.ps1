Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

Write-Host "=== Checking Prisma schema on VPS ==="
$r0 = Invoke-SSHCommand -SSHSession $session -Command "grep -n 'expires_at\|tokenExpiry' /var/www/antigravity/server/prisma/schema.prisma | head -20"
Write-Host ($r0.Output -join [System.Environment]::NewLine)

Write-Host "=== MetaToken model definition ==="
$r1 = Invoke-SSHCommand -SSHSession $session -Command "grep -A 20 'model MetaToken' /var/www/antigravity/server/prisma/schema.prisma | head -25"
Write-Host ($r1.Output -join [System.Environment]::NewLine)

Write-Host "=== Running Prisma Generate ==="
$r2 = Invoke-SSHCommand -SSHSession $session -Command "cd /var/www/antigravity/server && npx prisma generate 2>&1"
Write-Host ($r2.Output -join [System.Environment]::NewLine)

Write-Host "=== Running Prisma DB Push ==="
$r3 = Invoke-SSHCommand -SSHSession $session -Command "cd /var/www/antigravity/server && DATABASE_URL='file:/var/www/purple-port/server/prisma/dev.db' npx prisma db push --accept-data-loss 2>&1"
Write-Host ($r3.Output -join [System.Environment]::NewLine)

Write-Host "=== Restarting PM2 ==="
$r4 = Invoke-SSHCommand -SSHSession $session -Command "pm2 restart qix-ads-v2.6"
Write-Host ($r4.Output -join [System.Environment]::NewLine)

Write-Host "Done!"
Remove-SSHSession -SSHSession $session | Out-Null

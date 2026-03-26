Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

# Check where the Prisma client is being loaded from
Write-Host "=== Finding Prisma client location ==="
$r0 = Invoke-SSHCommand -SSHSession $session -Command "find /var/www/antigravity/server -name 'index.js' -path '*/@prisma/client/*' 2>/dev/null | head -5"
Write-Host ($r0.Output -join [System.Environment]::NewLine)

# Check the generated Prisma schema
Write-Host "=== Checking Prisma generated client schema ==="
$r1 = Invoke-SSHCommand -SSHSession $session -Command "grep -r 'expires_at\|tokenExpiry' /var/www/antigravity/server/node_modules/@prisma/client/ --include='*.d.ts' 2>/dev/null | head -20"
Write-Host ($r1.Output -join [System.Environment]::NewLine)

# Force delete the generated Prisma client and rebuild
Write-Host "=== Force clearing old Prisma client ==="
$r2 = Invoke-SSHCommand -SSHSession $session -Command "rm -rf /var/www/antigravity/node_modules/.prisma && rm -rf /var/www/antigravity/server/node_modules/.prisma"
Write-Host "Cleared .prisma cache"

# Run prisma generate from server directory
Write-Host "=== Running fresh Prisma Generate ==="
$r3 = Invoke-SSHCommand -SSHSession $session -Command "cd /var/www/antigravity/server && DATABASE_URL='file:/var/www/purple-port/server/prisma/dev.db' npx prisma generate 2>&1"
Write-Host ($r3.Output -join [System.Environment]::NewLine)

# Also run db push to sync schema
Write-Host "=== Running Prisma DB Push ==="
$r4 = Invoke-SSHCommand -SSHSession $session -Command "cd /var/www/antigravity/server && DATABASE_URL='file:/var/www/purple-port/server/prisma/dev.db' npx prisma db push --accept-data-loss 2>&1"
Write-Host ($r4.Output -join [System.Environment]::NewLine)

# Restart PM2
Write-Host "=== Restarting PM2 ==="
Invoke-SSHCommand -SSHSession $session -Command "pm2 restart qix-ads-v2.6"
Write-Host "Restarted PM2"

Write-Host "Done!"
Remove-SSHSession -SSHSession $session | Out-Null

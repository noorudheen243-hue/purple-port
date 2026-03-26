Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

# Copy new schema to parent antigravity directory and regenerate there
Write-Host "=== Checking parent schema ==="
$r0 = Invoke-SSHCommand -SSHSession $session -Command "grep -n 'expires_at\|tokenExpiry' /var/www/antigravity/prisma/schema.prisma | grep -i 'metatoken\|expires_at' | head -10"
Write-Host ($r0.Output -join [System.Environment]::NewLine)

$r0b = Invoke-SSHCommand -SSHSession $session -Command "grep -A 20 'model MetaToken' /var/www/antigravity/prisma/schema.prisma | head -20"
Write-Host ($r0b.Output -join [System.Environment]::NewLine)

# Update the parent schema too
Write-Host "=== Copying updated schema to parent directory ==="
$r1 = Invoke-SSHCommand -SSHSession $session -Command "cp /var/www/antigravity/server/prisma/schema.prisma /var/www/antigravity/prisma/schema.prisma"
Write-Host ($r1.Output -join [System.Environment]::NewLine)

# Run prisma generate on the parent directory
Write-Host "=== Running Prisma Generate in parent directory ==="
$r2 = Invoke-SSHCommand -SSHSession $session -Command "cd /var/www/antigravity && DATABASE_URL='file:/var/www/purple-port/server/prisma/dev.db' npx prisma generate 2>&1"
Write-Host ($r2.Output -join [System.Environment]::NewLine)

# Restart PM2
Write-Host "=== Restarting PM2 ==="
$r3 = Invoke-SSHCommand -SSHSession $session -Command "pm2 restart qix-ads-v2.6"
Write-Host ($r3.Output -join [System.Environment]::NewLine)

Write-Host "Done!"
Remove-SSHSession -SSHSession $session | Out-Null

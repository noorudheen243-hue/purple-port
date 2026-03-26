Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

# Delete the generated client
Write-Host "=== Deleting stale Prisma client ==="
$r0 = Invoke-SSHCommand -SSHSession $session -Command "rm -rf /var/www/antigravity/node_modules/.prisma"
Write-Host "Deleted /var/www/antigravity/node_modules/.prisma"

# Run generate in the parent directory
Write-Host "=== Running Prisma Generate in /var/www/antigravity ==="
$r1 = Invoke-SSHCommand -SSHSession $session -Command "cd /var/www/antigravity && npx prisma generate --schema=prisma/schema.prisma 2>&1"
Write-Host ($r1.Output -join [System.Environment]::NewLine)

# Check if it was recreated
Write-Host "=== Verifying new client files ==="
$r2 = Invoke-SSHCommand -SSHSession $session -Command "ls -l /var/www/antigravity/node_modules/.prisma/client/"
Write-Host ($r2.Output -join [System.Environment]::NewLine)

# Check the new schema.prisma in the client folder
Write-Host "=== Checking schema in the new client folder ==="
$r3 = Invoke-SSHCommand -SSHSession $session -Command "grep -A 10 'model MetaToken' /var/www/antigravity/node_modules/.prisma/client/schema.prisma"
Write-Host ($r3.Output -join [System.Environment]::NewLine)

# Restart PM2
Write-Host "=== Restarting PM2 ==="
$r4 = Invoke-SSHCommand -SSHSession $session -Command "pm2 restart 0"
Write-Host ($r4.Output -join [System.Environment]::NewLine)

Remove-SSHSession -SSHSession $session | Out-Null

Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

# Check where prisma client is actually located on the server
Write-Host "=== PM2 ecosystem env check ==="
$r0 = Invoke-SSHCommand -SSHSession $session -Command "pm2 env 0 2>&1 | grep -i 'cwd\|app_path\|script'"
Write-Host ($r0.Output -join [System.Environment]::NewLine)

# Check how server.js loads prisma
Write-Host "=== Checking server.js prisma import path ==="
$r1 = Invoke-SSHCommand -SSHSession $session -Command "cat /var/www/antigravity/server/dist/server.js | head -20"
Write-Host ($r1.Output -join [System.Environment]::NewLine)

# Find all prisma client locations
Write-Host "=== All Prisma client locations ==="
$r2 = Invoke-SSHCommand -SSHSession $session -Command "find /var/www -name 'schema.prisma' 2>/dev/null"
Write-Host ($r2.Output -join [System.Environment]::NewLine)

# Check if there's another node_modules somewhere
Write-Host "=== Check node_modules prisma location for server ==="
$r3 = Invoke-SSHCommand -SSHSession $session -Command "ls /var/www/antigravity/node_modules/@prisma/client/ 2>/dev/null | head -5"
Write-Host ($r3.Output -join [System.Environment]::NewLine)

$r4 = Invoke-SSHCommand -SSHSession $session -Command "ls /var/www/antigravity/server/node_modules/@prisma/client/ 2>/dev/null | head -5"
Write-Host ($r4.Output -join [System.Environment]::NewLine)

# Check the purple-port location too
Write-Host "=== Check purple-port server ==="
$r5 = Invoke-SSHCommand -SSHSession $session -Command "ls /var/www/purple-port/server/ 2>/dev/null | head -10"
Write-Host ($r5.Output -join [System.Environment]::NewLine)

Remove-SSHSession -SSHSession $session | Out-Null

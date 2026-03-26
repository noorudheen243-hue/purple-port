Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

Write-Host "=== SQLite Schema for MetaToken ==="
$r0 = Invoke-SSHCommand -SSHSession $session -Command "sqlite3 /var/www/purple-port/server/prisma/dev.db '.schema MetaToken'"
Write-Host ($r0.Output -join [System.Environment]::NewLine)

Write-Host "=== Prisma Utility Source on VPS ==="
$r1 = Invoke-SSHCommand -SSHSession $session -Command "cat /var/www/antigravity/server/src/utils/prisma.ts"
Write-Host ($r1.Output -join [System.Environment]::NewLine)

Write-Host "=== Checking for multiple prisma client folders ==="
$r2 = Invoke-SSHCommand -SSHSession $session -Command "find /var/www/antigravity -name 'client' -path '*/.prisma/client*'"
Write-Host ($r2.Output -join [System.Environment]::NewLine)

Remove-SSHSession -SSHSession $session | Out-Null

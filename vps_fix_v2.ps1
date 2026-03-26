Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

# Corrected Schema Path
$schemaContent = Get-Content "f:\Antigravity\server\prisma\schema.prisma" -Raw
$encodedSchema = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($schemaContent))

Write-Host "Updating schema.prisma..."
Invoke-SSHCommand -SSHSession $session -Command "echo '$encodedSchema' | base64 -d > /var/www/antigravity/server/prisma/schema.prisma"

Write-Host "Running prisma db push..."
# Use bitwise OR to capture both stdout and stderr in output
Invoke-SSHCommand -SSHSession $session -Command "cd /var/www/antigravity/server && export DATABASE_URL='file:/var/www/purple-port/server/prisma/dev.db' && npx prisma db push --accept-data-loss"

Write-Host "Running prisma generate..."
Invoke-SSHCommand -SSHSession $session -Command "cd /var/www/antigravity/server && npx prisma generate"

Write-Host "Restarting PM2..."
Invoke-SSHCommand -SSHSession $session -Command "pm2 restart qix-ads-v2.6"

Write-Host "Checking tables..."
$r = Invoke-SSHCommand -SSHSession $session -Command "sqlite3 /var/www/purple-port/server/prisma/dev.db .tables"
Write-Host "Tables: $($r.Output)"

Remove-SSHSession -SSHSession $session
Write-Host "Done."

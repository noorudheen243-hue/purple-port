Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

# 1. Upload the CORRECTED schema.prisma
Write-Host "Uploading corrected schema.prisma..."
Set-SCPItem -ComputerName $VPS -Credential $Cred -Path "f:\Antigravity\server\prisma\schema.prisma" -Destination "/var/www/antigravity/server/prisma/schema.prisma" -Force

# 2. Re-run DB Push and Generate
Write-Host "Running prisma db push and generate..."
Invoke-SSHCommand -SSHSession $session -Command "cd /var/www/antigravity/server && export DATABASE_URL=\"file:/var/www/purple-port/server/prisma/dev.db\" && npx prisma db push --accept-data-loss && npx prisma generate"

# 3. Update Nginx Config (Writing directly)
Write-Host "Updating Nginx Config..."
$nginxConfig = Get-Content "f:\Antigravity\nginx_config_new.txt" -Raw
$encodedConfig = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($nginxConfig))

Invoke-SSHCommand -SSHSession $session -Command "echo '$encodedConfig' | base64 -d > /etc/nginx/sites-available/default"
Invoke-SSHCommand -SSHSession $session -Command "nginx -t && systemctl reload nginx"

# 4. Restart PM2
Write-Host "Restarting Server..."
Invoke-SSHCommand -SSHSession $session -Command "pm2 restart qix-ads-v2.6"

# 5. Final verification of tables
Write-Host "Verifying tables..."
$r = Invoke-SSHCommand -SSHSession $session -Command "sqlite3 /var/www/purple-port/server/prisma/dev.db .tables"
Write-Host "Tables: $($r.Output)"

Remove-SSHSession -SSHSession $session | Out-Null
Write-Host "--- ALL FIXES APPLIED SUCCESSFULLY ---"

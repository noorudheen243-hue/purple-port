Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

Write-Host "--- Starting Deployment ---"

# 1. Upload Zips
Write-Host "Uploading Server Dist..."
Set-SCPItem -ComputerName $VPS -Credential $Cred -Path "f:\Antigravity\server_dist.zip" -Destination "/var/www/antigravity/server_dist.zip" -Force
Write-Host "Uploading Client Dist..."
Set-SCPItem -ComputerName $VPS -Credential $Cred -Path "f:\Antigravity\client_dist.zip" -Destination "/var/www/antigravity/client_dist.zip" -Force
Write-Host "Uploading Schema..."
Set-SCPItem -ComputerName $VPS -Credential $Cred -Path "f:\Antigravity\server\prisma\schema.prisma" -Destination "/var/www/antigravity/server/prisma/schema.prisma" -Force

# 2. Extract and Cleanup
Write-Host "Extracting Server Assets..."
Invoke-SSHCommand -SSHSession $session -Command "rm -rf /var/www/antigravity/server/dist/* && unzip -o /var/www/antigravity/server_dist.zip -d /var/www/antigravity/server/dist/ && rm /var/www/antigravity/server_dist.zip"

Write-Host "Extracting Client Assets..."
Invoke-SSHCommand -SSHSession $session -Command "rm -rf /var/www/antigravity/client/dist/* && unzip -o /var/www/antigravity/client_dist.zip -d /var/www/antigravity/client/dist/ && rm /var/www/antigravity/client_dist.zip"

# 3. Prisma Sync
Write-Host "Updating Database Schema..."
Invoke-SSHCommand -SSHSession $session -Command "cd /var/www/antigravity/server && export DATABASE_URL=\"file:/var/www/purple-port/server/prisma/dev.db\" && npx prisma db push --accept-data-loss && npx prisma generate"

# 4. Restart PM2
Write-Host "Restarting Application..."
Invoke-SSHCommand -SSHSession $session -Command "pm2 restart qix-ads-v2.6"

Write-Host "--- Deployment Complete ---"
Remove-SSHSession -SSHSession $session | Out-Null

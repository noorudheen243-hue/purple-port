Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

# Server build
Write-Host "Building Server..."
cd f:\Antigravity\server
npm run build
Write-Host "Compressing Server..."
if (Test-Path "f:\Antigravity\server_dist.zip") { Remove-Item "f:\Antigravity\server_dist.zip" }
Compress-Archive -Path "dist", "prisma" -DestinationPath "f:\Antigravity\server_dist.zip"

# Client build
Write-Host "Building Client..."
cd f:\Antigravity\client
npm run build
Write-Host "Compressing Client..."
if (Test-Path "f:\Antigravity\client_dist.zip") { Remove-Item "f:\Antigravity\client_dist.zip" }
Compress-Archive -Path "dist" -DestinationPath "f:\Antigravity\client_dist.zip"

# Upload
$remotePath = "/var/www/antigravity"
Write-Host "Uploading Server & Client..."
Set-SCPItem -ComputerName $VPS -Credential $Cred -Path "f:\Antigravity\server_dist.zip" -Destination "$remotePath/server/" -Force
Set-SCPItem -ComputerName $VPS -Credential $Cred -Path "f:\Antigravity\client_dist.zip" -Destination "$remotePath/client/" -Force

Write-Host "Extracting Server..."
Invoke-SSHCommand -SSHSession $session -Command "cd $remotePath/server && unzip -o server_dist.zip -d ./ && rm server_dist.zip"

Write-Host "Extracting and Moving Client..."
Invoke-SSHCommand -SSHSession $session -Command "cd $remotePath/client && unzip -o client_dist.zip -d ./ && rm client_dist.zip"
# CRITICAL: Clean out old assets and move the new ones explicitly to web root to bypass cache
Invoke-SSHCommand -SSHSession $session -Command "rm -rf /var/www/antigravity/assets"
Invoke-SSHCommand -SSHSession $session -Command "cp -rf /var/www/antigravity/client/dist/* /var/www/antigravity/"

Write-Host "Wiping old 0-metrics from DB..."
$dbPath = "/var/www/purple-port/server/prisma/dev.db"
$sqlClean = "DELETE FROM MarketingMetric;"
Invoke-SSHCommand -SSHSession $session -Command "sqlite3 '$dbPath' '$sqlClean' && echo 'Metrics wiped'"

Write-Host "Restarting PM2..."
Invoke-SSHCommand -SSHSession $session -Command "pm2 restart qix-ads-v2.6"

Remove-SSHSession -SSHSession $session | Out-Null
Write-Host "Patch applied!"

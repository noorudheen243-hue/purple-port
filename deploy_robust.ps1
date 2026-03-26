Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

Write-Host "--- Starting Robust Deployment ---"

# Use a temporary directory for uploads to avoid permission/path issues
$remoteTemp = "/tmp"

# 1. Upload Zips and Schema
Write-Host "Uploading assets..."
Set-SCPItem -ComputerName $VPS -Credential $Cred -Path "f:\Antigravity\server_dist.zip" -Destination "$remoteTemp/server_dist.zip" -Force
Set-SCPItem -ComputerName $VPS -Credential $Cred -Path "f:\Antigravity\client_dist.zip" -Destination "$remoteTemp/client_dist.zip" -Force
Set-SCPItem -ComputerName $VPS -Credential $Cred -Path "f:\Antigravity\server\prisma\schema.prisma" -Destination "$remoteTemp/schema.prisma" -Force

# 2. Move and Extract on VPS
Write-Host "Extracting on VPS..."
$commands = @(
    "mv $remoteTemp/schema.prisma /var/www/antigravity/server/prisma/schema.prisma",
    "rm -rf /var/www/antigravity/server/dist/*",
    "unzip -o $remoteTemp/server_dist.zip -d /var/www/antigravity/server/dist/",
    "rm -rf /var/www/antigravity/client/dist/*",
    "unzip -o $remoteTemp/client_dist.zip -d /var/www/antigravity/client/dist/",
    "rm $remoteTemp/server_dist.zip $remoteTemp/client_dist.zip"
)

foreach ($cmd in $commands) {
    Write-Host "Executing: $cmd"
    Invoke-SSHCommand -SSHSession $session -Command $cmd
}

# 3. Prisma Sync (Using a simpler command to avoid parameter issues)
Write-Host "Updating Database Schema..."
$prismaCmd = "cd /var/www/antigravity/server && DATABASE_URL='file:/var/www/purple-port/server/prisma/dev.db' npx prisma db push --accept-data-loss && npx prisma generate"
Invoke-SSHCommand -SSHSession $session -Command $prismaCmd

# 4. Restart PM2
Write-Host "Restarting Application..."
Invoke-SSHCommand -SSHSession $session -Command "pm2 restart qix-ads-v2.6"

Write-Host "--- Deployment Complete ---"
Remove-SSHSession -SSHSession $session | Out-Null

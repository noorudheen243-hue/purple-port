Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)

# Use SFTP for more reliable transit
$sftpSession = New-SFTPSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force
$sshSession = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

Write-Host "--- Starting SFTP Deployment ---"

$remoteTemp = "/tmp"

# 1. Upload Zips and Schema
Write-Host "Uploading assets via SFTP..."
Set-SFTPItem -SFTPSession $sftpSession -Path "f:\Antigravity\server_dist.zip" -Destination "$remoteTemp/server_dist.zip" -Force
Set-SFTPItem -SFTPSession $sftpSession -Path "f:\Antigravity\client_dist.zip" -Destination "$remoteTemp/client_dist.zip" -Force
Set-SFTPItem -SFTPSession $sftpSession -Path "f:\Antigravity\server\prisma\schema.prisma" -Destination "$remoteTemp/schema.prisma" -Force

# 2. Process on VPS
Write-Host "Processing on VPS..."
$commands = @(
    "cp $remoteTemp/schema.prisma /var/www/antigravity/server/prisma/schema.prisma",
    "rm -rf /var/www/antigravity/server/dist/*",
    "unzip -o $remoteTemp/server_dist.zip -d /var/www/antigravity/server/dist/",
    "rm -rf /var/www/antigravity/client/dist/*",
    "unzip -o $remoteTemp/client_dist.zip -d /var/www/antigravity/client/dist/",
    "rm $remoteTemp/server_dist.zip $remoteTemp/client_dist.zip $remoteTemp/schema.prisma"
)

foreach ($cmd in $commands) {
    Write-Host "Executing: $cmd"
    Invoke-SSHCommand -SSHSession $sshSession -Command $cmd
}

# 3. Prisma Sync
Write-Host "Updating Database Schema..."
$prismaCmd = "cd /var/www/antigravity/server && DATABASE_URL='file:/var/www/purple-port/server/prisma/dev.db' npx prisma db push --accept-data-loss && npx prisma generate"
Invoke-SSHCommand -SSHSession $sshSession -Command $prismaCmd

# 4. Restart PM2
Write-Host "Restarting Application..."
Invoke-SSHCommand -SSHSession $sshSession -Command "pm2 restart qix-ads-v2.6"

Write-Host "--- Deployment Complete ---"
Remove-SFTPSession -SFTPSession $sftpSession | Out-Null
Remove-SSHSession -SSHSession $sshSession | Out-Null

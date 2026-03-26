Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

# We zip only dist to avoid dev.db lock issues. Prisma schema is already pushed on VPS.
Write-Host "Compressing Server..."
cd f:\Antigravity\server
npm run build
if (Test-Path "f:\Antigravity\server_dist.zip") { Remove-Item "f:\Antigravity\server_dist.zip" }
Compress-Archive -Path "dist" -DestinationPath "f:\Antigravity\server_dist.zip"

Write-Host "Uploading Server Debug Build..."
$remotePath = "/var/www/antigravity"
Set-SCPItem -ComputerName $VPS -Credential $Cred -Path "f:\Antigravity\server_dist.zip" -Destination "$remotePath/server/" -Force

Write-Host "Extracting Server..."
Invoke-SSHCommand -SSHSession $session -Command "cd $remotePath/server && unzip -o server_dist.zip -d ./ && rm server_dist.zip"

Write-Host "Restarting PM2..."
Invoke-SSHCommand -SSHSession $session -Command "pm2 restart qix-ads-v2.6"

Remove-SSHSession -SSHSession $session | Out-Null
Write-Host "Deployment completed!"

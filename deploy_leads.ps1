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

# Upload and extract
$remotePath = "/var/www/antigravity"
Write-Host "Uploading Server..."
Set-SCPItem -ComputerName $VPS -Credential $Cred -Path "f:\Antigravity\server_dist.zip" -Destination "$remotePath/server/" -Force
Write-Host "Uploading Client..."
Set-SCPItem -ComputerName $VPS -Credential $Cred -Path "f:\Antigravity\client_dist.zip" -Destination "$remotePath/client/" -Force

Write-Host "Extracting on VPS and running Prisma push..."
Invoke-SSHCommand -SSHSession $session -Command "cd $remotePath/server && unzip -o server_dist.zip -d ./ && rm server_dist.zip"
Invoke-SSHCommand -SSHSession $session -Command "cd $remotePath/server && npx prisma db push --skip-generate"
Invoke-SSHCommand -SSHSession $session -Command "cd $remotePath/client && unzip -o client_dist.zip -d ./ && rm client_dist.zip"

Write-Host "Restarting PM2..."
Invoke-SSHCommand -SSHSession $session -Command "pm2 restart qix-ads-v2.6"

Remove-SSHSession -SSHSession $session | Out-Null
Write-Host "Deployment Complete!"

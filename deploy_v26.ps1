# Zip & Deploy v2.6 for Qix Ads
Import-Module Posh-SSH -Force
$vpsIp = "66.116.224.221"
$remoteUser = "root"
$remotePath = "/var/www/antigravity"
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($remoteUser, $SecPass)

Write-Output "Step 1: Zipping Dists locally..."
if (Test-Path "f:/Antigravity/server_dist.zip") { Remove-Item "f:/Antigravity/server_dist.zip" }
if (Test-Path "f:/Antigravity/client_dist.zip") { Remove-Item "f:/Antigravity/client_dist.zip" }
Compress-Archive -Path "f:/Antigravity/server/dist", "f:/Antigravity/server/prisma" -DestinationPath "f:/Antigravity/server_dist.zip"
Compress-Archive -Path "f:/Antigravity/client/dist/*" -DestinationPath "f:/Antigravity/client_dist.zip"

Write-Output "Step 2: Connecting to VPS..."
$session = New-SSHSession -ComputerName $vpsIp -Credential $Cred -AcceptKey -Force

Write-Output "Step 3: Preparing VPS (Ensuring unzip)..."
Invoke-SSHCommand -SSHSession $session -Command "apt-get update && apt-get install -y unzip"

Write-Output "Step 4: Uploading ZIPs..."
Set-SCPItem -ComputerName $vpsIp -Credential $Cred -Path "f:/Antigravity/server_dist.zip" -Destination "${remotePath}/server/" -Force
Set-SCPItem -ComputerName $vpsIp -Credential $Cred -Path "f:/Antigravity/client_dist.zip" -Destination "${remotePath}/" -Force

Write-Output "Step 5: Extracting on VPS..."
Invoke-SSHCommand -SSHSession $session -Command "cd ${remotePath}/server && unzip -o server_dist.zip -d ./ && rm server_dist.zip"
Invoke-SSHCommand -SSHSession $session -Command "cd ${remotePath} && unzip -o client_dist.zip -d public/ && rm client_dist.zip"
# Ensure uploads directory exists
Invoke-SSHCommand -SSHSession $session -Command "mkdir -p ${remotePath}/public/uploads"
# Ensure uploads directory exists
Invoke-SSHCommand -SSHSession $session -Command "mkdir -p ${remotePath}/public/uploads"

Write-Output "Step 6: Restarting PM2..."
$cmd = "pm2 stop qix-ads-v2.5; pm2 delete qix-ads-v2.5; pm2 stop qix-ads-v2.6; pm2 delete qix-ads-v2.6; cd ${remotePath}/server && pm2 start dist/server.js --name qix-ads-v2.6"
Invoke-SSHCommand -SSHSession $session -Command $cmd

Write-Output "Step 7: Cleanup..."
Remove-SSHSession -SSHSession $session | Out-Null
Remove-Item "f:/Antigravity/server_dist.zip"
Remove-Item "f:/Antigravity/client_dist.zip"

Write-Output "Deployment v2.6 Finished."

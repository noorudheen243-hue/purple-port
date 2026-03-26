Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

# Server Compression
Write-Host "Compressing Server..."
$serverZip = "f:\Antigravity\server_dist_unified.zip"
if (Test-Path $serverZip) { Remove-Item $serverZip }
Compress-Archive -Path "f:\Antigravity\server\dist", "f:\Antigravity\server\prisma" -DestinationPath $serverZip

# Client Compression
Write-Host "Compressing Client..."
$clientZip = "f:\Antigravity\client_dist_unified.zip"
if (Test-Path $clientZip) { Remove-Item $clientZip }
Compress-Archive -Path "f:\Antigravity\client\dist" -DestinationPath $clientZip

# Upload
$remotePath = "/var/www/antigravity"
Write-Host "Uploading Server..."
Set-SCPItem -ComputerName $VPS -Credential $Cred -Path $serverZip -Destination "$remotePath/server/" -Force
Write-Host "Uploading Client..."
Set-SCPItem -ComputerName $VPS -Credential $Cred -Path $clientZip -Destination "$remotePath/client/" -Force

# Extract and Restart
Write-Host "Extracting and Finalizing on VPS..."
Invoke-SSHCommand -SSHSession $session -Command "cd $remotePath/server && unzip -o server_dist_unified.zip -d ./ && rm server_dist_unified.zip"
Invoke-SSHCommand -SSHSession $session -Command "cd $remotePath/client && unzip -o client_dist_unified.zip -d ./ && rm client_dist_unified.zip"

Write-Host "Running Prisma generate (just in case)..."
Invoke-SSHCommand -SSHSession $session -Command "cd $remotePath/server && npx prisma generate"

Write-Host "Restarting PM2..."
Invoke-SSHCommand -SSHSession $session -Command "pm2 restart qix-ads-v2.6"

Write-Host "Cleaning up local zips..."
Remove-Item $serverZip
Remove-Item $clientZip

Remove-SSHSession -SSHSession $session | Out-Null
Write-Host "--- DEPLOYMENT SUCCESSFUL ---"

Import-Module Posh-SSH -Force
$vpsIp = "66.116.224.221"
$c = New-Object System.Management.Automation.PSCredential('root', (ConvertTo-SecureString 'EzdanAdam@243' -AsPlainText -Force))

Write-Host "Zipping builds..." -ForegroundColor Yellow
if (Test-Path "f:\Antigravity\server_dist.zip") { Remove-Item "f:\Antigravity\server_dist.zip" }
if (Test-Path "f:\Antigravity\client_dist.zip") { Remove-Item "f:\Antigravity\client_dist.zip" }
Compress-Archive -Path "f:\Antigravity\server\dist" -DestinationPath "f:\Antigravity\server_dist.zip"
Compress-Archive -Path "f:\Antigravity\client\dist\*" -DestinationPath "f:\Antigravity\client_dist.zip"
Write-Host "Zipped." -ForegroundColor Green

$s = New-SSHSession -ComputerName $vpsIp -Credential $c -AcceptKey -Force
Write-Host "SSH connected (ID $($s.SessionId))" -ForegroundColor Cyan

Write-Host "Uploading server zip..." -ForegroundColor Yellow
Set-SCPItem -ComputerName $vpsIp -Credential $c -Path "f:\Antigravity\server_dist.zip" -Destination "/var/www/antigravity/" -Force
Write-Host "Uploading client zip..." -ForegroundColor Yellow
Set-SCPItem -ComputerName $vpsIp -Credential $c -Path "f:\Antigravity\client_dist.zip" -Destination "/var/www/antigravity/" -Force
Write-Host "Uploads done." -ForegroundColor Green

Write-Host "Extracting server..." -ForegroundColor Yellow
$r1 = Invoke-SSHCommand -SSHSession $s -Command "cd /var/www/antigravity && unzip -o server_dist.zip -d server/ && rm server_dist.zip && echo SERVER_OK"
Write-Host ($r1.Output[-2..-1] -join " ")

Write-Host "Extracting client to Nginx root..." -ForegroundColor Yellow
$r2 = Invoke-SSHCommand -SSHSession $s -Command "rm -rf /var/www/antigravity/client/dist && mkdir -p /var/www/antigravity/client/dist && unzip -o /var/www/antigravity/client_dist.zip -d /var/www/antigravity/client/dist/ && rm /var/www/antigravity/client_dist.zip && echo CLIENT_OK"
Write-Host ($r2.Output[-2..-1] -join " ")

Write-Host "Restarting PM2 and Nginx..." -ForegroundColor Yellow
$r3 = Invoke-SSHCommand -SSHSession $s -Command "pm2 restart qix-ads-v2.6 && nginx -s reload && echo DEPLOY_COMPLETE"
Write-Host $($r3.Output -join " ") -ForegroundColor Green

# Verify
$r4 = Invoke-SSHCommand -SSHSession $s -Command "ls /var/www/antigravity/client/dist/assets/ | grep Activity"
Write-Host "ActivityFeedTable: $($r4.Output -join ' ')" -ForegroundColor Cyan

Remove-SSHSession -SSHSession $s | Out-Null
Remove-Item "f:\Antigravity\server_dist.zip" -ErrorAction SilentlyContinue
Remove-Item "f:\Antigravity\client_dist.zip" -ErrorAction SilentlyContinue
Write-Host "=== DONE ===" -ForegroundColor Green

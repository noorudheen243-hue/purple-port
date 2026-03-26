Import-Module Posh-SSH -Force

$vpsIp = "66.116.224.221"
$remoteUser = "root"
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($remoteUser, $SecPass)

Write-Output "Step 1: Zipping builds..."
if (Test-Path "f:/Antigravity/server_dist.zip") { Remove-Item "f:/Antigravity/server_dist.zip" }
if (Test-Path "f:/Antigravity/client_dist.zip") { Remove-Item "f:/Antigravity/client_dist.zip" }
Compress-Archive -Path "f:/Antigravity/server/dist", "f:/Antigravity/server/prisma" -DestinationPath "f:/Antigravity/server_dist.zip"
Compress-Archive -Path "f:/Antigravity/client/dist/*" -DestinationPath "f:/Antigravity/client_dist.zip"

Write-Output "Step 2: Connecting to VPS..."
$session = New-SSHSession -ComputerName $vpsIp -Credential $Cred -AcceptKey -Force
if (-not $session) { Write-Error "SSH session failed!"; exit 1 }
Write-Output "  Connected (Session ID: $($session.SessionId))"

Write-Output "Step 3: Uploading server zip..."
Set-SCPItem -ComputerName $vpsIp -Credential $Cred -Path "f:/Antigravity/server_dist.zip" -Destination "/var/www/antigravity/server/" -Force
Write-Output "  Server zip uploaded."

Write-Output "Step 4: Uploading client zip..."
# Upload to /tmp to avoid path issues
Set-SCPItem -ComputerName $vpsIp -Credential $Cred -Path "f:/Antigravity/client_dist.zip" -Destination "/tmp/client_dist.zip" -Force
Write-Output "  Client zip uploaded to /tmp."

Write-Output "Step 5: Extracting server dist..."
$r1 = Invoke-SSHCommand -SSHSession $session -Command "cd /var/www/antigravity/server && unzip -o server_dist.zip -d ./ && rm server_dist.zip && echo 'server_ok'"
Write-Output "  $($r1.Output -join ' ')"

Write-Output "Step 6: Extracting client dist to correct Nginx path..."
# Nginx root is /var/www/antigravity/client/dist — clear it first, then extract fresh
$r2 = Invoke-SSHCommand -SSHSession $session -Command "rm -rf /var/www/antigravity/client/dist && mkdir -p /var/www/antigravity/client/dist && unzip -o /tmp/client_dist.zip -d /var/www/antigravity/client/dist/ && rm /tmp/client_dist.zip && echo 'client_ok'"
Write-Output "  $($r2.Output[-3..-1] -join ' ')"

Write-Output "Step 7: Restarting PM2..."
$r3 = Invoke-SSHCommand -SSHSession $session -Command "pm2 restart qix-ads-v2.6 && echo 'PM2_OK'"
Write-Output "  $($r3.Output -join ' ')"

Write-Output "Step 8: Reload Nginx to clear cache..."
$r4 = Invoke-SSHCommand -SSHSession $session -Command "nginx -s reload && echo 'NGINX_OK'"
Write-Output "  $($r4.Output -join ' ')"

Write-Output "Step 9: Verify new ManageServicesView hash..."
$r5 = Invoke-SSHCommand -SSHSession $session -Command "ls -la /var/www/antigravity/client/dist/assets/ManageServicesView* 2>/dev/null"
Write-Output "  $($r5.Output -join ' ')"

Remove-SSHSession -SSHSession $session | Out-Null
Remove-Item "f:/Antigravity/server_dist.zip" -ErrorAction SilentlyContinue
Remove-Item "f:/Antigravity/client_dist.zip" -ErrorAction SilentlyContinue
Write-Output "=== DEPLOYMENT COMPLETE! ==="

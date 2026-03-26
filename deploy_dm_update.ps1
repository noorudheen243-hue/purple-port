Import-Module Posh-SSH -Force

$vpsIp = "66.116.224.221"
$remoteUser = "root"
$remotePath = "/var/www/antigravity"
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($remoteUser, $SecPass)

Write-Output "Step 1: Zipping server/dist and client/dist..."
if (Test-Path "f:/Antigravity/server_dist.zip") { Remove-Item "f:/Antigravity/server_dist.zip" }
if (Test-Path "f:/Antigravity/client_dist.zip") { Remove-Item "f:/Antigravity/client_dist.zip" }
Compress-Archive -Path "f:/Antigravity/server/dist", "f:/Antigravity/server/prisma" -DestinationPath "f:/Antigravity/server_dist.zip"
Compress-Archive -Path "f:/Antigravity/client/dist/*" -DestinationPath "f:/Antigravity/client_dist.zip"

Write-Output "Step 2: Connecting to VPS at $vpsIp..."
$session = New-SSHSession -ComputerName $vpsIp -Credential $Cred -AcceptKey -Force
if (-not $session) { Write-Error "SSH session failed!"; exit 1 }
Write-Output "  Connected (Session ID: $($session.SessionId))"

Write-Output "Step 3: Uploading server zip..."
Set-SCPItem -ComputerName $vpsIp -Credential $Cred -Path "f:/Antigravity/server_dist.zip" -Destination "${remotePath}/server/" -Force
Write-Output "  Server zip uploaded."

Write-Output "Step 4: Uploading client zip..."
Set-SCPItem -ComputerName $vpsIp -Credential $Cred -Path "f:/Antigravity/client_dist.zip" -Destination "${remotePath}/" -Force
Write-Output "  Client zip uploaded."

Write-Output "Step 5: Extracting on VPS..."
$r1 = Invoke-SSHCommand -SSHSession $session -Command "cd ${remotePath}/server && unzip -o server_dist.zip -d ./ && rm server_dist.zip && echo 'server_ok'"
Write-Output "  Server: $($r1.Output)"

$r2 = Invoke-SSHCommand -SSHSession $session -Command "cd ${remotePath} && unzip -o client_dist.zip -d public/ && rm client_dist.zip && echo 'client_ok'"
Write-Output "  Client: $($r2.Output)"

Write-Output "Step 6: Restarting PM2..."
$r3 = Invoke-SSHCommand -SSHSession $session -Command "pm2 restart qix-ads-v2.6 && echo 'PM2_OK'"
Write-Output "  PM2: $($r3.Output -join ' ')"

if (-not ($r3.Output -join '' -match "PM2_OK")) {
    Write-Output "  qix-ads-v2.6 not found, trying 'all'..."
    $r4 = Invoke-SSHCommand -SSHSession $session -Command "pm2 restart all && echo 'PM2_ALL_OK'"
    Write-Output "  $($r4.Output -join ' ')"
}

Write-Output "Step 7: Cleanup local zips..."
Remove-SSHSession -SSHSession $session | Out-Null
Remove-Item "f:/Antigravity/server_dist.zip" -ErrorAction SilentlyContinue
Remove-Item "f:/Antigravity/client_dist.zip" -ErrorAction SilentlyContinue

Write-Output "=== DEPLOYMENT COMPLETE! ==="

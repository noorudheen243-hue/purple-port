Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"
$User = "root"
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)

$LocalProjectDir = "f:\Antigravity"
$TempDir = "$LocalProjectDir\deploy_temp_posh"
$TarFile = "$LocalProjectDir\force_sync_update.tar.gz"

Write-Host "Preparing package..." -ForegroundColor Cyan
if (Test-Path $TarFile) { Remove-Item $TarFile -Force }
if (Test-Path $TempDir) { Remove-Item $TempDir -Recurse -Force }
New-Item -ItemType Directory -Path "$TempDir" | Out-Null
New-Item -ItemType Directory -Path "$TempDir\server" | Out-Null
New-Item -ItemType Directory -Path "$TempDir\server\dist" -Force | Out-Null
New-Item -ItemType Directory -Path "$TempDir\client" | Out-Null
New-Item -ItemType Directory -Path "$TempDir\client\dist" -Force | Out-Null

Copy-Item "$LocalProjectDir\server\dist\*" "$TempDir\server\dist" -Recurse
Copy-Item "$LocalProjectDir\client\dist\*" "$TempDir\client\dist" -Recurse

Write-Host "Taring..."
Set-Location $TempDir
tar -czf $TarFile .
Set-Location $LocalProjectDir

if (-not (Test-Path $TarFile)) { Write-Error "Local tar not found!"; exit 1 }

$sftp = New-SFTPSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force
Write-Host "SFTP Connected"

Write-Host "Uploading..."
Set-SFTPItem -SessionId $sftp.SessionId -Path $TarFile -Destination "/tmp/" -Force

$ssh = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

Write-Host "Extracting and Restarting..." -ForegroundColor Cyan
$remoteCmd = @"
set -e
echo "Cleaning up..."
rm -rf /tmp/force_sync
mkdir -p /tmp/force_sync
echo "Extracting package..."
tar -xzf /tmp/force_sync_update.tar.gz -C /tmp/force_sync

echo "Syncing to purple-port..."
cp -r /tmp/force_sync/server/dist/* /var/www/purple-port/server/dist/
cp -r /tmp/force_sync/client/dist/* /var/www/purple-port/client/dist/

echo "Restarting PM2..."
pm2 restart qix-api || pm2 restart all
echo "Cleaning up..."
rm -rf /tmp/force_sync
rm -f /tmp/force_sync_update.tar.gz
echo "DEPLOYMENT_SUCCESSFUL"
"@

$result = Invoke-SSHCommand -SessionId $ssh.SessionId -Command $remoteCmd
Write-Host $result.Output

Remove-SFTPSession -SessionId $sftp.SessionId
Remove-SSHSession -SessionId $ssh.SessionId
Write-Host "Done! Deployment Successful." -ForegroundColor Green

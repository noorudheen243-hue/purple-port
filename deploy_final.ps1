# Final Deploy Script — uses Posh-SSH correctly
Import-Module Posh-SSH -Force

$VPS = "66.116.224.221"
$User = "root"
$Pass = "EzdanAdam@243"
$Zip = "f:\Antigravity\backup_feature_update.zip"

$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)

# 1. SFTP Upload
Write-Host "[1/2] Uploading zip via SFTP..." -ForegroundColor Yellow
$sftp = New-SFTPSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force
# Upload to /tmp first (always writable), then move
Set-SFTPFile -SessionId $sftp.SessionId -LocalFile $Zip -RemotePath "/tmp/backup_feature_update.zip" -Overwrite
Remove-SFTPSession -SessionId $sftp.SessionId | Out-Null
Write-Host "   Zip uploaded to /tmp/" -ForegroundColor Green

# 2. SSH Execute
Write-Host "[2/2] Running deploy commands on VPS..." -ForegroundColor Yellow
$ssh = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

$cmd = @'
export PATH=$PATH:/usr/local/bin
[ -s "$HOME/.nvm/nvm.sh" ] && . "$HOME/.nvm/nvm.sh"
cp /tmp/backup_feature_update.zip /var/www/backup_feature_update.zip
echo "Extracting..."
unzip -o -q /var/www/backup_feature_update.zip -d /var/www/antigravity
[ -d /var/www/purple-port ] && unzip -o -q /var/www/backup_feature_update.zip -d /var/www/purple-port
cd /var/www/antigravity && npm install --production --no-audit --silent
mkdir -p /var/backups/antigravity && chmod 755 /var/backups/antigravity
for E in /var/www/antigravity/.env /var/www/purple-port/.env; do
  [ -f "$E" ] || continue
  grep -q BACKUP_DIR "$E" || echo "BACKUP_DIR=/var/backups/antigravity" >> "$E"
  grep -q AUTO_BACKUP_ENABLED "$E" || echo "AUTO_BACKUP_ENABLED=true" >> "$E"
done
pm2 restart all && echo "=== DEPLOY_SUCCESS ==="
'@

$r = Invoke-SSHCommand -SessionId $ssh.SessionId -Command $cmd -TimeOut 180
Write-Host ($r.Output -join "`n") -ForegroundColor White
Remove-SSHSession -SessionId $ssh.SessionId | Out-Null

if (($r.Output -join "") -match "DEPLOY_SUCCESS") {
    Write-Host "DEPLOYED! Visit: https://www.qixport.com/dashboard/settings" -ForegroundColor Green
}
else {
    Write-Host "Completed - check output above for issues" -ForegroundColor Yellow
}

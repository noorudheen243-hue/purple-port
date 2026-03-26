Import-Module Posh-SSH -Force
$vpsIp = "66.116.224.221"
$keyPath = "f:\Antigravity\deploy_key"
$c = New-Object System.Management.Automation.PSCredential('root', (ConvertTo-SecureString 'EzdanAdam@243' -AsPlainText -Force))
$s = New-SSHSession -ComputerName $vpsIp -Credential $c -AcceptKey -Force

Write-Host "Creating /tmp/upload/ on VPS..." -ForegroundColor Yellow
Invoke-SSHCommand -SSHSession $s -Command "mkdir -p /tmp/upload" | Out-Null

Write-Host "Uploading client zip..." -ForegroundColor Yellow
# Use sftp mode via Set-SFTPFile (more reliable than SCP for creating files)
$sftp = New-SFTPSession -ComputerName $vpsIp -Credential $c -AcceptKey -Force
Set-SFTPFile -SessionId $sftp.SessionId -LocalFile "f:\Antigravity\client_dist.zip" -RemotePath "/tmp/upload/client_dist.zip" -Overwrite
Remove-SFTPSession -SessionId $sftp.SessionId | Out-Null
Write-Host "Uploaded via SFTP." -ForegroundColor Green

# Verify upload
$rv = Invoke-SSHCommand -SSHSession $s -Command "ls -lh /tmp/upload/client_dist.zip"
Write-Host "  On VPS: $($rv.Output -join '')"

# Clear old dist and extract fresh
$r1 = Invoke-SSHCommand -SSHSession $s -Command "rm -rf /var/www/antigravity/client/dist && mkdir -p /var/www/antigravity/client/dist && unzip -o /tmp/upload/client_dist.zip -d /var/www/antigravity/client/dist/ && echo 'EXTRACT_OK'"
$lastLines = $r1.Output[-5..-1]
Write-Host "`n=== EXTRACTION ===" -ForegroundColor Cyan
Write-Host ($lastLines -join "`n")

# Verify
$r2 = Invoke-SSHCommand -SSHSession $s -Command "ls /var/www/antigravity/client/dist/"
Write-Host "`n=== DIST ROOT ===" -ForegroundColor Cyan
Write-Host ($r2.Output -join "`n")

$r3 = Invoke-SSHCommand -SSHSession $s -Command "ls /var/www/antigravity/client/dist/assets/ | grep ManageServices"
Write-Host "`n=== ManageServicesView File ===" -ForegroundColor Green
Write-Host ($r3.Output -join "`n")

# Reload nginx
$r4 = Invoke-SSHCommand -SSHSession $s -Command "nginx -s reload && echo 'NGINX_OK'"
Write-Host "`nNginx: $($r4.Output -join ' ')" -ForegroundColor Green

# Cleanup
Invoke-SSHCommand -SSHSession $s -Command "rm -rf /tmp/upload" | Out-Null
Remove-SSHSession -SSHSession $s | Out-Null
Remove-Item "f:\Antigravity\client_dist.zip" -ErrorAction SilentlyContinue
Write-Host "=== DONE ===" -ForegroundColor Green

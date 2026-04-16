Import-Module Posh-SSH -Force
$c = New-Object System.Management.Automation.PSCredential('root', (ConvertTo-SecureString 'EzdanAdam@243' -AsPlainText -Force))
$s = New-SSHSession -ComputerName 66.116.224.221 -Credential $c -AcceptKey -Force

Write-Host "Uploading client zip via SCP..." -ForegroundColor Yellow
$sftpSession = New-SFTPSession -ComputerName 66.116.224.221 -Credential $c -AcceptKey -Force
Invoke-SSHCommand -SSHSession $s -Command "rm -f /tmp/client_dist.zip"
Set-SFTPItem -SFTPSession $sftpSession -Path "f:\Antigravity\client_dist.zip" -Destination "/tmp/"
Remove-SFTPSession $sftpSession
Write-Host "Uploaded." -ForegroundColor Green

# Check what's inside the zip first
$rz = Invoke-SSHCommand -SSHSession $s -Command "unzip -l /tmp/client_dist.zip | head -10"
Write-Host "`n=== ZIP CONTENTS PREVIEW ===" -ForegroundColor Cyan
Write-Host ($rz.Output -join "`n")

# Now clear the target and extract
$r1 = Invoke-SSHCommand -SSHSession $s -Command "rm -rf /var/www/antigravity/client/dist/* && unzip -o /tmp/client_dist.zip -d /var/www/antigravity/client/dist/ && echo 'EXTRACT_OK'"
Write-Host "`n=== EXTRACTION ===" -ForegroundColor Cyan
Write-Host ($r1.Output[-5..-1] -join "`n")

# Verify
$r2 = Invoke-SSHCommand -SSHSession $s -Command "ls /var/www/antigravity/client/dist/"
Write-Host "`n=== DIST ROOT ===" -ForegroundColor Cyan
Write-Host ($r2.Output -join "`n")

$r3 = Invoke-SSHCommand -SSHSession $s -Command "ls /var/www/antigravity/client/dist/assets/ | grep ManageServices"
Write-Host "`n=== ManageServicesView File ===" -ForegroundColor Cyan
Write-Host ($r3.Output -join "`n")

# Nginx reload
$r4 = Invoke-SSHCommand -SSHSession $s -Command "nginx -s reload && echo 'NGINX_OK'"
Write-Host "`n=== NGINX: $($r4.Output -join '') ===" -ForegroundColor Green

Remove-SSHSession -SSHSession $s | Out-Null
Remove-Item "f:\Antigravity\client_dist.zip" -ErrorAction SilentlyContinue

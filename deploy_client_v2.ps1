Import-Module Posh-SSH -Force
$vpsIp = "66.116.224.221"
$c = New-Object System.Management.Automation.PSCredential('root', (ConvertTo-SecureString 'EzdanAdam@243' -AsPlainText -Force))

$s = New-SSHSession -ComputerName $vpsIp -Credential $c -AcceptKey -Force
Write-Host "SSH connected (ID $($s.SessionId))" -ForegroundColor Cyan

# Upload to the EXISTS /var/www/antigravity dir (SCP must point to a directory)
Write-Host "Uploading client_dist.zip to /var/www/antigravity/ ..." -ForegroundColor Yellow
Set-SCPItem -ComputerName $vpsIp -Credential $c `
    -Path "f:\Antigravity\client_dist.zip" `
    -Destination "/var/www/antigravity/" `
    -Force
Write-Host "Uploaded." -ForegroundColor Green

# Verify
$rv = Invoke-SSHCommand -SSHSession $s -Command "ls -lh /var/www/antigravity/client_dist.zip 2>/dev/null || echo NOT_FOUND"
Write-Host "File on VPS: $($rv.Output -join '')"

# Extract to /var/www/antigravity/client/dist
Write-Host "Extracting..." -ForegroundColor Yellow
$r1 = Invoke-SSHCommand -SSHSession $s -Command "rm -rf /var/www/antigravity/client/dist && mkdir -p /var/www/antigravity/client/dist && unzip -o /var/www/antigravity/client_dist.zip -d /var/www/antigravity/client/dist/ && rm /var/www/antigravity/client_dist.zip && echo EXTRACT_OK"
Write-Host ($r1.Output[-3..-1] -join "`n")

# Verify content
$r2 = Invoke-SSHCommand -SSHSession $s -Command "ls /var/www/antigravity/client/dist/"
Write-Host "`nDist root: $($r2.Output -join ', ')"

$r3 = Invoke-SSHCommand -SSHSession $s -Command "ls /var/www/antigravity/client/dist/assets/ | grep ManageServices"
Write-Host "ManageServicesView: $($r3.Output -join ' ')" -ForegroundColor Green

# Reload nginx
$r4 = Invoke-SSHCommand -SSHSession $s -Command "nginx -s reload && echo NGINX_OK"
Write-Host "Nginx: $($r4.Output -join ' ')" -ForegroundColor Cyan

Remove-SSHSession -SSHSession $s | Out-Null
Remove-Item "f:\Antigravity\client_dist.zip" -ErrorAction SilentlyContinue
Write-Host "=== DONE ===" -ForegroundColor Green

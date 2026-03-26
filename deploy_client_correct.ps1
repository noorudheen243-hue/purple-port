Import-Module Posh-SSH -Force
$vpsIp = "66.116.224.221"
$c = New-Object System.Management.Automation.PSCredential('root', (ConvertTo-SecureString 'EzdanAdam@243' -AsPlainText -Force))

# Step 1: Open SSH session to prepare target dir
$s = New-SSHSession -ComputerName $vpsIp -Credential $c -AcceptKey -Force
Write-Host "SSH connected (ID $($s.SessionId))" -ForegroundColor Cyan

# Ensure upload dir exists on VPS
Invoke-SSHCommand -SSHSession $s -Command "mkdir -p /var/www/antigravity/client_upload" | Out-Null

# Step 2: Upload via SCP to an existing known dir
Write-Host "Uploading via SCP to /var/www/antigravity/client_upload/..." -ForegroundColor Yellow
# SCP to an existing directory - must NOT have trailing slash issue
Set-SCPItem -ComputerName $vpsIp -Credential $c `
    -Path "f:\Antigravity\client_dist.zip" `
    -Destination "/var/www/antigravity/client_upload/client_dist.zip" `
    -Force

Write-Host "Upload complete." -ForegroundColor Green

# Step 3: Verify file landed
$rv = Invoke-SSHCommand -SSHSession $s -Command "ls -lh /var/www/antigravity/client_upload/client_dist.zip 2>/dev/null || echo 'NOT_FOUND'"
Write-Host "VPS file: $($rv.Output -join '')"

# Step 4: Extract to correct Nginx root
Write-Host "`nExtracting to /var/www/antigravity/client/dist/..." -ForegroundColor Yellow
$r1 = Invoke-SSHCommand -SSHSession $s -Command @"
rm -rf /var/www/antigravity/client/dist
mkdir -p /var/www/antigravity/client/dist
unzip -o /var/www/antigravity/client_upload/client_dist.zip -d /var/www/antigravity/client/dist/
echo EXTRACT_OK
"@
Write-Host ($r1.Output[-3..-1] -join "`n")

# Step 5: Verify
$r2 = Invoke-SSHCommand -SSHSession $s -Command "ls /var/www/antigravity/client/dist/ && echo DIR_OK"
Write-Host "`nContents: $($r2.Output -join ' ')"

$r3 = Invoke-SSHCommand -SSHSession $s -Command "ls /var/www/antigravity/client/dist/assets/ | grep ManageServices"
Write-Host "ManageServicesView: $($r3.Output -join ' ')" -ForegroundColor Green

# Step 6: Reload nginx
$r4 = Invoke-SSHCommand -SSHSession $s -Command "nginx -s reload && echo NGINX_OK"
Write-Host "Nginx: $($r4.Output -join ' ')" -ForegroundColor Green

# Cleanup
Invoke-SSHCommand -SSHSession $s -Command "rm -rf /var/www/antigravity/client_upload" | Out-Null
Remove-SSHSession -SSHSession $s | Out-Null
Remove-Item "f:\Antigravity\client_dist.zip" -ErrorAction SilentlyContinue
Write-Host "=== DEPLOYMENT DONE ===" -ForegroundColor Green

Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$sftpSession = New-SFTPSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force
$sshSession = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

# Check if old code still on VPS
Write-Host "Checking VPS server code..."
$check = Invoke-SSHCommand -SSHSession $sshSession -Command "grep -c tokenExpiry /var/www/antigravity/server/dist/modules/marketing-tasks/controller.js"
Write-Host "tokenExpiry occurrences on VPS: $($check.Output)"

# Upload fixed server zip
Write-Host "Uploading fixed server dist..."
Set-SFTPItem -SFTPSession $sftpSession -Path "f:\Antigravity\server_dist.zip" -Destination "/tmp/" -Force

# Extract on VPS
Write-Host "Extracting server dist..."
Invoke-SSHCommand -SSHSession $sshSession -Command "rm -rf /var/www/antigravity/server/dist/* && unzip -o /tmp/server_dist.zip -d /var/www/antigravity/server/dist/ && rm /tmp/server_dist.zip"

# Verify the fix
Write-Host "Verifying fix..."
$check2 = Invoke-SSHCommand -SSHSession $sshSession -Command "grep -c tokenExpiry /var/www/antigravity/server/dist/modules/marketing-tasks/controller.js"
Write-Host "tokenExpiry occurrences after fix: $($check2.Output)"

# Restart PM2
Write-Host "Restarting PM2..."
Invoke-SSHCommand -SSHSession $sshSession -Command "pm2 restart qix-ads-v2.6"

Write-Host "Done!"
Remove-SFTPSession -SFTPSession $sftpSession | Out-Null
Remove-SSHSession -SSHSession $sshSession | Out-Null

Import-Module Posh-SSH -Force
$c = New-Object System.Management.Automation.PSCredential('root', (ConvertTo-SecureString 'EzdanAdam@243' -AsPlainText -Force))
$s = New-SSHSession -ComputerName 66.116.224.221 -Credential $c -AcceptKey -Force

# Check where nginx is serving frontend from
$r1 = Invoke-SSHCommand -SSHSession $s -Command "cat /etc/nginx/sites-enabled/* 2>/dev/null || cat /etc/nginx/nginx.conf | grep -A5 'root '"
Write-Host "=== NGINX CONFIG ===" -ForegroundColor Cyan
Write-Host ($r1.Output -join "`n")

# Check what's in common web dirs
$r2 = Invoke-SSHCommand -SSHSession $s -Command "ls /var/www/ && echo '---' && ls /var/www/antigravity/ 2>/dev/null && echo '---antigravity---' && ls /var/www/purple-port/ 2>/dev/null"
Write-Host "`n=== WEB DIRECTORIES ===" -ForegroundColor Cyan
Write-Host ($r2.Output -join "`n")

# Check where ManageServicesView is
$r3 = Invoke-SSHCommand -SSHSession $s -Command "find /var/www -name 'ManageServicesView*' 2>/dev/null | head -5"
Write-Host "`n=== ManageServicesView PATHS ===" -ForegroundColor Cyan
Write-Host ($r3.Output -join "`n")

# Check the modification time of deployed JS files
$r4 = Invoke-SSHCommand -SSHSession $s -Command "find /var/www -name '*.js' -newer /var/www/antigravity/server/dist/server.js 2>/dev/null | head -5"
Write-Host "`n=== RECENTLY DEPLOYED JS FILES ===" -ForegroundColor Cyan
Write-Host ($r4.Output -join "`n")

Remove-SSHSession -SSHSession $s | Out-Null

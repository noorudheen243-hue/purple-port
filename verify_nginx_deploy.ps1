Import-Module Posh-SSH -Force
$c = New-Object System.Management.Automation.PSCredential('root', (ConvertTo-SecureString 'EzdanAdam@243' -AsPlainText -Force))
$s = New-SSHSession -ComputerName 66.116.224.221 -Credential $c -AcceptKey -Force

# Confirm new ManageServicesView is in the nginx root
$r1 = Invoke-SSHCommand -SSHSession $s -Command "ls -la /var/www/antigravity/client/dist/assets/ManageServicesView* 2>/dev/null"
Write-Host "=== ManageServicesView in Nginx root ===" -ForegroundColor Cyan
Write-Host ($r1.Output -join "`n")

# Check index.html freshness
$r2 = Invoke-SSHCommand -SSHSession $s -Command "ls -la /var/www/antigravity/client/dist/index.html"
Write-Host "`n=== index.html ===" -ForegroundColor Cyan
Write-Host ($r2.Output -join "`n")

# Count files in the dist
$r3 = Invoke-SSHCommand -SSHSession $s -Command "find /var/www/antigravity/client/dist -name '*.js' | wc -l"
Write-Host "`n=== JS file count in client/dist ===" -ForegroundColor Cyan
Write-Host ($r3.Output -join "`n")

Remove-SSHSession -SSHSession $s | Out-Null

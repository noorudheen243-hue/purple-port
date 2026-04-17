Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"
$User = "root"
$Pass = "EzdanAdam@243"  
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)

$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force
$sftp = New-SFTPSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

function Run($cmd, $timeout = 120) {
    $r = Invoke-SSHCommand -SessionId $s.SessionId -Command $cmd -TimeOut $timeout
    Write-Host ($r.Output -join "`n") -ForegroundColor White
    if ($r.Error -and $r.Error.Trim()) { Write-Host "STDERR: $($r.Error.Trim())" -ForegroundColor Yellow }
    return $r
}

# 1. Upload fixed service.js
Write-Host "`n[1/4] Uploading fixed payroll service.js..." -ForegroundColor Cyan
Set-SFTPItem -SFTPSession $sftp -Path 'f:\Antigravity\server\dist\modules\payroll\service.js' -Destination '/var/www/purple-port/server/dist/modules/payroll/' -Force
Write-Host "Uploaded successfully." -ForegroundColor Green

# 2. Verify the file timestamp on VPS
Write-Host "`n[2/4] Verifying file timestamp on VPS..." -ForegroundColor Cyan
Run "stat /var/www/purple-port/server/dist/modules/payroll/service.js"

# 3. Verify the IST_OFFSET string is in the file (confirm it's our version)
Write-Host "`n[3/4] Confirming IST_OFFSET presence in deployed file..." -ForegroundColor Cyan
Run "grep -c 'IST_OFFSET' /var/www/purple-port/server/dist/modules/payroll/service.js"

# 4. Hard delete + restart PM2
Write-Host "`n[4/4] Hard reloading PM2..." -ForegroundColor Yellow
Run "source `$HOME/.nvm/nvm.sh 2>/dev/null; pm2 delete qix-ads-v2.7; pm2 start /var/www/purple-port/server/dist/server.js --name qix-ads-v2.7 --cwd /var/www/purple-port/server; pm2 save"

Write-Host "`nDone! PM2 restarted with fresh code." -ForegroundColor Green

Remove-SSHSession -SessionId $s.SessionId | Out-Null
Remove-SFTPSession -SFTPSession $sftp | Out-Null

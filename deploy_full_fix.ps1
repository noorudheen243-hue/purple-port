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
    Write-Host ($r.Output -join "`n")
    if ($r.Error -and $r.Error.Trim()) { Write-Host "ERR: $($r.Error.Trim())" -ForegroundColor Yellow }
    return $r
}

# 1. Upload backend service.js
Write-Host "[1/4] Uploading backend payroll service.js..." -ForegroundColor Cyan
Set-SFTPItem -SFTPSession $sftp -Path 'f:\Antigravity\server\dist\modules\payroll\service.js' -Destination '/var/www/purple-port/server/dist/modules/payroll/' -Force
Write-Host "Backend uploaded." -ForegroundColor Green

# 2. Upload frontend dist to CORRECT Nginx root: /var/www/purple-port/client/dist
Write-Host "`n[2/4] Uploading frontend dist..." -ForegroundColor Cyan
$zipPath = 'f:\Antigravity\client_dist.zip'
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Compress-Archive -Path 'f:\Antigravity\client\dist\*' -DestinationPath $zipPath
Set-SFTPItem -SFTPSession $sftp -Path $zipPath -Destination '/var/www/purple-port/client/' -Force
Run "cd /var/www/purple-port/client && unzip -o client_dist.zip -d dist && rm -f client_dist.zip"
Write-Host "Frontend uploaded to /var/www/purple-port/client/dist." -ForegroundColor Green

# 3. Restart PM2
Write-Host "`n[3/4] Restarting PM2..." -ForegroundColor Yellow
Run "source `$HOME/.nvm/nvm.sh 2>/dev/null; pm2 restart qix-ads-v2.7"

Write-Host "`n[4/4] Verifying backend status..." -ForegroundColor Cyan
Run "grep -c 'IN_PROGRESS' /var/www/purple-port/server/dist/modules/payroll/service.js"

Write-Host "`nAll done! Please hard-refresh your browser." -ForegroundColor Green
Remove-SSHSession -SessionId $s.SessionId | Out-Null
Remove-SFTPSession -SFTPSession $sftp | Out-Null

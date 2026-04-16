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

# 1. Check IST_OFFSET in the currently running file
Write-Host "[1] Checking if IST_OFFSET is in deployed service.js..." -ForegroundColor Cyan
$r1 = Run "grep -c 'IST_OFFSET' /var/www/purple-port/server/dist/modules/payroll/service.js"
Write-Host "IST_OFFSET count: $($r1.Output)"

# 2. Check file modification time
Write-Host "`n[2] File modification time..." -ForegroundColor Cyan
Run "stat -c '%y %n' /var/www/purple-port/server/dist/modules/payroll/service.js"

# 3. PM2 status
Write-Host "`n[3] PM2 Status..." -ForegroundColor Cyan
Run "source `$HOME/.nvm/nvm.sh 2>/dev/null; pm2 list"

# 4. PM2 logs last 30 lines
Write-Host "`n[4] Recent PM2 Logs..." -ForegroundColor Cyan
Run "source `$HOME/.nvm/nvm.sh 2>/dev/null; pm2 logs --nostream --lines 20 qix-ads-v2.7"

Remove-SSHSession -SessionId $s.SessionId | Out-Null
Remove-SFTPSession -SFTPSession $sftp | Out-Null

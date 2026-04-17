Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"
$User = "root"
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force
$sftp = New-SFTPSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

function Run($cmd, $timeout = 60) {
    $r = Invoke-SSHCommand -SessionId $s.SessionId -Command $cmd -TimeOut $timeout
    Write-Host ($r.Output -join "`n")
    return $r
}

# 1. Find static serving in server.js
Write-Host "[1] Static path in server.js..." -ForegroundColor Cyan
Run "grep -n static /var/www/purple-port/server/dist/server.js | head -10"

# 2. Directory listing
Write-Host "[2] Purple-port root..." -ForegroundColor Cyan
Run "ls /var/www/purple-port/"

# 3. Public folder
Write-Host "[3] Public folder..." -ForegroundColor Cyan
Run "ls /var/www/purple-port/public/ 2>/dev/null || echo NO_PUBLIC"

# 4. Check index.html exists
Write-Host "[4] index.html location..." -ForegroundColor Cyan
Run "find /var/www/purple-port -name index.html 2>/dev/null | head -5"

Remove-SSHSession -SessionId $s.SessionId | Out-Null
Remove-SFTPSession -SFTPSession $sftp | Out-Null

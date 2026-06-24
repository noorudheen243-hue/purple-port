Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"
$User = "root"
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)

Write-Host "Connecting SSH to $VPS..." -ForegroundColor Cyan
$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

function Run($cmd) {
    Write-Host "`n>> $cmd" -ForegroundColor DarkGray
    $r = Invoke-SSHCommand -SessionId $s.SessionId -Command $cmd -TimeOut 60
    if ($r.Output) { Write-Host $r.Output -ForegroundColor White }
    if ($r.Error -and $r.Error.Trim()) { Write-Host "ERR: $($r.Error)" -ForegroundColor Yellow }
}

try {
    Write-Host "`nDeleting BIOMETRIC attendance records..." -ForegroundColor Yellow
    Run "sqlite3 /var/www/purple-port/server/prisma/dev.db `"DELETE FROM AttendanceRecord WHERE method = 'BIOMETRIC';`""
    
    Write-Host "`nChecking records left..." -ForegroundColor Yellow
    Run "sqlite3 /var/www/purple-port/server/prisma/dev.db `"SELECT COUNT(*) FROM AttendanceRecord;`""
}
finally {
    if ($s) { Remove-SSHSession -SessionId $s.SessionId | Out-Null }
}

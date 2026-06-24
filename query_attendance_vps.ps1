Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"
$User = "root"
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)

$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

function Run($cmd) {
    $r = Invoke-SSHCommand -SessionId $s.SessionId -Command $cmd -TimeOut 60
    if ($r.Output) { Write-Host ($r.Output -join "`n") }
    if ($r.Error -and $r.Error.Trim()) { Write-Host "ERR: $($r.Error)" -ForegroundColor Red }
}

try {
    Write-Host "`n=== ATTENDANCE ===" -ForegroundColor Green
    Run "sqlite3 /var/www/purple-port/server/prisma/dev.db 'SELECT user_id, date, check_in, check_out, method, updatedAt FROM AttendanceRecord ORDER BY updatedAt DESC LIMIT 5;'"
}
finally {
    if ($s) { Remove-SSHSession -SessionId $s.SessionId | Out-Null }
}

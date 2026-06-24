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
}

try {
    Write-Host "`n=== SYNC LOGS ===" -ForegroundColor Green
    Run "sqlite3 /var/www/purple-port/server/prisma/dev.db 'SELECT method, status, logs_fetched, logs_saved, sync_time FROM BiometricSyncLog ORDER BY sync_time DESC LIMIT 5;'"
    Write-Host "`n=== DEVICE STATUS ===" -ForegroundColor Green
    Run "sqlite3 /var/www/purple-port/server/prisma/dev.db 'SELECT id, status, last_heartbeat FROM BiometricDeviceStatus;'"
}
finally {
    if ($s) { Remove-SSHSession -SessionId $s.SessionId | Out-Null }
}

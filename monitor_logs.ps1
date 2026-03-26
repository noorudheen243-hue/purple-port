# Monitor PM2 Logs for Time
Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

function Run($cmd, $timeout = 60) {
    Write-Host "`n>> $cmd" -ForegroundColor DarkGray
    $r = Invoke-SSHCommand -SessionId $s.SessionId -Command $cmd -TimeOut $timeout
    if ($r.Output) { Write-Host $r.Output -ForegroundColor White }
    if ($r.Error -and $r.Error.Trim()) { Write-Host "ERR: $($r.Error)" -ForegroundColor Yellow }
    return $r
}

Write-Host "`n[1] Check last 100 log lines with timestamps" -ForegroundColor Yellow
Run "tail -n 100 /root/.pm2/logs/qix-backend-out.log"

Write-Host "`n[2] Check for SQLite journal files (indicates active transactions/busy)" -ForegroundColor Yellow
Run "ls -lah /var/www/purple-port/server/prisma/"

Remove-SSHSession -SessionId $s.SessionId | Out-Null

# Check PM2 Crash Logs
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

Write-Host "`n[1] Check PM2 status" -ForegroundColor Yellow
Run "source `$HOME/.nvm/nvm.sh 2>/dev/null; pm2 list"

Write-Host "`n[2] Check PM2 error logs for the crash" -ForegroundColor Yellow
Run "tail -50 /root/.pm2/logs/qix-backend-error.log"

Write-Host "`n[3] Check PM2 out logs" -ForegroundColor Yellow
Run "tail -20 /root/.pm2/logs/qix-backend-out.log"

Remove-SSHSession -SessionId $s.SessionId | Out-Null

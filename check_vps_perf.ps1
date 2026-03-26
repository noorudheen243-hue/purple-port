# Check VPS Performance
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

Write-Host "`n[1] Check System Uptime, Load Average, Memory" -ForegroundColor Yellow
Run "uptime && echo '---' && free -m && echo '---' && df -h /"

Write-Host "`n[2] Check top CPU/Memory processes running on the server" -ForegroundColor Yellow
Run "top -b -n 1 | head -20"

Write-Host "`n[3] Check PM2 app resource usage" -ForegroundColor Yellow
Run "source `$HOME/.nvm/nvm.sh 2>/dev/null; pm2 list"

Write-Host "`n[4] Check DB file size (can cause slow SQLite responses if huge without indices)" -ForegroundColor Yellow
Run "ls -lah /var/www/antigravity/prisma/dev.db /var/www/purple-port/server/prisma/dev.db 2>/dev/null"

Remove-SSHSession -SessionId $s.SessionId | Out-Null

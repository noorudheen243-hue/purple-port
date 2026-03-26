# Verify Optimal State
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

Write-Host "`n[1] Check PM2 processes" -ForegroundColor Yellow
Run "source `$HOME/.nvm/nvm.sh 2>/dev/null; pm2 list"

Write-Host "`n[2] Check Nginx status and config root" -ForegroundColor Yellow
Run "systemctl status nginx --no-pager"
Run "grep 'root' /etc/nginx/sites-available/default"

Write-Host "`n[3] Check if Gzip is actually working (using curl)" -ForegroundColor Yellow
Run "curl -I -H 'Accept-Encoding: gzip' http://localhost/api/users"

Write-Host "`n[4] Check last few lines of PM2 logs (should NOT have many prisma:query)" -ForegroundColor Yellow
Run "source `$HOME/.nvm/nvm.sh 2>/dev/null; pm2 logs qix-backend --lines 20 --no-colors"

Remove-SSHSession -SessionId $s.SessionId | Out-Null

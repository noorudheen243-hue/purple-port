# Final Verification of Optimizations
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

Write-Host "`n[1] Check Gzip Compression on API" -ForegroundColor Yellow
Run "curl -I -H 'Accept-Encoding: gzip' -k https://qixport.com/api/users"

Write-Host "`n[2] Check Nginx Root" -ForegroundColor Yellow
Run "grep 'root' /etc/nginx/sites-available/default"

Write-Host "`n[3] Check PM2 Logs (Wait for any activity)" -ForegroundColor Yellow
Run "source `$HOME/.nvm/nvm.sh 2>/dev/null; pm2 logs qix-backend --lines 20 --no-colors"

Remove-SSHSession -SessionId $s.SessionId | Out-Null

# Check for uploads directories
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

Write-Host "`n[1] Check PM2 cwd" -ForegroundColor Yellow
Run "source `$HOME/.nvm/nvm.sh 2>/dev/null; pm2 show qix-backend | grep pm_cwd"

Write-Host "`n[2] Check /var/www/antigravity/uploads" -ForegroundColor Yellow
Run "ls -lah /var/www/antigravity/uploads 2>/dev/null | head -10"
Run "ls -lah /var/www/antigravity/uploads/avatars 2>/dev/null | head -10"

Write-Host "`n[3] Check /var/www/purple-port/server/uploads" -ForegroundColor Yellow
Run "ls -lah /var/www/purple-port/server/uploads 2>/dev/null | head -10"
Run "ls -lah /var/www/purple-port/server/uploads/avatars 2>/dev/null | head -10"

Remove-SSHSession -SessionId $s.SessionId | Out-Null

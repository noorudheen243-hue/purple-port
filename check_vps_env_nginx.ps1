# Check Environment and Nginx
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

Write-Host "`n[1] Check NODE_ENV and .env content (masking secrets)" -ForegroundColor Yellow
Run "cat /var/www/antigravity/.env | grep -v 'SECRET\|KEY\|PASS'"

Write-Host "`n[2] Check PM2 environment variables for qix-backend" -ForegroundColor Yellow
Run "source `$HOME/.nvm/nvm.sh 2>/dev/null; pm2 show qix-backend | grep -i 'node_env\|debug'"

Write-Host "`n[3] Check Nginx configuration" -ForegroundColor Yellow
Run "ls -la /etc/nginx/sites-enabled/"
Run "cat /etc/nginx/sites-enabled/default 2>/dev/null"
Run "cat /etc/nginx/sites-enabled/qixport 2>/dev/null"
Run "cat /etc/nginx/sites-enabled/antigravity 2>/dev/null"

Remove-SSHSession -SessionId $s.SessionId | Out-Null

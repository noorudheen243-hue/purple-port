# Manually run the remote steps
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

Write-Host "`n[1] Test Zip Integrity" -ForegroundColor Yellow
Run "unzip -t /var/www/performance_update.zip"

Write-Host "`n[2] Extract Zip" -ForegroundColor Yellow
Run "mkdir -p /var/www/antigravity && unzip -o -q /var/www/performance_update.zip -d /var/www/antigravity"

Write-Host "`n[3] Apply Nginx Config" -ForegroundColor Yellow
Run "mv /tmp/nginx_optimized.conf /etc/nginx/sites-available/default && nginx -t && systemctl restart nginx"

Write-Host "`n[4] Restart App" -ForegroundColor Yellow
Run "source `$HOME/.nvm/nvm.sh 2>/dev/null; cd /var/www/antigravity && npx prisma generate && pm2 delete qix-backend || true; pm2 start dist/server.js --name 'qix-backend' --env production && pm2 save"

Remove-SSHSession -SessionId $s.SessionId | Out-Null

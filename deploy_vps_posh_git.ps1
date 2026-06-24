Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"
$User = "root"
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)

Write-Host "Connecting SSH to $VPS..." -ForegroundColor Cyan
$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

function Run($cmd, $timeout = 600) {
    Write-Host "`n>> $cmd" -ForegroundColor DarkGray
    $r = Invoke-SSHCommand -SessionId $s.SessionId -Command $cmd -TimeOut $timeout
    if ($r.Output) { Write-Host $r.Output -ForegroundColor White }
    if ($r.Error -and $r.Error.Trim()) { Write-Host "ERR: $($r.Error)" -ForegroundColor Yellow }
    return $r
}

try {
    Write-Host "`n[1/5] Listing PM2 processes..." -ForegroundColor Yellow
    Run "source `$HOME/.nvm/nvm.sh 2>/dev/null; pm2 status"

    Write-Host "`n[2/5] Pulling Latest Code from Git..." -ForegroundColor Yellow
    # Discard any local changes on the VPS and pull the latest code
    Run "cd /var/www/purple-port && git fetch origin && git reset --hard origin/main"

    Write-Host "`n[3/5] Installing dependencies and building client..." -ForegroundColor Yellow
    Run "source `$HOME/.nvm/nvm.sh 2>/dev/null; cd /var/www/purple-port/client && npm install --legacy-peer-deps && npm run build"

    Write-Host "`n[4/5] Syncing build to server public folder and restarting nginx..." -ForegroundColor Yellow
    Run "mkdir -p /var/www/purple-port/server/public && rm -rf /var/www/purple-port/server/public/* && cp -r /var/www/purple-port/client/dist/* /var/www/purple-port/server/public/"
    Run "systemctl restart nginx"

    Write-Host "`n[5/5] Rebuilding backend server..." -ForegroundColor Yellow
    Run "source `$HOME/.nvm/nvm.sh 2>/dev/null; cd /var/www/purple-port/server && npm install && npx prisma generate && npm run build"
    
    Write-Host "`n[Restarting PM2]..." -ForegroundColor Yellow
    Run "source `$HOME/.nvm/nvm.sh 2>/dev/null; pm2 restart all"
    Run "source `$HOME/.nvm/nvm.sh 2>/dev/null; pm2 status"

    Write-Host "`n==========================================" -ForegroundColor Green
    Write-Host "   DEPLOYMENT VIA GIT SUCCESSFUL!         " -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
}
catch {
    Write-Error "Deployment script failed: $($_.Exception.Message)"
}
finally {
    if ($s) {
        Remove-SSHSession -SessionId $s.SessionId | Out-Null
    }
}

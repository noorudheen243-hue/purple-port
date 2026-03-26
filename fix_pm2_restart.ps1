# Find real server structure and fix the crashed PM2
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

Write-Host "`n[1] Show PM2 process info - what CWD / script is really used" -ForegroundColor Yellow
Run "source `$HOME/.nvm/nvm.sh 2>/dev/null; pm2 show qix-backend"

Write-Host "`n[2] Find big server.js files (the real compiled one)" -ForegroundColor Yellow
Run "find /var/www -name 'server.js' -size +100k 2>/dev/null | xargs ls -lah 2>/dev/null"

Write-Host "`n[3] Check if there is a dist folder inside /var/www/antigravity" -ForegroundColor Yellow
Run "ls -lah /var/www/antigravity/dist/ 2>/dev/null | head -10 && ls -lah /var/www/antigravity/node_modules/@prisma 2>/dev/null | head -5"

Write-Host "`n[4] Check /var/www/purple-port layout" -ForegroundColor Yellow
Run "find /var/www/purple-port -maxdepth 3 -name 'package.json' 2>/dev/null | xargs ls -lah"

Write-Host "`n[5] Try to start server from antigravity (where PM2 originally pointed)" -ForegroundColor Yellow
Run "source `$HOME/.nvm/nvm.sh 2>/dev/null; pm2 delete qix-backend; pm2 start /var/www/antigravity/dist/server.js --name qix-backend --cwd /var/www/antigravity && pm2 save && echo 'Started from antigravity'" 30

Write-Host "`n[6] Health check after restart" -ForegroundColor Yellow
Run "sleep 5 && curl -s http://localhost:4001/health && echo done" 15

Remove-SSHSession -SessionId $s.SessionId | Out-Null

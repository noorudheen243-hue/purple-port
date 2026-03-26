# Fix antigravity app completely
Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

function Run($cmd, $timeout = 300) {
    Write-Host "`n>> $cmd" -ForegroundColor DarkGray
    $r = Invoke-SSHCommand -SessionId $s.SessionId -Command $cmd -TimeOut $timeout
    if ($r.Output) { Write-Host $r.Output -ForegroundColor White }
    if ($r.Error -and $r.Error.Trim()) { Write-Host "ERR: $($r.Error)" -ForegroundColor Yellow }
    return $r
}

$APP = "/var/www/antigravity"

Write-Host "`n[1] Remove symlink and restore normal Prisma folder" -ForegroundColor Yellow
Run "rm -rf $APP/node_modules/@prisma"

Write-Host "`n[2] Git pull latest in antigravity" -ForegroundColor Yellow
Run "cd $APP && git fetch --all && git reset --hard origin/main" 60

Write-Host "`n[3] Re-install dependencies and generate Prisma Client" -ForegroundColor Yellow
Run "source `$HOME/.nvm/nvm.sh 2>/dev/null; cd $APP && npm install --no-audit && npx prisma generate" 180

Write-Host "`n[4] Re-build server code" -ForegroundColor Yellow
Run "source `$HOME/.nvm/nvm.sh 2>/dev/null; cd $APP && npm run build" 180

Write-Host "`n[5] Ensure .env points to the REAL DB" -ForegroundColor Yellow
Run "sed -i 's|DATABASE_URL=.*|DATABASE_URL=file:/var/www/purple-port/server/prisma/dev.db|' $APP/.env"
Run "grep DATABASE_URL $APP/.env"

Write-Host "`n[6] Restart PM2" -ForegroundColor Yellow
Run "source `$HOME/.nvm/nvm.sh 2>/dev/null; pm2 restart qix-backend"

Write-Host "`n[7] Check health and logs" -ForegroundColor Yellow
Run "sleep 5 && curl -s http://localhost:4001/health || tail -30 /root/.pm2/logs/qix-backend-error.log"

Remove-SSHSession -SessionId $s.SessionId | Out-Null

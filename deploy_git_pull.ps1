# Deploy via SSH Posh-SSH with individual commands (no heredoc escaping issues)
Import-Module Posh-SSH -Force

$VPS = "66.116.224.221"
$User = "root"
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)

Write-Host "Connecting to VPS..." -ForegroundColor Cyan
$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force
Write-Host "Connected (Session $($s.SessionId))" -ForegroundColor Green

function Run ($cmd) {
    Write-Host "  >> $cmd" -ForegroundColor DarkGray
    $r = Invoke-SSHCommand -SessionId $s.SessionId -Command $cmd -TimeOut 180
    if ($r.Output) { Write-Host $r.Output -ForegroundColor White }
    if ($r.Error -and $r.Error.Trim()) { Write-Host "STDERR: $($r.Error)" -ForegroundColor Yellow }
    return $r
}

Write-Host "`n[1] Load NVM and show node version" -ForegroundColor Yellow
Run 'source $HOME/.nvm/nvm.sh 2>/dev/null; node -v; npm -v'

Write-Host "`n[2] Git pull latest code at /var/www/purple-port" -ForegroundColor Yellow
Run 'cd /var/www/purple-port && git fetch --all && git reset --hard origin/main && git log -1 --oneline'

Write-Host "`n[3] Install server dependencies" -ForegroundColor Yellow
Run 'source $HOME/.nvm/nvm.sh 2>/dev/null; cd /var/www/purple-port && npm install --production --no-audit --silent 2>&1 | tail -5'

Write-Host "`n[4] Build TypeScript server" -ForegroundColor Yellow
Run 'source $HOME/.nvm/nvm.sh 2>/dev/null; cd /var/www/purple-port && npm run build 2>&1 | tail -5'

Write-Host "`n[5] Build and copy frontend" -ForegroundColor Yellow
Run 'source $HOME/.nvm/nvm.sh 2>/dev/null; cd /var/www/purple-port && npm run build:client 2>&1 | tail -5 || echo "No client build script - using pre-built"'

Write-Host "`n[6] Setup backup directory" -ForegroundColor Yellow
Run 'mkdir -p /var/backups/antigravity && chmod 755 /var/backups/antigravity && echo "Backup dir: OK"'

Write-Host "`n[7] Patch .env for backup settings" -ForegroundColor Yellow
Run 'f=/var/www/purple-port/.env; grep -q BACKUP_DIR "$f" || echo "BACKUP_DIR=/var/backups/antigravity" >> "$f"; grep -q AUTO_BACKUP_ENABLED "$f" || echo "AUTO_BACKUP_ENABLED=true" >> "$f"; echo "ENV patched"; cat "$f" | grep -E "BACKUP|AUTO_BACK"'

Write-Host "`n[8] Restart PM2" -ForegroundColor Yellow
Run 'source $HOME/.nvm/nvm.sh 2>/dev/null; pm2 restart all && echo "PM2 restarted OK"'

Write-Host "`n[9] Verify - check if backup route is in dist" -ForegroundColor Yellow
Run 'grep -r "save-to-disk" /var/www/purple-port/dist/ 2>/dev/null && echo "BACKUP_ROUTES_FOUND" || echo "NOT_FOUND_IN_DIST"'

Remove-SSHSession -SessionId $s.SessionId | Out-Null
Write-Host "`nDone! Test: https://www.qixport.com/dashboard/settings" -ForegroundColor Green

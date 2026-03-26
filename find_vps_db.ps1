# Find the live database and app directory on VPS
Import-Module Posh-SSH -Force

$VPS = "66.116.224.221"
$User = "root"
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)

Write-Host "Connecting..." -ForegroundColor Cyan
$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

function Run($cmd, $timeout = 60) {
    Write-Host "`n>> $cmd" -ForegroundColor DarkGray
    $r = Invoke-SSHCommand -SessionId $s.SessionId -Command $cmd -TimeOut $timeout
    if ($r.Output) { Write-Host $r.Output -ForegroundColor White }
    if ($r.Error -and $r.Error.Trim()) { Write-Host "ERR: $($r.Error)" -ForegroundColor Yellow }
}

# Find all SQLite DB files on the server
Write-Host "`n[A] Find all .db files (SQLite databases)" -ForegroundColor Yellow
Run 'find / -name "*.db" -not -path "*/proc/*" -not -path "*/sys/*" 2>/dev/null | head -20'

# Check what env PM2 uses for the running process
Write-Host "`n[B] Show the actual env file being used by qix-backend" -ForegroundColor Yellow
Run 'source $HOME/.nvm/nvm.sh 2>/dev/null; pm2 show qix-backend 2>/dev/null | grep -E "cwd|script|DATABASE|env"'

# Check what files PM2 dump shows
Write-Host "`n[C] PM2 dump - find cwd and DATABASE_URL" -ForegroundColor Yellow
Run 'cat /root/.pm2/dump.pm2 2>/dev/null | python3 -c "import sys,json,pprint; d=json.load(sys.stdin); [print(a[\"name\"],\"cwd:\",a.get(\"pm_cwd\",\"?\"),\"exec:\",a.get(\"pm_exec_path\",\"?\"),\"env:\",{k:v for k,v in a.get(\"pm2_env\",{}).items() if \"DATABASE\" in k or \"PORT\" in k or \"JWT\" in k}) for a in d[\"list\"]]"'

# Check which actual dir the process runs from
Write-Host "`n[D] Check /proc for the running node process CWD" -ForegroundColor Yellow
Run 'NODE_PID=$(pgrep -f "qix-backend" | head -1) && [ -n "$NODE_PID" ] && ls -la /proc/$NODE_PID/cwd || echo "Process not found via pgrep"'

# Check all .env files to find DATABASE_URL
Write-Host "`n[E] Find all .env files with DATABASE_URL" -ForegroundColor Yellow
Run 'find /var/www -name ".env" 2>/dev/null -exec sh -c "echo \"=== {} ===\"; grep -i database {} 2>/dev/null" \;'

Remove-SSHSession -SessionId $s.SessionId | Out-Null

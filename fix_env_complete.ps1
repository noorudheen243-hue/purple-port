Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)
$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force
$APP = "/var/www/purple-port/server"
$DB = "$APP/prisma/dev.db"

function Run($cmd, $timeout = 15) {
    $r = Invoke-SSHCommand -SessionId $s.SessionId -Command $cmd -TimeOut $timeout
    if ($r.Output) { Write-Host $r.Output -ForegroundColor White }
    if ($r.Error -and $r.Error.Trim()) { Write-Host "ERR: $($r.Error)" -ForegroundColor Yellow }
    return $r
}

# 1. Fix CLIENT_URL
Write-Host "[1] Fixing CLIENT_URL..." -ForegroundColor Cyan
Run "python3 -c `"
import re
with open('$APP/.env','r') as f: c=f.read()
c=re.sub(r'CLIENT_URL=.*', 'CLIENT_URL=https://qixport.com', c)
with open('$APP/.env','w') as f: f.write(c)
print('CLIENT_URL fixed')
`""

# 2. Check what's in DB for META settings
Write-Host "`n[2] SystemSettings for META in DB..." -ForegroundColor Cyan
Run "sqlite3 $DB 'SELECT key, value FROM SystemSetting;'"

# 3. Show the URL the app will now use
Write-Host "`n[3] Final ENV check..." -ForegroundColor Cyan
Run "grep -E 'API_URL|CLIENT_URL|META' $APP/.env"

# 4. Restart PM2
Write-Host "`n[4] Restarting PM2..." -ForegroundColor Cyan
Run "source `$HOME/.nvm/nvm.sh 2>/dev/null; pm2 restart all --update-env && pm2 save" 30

Remove-SSHSession -SessionId $s.SessionId | Out-Null
Write-Host "`nDone! Now check what App ID is in the DB." -ForegroundColor Green

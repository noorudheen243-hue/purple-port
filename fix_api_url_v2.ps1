Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)
$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force
$APP = "/var/www/purple-port/server"

# Use Python to safely replace the API_URL line
$fixCmd = "python3 -c `"
import re
with open('$APP/.env','r') as f: content=f.read()
content=re.sub(r'API_URL=.*', 'API_URL=https://qixport.com', content)
with open('$APP/.env','w') as f: f.write(content)
print('Done')
`""

Write-Host "[1] Fixing API_URL using Python..." -ForegroundColor Cyan
$r = Invoke-SSHCommand -SessionId $s.SessionId -Command $fixCmd -TimeOut 10
Write-Host $r.Output
if ($r.Error) { Write-Host "ERR: $($r.Error)" -ForegroundColor Red }

Write-Host "`n[2] Verifying fix..." -ForegroundColor Cyan
$r2 = Invoke-SSHCommand -SessionId $s.SessionId -Command "grep API_URL $APP/.env" -TimeOut 5
Write-Host $r2.Output

Write-Host "`n[3] Restarting PM2 with updated env..." -ForegroundColor Cyan
$r3 = Invoke-SSHCommand -SessionId $s.SessionId -Command "source `$HOME/.nvm/nvm.sh 2>/dev/null; pm2 restart all --update-env && pm2 save" -TimeOut 30
Write-Host $r3.Output

Remove-SSHSession -SessionId $s.SessionId | Out-Null
Write-Host "`nCallback URL is now: https://qixport.com/api/marketing/auth/meta/callback" -ForegroundColor Green

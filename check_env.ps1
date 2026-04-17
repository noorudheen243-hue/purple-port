Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)
$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

Write-Host "=== ENV: API_URL, META_APP_ID ===" -ForegroundColor Cyan
$r = Invoke-SSHCommand -SessionId $s.SessionId -Command "grep -E 'API_URL|META_APP' /var/www/purple-port/server/.env 2>/dev/null" -TimeOut 10
Write-Host $r.Output

Write-Host "`n=== Meta App ID from DB ===" -ForegroundColor Cyan
$r2 = Invoke-SSHCommand -SessionId $s.SessionId -Command "sqlite3 /var/www/purple-port/server/prisma/dev.db 'SELECT key, value FROM SystemSetting WHERE key LIKE \"%META%\";'" -TimeOut 10
Write-Host $r2.Output

Remove-SSHSession -SessionId $s.SessionId | Out-Null

Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)
$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force
$DB = "/var/www/purple-port/server/prisma/dev.db"

Write-Host "=== ALL System Settings ===" -ForegroundColor Cyan
$r = Invoke-SSHCommand -SessionId $s.SessionId -Command "sqlite3 $DB 'SELECT key, value FROM SystemSetting;'" -TimeOut 10
Write-Host $r.Output

Write-Host "`n=== MetaToken table ===" -ForegroundColor Cyan
$r2 = Invoke-SSHCommand -SessionId $s.SessionId -Command "sqlite3 $DB 'SELECT id, account_name, isActive, expires_at FROM MetaToken;'" -TimeOut 10
Write-Host $r2.Output

Remove-SSHSession -SessionId $s.SessionId | Out-Null

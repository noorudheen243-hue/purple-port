Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)
$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force
$dbPath = "/var/www/purple-port/server/prisma/dev.db"

Write-Host "=== Clients with 'basil' or 'homeo' ===" -ForegroundColor Cyan
$r = Invoke-SSHCommand -SessionId $s.SessionId -Command "sqlite3 $dbPath ""SELECT id, name FROM Client WHERE LOWER(name) LIKE '%basil%' OR LOWER(name) LIKE '%homeo%';"" " -TimeOut 15
Write-Host $r.Output
if ($r.Error) { Write-Host "ERR: $($r.Error)" -ForegroundColor Red }

Write-Host "`n=== ALL MetaAccounts (externalAccountId | clientId | metaTokenId) ===" -ForegroundColor Cyan
$r2 = Invoke-SSHCommand -SessionId $s.SessionId -Command "sqlite3 $dbPath ""SELECT externalAccountId, clientId, metaTokenId FROM MarketingAccount WHERE platform='meta';"" " -TimeOut 15
Write-Host $r2.Output

Remove-SSHSession -SessionId $s.SessionId | Out-Null

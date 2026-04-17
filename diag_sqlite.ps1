Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)
$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force
$APP = "/var/www/purple-port/server"

# Run diagnostic using sqlite3 directly - no Prisma schema issues
Write-Host "=== MARKETING ACCOUNTS ===" -ForegroundColor Cyan
$dbPath = "/var/www/purple-port/server/prisma/dev.db"
$r = Invoke-SSHCommand -SessionId $s.SessionId -Command "sqlite3 '$dbPath' 'SELECT platform, externalAccountId, accessToken IS NOT NULL as hasDirectToken, metaTokenId FROM MarketingAccount;'" -TimeOut 15
Write-Host $r.Output

Write-Host "`n=== CAMPAIGNS BY STATUS ===" -ForegroundColor Cyan
$r2 = Invoke-SSHCommand -SessionId $s.SessionId -Command "sqlite3 '$dbPath' 'SELECT status, COUNT(*) FROM MarketingCampaign GROUP BY status;'" -TimeOut 15
Write-Host $r2.Output

Write-Host "`n=== METRICS COUNT ===" -ForegroundColor Cyan
$r3 = Invoke-SSHCommand -SessionId $s.SessionId -Command "sqlite3 '$dbPath' 'SELECT COUNT(*) as total_metrics, MIN(date) as earliest, MAX(date) as latest FROM MarketingMetric;'" -TimeOut 15
Write-Host $r3.Output

Write-Host "`n=== LAST SYNC LOGS ===" -ForegroundColor Cyan
$r4 = Invoke-SSHCommand -SessionId $s.SessionId -Command "sqlite3 '$dbPath' 'SELECT status, startedAt, details FROM MarketingSyncLog ORDER BY startedAt DESC LIMIT 3;'" -TimeOut 15
Write-Host $r4.Output

Write-Host "`n=== META TOKENS ===" -ForegroundColor Cyan
$r5 = Invoke-SSHCommand -SessionId $s.SessionId -Command "sqlite3 '$dbPath' 'SELECT id, account_name, isActive, expires_at FROM MetaToken LIMIT 5;'" -TimeOut 15
Write-Host $r5.Output

Remove-SSHSession -SessionId $s.SessionId | Out-Null

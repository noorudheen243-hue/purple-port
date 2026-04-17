Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)
$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

Write-Host "=== FULL SYNC LOG ===" -ForegroundColor Cyan
$r = Invoke-SSHCommand -SessionId $s.SessionId -Command "cat /tmp/meta_sync.log 2>/dev/null | grep -v 'prisma:query' | grep -v 'graph.facebook' | grep -v 'keepAlive' | grep -v '_events'" -TimeOut 15
Write-Host $r.Output

Write-Host "`n=== DB CHECK ===" -ForegroundColor Cyan
$dbPath = "/var/www/purple-port/server/prisma/dev.db"
$r2 = Invoke-SSHCommand -SessionId $s.SessionId -Command "sqlite3 $dbPath ""SELECT COUNT(*) as metrics, (SELECT COUNT(*) FROM MarketingCampaign WHERE status='ACTIVE') as active_camps, (SELECT COUNT(*) FROM MarketingCampaign) as total_camps FROM MarketingMetric;"" " -TimeOut 15
Write-Host $r2.Output

Remove-SSHSession -SessionId $s.SessionId | Out-Null

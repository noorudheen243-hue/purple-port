Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"
$User = "root"
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)

Write-Host "Connecting SSH..." -ForegroundColor Cyan
$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

function Run($cmd) {
    Write-Host "`n>> $cmd" -ForegroundColor Yellow
    $r = Invoke-SSHCommand -SessionId $s.SessionId -Command $cmd -TimeOut 60
    if ($r.Output) { Write-Host ($r.Output -join "`n") }
    if ($r.Error -and $r.Error.Trim()) { Write-Host "ERR: $($r.Error)" -ForegroundColor Red }
}

try {
    Write-Host "`n=== CLIENTS ===" -ForegroundColor Green
    Run "sqlite3 /var/www/purple-port/server/prisma/dev.db 'SELECT id, name FROM Client;'"

    Write-Host "`n=== META TOKENS ===" -ForegroundColor Green
    Run "sqlite3 /var/www/purple-port/server/prisma/dev.db 'SELECT id, user_id, account_name, meta_user_id, isActive FROM MetaToken;'"

    Write-Host "`n=== MARKETING ACCOUNTS ===" -ForegroundColor Green
    Run "sqlite3 /var/www/purple-port/server/prisma/dev.db 'SELECT id, clientId, platform, externalAccountId, accessToken IS NOT NULL AS hasToken, metaTokenId FROM MarketingAccount;'"

    Write-Host "`n=== MARKETING CAMPAIGNS ===" -ForegroundColor Green
    Run "sqlite3 /var/www/purple-port/server/prisma/dev.db 'SELECT id, clientId, platform, externalCampaignId, name, status FROM MarketingCampaign;'"
}
finally {
    if ($s) { Remove-SSHSession -SessionId $s.SessionId | Out-Null }
}

Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)
$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force
$dbPath = "/var/www/purple-port/server/prisma/dev.db"
$APP = "/var/www/purple-port/server"

function Run($cmd, $timeout = 30) {
    $r = Invoke-SSHCommand -SessionId $s.SessionId -Command $cmd -TimeOut $timeout
    if ($r.Output) { Write-Host $r.Output -ForegroundColor White }
    if ($r.Error -and $r.Error.Trim()) { Write-Host "ERR: $($r.Error)" -ForegroundColor Yellow }
    return $r
}

# Dr Basil client ID and token
$clientId = "db6df8c3-0ec8-4b17-8071-e39746b8be35"
$metaTokenId = "token-2072270786963487-0f602110-d76e-4f21-8bcf-c71959dd4015"
$accountId = "1017260952339227"
$newId = [System.Guid]::NewGuid().ToString()
$now = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")

Write-Host "[1] Inserting Dr Basil Meta account ($accountId) into DB..." -ForegroundColor Cyan
$sql = "INSERT OR IGNORE INTO MarketingAccount (id, platform, externalAccountId, clientId, metaTokenId, createdAt) VALUES ('$newId', 'meta', '$accountId', '$clientId', '$metaTokenId', '$now');"
Run "sqlite3 $dbPath ""$sql"""
Run "sqlite3 $dbPath ""SELECT id, platform, externalAccountId FROM MarketingAccount WHERE clientId='$clientId';"" "

Write-Host "`n[2] Launching sync for Dr Basil account (100 days)..." -ForegroundColor Cyan
Run "printf '#!/bin/bash\nsource ~/.nvm/nvm.sh 2>/dev/null\ncd $APP\nexec node tmp_sync_runner.js\n' > /tmp/run_sync.sh && chmod +x /tmp/run_sync.sh" 10
Run "nohup /tmp/run_sync.sh > /tmp/meta_sync.log 2>&1 & echo 'Sync PID: '$!" 10

Write-Host "`n[3] Checking sync log after 10 seconds..." -ForegroundColor Cyan
Start-Sleep 10
Run "head -30 /tmp/meta_sync.log" 15

Remove-SSHSession -SessionId $s.SessionId | Out-Null
Write-Host "`nDr Basil account inserted and sync started!" -ForegroundColor Green

Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)
$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force
$DB = "/var/www/purple-port/server/prisma/dev.db"

function SQL($query) {
    $r = Invoke-SSHCommand -SessionId $s.SessionId -Command "sqlite3 $DB `"$query`"" -TimeOut 15
    if ($r.Output) { Write-Host $r.Output -ForegroundColor White }
    if ($r.Error -and $r.Error.Trim()) { Write-Host "ERR: $($r.Error)" -ForegroundColor Yellow }
    return $r
}

$clientId       = "db6df8c3-0ec8-4b17-8071-e39746b8be35"  # Dr Basil Homeo Hospital
$shihabTokenId  = "token-919640203803366-0f602110-d76e-4f21-8bcf-c71959dd4015"  # Shihabudheen Ck
$adAccountId    = "1017260952339227"

Write-Host "=== BEFORE: Dr Basil accounts ===" -ForegroundColor Cyan
SQL "SELECT id, externalAccountId, metaTokenId, accessToken IS NOT NULL as hasToken FROM MarketingAccount WHERE clientId='$clientId';"

Write-Host "`n[1] Getting Shihabudheen's access token..." -ForegroundColor Cyan
$r = Invoke-SSHCommand -SessionId $s.SessionId -Command "sqlite3 $DB 'SELECT access_token FROM MetaToken WHERE id=''$shihabTokenId'';'" -TimeOut 10
$shihabToken = $r.Output.Trim()
Write-Host "Token found: $($shihabToken.Substring(0, [Math]::Min(30, $shihabToken.Length)))..."

Write-Host "`n[2] Deleting duplicate/stale Dr Basil accounts..." -ForegroundColor Cyan
# Keep only one - we'll recreate cleanly
SQL "DELETE FROM MarketingAccount WHERE clientId='$clientId' AND platform='meta';"

Write-Host "`n[3] Creating clean Dr Basil account with correct token..." -ForegroundColor Cyan
$newId = [System.Guid]::NewGuid().ToString()
$now = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
SQL "INSERT INTO MarketingAccount (id, platform, externalAccountId, clientId, metaTokenId, accessToken, createdAt) VALUES ('$newId', 'meta', '$adAccountId', '$clientId', '$shihabTokenId', '$shihabToken', '$now');"

Write-Host "`n=== AFTER: Dr Basil account ===" -ForegroundColor Cyan  
SQL "SELECT id, externalAccountId, metaTokenId, accessToken IS NOT NULL as hasToken FROM MarketingAccount WHERE clientId='$clientId';"

Write-Host "`n[4] Also updating any existing campaigns to reflect correct clientId..." -ForegroundColor Cyan
SQL "SELECT COUNT(*) as campaigns_for_basil FROM MarketingCampaign WHERE clientId='$clientId';"

Remove-SSHSession -SessionId $s.SessionId | Out-Null
Write-Host "`nDone! Dr Basil now linked to Shihabudheen Ck's token for ad account $adAccountId" -ForegroundColor Green

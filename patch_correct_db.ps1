Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

$dbs = @(
    "/var/www/purple-port/server/prisma/dev.db",
    "/var/www/antigravity/prisma/dev.db"
)

foreach ($db in $dbs) {
    Write-Host "Patching: $db"

    # Step 1: Delete metrics of meta campaigns BEFORE deleting campaigns
    $r1 = Invoke-SSHCommand -SSHSession $session -Command "sqlite3 $db ""DELETE FROM MarketingMetric WHERE campaignId IN (SELECT id FROM MarketingCampaign WHERE platform='meta');"" && echo 'metrics cleared'"
    Write-Host "  Metrics:" $r1.Output

    # Step 2: Delete old campaigns from wrong account
    $r2 = Invoke-SSHCommand -SSHSession $session -Command "sqlite3 $db ""DELETE FROM MarketingCampaign WHERE platform='meta';"" && echo 'campaigns cleared'"
    Write-Host "  Campaigns:" $r2.Output

    # Step 3: Update the MarketingAccount externalAccountId
    $r3 = Invoke-SSHCommand -SSHSession $session -Command "sqlite3 $db ""UPDATE MarketingAccount SET externalAccountId='2844542265768540' WHERE platform='meta' AND externalAccountId='act_660727494538274';"" && echo 'account patched'"
    Write-Host "  Account:" $r3.Output

    # Verify
    $r4 = Invoke-SSHCommand -SSHSession $session -Command "sqlite3 $db 'SELECT platform, externalAccountId, CASE WHEN accessToken IS NULL THEN ''NO_TOKEN'' ELSE ''HAS_TOKEN'' END as tok FROM MarketingAccount WHERE platform=''meta'';'"
    Write-Host "  Verify:" $r4.Output
}

Write-Host ""
Write-Host "All done. Now triggering a sync..."
Invoke-SSHCommand -SSHSession $session -Command "pm2 restart qix-ads-v2.6"

Remove-SSHSession -SSHSession $session | Out-Null

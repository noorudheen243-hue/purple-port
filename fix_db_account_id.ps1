Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

$db = "/var/www/antigravity/server/prisma/dev.db"

# First check what accounts exist
$r1 = Invoke-SSHCommand -SSHSession $session -Command "sqlite3 $db 'SELECT id, platform, externalAccountId, LENGTH(accessToken) as tokenLen FROM MarketingAccount WHERE platform=''meta'';'"
Write-Host "Current Meta accounts:"
Write-Host $r1.Output

# Update: change act_660727494538274 to 2844542265768540 for Koomen's client
$r2 = Invoke-SSHCommand -SSHSession $session -Command "sqlite3 $db ""UPDATE MarketingAccount SET externalAccountId='2844542265768540' WHERE platform='meta' AND externalAccountId='act_660727494538274';"" && echo 'OK'"
Write-Host "Update result:" $r2.Output

# Also clean up campaigns that were saved from the wrong account
$r3 = Invoke-SSHCommand -SSHSession $session -Command "sqlite3 $db 'SELECT COUNT(*) FROM MarketingCampaign WHERE platform=''meta'';'"
Write-Host "Campaign count:" $r3.Output

$r4 = Invoke-SSHCommand -SSHSession $session -Command "sqlite3 $db ""DELETE FROM MarketingMetric WHERE campaignId IN (SELECT id FROM MarketingCampaign WHERE platform='meta');"" && echo 'metrics deleted'"
Write-Host $r4.Output
$r5 = Invoke-SSHCommand -SSHSession $session -Command "sqlite3 $db ""DELETE FROM MarketingCampaign WHERE platform='meta';"" && echo 'campaigns deleted'"
Write-Host $r5.Output

# Verify fix
$r6 = Invoke-SSHCommand -SSHSession $session -Command "sqlite3 $db 'SELECT id, platform, externalAccountId, LENGTH(accessToken) as tokenLen FROM MarketingAccount WHERE platform=''meta'';'"
Write-Host "After fix:" $r6.Output

Remove-SSHSession -SSHSession $session | Out-Null

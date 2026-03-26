Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$remotePath = "/var/www/antigravity"

Write-Host "[1/4] Compressing server dist..."
if (Test-Path "f:/Antigravity/server_dist.zip") { Remove-Item "f:/Antigravity/server_dist.zip" }
Compress-Archive -Path "f:/Antigravity/server/dist", "f:/Antigravity/server/prisma" -DestinationPath "f:/Antigravity/server_dist.zip"

Write-Host "[2/4] Uploading server dist..."
Set-SCPItem -ComputerName $VPS -Credential $Cred -Path "f:/Antigravity/server_dist.zip" -Destination "$remotePath/server/" -Force

Write-Host "[3/4] Extracting and patching DB..."
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

# Extract new server code
Invoke-SSHCommand -SSHSession $session -Command "cd $remotePath/server && unzip -o server_dist.zip -d ./ && rm server_dist.zip"

# Patch the live DB: update Koomen's meta account from wrong account ID to correct one
$dbPath = "/var/www/antigravity/server/prisma/dev.db"
$sqlFix = "UPDATE MarketingAccount SET externalAccountId='2844542265768540' WHERE platform='meta' AND externalAccountId='act_660727494538274';"
$r = Invoke-SSHCommand -SSHSession $session -Command "sqlite3 '$dbPath' '$sqlFix' && echo 'DB patched OK'"
Write-Host "DB patch result:" $r.Output

# Also purge any stale campaigns from old account so clean slate
$sqlClean1 = "DELETE FROM MarketingMetric WHERE campaignId IN (SELECT id FROM MarketingCampaign WHERE platform='meta' AND clientId IN (SELECT clientId FROM MarketingAccount WHERE platform='meta' AND externalAccountId='2844542265768540'));"
$sqlClean2 = "DELETE FROM MarketingCampaign WHERE platform='meta' AND clientId IN (SELECT clientId FROM MarketingAccount WHERE platform='meta' AND externalAccountId='2844542265768540');"
Invoke-SSHCommand -SSHSession $session -Command "sqlite3 '$dbPath' '$sqlClean1'"
Invoke-SSHCommand -SSHSession $session -Command "sqlite3 '$dbPath' '$sqlClean2'"
Write-Host "Old campaigns cleaned."

Write-Host "[4/4] Restarting PM2..."
Invoke-SSHCommand -SSHSession $session -Command "pm2 restart qix-ads-v2.6"
Remove-SSHSession -SSHSession $session | Out-Null
Remove-Item "f:/Antigravity/server_dist.zip"
Write-Host "Done! Server fix deployed and DB patched."

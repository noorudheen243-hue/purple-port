Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

# Locate databases
$findCmd = "find /var/www -name 'dev.db' -o -name 'marketing.db' -o -name 'data.db' 2>/dev/null"
$findRes = Invoke-SSHCommand -SSHSession $session -Command $findCmd
$dbPaths = $findRes.Output.Split("`n") | Where-Object { $_.Trim() -ne "" }

Write-Host "Found DBs: " $dbPaths

$Query1 = "DELETE FROM MarketingMetric WHERE campaignId IN (SELECT id FROM MarketingCampaign WHERE externalCampaignId LIKE 'camp_meta_%' OR externalCampaignId LIKE 'camp_google_%');"
$Query2 = "DELETE FROM MarketingCampaign WHERE externalCampaignId LIKE 'camp_meta_%' OR externalCampaignId LIKE 'camp_google_%';"

foreach ($db in $dbPaths) {
    $db = $db.Trim()
    Write-Host "Cleaning: $db"
    
    $run1 = "sqlite3 ""$db"" ""$Query1"""
    $res1 = Invoke-SSHCommand -SSHSession $session -Command $run1
    Write-Host "Result 1: " $res1.Output

    $run2 = "sqlite3 ""$db"" ""$Query2"""
    $res2 = Invoke-SSHCommand -SSHSession $session -Command $run2
    Write-Host "Result 2: " $res2.Output
}

# Also gracefully restart pm2
Invoke-SSHCommand -SSHSession $session -Command "pm2 restart qix-ads-v2.6"

Remove-SSHSession -SSHSession $session | Out-Null

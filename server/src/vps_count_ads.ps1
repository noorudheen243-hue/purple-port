
Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

$dbPath = "/var/www/purple-port/server/prisma/dev.db"
$clientId = "1f4f0934-9915-4fd9-b085-87e71208cbe8"
Write-Host "Counting ads for client..."
$cmd = "sqlite3 $dbPath `"SELECT COUNT(*) FROM MarketingAd WHERE campaignId IN (SELECT id FROM MarketingCampaign WHERE clientId = '$clientId');`""
$r = Invoke-SSHCommand -SSHSession $session -Command $cmd
Write-Host "Ads Count: $($r.Output)"

Remove-SSHSession -SSHSession $session | Out-Null

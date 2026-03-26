Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force
$db = "/var/www/antigravity/server/prisma/dev.db"

$r = Invoke-SSHCommand -SSHSession $session -Command "sqlite3 $db '.tables'"
Write-Host "Tables:" $r.Output

$r2 = Invoke-SSHCommand -SSHSession $session -Command "sqlite3 $db 'SELECT COUNT(*) FROM MarketingAccount;'"
Write-Host "Total marketing accounts:" $r2.Output

$r3 = Invoke-SSHCommand -SSHSession $session -Command "sqlite3 $db 'SELECT platform, externalAccountId, CASE WHEN accessToken IS NULL THEN ''NO_TOKEN'' ELSE ''HAS_TOKEN'' END as tok FROM MarketingAccount;'"
Write-Host "Accounts:" $r3.Output

Remove-SSHSession -SSHSession $session | Out-Null

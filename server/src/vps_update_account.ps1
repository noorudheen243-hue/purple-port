
Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

$dbPath = "/var/www/purple-port/server/prisma/dev.db"
$clientId = "1f4f0934-9915-4fd9-b085-87e71208cbe8"
$newAccountId = "657980315809710"

Write-Host "Updating MarketingAccount for Client ID: $clientId..."
$cmd = "sqlite3 $dbPath `"UPDATE MarketingAccount SET externalAccountId = '$newAccountId' WHERE clientId = '$clientId' AND platform = 'meta';`""
$r = Invoke-SSHCommand -SSHSession $session -Command $cmd
Write-Host "Update Result: $($r.Output)"

Write-Host "Verifying update..."
$cmd2 = "sqlite3 $dbPath `"SELECT externalAccountId FROM MarketingAccount WHERE clientId = '$clientId' AND platform = 'meta';`""
$r2 = Invoke-SSHCommand -SSHSession $session -Command $cmd2
Write-Host "New External Account ID: $($r2.Output)"

Remove-SSHSession -SSHSession $session | Out-Null


Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

$dbPath = "/var/www/purple-port/server/prisma/dev.db"
Write-Host "Searching for any MarketingAccount with ID 616308347710249..."
$cmd = "sqlite3 $dbPath `"SELECT mA.id, mA.clientId, C.name FROM MarketingAccount mA JOIN Client C ON mA.clientId = C.id WHERE mA.externalAccountId = '616308347710249';`""
$r = Invoke-SSHCommand -SSHSession $session -Command $cmd
Write-Host "Search Result: $($r.Output)"

Remove-SSHSession -SSHSession $session | Out-Null


Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

$dbPath = "/var/www/purple-port/server/prisma/dev.db"
$tokenId = "token-2072270786963487-0f602110-d76e-4f21-8bcf-c71959dd4015"
$cmd = "sqlite3 $dbPath `"SELECT scopes FROM MetaToken WHERE id = '$tokenId';`""
$r = Invoke-SSHCommand -SSHSession $session -Command $cmd
Write-Host "Scopes: $($r.Output)"

Remove-SSHSession -SSHSession $session | Out-Null

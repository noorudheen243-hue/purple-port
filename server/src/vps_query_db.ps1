
Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

Write-Host "Checking for dev.db..."
$r = Invoke-SSHCommand -SSHSession $session -Command "ls -l /var/www/purple-port/server/dev.db"
Write-Host $r.Output

Write-Host "Querying database for Interman..."
$cmd = "sqlite3 /var/www/purple-port/server/dev.db `"SELECT id, name FROM Client WHERE name LIKE '%Interman%';`""
$r2 = Invoke-SSHCommand -SSHSession $session -Command $cmd
Write-Host $r2.Output

Remove-SSHSession -SSHSession $session | Out-Null

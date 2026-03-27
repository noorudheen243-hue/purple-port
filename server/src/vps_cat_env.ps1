
Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

Write-Host "Checking client .env.production..."
$r = Invoke-SSHCommand -SSHSession $session -Command "cat /var/www/purple-port/client/.env.production"
Write-Host $r.Output

Write-Host "Checking server .env..."
$r2 = Invoke-SSHCommand -SSHSession $session -Command "cat /var/www/purple-port/server/.env"
Write-Host $r2.Output

Remove-SSHSession -SSHSession $session | Out-Null

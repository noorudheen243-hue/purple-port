
Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

Write-Host "Listing .pm2/pids..."
$r = Invoke-SSHCommand -SSHSession $session -Command "ls /root/.pm2/pids"
Write-Host $r.Output

Write-Host "Checking /var/www/purple-port directory..."
$r2 = Invoke-SSHCommand -SSHSession $session -Command "ls -F /var/www/purple-port"
Write-Host $r2.Output

Remove-SSHSession -SSHSession $session | Out-Null

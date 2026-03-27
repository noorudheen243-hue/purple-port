
Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

Write-Host "Checking for ecosystem.config.js..."
$r = Invoke-SSHCommand -SSHSession $session -Command "ls /var/www/purple-port/ecosystem.config.js"
Write-Host $r.Output

Write-Host "Checking environment variables for qix-api..."
$r2 = Invoke-SSHCommand -SSHSession $session -Command "pm2 env 1"
Write-Host $r2.Output

Remove-SSHSession -SSHSession $session | Out-Null

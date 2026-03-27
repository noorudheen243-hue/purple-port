
Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

Write-Host "Checking PM2 status..."
$r = Invoke-SSHCommand -SSHSession $session -Command "pm2 status qix-api"
Write-Host $r.Output

Write-Host "Tail logs..."
$r2 = Invoke-SSHCommand -SSHSession $session -Command "tail -n 100 /root/.pm2/logs/qix-api-out.log /root/.pm2/logs/qix-api-error.log"
Write-Host $r2.Output

Remove-SSHSession -SSHSession $session | Out-Null

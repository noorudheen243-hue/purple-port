
Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

Write-Host "Tailing logs for new errors..."
$cmd = "tail -n 200 /root/.pm2/logs/qix-api-out.log /root/.pm2/logs/qix-api-error.log"
$r = Invoke-SSHCommand -SSHSession $session -Command $cmd
Write-Host $r.Output

Remove-SSHSession -SSHSession $session | Out-Null

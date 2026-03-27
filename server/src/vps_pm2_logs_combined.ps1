
Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

Write-Host "Fetching combined PM2 logs..."
$r = Invoke-SSHCommand -SSHSession $session -Command "pm2 logs --lines 1000 --no-colors"
Write-Host $r.Output

Remove-SSHSession -SSHSession $session | Out-Null

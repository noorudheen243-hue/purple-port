Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

Write-Host "--- DEFAULT NGINX CONFIG ---"
$r2 = Invoke-SSHCommand -SSHSession $session -Command "cat /etc/nginx/sites-available/default"
Write-Host $r2.Output

Remove-SSHSession -SSHSession $session | Out-Null

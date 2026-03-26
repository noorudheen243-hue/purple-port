Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

Write-Host "--- ALL NGINX CONFIGS ---"
$r1 = Invoke-SSHCommand -SSHSession $session -Command "grep -H -r 'server_name' /etc/nginx/sites-available/"
Write-Host $r1.Output

Write-Host "--- purple-port CONFIG ---"
$r2 = Invoke-SSHCommand -SSHSession $session -Command "cat /etc/nginx/sites-available/purple-port"
Write-Host $r2.Output

Remove-SSHSession -SSHSession $session | Out-Null

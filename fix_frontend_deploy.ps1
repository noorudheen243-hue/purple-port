Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

# Check nginx root
$r1 = Invoke-SSHCommand -SSHSession $session -Command "grep 'root ' /etc/nginx/sites-available/antigravity"
Write-Host "NGINX ROOT: " $r1.Output

# Move frontend to root if it's there
$r2 = Invoke-SSHCommand -SSHSession $session -Command "cp -r /var/www/antigravity/client/dist/* /var/www/antigravity/ && echo 'Moved files'"
Write-Host "MOVE: " $r2.Output

Remove-SSHSession -SSHSession $session | Out-Null

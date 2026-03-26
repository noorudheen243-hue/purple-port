Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

# Check nginx config
$r1 = Invoke-SSHCommand -SSHSession $session -Command "cat /etc/nginx/sites-available/antigravity"
Write-Host "--- NGINX CONFIG ---"
Write-Host $r1.Output

# List directories mapping to the frontend
$r2 = Invoke-SSHCommand -SSHSession $session -Command "ls -la /var/www/antigravity /var/www/antigravity/client/dist /var/www/antigravity/client"
Write-Host "--- DIRECTORY LISTING ---"
Write-Host $r2.Output

Remove-SSHSession -SSHSession $session | Out-Null

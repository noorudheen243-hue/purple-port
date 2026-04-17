Import-Module Posh-SSH -Force
$password = 'EzdanAdam@243'
$secPass = ConvertTo-SecureString $password -AsPlainText -Force
$cred = New-Object System.Management.Automation.PSCredential('root', $secPass)
$session = New-SSHSession -ComputerName 66.116.224.221 -Credential $cred -AcceptKey -Force

# Check PM2 status
$res = Invoke-SSHCommand -SSHSession $session -Command "pm2 list"
$res.Output

# Also check where 'server' is located
$res2 = Invoke-SSHCommand -SSHSession $session -Command "ls -d /var/www/purple-port/server"
$res2.Output

Remove-SSHSession -SSHSession $session

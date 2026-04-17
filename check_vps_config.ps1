Import-Module Posh-SSH -Force
$password = 'EzdanAdam@243'
$secPass = ConvertTo-SecureString $password -AsPlainText -Force
$cred = New-Object System.Management.Automation.PSCredential('root', $secPass)
$session = New-SSHSession -ComputerName 66.116.224.221 -Credential $cred -AcceptKey -Force

# Read Nginx Config
$res = Invoke-SSHCommand -SSHSession $session -Command "cat /etc/nginx/sites-enabled/default"
$res.Output

# List Directories to find the app
$res2 = Invoke-SSHCommand -SSHSession $session -Command "ls -F /var/www/"
$res2.Output

Remove-SSHSession -SSHSession $session

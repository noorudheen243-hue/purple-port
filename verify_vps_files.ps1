Import-Module Posh-SSH -Force
$password = 'EzdanAdam@243'
$secPass = ConvertTo-SecureString $password -AsPlainText -Force
$cred = New-Object System.Management.Automation.PSCredential('root', $secPass)
$session = New-SSHSession -ComputerName 66.116.224.221 -Credential $cred -AcceptKey -Force

# Timestamp check
$res = Invoke-SSHCommand -SSHSession $session -Command "ls -l /var/www/purple-port/client/dist/index.html"
Write-Host "Index.html: $($res.Output)"

# Content check for a new string
$res2 = Invoke-SSHCommand -SSHSession $session -Command "grep 'Manual Backup to PC' /var/www/purple-port/client/dist/assets/*.js | head -1"
Write-Host "Grep result: $($res2.Output)"

Remove-SSHSession -SSHSession $session

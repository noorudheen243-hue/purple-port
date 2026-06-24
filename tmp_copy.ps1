Import-Module Posh-SSH -Force
$Cred = New-Object System.Management.Automation.PSCredential('root', (ConvertTo-SecureString 'EzdanAdam@243' -AsPlainText -Force))
$Session = New-SSHSession -ComputerName 66.116.224.221 -Credential $Cred -AcceptKey -Force
Invoke-SSHCommand -SSHSession $Session -Command 'cp -rf /var/www/purple-port/client/dist/* /var/www/purple-port/server/public/'
Remove-SSHSession -SSHSession $Session | Out-Null

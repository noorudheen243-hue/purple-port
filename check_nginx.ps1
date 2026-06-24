Import-Module Posh-SSH -Force

$SERVER_IP = "66.116.224.221"
$SSH_USER = "root"
$PASSWORD = "EzdanAdam@243"

$securePassword = ConvertTo-SecureString $PASSWORD -AsPlainText -Force
$credential = New-Object System.Management.Automation.PSCredential($SSH_USER, $securePassword)
$session = New-SSHSession -ComputerName $SERVER_IP -Credential $credential -AcceptKey

Write-Host "=== Nginx sites-enabled configuration ===" -ForegroundColor Cyan
(Invoke-SSHCommand -SessionId $session.SessionId -Command "cat /etc/nginx/sites-enabled/* 2>&1").Output

Remove-SSHSession -SessionId $session.SessionId

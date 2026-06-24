Import-Module Posh-SSH -Force

$SERVER_IP = "66.116.224.221"
$SSH_USER = "root"
$PASSWORD = "EzdanAdam@243"

$securePassword = ConvertTo-SecureString $PASSWORD -AsPlainText -Force
$credential = New-Object System.Management.Automation.PSCredential($SSH_USER, $securePassword)
$session = New-SSHSession -ComputerName $SERVER_IP -Credential $credential -AcceptKey

Write-Host "=== Last 60 lines of PM2 server logs ===" -ForegroundColor Cyan
(Invoke-SSHCommand -SessionId $session.SessionId -Command "pm2 logs qix-api --lines 60 --nostream 2>&1").Output

Remove-SSHSession -SessionId $session.SessionId

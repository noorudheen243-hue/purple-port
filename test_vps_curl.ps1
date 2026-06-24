Import-Module Posh-SSH -Force

$SERVER_IP = "66.116.224.221"
$SSH_USER = "root"
$PASSWORD = "EzdanAdam@243"

$securePassword = ConvertTo-SecureString $PASSWORD -AsPlainText -Force
$credential = New-Object System.Management.Automation.PSCredential($SSH_USER, $securePassword)
$session = New-SSHSession -ComputerName $SERVER_IP -Credential $credential -AcceptKey

Write-Host "=== Testing /api/crm/leads ===" -ForegroundColor Cyan
(Invoke-SSHCommand -SessionId $session.SessionId -Command "curl -i http://localhost:4001/api/crm/leads 2>&1").Output

Write-Host "=== Testing /api/marketing/crm/leads ===" -ForegroundColor Cyan
(Invoke-SSHCommand -SessionId $session.SessionId -Command "curl -i http://localhost:4001/api/marketing/crm/leads 2>&1").Output

Remove-SSHSession -SessionId $session.SessionId

Import-Module Posh-SSH -Force

$SERVER_IP = "66.116.224.221"
$SSH_USER = "root"
$PASSWORD = "EzdanAdam@243"

$securePassword = ConvertTo-SecureString $PASSWORD -AsPlainText -Force
$credential = New-Object System.Management.Automation.PSCredential($SSH_USER, $securePassword)
$session = New-SSHSession -ComputerName $SERVER_IP -Credential $credential -AcceptKey

# Dr Basil Homeo Hospital client ID: db6df8c3-0ec8-4b17-8071-e39746b8be35
$URL = "http://localhost:4001/api/marketing/crm/webhooks/incoming?clientId=db6df8c3-0ec8-4b17-8071-e39746b8be35"
$Payload = '{"name":"Jane Webhook Test","phone":"+919876543210","email":"jane.test@webhook.com","location":"Ernakulam","campaign_name":"Vite Webhook Landing Page","notes":"Interested in homeopathic treatment","tags":"test,webhook"}'

Write-Host "=== POSTing webhook lead ===" -ForegroundColor Cyan
(Invoke-SSHCommand -SessionId $session.SessionId -Command "curl -i -X POST -H 'Content-Type: application/json' -d '$Payload' '$URL' 2>&1").Output

Remove-SSHSession -SessionId $session.SessionId

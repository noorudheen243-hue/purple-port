Import-Module Posh-SSH -Force

$SERVER_IP = "66.116.224.221"
$SSH_USER = "root"
$PASSWORD = "EzdanAdam@243"

$securePassword = ConvertTo-SecureString $PASSWORD -AsPlainText -Force
$credential = New-Object System.Management.Automation.PSCredential($SSH_USER, $securePassword)
$session = New-SSHSession -ComputerName $SERVER_IP -Credential $credential -AcceptKey

$QUERY = "SELECT id, client_id, name, phone, email, source, location, campaign_name, assigned_to FROM Lead WHERE id = '63af65c5-70a8-46e1-8d42-a57bf04988ff'"
Write-Host "=== Querying DB for captured lead ===" -ForegroundColor Cyan
(Invoke-SSHCommand -SessionId $session.SessionId -Command "sqlite3 /var/www/purple-port/server/prisma/dev.db `"$QUERY`"" 2>&1).Output

Remove-SSHSession -SessionId $session.SessionId

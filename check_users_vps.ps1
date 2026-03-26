Import-Module Posh-SSH -Force
$SERVER_IP = "66.116.224.221"
$SSH_USER = "root"
$PASS = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $PASS -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($SSH_USER, $SecPass)

$session = New-SSHSession -ComputerName $SERVER_IP -Credential $Cred -AcceptKey -Force

$remoteScript = @'
sqlite3 /var/www/purple-port/server/prisma/dev.db 'SELECT id, email, role, full_name, status, department FROM User;'
'@
$b64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($remoteScript))
$cmd = "echo '$b64' | base64 -d > /tmp/query.sh && chmod +x /tmp/query.sh && bash /tmp/query.sh"
$r = Invoke-SSHCommand -SSHSession $session -Command $cmd
Write-Host "Output: " ($r.Output | Out-String)
Remove-SSHSession -SSHSession $session | Out-Null

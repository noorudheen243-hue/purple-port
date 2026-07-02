
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)

$session = New-SSHSession -ComputerName "66.116.224.221" -Credential $Cred -AcceptKey -Force
$sftp = New-SFTPSession -ComputerName "66.116.224.221" -Credential $Cred -AcceptKey -Force

Set-SFTPItem -SFTPSession $sftp -Path "f:\Antigravity\server\dist\modules\accounting\service.js" -Destination "/var/www/purple-port/server/dist/modules/accounting/" -Force
Set-SFTPItem -SFTPSession $sftp -Path "f:\Antigravity\server\src\modules\accounting\service.ts" -Destination "/var/www/purple-port/server/src/modules/accounting/" -Force

Invoke-SSHCommand -SessionId $session.SessionId -Command "pm2 restart qix-api" | Select-Object -ExpandProperty Output

Remove-SFTPSession -SFTPSession $sftp
Remove-SSHSession -SessionId $session.SessionId


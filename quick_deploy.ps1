
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)

$session = New-SSHSession -ComputerName "66.116.224.221" -Credential $Cred -AcceptKey -Force
$sftp = New-SFTPSession -ComputerName "66.116.224.221" -Credential $Cred -AcceptKey -Force

Set-SFTPItem -SFTPSession $sftp -Path "f:\Antigravity\server\src\modules\attendance\service.ts" -Destination "/var/www/purple-port/server/src/modules/attendance/" -Force
Set-SFTPItem -SFTPSession $sftp -Path "f:\Antigravity\server\src\scripts\fix_historical_attendance.ts" -Destination "/var/www/purple-port/server/src/scripts/" -Force

Invoke-SSHCommand -SessionId $session.SessionId -Command "source $HOME/.nvm/nvm.sh 2>/dev/null; cd /var/www/purple-port/server && npx ts-node src/scripts/fix_historical_attendance.ts"

Remove-SFTPSession -SFTPSession $sftp
Remove-SSHSession -SessionId $session.SessionId


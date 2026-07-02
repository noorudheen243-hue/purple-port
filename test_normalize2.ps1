
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)
$session = New-SSHSession -ComputerName "66.116.224.221" -Credential $Cred -AcceptKey -Force

$script = @'
const { AttendanceService } = require("./dist/modules/attendance/service.js");

// ZkLib returns a string with the server's local timezone injected!
const fakeZkLibOutput = "Wed Jul 01 2026 09:31:24 GMT+0000 (Coordinated Universal Time)";
console.log("Fake ZkLib Output:", fakeZkLibOutput);

const normalized = AttendanceService.normalizeBiometricTimestamp(fakeZkLibOutput);
console.log("Normalized (what goes to DB):", normalized.toISOString());
'@

Set-Content -Path test_normalize2.js -Value $script
$sftp = New-SFTPSession -ComputerName "66.116.224.221" -Credential $Cred -AcceptKey -Force
Set-SFTPItem -SFTPSession $sftp -Path "f:\Antigravity\test_normalize2.js" -Destination "/var/www/purple-port/server/" -Force
Invoke-SSHCommand -SessionId $session.SessionId -Command "cd /var/www/purple-port/server && source $HOME/.nvm/nvm.sh 2>/dev/null; node test_normalize2.js" | Select-Object -ExpandProperty Output

Remove-SFTPSession -SFTPSession $sftp
Remove-SSHSession -SessionId $session.SessionId


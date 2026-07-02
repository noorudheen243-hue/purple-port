
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)
$session = New-SSHSession -ComputerName "66.116.224.221" -Credential $Cred -AcceptKey -Force

$script = @'
const { AttendanceService } = require("./dist/modules/attendance/service.js");

// Simulate ZkLib parsing 'Wed Jul 01 2026 09:31:24' on the VPS (UTC timezone)
// In UTC timezone, new Date(2026, 6, 1, 9, 31, 24) creates a Date object that internally represents 09:31 UTC.
const d = new Date(2026, 6, 1, 9, 31, 24);
console.log("ZkLib generated Date object:", d.toISOString());

const normalized = AttendanceService.normalizeBiometricTimestamp(d);
console.log("Normalized (what goes to DB):", normalized.toISOString());
'@

Set-Content -Path test_normalize.js -Value $script
$sftp = New-SFTPSession -ComputerName "66.116.224.221" -Credential $Cred -AcceptKey -Force
Set-SFTPItem -SFTPSession $sftp -Path "f:\Antigravity\test_normalize.js" -Destination "/var/www/purple-port/server/" -Force
Invoke-SSHCommand -SessionId $session.SessionId -Command "cd /var/www/purple-port/server && source $HOME/.nvm/nvm.sh 2>/dev/null; node test_normalize.js" | Select-Object -ExpandProperty Output

Remove-SFTPSession -SFTPSession $sftp
Remove-SSHSession -SessionId $session.SessionId


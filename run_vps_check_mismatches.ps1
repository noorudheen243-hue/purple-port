Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"
$User = "root"
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)

$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force
$sftp = New-SFTPSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

Set-SFTPItem -SFTPSession $sftp -Path "f:\Antigravity\check_mismatches.ts" -Destination "/tmp" -Force

$session = $s[-1]
$r = Invoke-SSHCommand -SessionId $session.SessionId -Command "source `$HOME/.nvm/nvm.sh 2>/dev/null; cd /var/www/purple-port/server && mv /tmp/check_mismatches.ts src/scripts/ && npx ts-node src/scripts/check_mismatches.ts"
Write-Host $r.Output
if ($r.Error) { Write-Host "ERR: $($r.Error)" }

Remove-SFTPSession -SFTPSession $sftp | Out-Null
Remove-SSHSession -SessionId $session.SessionId | Out-Null

Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"
$User = "root"
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

$r = Invoke-SSHCommand -SessionId $s.SessionId -Command 'sqlite3 /var/www/purple-port/server/prisma/dev_backup_20260618_020310.db "SELECT COUNT(*) FROM AttendanceRecord WHERE method = ''BIOMETRIC'';"'
Write-Host "Backup BIOMETRIC count: " $r.Output

Remove-SSHSession -SessionId $s.SessionId | Out-Null

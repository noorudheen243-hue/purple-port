
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)
$session = New-SSHSession -ComputerName "66.116.224.221" -Credential $Cred -AcceptKey -Force

Invoke-SSHCommand -SessionId $session.SessionId -Command "sqlite3 /var/www/purple-port/server/prisma/dev.db 'SELECT id, check_in, check_out, date FROM AttendanceRecord WHERE date >= 1782864000000 LIMIT 5;'" | Select-Object -ExpandProperty Output

Remove-SSHSession -SessionId $session.SessionId


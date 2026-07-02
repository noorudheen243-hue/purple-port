
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)
$session = New-SSHSession -ComputerName "66.116.224.221" -Credential $Cred -AcceptKey -Force

Invoke-SSHCommand -SessionId $session.SessionId -Command "cat /var/www/purple-port/server/src/modules/attendance/service.ts | grep -A 20 normalizeBiometric" | Select-Object -ExpandProperty Output

Remove-SSHSession -SessionId $session.SessionId


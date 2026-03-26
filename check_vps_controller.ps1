# Check Task Controller on VPS
Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

$r = Invoke-SSHCommand -SessionId $s.SessionId -Command "cat /var/www/antigravity/server/dist/modules/tasks/controller.js | grep -A 50 'const getStats ='"
Write-Host "Server-side Controller Logic:"
$r.Output

Remove-SSHSession -SessionId $s.SessionId | Out-Null

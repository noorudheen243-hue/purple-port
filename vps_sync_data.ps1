Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"
$User = "root"
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$ssh = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force
$r = Invoke-SSHCommand -SessionId $ssh.SessionId -Command "curl -X POST http://localhost:4000/api/marketing/sync"
Write-Output $r.Output
Remove-SSHSession -SessionId $ssh.SessionId | Out-Null

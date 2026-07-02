Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)

$sshSession = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force
$sshId = $sshSession.SessionId

$RemoteCMD = "pm2 logs qix-api --lines 100 --nostream"
$r1 = Invoke-SSHCommand -SessionId $sshId -Command $RemoteCMD
Write-Host $r1.Output

Remove-SSHSession -SessionId $sshId | Out-Null

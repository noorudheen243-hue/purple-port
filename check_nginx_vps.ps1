Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"
$User = "root"
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)

$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force
$session = $s[-1]

Write-Host "Checking Nginx config..."
$r = Invoke-SSHCommand -SessionId $session.SessionId -Command "cat /etc/nginx/sites-enabled/*"
Write-Host $r.Output

Remove-SSHSession -SessionId $session.SessionId | Out-Null

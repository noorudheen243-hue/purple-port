Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"
$User = "root"
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)

$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

$r = Invoke-SSHCommand -SessionId $s.SessionId -Command 'ls /var/www'
Write-Host "OUT: " $r.Output
Write-Host "ERR: " $r.Error

$r2 = Invoke-SSHCommand -SessionId $s.SessionId -Command 'ls /var/www/antigravity/server'
Write-Host "OUT2: " $r2.Output
Write-Host "ERR2: " $r2.Error

Remove-SSHSession -SessionId $s.SessionId | Out-Null

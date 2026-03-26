# Find PM2 process details for ID 0
Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

# Show details for process 0
$r = Invoke-SSHCommand -SessionId $s.SessionId -Command "pm2 show 0"
Write-Host "PM2 Show 0:"
$r.Output

Remove-SSHSession -SessionId $s.SessionId | Out-Null

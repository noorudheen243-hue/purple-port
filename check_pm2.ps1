# Find PM2 process details
Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

# Check PM2
$r = Invoke-SSHCommand -SessionId $s.SessionId -Command "pm2 list"
Write-Host "PM2 List:"
$r.Output

# Check where the process is running from
$r2 = Invoke-SSHCommand -SessionId $s.SessionId -Command "pm2 show all --json"
Write-Host "PM2 Details (JSON):"
$r2.Output

Remove-SSHSession -SessionId $s.SessionId | Out-Null

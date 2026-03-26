# Check directory structure on VPS
Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

# List contents of antigravity directory
$r = Invoke-SSHCommand -SessionId $s.SessionId -Command "ls -R /var/www/antigravity | head -n 50"
Write-Host "Directory Structure:`n$($r.Output)"

Remove-SSHSession -SessionId $s.SessionId | Out-Null

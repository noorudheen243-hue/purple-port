# Search for strings in JS files on VPS
Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

# Search for PLANNED (my latest change)
$r = Invoke-SSHCommand -SessionId $s.SessionId -Command "grep -l 'PLANNED' /var/www/antigravity/public/assets/index-*.js"
Write-Host "Files containing PLANNED: $($r.Output)"

# Search for ASSIGNED (the old problematic default)
$r2 = Invoke-SSHCommand -SessionId $s.SessionId -Command "grep -l 'ASSIGNED' /var/www/antigravity/public/assets/index-*.js"
Write-Host "Files containing ASSIGNED: $($r2.Output)"

Remove-SSHSession -SessionId $s.SessionId | Out-Null

# Verify v2.3 and ASSIGNED changes on VPS
Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

# Search for v2.3 marker
$r = Invoke-SSHCommand -SessionId $s.SessionId -Command "grep 'v2.3' /var/www/antigravity/public/assets/index-*.js | head -n 1"
Write-Host "v2.3 Marker Found: $($r.Output)"

# Search for ASSIGNED status mapping (look for the hex color or string)
$r2 = Invoke-SSHCommand -SessionId $s.SessionId -Command "grep 'ASSIGNED' /var/www/antigravity/public/assets/index-*.js | head -n 1"
Write-Host "ASSIGNED Code Found: $($r2.Output)"

Remove-SSHSession -SessionId $s.SessionId | Out-Null

# Verify v2.4 on VPS
Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

# Search for v2.4 marker
$r = Invoke-SSHCommand -SessionId $s.SessionId -Command "grep 'v2.4' /var/www/antigravity/public/assets/index-*.js | head -n 1"
Write-Host "v2.4 Marker Found: $($r.Output)"

# Search for staff_type keyword in JS
$r2 = Invoke-SSHCommand -SessionId $s.SessionId -Command "grep 'staff_type' /var/www/antigravity/public/assets/index-*.js | head -n 1"
Write-Host "staff_type Code Found: $($r2.Output)"

Remove-SSHSession -SessionId $s.SessionId | Out-Null

# Verify v2.5 on VPS
Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

# 1. Search for v2.5 marker
$r = Invoke-SSHCommand -SessionId $s.SessionId -Command "grep 'v2.5' /var/www/antigravity/public/assets/index-*.js | head -n 1"
Write-Host "v2.5 Marker Found: $($r.Output)"

# 2. Check Zod error fix in auth controller
$r2 = Invoke-SSHCommand -SessionId $s.SessionId -Command "grep -a 'path.join' /var/www/antigravity/server/dist/modules/auth/controller.js | head -n 1"
Write-Host "Zod Fix Code Found: $($r2.Output)"

# 3. Check staff_type in task controller
$r3 = Invoke-SSHCommand -SessionId $s.SessionId -Command "grep -a 'staff_type' /var/www/antigravity/server/dist/modules/tasks/controller.js | head -n 1"
Write-Host "staff_type in Controller: $($r3.Output)"

Remove-SSHSession -SessionId $s.SessionId | Out-Null

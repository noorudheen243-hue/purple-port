# Check file details on VPS
Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

# Check timestamps and a snippet of the dashboard file if possible
$r = Invoke-SSHCommand -SessionId $s.SessionId -Command "ls -l /var/www/antigravity/public/index.html; grep -o 'v2.2' /var/www/antigravity/public/index.html || echo 'Version not found'"
Write-Host "Index Details: $($r.Output)"

# Find the latest built JS files for dashboards
$r2 = Invoke-SSHCommand -SessionId $s.SessionId -Command "ls -lt /var/www/antigravity/public/assets/index-*.js | head -n 5"
Write-Host "Latest JS files:`n$($r2.Output)"

Remove-SSHSession -SessionId $s.SessionId | Out-Null

# Find JS files on VPS excluding node_modules
Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

# Find all JS files in antigravity folder excluding node_modules
$r = Invoke-SSHCommand -SessionId $s.SessionId -Command "find /var/www/antigravity -name '*.js' -not -path '*/node_modules/*'"
Write-Host "JS Files found (Non-Node):"
$r.Output

# Also check purple-port
$r2 = Invoke-SSHCommand -SessionId $s.SessionId -Command "find /var/www/purple-port -name '*.js' -not -path '*/node_modules/*'"
Write-Host "JS Files found in purple-port (Non-Node):"
$r2.Output

Remove-SSHSession -SessionId $s.SessionId | Out-Null

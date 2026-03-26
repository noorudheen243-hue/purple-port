# Explore VPS file structure for JS files
Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

# List all JS files in antigravity folder (limit depth for sanity)
$r = Invoke-SSHCommand -SessionId $s.SessionId -Command "find /var/www/antigravity -name '*.js' -maxdepth 4"
Write-Host "JS Files found in /var/www/antigravity:"
$r.Output

Remove-SSHSession -SessionId $s.SessionId | Out-Null

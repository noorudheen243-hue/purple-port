# Verify code on VPS
Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

# Search for the newly added logic in the compiled JS
$r = Invoke-SSHCommand -SessionId $s.SessionId -Command "grep -E 'status.*notIn.*COMPLETED.*CANCELLED' /var/www/antigravity/dist/modules/analytics/service.js"
Write-Host "Search Result: $($r.Output)"

Remove-SSHSession -SessionId $s.SessionId | Out-Null

# Find and inspect controller.js on VPS
Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

# Find all controller.js files
$r = Invoke-SSHCommand -SessionId $s.SessionId -Command "find /var/www/antigravity/server/dist -name controller.js"
Write-Host "Controller Files Found:"
$r.Output

# Inspect the one in tasks
$tasksController = "/var/www/antigravity/server/dist/modules/tasks/controller.js"
$r2 = Invoke-SSHCommand -SessionId $s.SessionId -Command "grep -a 'staff_type' $tasksController"
Write-Host "staff_type check: $($r2.Output)"

Remove-SSHSession -SessionId $s.SessionId | Out-Null

Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

# check if new code exists
$r = Invoke-SSHCommand -SSHSession $session -Command "grep -o 'Deleted metrics for' /var/www/antigravity/server/dist/modules/marketing-tasks/controller.js"
Write-Host "Output:" $r.Output
Remove-SSHSession -SSHSession $session | Out-Null

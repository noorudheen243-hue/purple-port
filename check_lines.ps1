Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

$file = "/var/www/antigravity/server/dist/modules/marketing-tasks/controller.js"

Write-Host "=== Checking lines 185-220 on VPS ==="
$r0 = Invoke-SSHCommand -SSHSession $session -Command "sed -n '185,220p' $file"
Write-Host ($r0.Output -join [System.Environment]::NewLine)

Remove-SSHSession -SSHSession $session | Out-Null

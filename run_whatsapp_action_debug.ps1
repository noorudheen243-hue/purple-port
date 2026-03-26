Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

$remotePath = "/var/www/antigravity/server/dist/modules/marketing-tasks"
Set-SCPItem -ComputerName $VPS -Credential $Cred -Path "f:\Antigravity\debug_actions_whatsapp.js" -Destination "$remotePath/" -Force

$r = Invoke-SSHCommand -SSHSession $session -Command "cd $remotePath && node debug_actions_whatsapp.js"

Write-Host "--- SCRIPT OUTPUT ---"
Write-Host $r.Output

Remove-SSHSession -SSHSession $session | Out-Null

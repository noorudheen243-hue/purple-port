Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

$remotePath = "/var/www/antigravity/server/dist/modules/marketing-tasks"
Set-SCPItem -ComputerName $VPS -Credential $Cred -Path "f:\Antigravity\debug_ads5.js" -Destination "$remotePath/" -Force

$r = Invoke-SSHCommand -SSHSession $session -Command "cd $remotePath && node debug_ads5.js"

Write-Host "--- SCRIPT OUTPUT ---"
Write-Host $r.Output
if ($r.Error) { Write-Host "ERR: " $r.Error }

Remove-SSHSession -SSHSession $session | Out-Null


Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

$r = Invoke-SSHCommand -SSHSession $session -Command "pm2 jlist"
# Just print the first 1000 characters of the JSON if it's too long
$json = $r.Output -join ""
if ($json.Length -gt 2000) { $json = $json.Substring(0, 2000) }
Write-Host $json

Remove-SSHSession -SSHSession $session | Out-Null

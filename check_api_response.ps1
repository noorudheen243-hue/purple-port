# Check API response for creative dashboard
Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

$r = Invoke-SSHCommand -SessionId $s.SessionId -Command "curl -s -k https://qixport.com/api/analytics/creative-dashboard"
$r.Output | Out-File "f:\Antigravity\api_response.json"

Remove-SSHSession -SessionId $s.SessionId | Out-Null

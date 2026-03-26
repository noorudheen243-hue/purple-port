Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

# We use the raw curl command directly. Since this is string to string, no nested PowerShell quotes needed
$cmd = "curl -s http://localhost:4001/api/marketing/status?clientId=b8199325-e5ee-4e64-85c1-bfcc20664d86"
$r = Invoke-SSHCommand -SSHSession $session -Command $cmd
Write-Host "API RESPONSE:"
Write-Host $r.Output

Remove-SSHSession -SSHSession $session | Out-Null

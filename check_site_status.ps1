Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

# Check HTTP status code of the login page
$r = Invoke-SSHCommand -SSHSession $session -Command "curl -s -o /dev/null -w '%{http_code}' https://qixport.com/login"
Write-Host "HTTP Status: $($r.Output)"

# Check backend status
$res = Invoke-SSHCommand -SSHSession $session -Command "pm2 list"
Write-Host "PM2 List:"
Write-Host ($res.Output -join "`n")

Remove-SSHSession -SSHSession $session | Out-Null

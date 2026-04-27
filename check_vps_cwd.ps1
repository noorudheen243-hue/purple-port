$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)
$s = New-SSHSession -ComputerName "66.116.224.221" -Credential $Cred -AcceptKey -Force
$r = Invoke-SSHCommand -SSHSession $s -Command "pm2 jlist | grep -o '\"cwd\":\"[^\"]*\"' | head -1"
Write-Host "Current Working Directory: $($r.Output)"
Remove-SSHSession -SSHSession $s

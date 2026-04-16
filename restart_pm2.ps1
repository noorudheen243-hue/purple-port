Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"
$User = "root"
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force
$r = Invoke-SSHCommand -SessionId $s.SessionId -Command 'source ~/.nvm/nvm.sh 2>/dev/null; pm2 restart all && pm2 save'
Write-Host $r.Output
Remove-SSHSession -SessionId $s.SessionId

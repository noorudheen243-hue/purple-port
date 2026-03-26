Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"
$User = "root"
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$ssh = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force
$cmd = 'cd /var/www/purple-port && unzip -o /tmp/deploy_update_v8.zip && cp -r client_dist/* server/public/ && pm2 restart qix-ads qix-api all'
$r = Invoke-SSHCommand -SessionId $ssh.SessionId -Command $cmd -TimeOut 60
Write-Host ($r.Output -join "`n") -ForegroundColor White
Write-Host ($r.Error -join "`n") -ForegroundColor Red
Remove-SSHSession -SessionId $ssh.SessionId | Out-Null

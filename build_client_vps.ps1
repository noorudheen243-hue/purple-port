Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"
$User = "root"
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)

$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force
$session = $s[-1]

Write-Host "Building client on VPS..."
$r = Invoke-SSHCommand -SessionId $session.SessionId -Command "source `$HOME/.nvm/nvm.sh 2>/dev/null; cd /var/www/purple-port/client && npm run build" -TimeOut 600
Write-Host $r.Output
if ($r.Error) { Write-Host "ERR: $($r.Error)" }

Write-Host "Restarting nginx..."
Invoke-SSHCommand -SessionId $session.SessionId -Command "systemctl restart nginx" | Out-Null

Remove-SSHSession -SessionId $session.SessionId | Out-Null
Write-Host "Done!"

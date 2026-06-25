Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"
$User = "root"
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)

Write-Host "Connecting SSH to $VPS..." -ForegroundColor Cyan
$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

# Get the last session created
$session = $s[-1]

Write-Host "Copying compiled client to /var/www/purple-port/public/"
$r = Invoke-SSHCommand -SessionId $session.SessionId -Command "mkdir -p /var/www/purple-port/public && cp -r /var/www/purple-port/server/public/* /var/www/purple-port/public/ && systemctl restart nginx"
if ($r.Output) { Write-Host $r.Output }
if ($r.Error) { Write-Host "ERR: $($r.Error)" }
Write-Host "Done!"
Remove-SSHSession -SessionId $session.SessionId | Out-Null

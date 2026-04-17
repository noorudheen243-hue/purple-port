Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)
$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force
$APP = "/var/www/purple-port/server"

Set-SCPItem -ComputerName $VPS -Credential $Cred -Path "f:\Antigravity\tmp_diag.js" -Destination "$APP/tmp_diag.js" -Force

$r = Invoke-SSHCommand -SessionId $s.SessionId -Command "source `$HOME/.nvm/nvm.sh 2>/dev/null; cd $APP && node tmp_diag.js 2>&1" -TimeOut 30
Write-Host $r.Output

Remove-SSHSession -SessionId $s.SessionId | Out-Null

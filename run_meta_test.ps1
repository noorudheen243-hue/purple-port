Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)
$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force
$APP = "/var/www/purple-port/server"

# Delete old file first, then upload new one
$r0 = Invoke-SSHCommand -SessionId $s.SessionId -Command "rm -f $APP/tmp_test_meta.js" -TimeOut 5
Set-SCPItem -ComputerName $VPS -Credential $Cred -Path "f:\Antigravity\tmp_test_meta.js" -Destination "$APP/" -Force

Write-Host "Running Meta API test..." -ForegroundColor Cyan
$r = Invoke-SSHCommand -SessionId $s.SessionId -Command "source `$HOME/.nvm/nvm.sh 2>/dev/null; cd $APP && node tmp_test_meta.js 2>&1" -TimeOut 30
Write-Host $r.Output
if ($r.Error) { Write-Host "ERR: $($r.Error)" -ForegroundColor Red }

Remove-SSHSession -SessionId $s.SessionId | Out-Null

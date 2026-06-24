Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"
$User = "root"
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)

$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

try {
    $nodeCmd = @'
cd /var/www/purple-port/server
source $HOME/.nvm/nvm.sh 2>/dev/null
node -e "
const { calculateAutoLOP } = require('./dist/modules/payroll/service');
calculateAutoLOP('4ce1fee1-86dc-4ed9-9857-d91539a0e5f6', 6, 2026)
  .then(r => console.log('Result LOP days:', r))
  .catch(console.error);
"
'@
    $r = Invoke-SSHCommand -SessionId $s.SessionId -Command $nodeCmd -TimeOut 60
    if ($r.Output) { Write-Host ($r.Output -join "`n") }
    if ($r.Error -and $r.Error.Trim()) { Write-Host "ERR: $($r.Error)" -ForegroundColor Red }
}
finally {
    if ($s) { Remove-SSHSession -SessionId $s.SessionId | Out-Null }
}

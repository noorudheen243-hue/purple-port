Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"
$User = "root"
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

function Run($cmd) {
    Write-Host "`n>> $cmd" -ForegroundColor DarkGray
    $r = Invoke-SSHCommand -SessionId $s.SessionId -Command $cmd -TimeOut 60
    if ($r.Output) { Write-Host $r.Output -ForegroundColor White }
}

try {
    $code = @"
const { biometricControl } = require('./src/modules/attendance/biometric.service');
async function forceSync() {
    console.log('Force triggering sync...');
    await biometricControl.syncDeviceLogs();
    console.log('Sync completed.');
    process.exit(0);
}
forceSync();
"@
    Run "cat << 'EOF' > /var/www/purple-port/server/force_sync.js`n$code`nEOF"
    Run "cd /var/www/purple-port/server && npx ts-node force_sync.js"
}
finally {
    if ($s) { Remove-SSHSession -SessionId $s.SessionId | Out-Null }
}

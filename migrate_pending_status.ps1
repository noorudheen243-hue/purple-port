Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"
$User = "root"
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)

$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force
$sftp = New-SFTPSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

function Run($cmd, $timeout = 60) {
    $r = Invoke-SSHCommand -SessionId $s.SessionId -Command $cmd -TimeOut $timeout
    Write-Host ($r.Output -join "`n")
    if ($r.Error -and $r.Error.Trim()) { Write-Host "ERR: $($r.Error.Trim())" -ForegroundColor Yellow }
    return $r
}

# Upload the migration script
$migrationScript = @'
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
async function fix() {
    const result = await db.payrollSlip.updateMany({
        where: { status: 'PENDING' },
        data: { status: 'IN_PROGRESS' }
    });
    console.log('Updated ' + result.count + ' slips from PENDING to IN_PROGRESS');
    process.exit(0);
}
fix().catch(e => { console.error(e.message); process.exit(1); });
'@

$migrationScript | Out-File -Encoding UTF8 "f:\Antigravity\tmp_migrate.js"
Set-SFTPItem -SFTPSession $sftp -Path "f:\Antigravity\tmp_migrate.js" -Destination "/var/www/purple-port/server/" -Force

Write-Host "Running migration..." -ForegroundColor Cyan
Run "source `$HOME/.nvm/nvm.sh 2>/dev/null; cd /var/www/purple-port/server && node tmp_migrate.js"
Run "rm -f /var/www/purple-port/server/tmp_migrate.js"

Write-Host "Done!" -ForegroundColor Green
Remove-SSHSession -SessionId $s.SessionId | Out-Null
Remove-SFTPSession -SFTPSession $sftp | Out-Null

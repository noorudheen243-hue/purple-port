Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"
$User = "root"
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

function Run($cmd) {
    $r = Invoke-SSHCommand -SessionId $s.SessionId -Command $cmd -TimeOut 60
    if ($r.Output) { Write-Host ($r.Output -join "`n") }
}

try {
    $code = @"
const ZKLib = require('zkteco-js');
const prisma = require('./prisma').default;
async function test() {
    const status = await prisma.biometricDeviceStatus.findUnique({ where: { id: 'CURRENT' } });
    let ip = '192.168.1.201';
    if (status && status.last_office_ip && status.last_office_ip !== 'unknown') {
        ip = status.last_office_ip;
    }
    const zk = new ZKLib(ip, 4370, 10000, 4000);
    try {
        await zk.createSocket();
        const logs = await zk.getAttendances();
        const data = logs.data || [];
        if(data.length > 0) {
            console.log('RecordTime Type:', typeof data[0].recordTime);
            console.log('Is Date:', data[0].recordTime instanceof Date);
            console.log('Value:', data[0].recordTime);
        } else {
            console.log('No logs found');
        }
    } catch(e) { console.error(e.message); }
    finally { try { await zk.disconnect(); } catch(e){} }
}
test();
"@
    
    $codePath = "/var/www/purple-port/server/src/utils/test_zk.js"
    Run "cat << 'EOF' > $codePath`n$code`nEOF"
    Run "cd /var/www/purple-port/server && npx ts-node src/utils/test_zk.js"
}
finally {
    if ($s) { Remove-SSHSession -SessionId $s.SessionId | Out-Null }
}

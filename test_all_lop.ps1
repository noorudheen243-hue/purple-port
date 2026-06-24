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
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const users = await prisma.user.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, full_name: true }
  });
  console.log('Calculating LOP for June 2026:');
  for (const u of users) {
    const lop = await calculateAutoLOP(u.id, 6, 2026);
    const halfDays = await prisma.attendanceRecord.count({
      where: {
        user_id: u.id,
        status: 'HALF_DAY',
        date: {
          gte: new Date('2026-06-01T00:00:00Z'),
          lte: new Date('2026-06-30T23:59:59Z')
        }
      }
    });
    console.log(` - ${u.full_name}: LOP = ${lop}, HALF_DAY Count = ${halfDays}`);
  }
}
run().then(() => process.exit(0)).catch(console.error);
"
'@
    $r = Invoke-SSHCommand -SessionId $s.SessionId -Command $nodeCmd -TimeOut 60
    if ($r.Output) { Write-Host ($r.Output -join "`n") }
    if ($r.Error -and $r.Error.Trim()) { Write-Host "ERR: $($r.Error)" -ForegroundColor Red }
}
finally {
    if ($s) { Remove-SSHSession -SessionId $s.SessionId | Out-Null }
}


$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)
$session = New-SSHSession -ComputerName "66.116.224.221" -Credential $Cred -AcceptKey -Force

$r = Invoke-SSHCommand -SessionId $session.SessionId -Command "source $HOME/.nvm/nvm.sh 2>/dev/null; cd /var/www/purple-port/server && npx ts-node -e '
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
async function main() {
  const records = await prisma.attendanceRecord.findMany({
    where: { method: "BIOMETRIC", check_out: { not: null } },
    orderBy: { date: "desc" },
    take: 3
  });
  console.log("VPS Records:", records);
}
main().catch(console.error).finally(() => prisma.$disconnect());
' "

Write-Host $r.Output
Remove-SSHSession -SessionId $session.SessionId


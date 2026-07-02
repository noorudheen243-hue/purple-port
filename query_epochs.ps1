
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)
$session = New-SSHSession -ComputerName "66.116.224.221" -Credential $Cred -AcceptKey -Force

$script = @'
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();
async function main() {
    const records = await db.attendanceRecord.findMany({
        where: { date: { gte: new Date("2026-06-30T18:30:00.000Z") } },
        take: 5
    });
    for (const r of records) {
        console.log(r.id, r.check_in?.getTime(), r.check_in?.toISOString());
    }
}
main().catch(console.error).finally(() => db.$disconnect());
'@

Set-Content -Path query_epochs.js -Value $script
$sftp = New-SFTPSession -ComputerName "66.116.224.221" -Credential $Cred -AcceptKey -Force
Set-SFTPItem -SFTPSession $sftp -Path "f:\Antigravity\query_epochs.js" -Destination "/var/www/purple-port/server/" -Force
Invoke-SSHCommand -SessionId $session.SessionId -Command "cd /var/www/purple-port/server && source $HOME/.nvm/nvm.sh 2>/dev/null; node query_epochs.js" | Select-Object -ExpandProperty Output

Remove-SFTPSession -SFTPSession $sftp
Remove-SSHSession -SessionId $session.SessionId


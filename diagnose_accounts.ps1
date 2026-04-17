Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)
$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force
$APP = "/var/www/purple-port/server"

$diagCode = @'
const {PrismaClient} = require("./node_modules/@prisma/client");
const p = new PrismaClient();
async function main() {
    const accounts = await p.marketingAccount.findMany({
        include: { client: { select: { name: true } }, metaToken: { select: { id: true, page_name: true } } }
    });
    console.log("=== MARKETING ACCOUNTS ===");
    for (const a of accounts) {
        console.log(`  [${a.platform}] ${a.externalAccountId} | Client: ${a.client?.name} | Token: ${a.accessToken ? "DIRECT" : a.metaToken ? "META_TOKEN("+a.metaToken.page_name+")" : "NONE"}`);
    }

    const camps = await p.marketingCampaign.groupBy({ by: ["status"], _count: { id: true } });
    console.log("\n=== CAMPAIGNS BY STATUS ===");
    for (const g of camps) { console.log(`  ${g.status}: ${g._count.id}`); }

    const metrics = await p.marketingMetric.count();
    console.log(`\n=== TOTAL METRICS: ${metrics} ===`);
    
    const syncLogs = await p.marketingSyncLog.findMany({ orderBy: { startedAt: "desc" }, take: 3 });
    console.log("\n=== LAST 3 SYNC LOGS ===");
    for (const l of syncLogs) { console.log(`  ${l.status} | ${l.startedAt?.toISOString()} | ${l.details || ""}`); }
}
main().finally(() => p.$disconnect());
'@

$diagCode | Set-Content -Path "f:\Antigravity\tmp_diag.js" -Encoding UTF8
Set-SCPItem -ComputerName $VPS -Credential $Cred -Path "f:\Antigravity\tmp_diag.js" -Destination "$APP/" -Force

$r = Invoke-SSHCommand -SessionId $s.SessionId -Command "source `$HOME/.nvm/nvm.sh 2>/dev/null; cd $APP && node tmp_diag.js" -TimeOut 30
Write-Host $r.Output
if ($r.Error) { Write-Host "ERR: $($r.Error)" -ForegroundColor Yellow }

Remove-SSHSession -SessionId $s.SessionId | Out-Null

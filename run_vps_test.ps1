Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

# Create a test script on the server to directly call our services
$script = @"
const { PrismaClient } = require('@prisma/client');
const { MetaAdsService } = require('./services/metaAdsService');
const { MetaLeadsService } = require('./services/metaLeadsService');

const prisma = new PrismaClient();
const adsService = new MetaAdsService();
const leadsService = new MetaLeadsService();

async function run() {
    const acc = await prisma.marketingAccount.findFirst({ where: { platform: 'meta' } });
    if (!acc) return console.log('No meta account found');
    
    console.log('--- TEST CONFIG ---');
    console.log('Account:', acc.externalAccountId);

    const campaigns = await prisma.marketingCampaign.findMany({ where: { platform: 'meta' } });
    console.log('Campaigns:', campaigns.map(c => c.name));

    // Test leads
    console.log('--- TESTING LEADS ---');
    try {
        const leads = await leadsService.syncLeads(acc.clientId, acc.externalAccountId, acc.accessToken);
        console.log('Leads Result:', leads);
    } catch(e) { console.error('Leads Error:', e.message); }

    // Test metrics
    if (campaigns.length > 0) {
        console.log('--- TESTING METRICS for ' + campaigns[0].externalCampaignId + ' ---');
        try {
            const today = new Date();
            const from = new Date(today); from.setDate(from.getDate() - 3);
            const metrics = await adsService.fetchMetrics(campaigns[0].externalCampaignId, acc.externalAccountId, from, today);
            console.log('Metrics parsed successfully:', metrics.length);
        } catch(e) { console.error('Metrics Error:', e.message); }
    }
}
run().catch(console.error).finally(() => process.exit(0));
"@

# Upload and run the script inside the compiled JS directory on the server
$remotePath = "/var/www/antigravity/server/dist/modules/marketing-tasks"
Invoke-SSHCommand -SSHSession $session -Command "echo `"$script`" > $remotePath/debug_test.js"
$r = Invoke-SSHCommand -SSHSession $session -Command "cd $remotePath && node debug_test.js"

Write-Host "--- SCRIPT OUTPUT ---"
Write-Host $r.Output
if ($r.Error) { Write-Host "ERR: " $r.Error }

Remove-SSHSession -SSHSession $session | Out-Null

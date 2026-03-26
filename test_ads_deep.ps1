Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

# Test script to dump `ads` with full creative
$script = @"
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient();
const META_GRAPH_URL = 'https://graph.facebook.com/v19.0';

async function run() {
    const acc = await prisma.marketingAccount.findFirst({ where: { platform: 'meta' } });
    const formattedAccountId = acc.externalAccountId.startsWith('act_') ? acc.externalAccountId : 'act_' + acc.externalAccountId;
    
    console.log('Fetching ads for', formattedAccountId);
    try {
        const res = await axios.get(META_GRAPH_URL + '/' + formattedAccountId + '/ads', {
            params: {
                access_token: acc.accessToken,
                fields: 'id,name,creative{id,name,object_story_spec,asset_feed_spec,effective_object_story_id}',
                limit: 5
            }
        });
        const ads = res.data.data;
        for (const ad of ads) {
            console.log('\n--- AD:', ad.id, ad.name, '---');
            if (ad.creative) {
                console.log(JSON.stringify(ad.creative, null, 2));
            }
        }
    } catch(e) {
        console.error(e.response ? e.response.data : e.message);
    }
}
run().catch(console.error).finally(() => process.exit(0));
"@

$remotePath = "/var/www/antigravity/server/dist/modules/marketing-tasks"
Invoke-SSHCommand -SSHSession $session -Command "echo `"$script`" > $remotePath/debug_ads.js"
$r = Invoke-SSHCommand -SSHSession $session -Command "cd $remotePath && node debug_ads.js"

Write-Host "--- SCRIPT OUTPUT ---"
Write-Host $r.Output

Remove-SSHSession -SSHSession $session | Out-Null
